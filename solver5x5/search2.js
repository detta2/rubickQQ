// search2.js — cari 3-cycle X-center via komutator lebih luas.
// Cek [A,B] untuk A,B dari semua 36 moves, dan [A1 A2, B].
const { newCube, applyMoves } = require("../solver/cube");
const FN = ["U", "R", "F", "D", "L", "B"];
const ALL = [];
for (const f of FN) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) ALL.push(f + w + s);
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
function invSeq(seq) { return seq.trim().split(/\s+/).reverse().map(inv).join(" "); }

// Cari komutator [A,B] dengan 3-cycle pada X-center dan total moved kecil
console.log("== [A,B] dengan 3-cycle X-center, moved<=10 ==");
let found = 0;
for (const A of ALL) for (const B of ALL) {
  const seq = `${A} ${B} ${inv(A)} ${inv(B)}`;
  const cyc = cycles(permOf(seq));
  const x3 = cyc.filter(c => c.length === 3 && c.every(i => isX(CPOS[i])));
  if (x3.length === 0) continue;
  const moved = cyc.reduce((a, c) => a + c.length, 0);
  if (moved <= 10) {
    found++;
    if (found <= 10) console.log(`${seq} moved:${moved} : ${x3[0].map(cname).join("->")}`);
  }
}
console.log(`ditemukan: ${found}`);

// Cari [A1 A2, B]: A1,A2 wide, B face turn
console.log("\n== [A1 A2, B] dengan 3-cycle X-center murni (tepat 3 moved), A1A2 wide ==");
const WIDE = [];
for (const f of FN) for (const s of ["", "'", "2"]) WIDE.push(f + "w" + s);
const FTURN = [];
for (const f of FN) for (const s of ["", "'", "2"]) FTURN.push(f + s);
found = 0;
for (const A1 of WIDE) for (const A2 of WIDE) for (const B of FTURN) {
  const A = `${A1} ${A2}`;
  const seq = `${A} ${B} ${invSeq(A)} ${inv(B)}`;
  const cyc = cycles(permOf(seq));
  const moved = cyc.reduce((a, c) => a + c.length, 0);
  if (moved !== 3) continue;
  if (!cyc[0].every(i => isX(CPOS[i]))) continue;
  found++;
  if (found <= 10) console.log(`${seq} : ${cyc[0].map(cname).join("->")}`);
  if (found >= 10) break;
}
console.log(`ditemukan: ${found}`);
