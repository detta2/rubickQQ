// Discovery V2 (diperbaiki): skenario realistis dengan marker.
// T: 2 witness (warna-T, sudah terpasang) + 2 slot berisi warna-S.
// S: target (marker 9) di (sr,sq). Sisanya solved.
// Syarat: 9 berakhir di T, 2 witness tetap (warna-T di T), preserve monokromatik.
const { newCube, applyMoves } = require("./cube");
const WIDE = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'"]) WIDE.push(f + "w" + s);
const TURNS = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'", "2"]) TURNS.push(f + s);
function invert(m) {
  const p = require("./cube").parseMove(m);
  return p.face + (p.depth === 2 ? "w" : "") + (p.turns === 1 ? "'" : p.turns === 3 ? "" : "2");
}
function faceMono(c, f) {
  const n = c.n, v = c.f[f][1][1];
  for (let r = 1; r < n - 1; r++) for (let col = 1; col < n - 1; col++)
    if (c.f[f][r][col] !== v) return false;
  return true;
}
function checkSeq(n, T, S, sr, sq, preserve, seq) {
  const pos = [];
  for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++) pos.push([r, q]);
  // coba semua pasangan witness
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
    const c = newCube(n);
    const [w1, w2] = [pos[i], pos[j]];
    const rest = pos.filter((_, k) => k !== i && k !== j); // 2 slot non-witness
    // T: witness = T, slot lain = S
    for (const [r, q] of rest) c.f[T][r][q] = S;
    // S: target marker 9 di (sr,sq)
    c.f[S][sr][sq] = 9;
    applyMoves(c, seq);
    // 1) marker 9 harus di T
    let nineOnT = false;
    for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++)
      if (c.f[T][r][q] === 9) nineOnT = true;
    if (!nineOnT) return false;
    // 2) witness: tepat 2 warna-T di T
    let cntT = 0;
    for (let r = 1; r < n - 1; r++) for (let q = 1; q < n - 1; q++)
      if (c.f[T][r][q] === T) cntT++;
    if (cntT !== 2) return false;
    // 3) preserve
    for (const pf of preserve) if (!faceMono(c, pf)) return false;
  }
  return true;
}
function findFor(n, T, S, sr, sq, preserve) {
  for (const A of WIDE) for (const B of TURNS) {
    const seq = `${A} ${B} ${invert(A)}`;
    if (checkSeq(n, T, S, sr, sq, preserve, seq)) return seq;
  }
  for (const A1 of WIDE) for (const A2 of WIDE) for (const B of TURNS) {
    const seq = `${A1} ${A2} ${B} ${invert(A2)} ${invert(A1)}`;
    if (checkSeq(n, T, S, sr, sq, preserve, seq)) return seq;
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
const table = {};
let missing = 0;
for (const j of jobs) for (const S of j.src)
  for (let sr = 1; sr <= 2; sr++) for (let sq = 1; sq <= 2; sq++) {
    const seq = findFor(4, j.T, S, sr, sq, j.pr);
    table[`${j.T},${S},${sr},${sq}`] = seq;
    if (!seq) { missing++; console.log(`MISSING: ${FN[j.T]} <- ${FN[S]} (${sr},${sq})`); }
  }
console.log(`\nMissing: ${missing}/80`);
require("fs").writeFileSync(__dirname + "/macro_table.json", JSON.stringify(table));
for (const j of jobs) for (const S of j.src) {
  const row = [];
  for (let sr = 1; sr <= 2; sr++) for (let sq = 1; sq <= 2; sq++)
    row.push(`(${sr},${sq}):${table[`${j.T},${S},${sr},${sq}`]}`);
  console.log(`${FN[j.T]} <- ${FN[S]}: ${row.join(" ")}`);
}
