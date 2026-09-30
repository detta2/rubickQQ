// analyze5.js — analisis first-principles untuk solver 5x5.
// 1. Verifikasi orbit: apakah X-center dan +-center orbit terpisah?
// 2. Sensus komutator [W,F]: struktur cycle pada centers.
// Semua sequence di sini di-derive dari komputasi, bukan dari sumber luar.
const { newCube, applyMoves, cloneCube } = require("../solver/cube");

const FN = ["U", "R", "F", "D", "L", "B"];
const MOVES = [];
for (const f of FN) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) MOVES.push(f + w + s);

// posisi center: [face, r, c], 1<=r,c<=3
function centerPositions() {
  const p = [];
  for (let f = 0; f < 6; f++)
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) p.push([f, r, c]);
  return p;
}
const CPOS = centerPositions();
function isX([f, r, c]) { return r % 2 === 1 && c % 2 === 1; } // (1,1),(1,3),(3,1),(3,3)
function posKey([f, r, c]) { return f + "," + r + "," + c; }

// Kubus dengan tiap movable center dilabeli ID unik 0..47
function labeledCube() {
  const c = newCube(5, -1);
  CPOS.forEach(([f, r, cc], i) => { c.f[f][r][cc] = i; });
  return c;
}
function readLabels(c) {
  const m = {}; // id -> posKey
  for (const [f, r, cc] of CPOS) m[c.f[f][r][cc]] = posKey([f, r, cc]);
  return m;
}
// permutasi sebagai array: perm[i] = posisi akhir id i (dalam index CPOS)
function permutationOf(seq) {
  const c = labeledCube();
  applyMoves(c, seq);
  const idx = {}; CPOS.forEach(([f, r, cc], i) => { idx[posKey([f, r, cc])] = i; });
  const perm = new Array(48);
  for (const [f, r, cc] of CPOS) {
    const id = c.f[f][r][cc];
    perm[id] = idx[posKey([f, r, cc])];
  }
  return perm;
}
function cycles(perm) {
  const seen = new Array(perm.length).fill(false), out = [];
  for (let i = 0; i < perm.length; i++) {
    if (seen[i] || perm[i] === i) continue;
    const cyc = []; let j = i;
    while (!seen[j]) { seen[j] = true; cyc.push(j); j = perm[j]; }
    if (cyc.length > 1) out.push(cyc);
  }
  return out;
}
function facesTouched(perm) {
  const s = new Set();
  CPOS.forEach(([f, r, c], i) => { if (perm[i] !== i) s.add(f); });
  return [...s].sort().map(f => FN[f]).join("");
}

// --- 1. Analisis orbit ---
{
  // BFS dari satu X-center memakai 12 generator dasar (face + wide, cw saja cukup utk orbit)
  const gens = [];
  for (const f of FN) for (const w of ["", "w"]) gens.push(f + w);
  const start = posKey([0, 1, 1]); // U X-center
  const reach = new Set([start]);
  const queue = [start];
  const idx = {}; CPOS.forEach(([f, r, c], i) => { idx[posKey([f, r, c])] = i; });
  while (queue.length) {
    const cur = queue.pop();
    const [f, r, c] = cur.split(",").map(Number);
    for (const g of gens) {
      const cube = labeledCube();
      // cari id di posisi cur: id = index cur
      applyMoves(cube, g);
      // posisi baru dari id tersebut:
      const id = idx[cur];
      // scan semua posisi center utk id
      for (const [f2, r2, c2] of CPOS) {
        if (cube.f[f2][r2][c2] === id) {
          const k = posKey([f2, r2, c2]);
          if (!reach.has(k)) { reach.add(k); queue.push(k); }
          break;
        }
      }
    }
  }
  const xReach = [...reach].filter(k => { const [f, r, c] = k.split(",").map(Number); return isX([f, r, c]); });
  const pmReach = [...reach].filter(k => { const [f, r, c] = k.split(",").map(Number); return !isX([f, r, c]); });
  console.log(`Orbit dari X-center: total ${reach.size} (X:${xReach.length}, +-:${pmReach.length})`);
  const start2 = posKey([0, 1, 2]); // U +-center
  const reach2 = new Set([start2]); const q2 = [start2];
  while (q2.length) {
    const cur = q2.pop();
    const id = idx[cur];
    for (const g of gens) {
      const cube = labeledCube();
      applyMoves(cube, g);
      for (const [f2, r2, c2] of CPOS) {
        if (cube.f[f2][r2][c2] === id) {
          const k = posKey([f2, r2, c2]);
          if (!reach2.has(k)) { reach2.add(k); q2.push(k); }
          break;
        }
      }
    }
  }
  console.log(`Orbit dari +-center: total ${reach2.size}`);
  console.log(`=> ${reach.size === 24 && reach2.size === 24 ? "DUA ORBIT TERPISAH @24 (X dan +-) TERVERIFIKASI" : "orbit tidak seperti dugaan!"}`);
}

// --- 2. Sensus komutator [W, F] ---
console.log("\n--- Sensus komutator [W,F] pada centers ---");
const WIDE = FN.map(f => f + "w");
const FACE = [];
for (const f of FN) for (const s of ["", "'", "2"]) FACE.push(f + s);
const results = [];
for (const W of WIDE) for (const F of FACE) {
  const seq = `${W} ${F} ${inv(W)} ${inv(F)}`;
  const perm = permutationOf(seq);
  const cyc = cycles(perm);
  const moved = cyc.reduce((a, c) => a + c.length, 0);
  if (moved === 0) continue;
  const cycStr = cyc.map(c => c.length).sort((a, b) => a - b).join("+");
  results.push({ seq, moved, cycStr, faces: facesTouched(perm), cyc });
}
// tampilkan yang paling bersih: 3-cycle murni
console.log("\n== 3-cycle murni (tepat 3 centers bergerak) ==");
for (const r of results.filter(r => r.cycStr === "3")) {
  const names = r.cyc[0].map(i => { const [f, rr, cc] = CPOS[i]; return `${FN[f]}(${rr},${cc})${isX(CPOS[i]) ? "X" : "+"}`; });
  console.log(`${r.seq}  faces:${r.faces}  ${names.join(" -> ")}`);
}
console.log("\n== moved<=8, cycle sederhana (3+3, 3+2, dsb), faces<=3 ==");
for (const r of results.filter(r => r.moved <= 8 && r.faces.length <= 3 && r.cycStr !== "3")) {
  console.log(`${r.seq}  moved:${r.moved} cycles:${r.cycStr} faces:${r.faces}`);
}
function inv(m) {
  const mm = /^([URFDLB])(w?)(['2]?)$/.exec(m);
  const t = mm[3] === "'" ? "" : mm[3] === "" ? "'" : "2";
  return mm[1] + mm[2] + t;
}
