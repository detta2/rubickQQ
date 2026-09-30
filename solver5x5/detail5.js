// detail5.js — bedah struktur cycle komutator [W,F] pada 5x5.
const { newCube, applyMoves } = require("../solver/cube");
const FN = ["U", "R", "F", "D", "L", "B"];
function centerPositions() {
  const p = [];
  for (let f = 0; f < 6; f++) for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) p.push([f, r, c]);
  return p;
}
const CPOS = centerPositions();
const idx = {}; CPOS.forEach(([f, r, c], i) => { idx[f + "," + r + "," + c] = i; });
function isX([f, r, c]) { return r % 2 === 1 && c % 2 === 1; }
function cname(i) { const [f, r, c] = CPOS[i]; return `${FN[f]}(${r},${c})${isX(CPOS[i]) ? "X" : "+"}`; }
function labeledCube() {
  const c = newCube(5, -1);
  CPOS.forEach(([f, r, cc], i) => { c.f[f][r][cc] = i; });
  return c;
}
function permOf(seq) {
  const c = labeledCube(); applyMoves(c, seq);
  const perm = new Array(48);
  for (const [f, r, cc] of CPOS) perm[c.f[f][r][cc]] = idx[f + "," + r + "," + cc];
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
function inv(m) {
  const mm = /^([URFDLB])(w?)(['2]?)$/.exec(m);
  return mm[1] + mm[2] + (mm[3] === "'" ? "" : mm[3] === "" ? "'" : "2");
}
function comm(W, F) { return `${W} ${F} ${inv(W)} ${inv(F)}`; }

// Bedah [Uw,R]
for (const [W, F] of [["Uw", "R"], ["Rw", "U"], ["Fw", "R"]]) {
  const seq = comm(W, F);
  const cyc = cycles(permOf(seq));
  console.log(`\n=== [${W},${F}] = ${seq} ===`);
  for (const c of cyc) {
    console.log(`  cycle len ${c.length}: ${c.map(cname).join(" -> ")}`);
  }
  // cek: [W,F]^5 -> harusnya 3-cycle murni
  const seq5 = Array(5).fill(seq).join(" ");
  const cyc5 = cycles(permOf(seq5));
  console.log(`  [W,F]^5 cycles: ${cyc5.map(c => c.length).join("+")} : ${cyc5.map(c => c.map(cname).join("->")).join(" | ")}`);
}
