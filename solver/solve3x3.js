// solve3x3.js — wrapper Kociemba two-phase (cubejs, MIT) untuk kubus 3x3.
// Input: cube dari cube.js (model NxN, n=3). Output: string langkah solusi.
const { cloneCube, applyMoves } = require("./cube");
const CubeJs = require("./cubejs/cube.js");
require("./cubejs/solve.js");

let initialized = false;
function ensureInit() {
  if (!initialized) {
    CubeJs.initSolver();
    initialized = true;
  }
}

const COLOR_LETTER = ["U", "R", "F", "D", "L", "B"]; // color value -> huruf (sesuai face solved)

// ubah cube (n=3) ke string facelet cubejs (54 char, order U,R,F,D,L,B)
function toFaceletString(c) {
  if (c.n !== 3) throw new Error("solve3x3 hanya untuk n=3");
  let s = "";
  for (let f = 0; f < 6; f++) {
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      s += COLOR_LETTER[c.f[f][r][q]];
    }
  }
  return s;
}

function solve3x3(cube, maxDepth = 22) {
  ensureInit();
  const s = toFaceletString(cube);
  const cj = CubeJs.fromString(s);
  const sol = cj.solve(maxDepth);
  return sol.trim().split(/\s+/).filter(Boolean);
}

module.exports = { solve3x3, toFaceletString };

if (require.main === module) {
  const { newCube, applyMoves } = require("./cube");
  const ALLM = [];
  for (const f of ["U", "D", "F", "B", "L", "R"]) for (const s of ["", "'", "2"]) ALLM.push(f + s);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  let ok = 0;
  const N = 20;
  for (let i = 0; i < N; i++) {
    const c = newCube(3);
    let sc = [];
    for (let k = 0; k < 25; k++) sc.push(rnd(ALLM));
    applyMoves(c, sc.join(" "));
    const sol = solve3x3(c);
    const d = cloneCube(c);
    applyMoves(d, sol.join(" "));
    // verifikasi solved
    let solved = true;
    for (let f = 0; f < 6; f++) for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      if (d.f[f][r][q] !== f) solved = false;
    }
    if (solved) { ok++; if (i < 3) console.log(`scramble ${sc.join(" ").slice(0,40)}... -> ${sol.length} langkah`); }
    else console.log("GAGAL:", sc.join(" "));
  }
  console.log(`3x3: ${ok}/${N} solved`);
}
