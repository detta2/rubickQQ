// find_macro5.js — discovery makro insersi center 5x5 (adaptasi V2 dari 4x4).
// Skenario: T punya 2 witness (warna-T) + 7 slot berisi warna-S; S punya marker 9 di (sr,sq).
// Syarat: 9 berakhir di T, 2 witness tetap, preserve monokromatik.
const { newCube, applyMoves, parseMove } = require("../solver/cube");

const WIDE = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'"]) WIDE.push(f + "w" + s);
const TURNS = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'", "2"]) TURNS.push(f + s);

function invert(m) {
  const p = parseMove(m);
  return p.face + (p.depth === 2 ? "w" : "") + (p.turns === 1 ? "'" : p.turns === 3 ? "" : "2");
}
function faceMono(c, f) {
  const n = c.n, v = c.f[f][1][1];
  for (let r = 1; r < n - 1; r++) for (let col = 1; col < n - 1; col++)
    if (c.f[f][r][col] !== v) return false;
  return true;
}
function centerPos(n) {
  const p = [];
  for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++) p.push([r, q]);
  return p;
}
const POS5 = centerPos(5);

function checkSeq(T, S, sr, sq, preserve, seq) {
  // Skenario realistis: T penuh (9) kecuali 1 hole di (1,1) berisi S.
  // S solved kecuali marker 9 di (sr,sq).
  // Syarat: 9 berakhir di T, 8 witness T tetap, preserve monokromatik.
  const c = newCube(5);
  c.f[T][1][1] = S; // hole
  c.f[S][sr][sq] = 9; // marker
  applyMoves(c, seq);
  let nineOnT = false, cntT = 0;
  for (let r = 1; r < 4; r++) for (let q = 1; q < 4; q++) {
    if (c.f[T][r][q] === 9) nineOnT = true;
    if (c.f[T][r][q] === T) cntT++;
  }
  if (!nineOnT || cntT !== 8) return false;
  for (const pf of preserve) if (!faceMono(c, pf)) return false;
  return true;
}

function findFor(T, S, sr, sq, preserve) {
  for (const A of WIDE) for (const B of TURNS) {
    const seq = `${A} ${B} ${invert(A)}`;
    if (checkSeq(T, S, sr, sq, preserve, seq)) return seq;
  }
  for (const A1 of WIDE) for (const A2 of WIDE) for (const B of TURNS) {
    const seq = `${A1} ${A2} ${B} ${invert(A2)} ${invert(A1)}`;
    if (checkSeq(T, S, sr, sq, preserve, seq)) return seq;
  }
  return null;
}

const FN = ["U", "R", "F", "D", "L", "B"];
const jobs = [
  { T: 0, src: [2, 1, 5, 4], pr: [] },
  { T: 3, src: [2, 1, 5, 4], pr: [0] },
  { T: 4, src: [2, 5, 1], pr: [0, 3] },
  { T: 1, src: [2, 5, 4], pr: [0, 3] },
  { T: 2, src: [1, 4, 5], pr: [0, 3, 4, 1] },
  { T: 5, src: [1, 4, 2], pr: [0, 3, 4, 1, 2] },
];

if (require.main === module) {
  const table = {};
  let missing = 0, total = 0;
  const t0 = Date.now();
  for (const j of jobs) for (const S of j.src)
    for (let sr = 1; sr <= 3; sr++) for (let sq = 1; sq <= 3; sq++) {
      total++;
      const seq = findFor(j.T, S, sr, sq, j.pr);
      table[`${j.T},${S},${sr},${sq}`] = seq;
      if (!seq) { missing++; console.log(`MISSING: ${FN[j.T]} <- ${FN[S]} (${sr},${sq})`); }
    }
  console.log(`\nMissing: ${missing}/${total} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  require("fs").writeFileSync(__dirname + "/macro5.json", JSON.stringify(table));
  console.log("tersimpan di macro5.json");
}
module.exports = { findFor };
