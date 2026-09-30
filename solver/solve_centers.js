// solve_centers.js — solver centers 4x4 (dan 5x5) staged, pakai makro komutator bersih.
// Strategi: untuk tiap face T (U,D,L,R,F):
//   1. Cari piece warna-T di face S (S tak solved).
//   2. S-turns: bawa piece ke posisi kerja (sr,sq) makro.
//   3. T-turns: bawa hole (non-T) di T ke (1,1).
//   4. Aplikasikan makro (dirancang untuk hole di (1,1), bersih: tak pindahkan T-color keluar T).
//   5. Simulasi: pastikan progres (count bertambah) & face solved tetap monokromatik.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");
const MACRO = require("./macro_basic.json");

const FN = ["U", "R", "F", "D", "L", "B"];
// posisi kerja per (T,S): list dari tabel
const P0 = {};
for (const k of Object.keys(MACRO)) {
  if (!MACRO[k]) continue;
  const [T, S, sr, sq] = k.split(",").map(Number);
  const key = `${T},${S}`;
  if (!P0[key]) P0[key] = [];
  P0[key].push([sr, sq]);
}

function countColorOn(c, color, f) {
  let n = 0;
  for (let r = 1; r < c.n - 1; r++) for (let q = 1; q < c.n - 1; q++) if (c.f[f][r][q] === color) n++;
  return n;
}
function faceMono(c, f) {
  const n = c.n, v = c.f[f][1][1];
  for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++) if (c.f[f][r][q] !== v) return false;
  return true;
}
// cari jumlah turn (0-3) face F yg membawa marker 99 dari (r,q) ke (r0,q0)
function findTurns(c, F, r, q, r0, q0) {
  for (let tt = 0; tt < 4; tt++) {
    const d = cloneCube(c);
    d.f[F][r][q] = 99;
    for (let k = 0; k < tt; k++) applyMove(d, FN[F]);
    if (d.f[F][r0][q0] === 99) return tt;
  }
  return -1;
}
function turnStr(F, t) {
  return t === 0 ? "" : t === 1 ? FN[F] : t === 2 ? FN[F] + "2" : FN[F] + "'";
}

function solveCenters(c, mv) {
  const n = c.n, need = (n - 2) * (n - 2);
  // urutan: U,D,L,R,F (B otomatis selesai)
  const order = [0, 3, 4, 1, 2];
  const solved = [];
  for (const T of order) {
    let guard = 0;
    while (countColorOn(c, T, T) < need && guard++ < 100) {
      const before = countColorOn(c, T, T);
      let applied = false;
      // kumpulkan kandidat: piece warna-T di face S (S bukan T, S belum solved, ada makro)
      const cands = [];
      for (let S = 0; S < 6; S++) {
        if (S === T || solved.includes(S)) continue;
        const key = `${T},${S}`;
        if (!P0[key] || P0[key].length === 0) continue;
        for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++) {
          if (c.f[S][r][q] === T) cands.push({ S, r, q });
        }
      }
      // coba tiap kandidat × tiap posisi kerja
      for (const { S, r, q } of cands) {
        const key = `${T},${S}`;
        for (const [sr, sq] of P0[key]) {
          const macro = MACRO[`${T},${S},${sr},${sq}`];
          if (!macro) continue;
          // langkah 2: S-turns bawa (r,q)->(sr,sq)
          const t = findTurns(c, S, r, q, sr, sq);
          if (t < 0) continue;
          const sTurn = turnStr(S, t);
          // simulasi S-turns untuk lihat posisi hole di T
          const d1 = cloneCube(c);
          if (sTurn) applyMoves(d1, sTurn);
          // langkah 3: cari hole di T, T-turns bawa ke (1,1)
          let hr = -1, hq = -1;
          for (let rr = 1; rr < n - 1 && hr < 0; rr++) for (let qq = 1; qq < n - 1 && hr < 0; qq++) {
            if (d1.f[T][rr][qq] !== T) { hr = rr; hq = qq; }
          }
          if (hr < 0) continue; // tak ada hole (seharusnya tak terjadi)
          const u = findTurns(d1, T, hr, hq, 1, 1);
          if (u < 0) continue;
          const tTurn = turnStr(T, u);
          // langkah 4-5: rakit sekuens, simulasi, cek
          const seq = (sTurn ? sTurn + " " : "") + (tTurn ? tTurn + " " : "") + macro;
          const d2 = cloneCube(c);
          applyMoves(d2, seq);
          const after = countColorOn(d2, T, T);
          const presOK = solved.every((pf) => faceMono(d2, pf));
          if (after > before && presOK) {
            applyMoves(c, seq);
            if (mv) mv.push(seq);
            applied = true;
            break;
          }
        }
        if (applied) break;
      }
      if (!applied) return false; // stuck
    }
    if (countColorOn(c, T, T) < need) return false;
    solved.push(T);
  }
  return true;
}

module.exports = { solveCenters };

if (require.main === module) {
  const ALLM = [];
  for (const f of ["U", "D", "F", "B", "L", "R"]) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) ALLM.push(f + w + s);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  let ok = 0, tot = 0, totMv = 0;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const c = newCube(4);
    let sc = [];
    for (let k = 0; k < 40; k++) sc.push(rnd(ALLM));
    applyMoves(c, sc.join(" "));
    const d = cloneCube(c);
    const mv = [];
    if (solveCenters(d, mv)) {
      // verifikasi semua centers monokromatik
      let allMono = true;
      for (let f = 0; f < 6; f++) if (!faceMono(d, f)) allMono = false;
      if (allMono) { ok++; totMv += mv.join(" ").split(" ").filter(Boolean).length; }
    }
    tot++;
  }
  console.log(`centers 4x4: ${ok}/${tot} solved, rata2 ${ok ? (totMv / ok).toFixed(1) : "NaN"} langkah`);
}
