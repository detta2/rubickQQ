// Penemu makro insersi center: cari A B A' (A=wide, B=face turn)
// yang memindahkan 1 center piece dari face S ke face T,
// dengan face-face preserve tetap monokromatik.
const { newCube, applyMove, applyMoves, cloneCube } = require("./cube");

const WIDE = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'"]) WIDE.push(f + "w" + s);
const TURNS = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'", "2"]) TURNS.push(f + s);

// target warna per face (skema standar)
const TARGET = [0, 1, 2, 3, 4, 5]; // U,R,F,D,L,B

function solvedCenters(n) {
  const c = newCube(n);
  return c; // newCube sudah solved (tiap face warna = index face)
}
function faceMono(c, f) {
  const n = c.n, v = c.f[f][1][1];
  for (let r = 1; r < n - 1; r++) for (let col = 1; col < n - 1; col++)
    if (c.f[f][r][col] !== v) return false;
  return true;
}
// tukar 2 center piece: (f1,r1,c1) <-> (f2,r2,c2)
function swapCenters(c, a, b) {
  const t = c.f[a[0]][a[1]][a[2]];
  c.f[a[0]][a[1]][a[2]] = c.f[b[0]][b[1]][b[2]];
  c.f[b[0]][b[1]][b[2]] = t;
}
function centerPos(n, f) {
  const p = [];
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) p.push([f, r, c]);
  return p;
}
// cari makro untuk (T <- S), preserve = daftar face yg harus tetap monokromatik.
// Mengembalikan {macro, worksFor} : worksFor = posisi-posisi S yg berhasil.
function findMacro(n, T, S, preserve) {
  const results = [];
  for (const A of WIDE) {
    for (const B of TURNS) {
      const macro = `${A} ${B} ${invert(A)}`;
      const worksFor = [];
      for (const sp of centerPos(n, S)) {
        // skenario: piece warna T ada di sp (tukar dengan piece di slot T)
        const c = solvedCenters(n);
        const tp = [T, 1, 1]; // slot target (piece T yg "benar" ada di sini)
        // pastikan sp bukan di T dan warnanya beda: tukar piece T@tp dengan piece S@sp
        swapCenters(c, tp, sp);
        // sekarang: piece warna-T ada di sp, piece warna-S ada di tp
        applyMoves(c, macro);
        // cek: ada piece warna-T di face T lebih banyak dari sebelumnya?
        // lebih tepat: piece yg tadinya di sp sekarang ada di face T?
        // lacak: cari posisi piece yg ditukar — kita tandai via warna unik? 
        // Sederhana: hitung jumlah warna-T di face T; harus 4 (semua kembali)
        // dan piece warna-S tidak boleh ada di face T.
        let countT = 0, badS = 0;
        for (let r = 1; r < n - 1; r++) for (let col = 1; col < n - 1; col++) {
          if (c.f[T][r][col] === TARGET[T]) countT++;
          if (c.f[T][r][col] === TARGET[S]) badS++;
        }
        let presOK = true;
        for (const pf of preserve) if (!faceMono(c, pf)) { presOK = false; break; }
        // juga S tidak perlu monokromatik (belum solved), tapi T harus penuh
        if (countT === 4 && badS === 0 && presOK) worksFor.push(sp);
      }
      if (worksFor.length > 0) results.push({ macro, worksFor });
    }
  }
  return results;
}
function invert(m) {
  const p = require("./cube").parseMove(m);
  return p.face + (p.depth === 2 ? "w" : "") + (p.turns === 1 ? "'" : p.turns === 3 ? "" : "2");
}

const FN = ["U", "R", "F", "D", "L", "B"];
// yang dibutuhkan (urutan solve: U,D,L,R,F,B):
const jobs = [
  { T: 0, S: 2, preserve: [] },          // U <- F
  { T: 3, S: 2, preserve: [0] },         // D <- F
  { T: 4, S: 2, preserve: [0, 3] },      // L <- F
  { T: 4, S: 5, preserve: [0, 3] },      // L <- B
  { T: 1, S: 2, preserve: [0, 3] },      // R <- F
  { T: 1, S: 5, preserve: [0, 3] },      // R <- B
  { T: 2, S: 1, preserve: [0, 3, 4, 1] },// F <- R
  { T: 5, S: 1, preserve: [0, 3, 4, 1, 2] },// B <- R
];
for (const j of jobs) {
  const res = findMacro(4, j.T, j.S, j.preserve);
  console.log(`\n${FN[j.T]} <- ${FN[j.S]} preserve [${j.preserve.map(f => FN[f])}]: ${res.length} makro`);
  for (const r of res.slice(0, 6)) {
    console.log(`  ${r.macro}  worksFor: ${r.worksFor.map(p => `(${p[1]},${p[2]})`).join(" ")}`);
  }
}
