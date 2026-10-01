// detail2.js — bedah [U2,W] dan cari versi murni / pendek untuk +-center juga.
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

console.log("== Bedah U2 Rw U2 Rw' ==");
{
  const seq = "U2 Rw U2 Rw'";
  const cyc = cycles(permOf(seq));
  for (const c of cyc) console.log(`  len ${c.length} [${c.every(i => isX(CPOS[i])) ? "X" : c.every(i => !isX(CPOS[i])) ? "+" : "MIX"}]: ${c.map(cname).join(" -> ")}`);
  // cek pangkat
  for (const k of [2, 3]) {
    const s2 = Array(k).fill(seq).join(" ");
    const c2 = cycles(permOf(s2));
    console.log(`  ^${k}: ${c2.map(c => c.length).join("+")}`);
  }
}

console.log("\n== [A,B] dengan 3-cycle +-center, moved<=10 ==");
const ALL = [];
for (const f of FN) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) ALL.push(f + w + s);
let found = 0;
const plusResults = [];
for (const A of ALL) for (const B of ALL) {
  const seq = `${A} ${B} ${inv(A)} ${inv(B)}`;
  const cyc = cycles(permOf(seq));
  const p3 = cyc.filter(c => c.length === 3 && c.every(i => !isX(CPOS[i])));
  if (p3.length === 0) continue;
  const moved = cyc.reduce((a, c) => a + c.length, 0);
  if (moved <= 12) { found++; if (plusResults.length < 15) plusResults.push({ seq, moved, cyc }); }
}
console.log(`ditemukan: ${found}`);
for (const r of plusResults) {
  console.log(`\n${r.seq} moved:${r.moved}`);
  for (const c of r.cyc) console.log(`  len ${c.length} [${c.every(i => isX(CPOS[i])) ? "X" : "+"}]: ${c.map(cname).join(" -> ")}`);
}
