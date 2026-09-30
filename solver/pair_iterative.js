// pair_iterative.js — coba pairing iteratif dengan repair.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");
const { solveCenters } = require("./solve_centers");
const { pairEdges: pairEdges2, findPieces, edgeOf } = require("./pair_edges2");

const DEDGE_COLORS = [
  [0,2],[0,1],[0,5],[0,4],
  [3,2],[3,1],[3,5],[3,4],
  [2,1],[2,4],[5,1],[5,4],
];

function allPaired(c) {
  for (const [c1,c2] of DEDGE_COLORS) {
    const pcs = findPieces(c, c1, c2);
    if (pcs.length !== 2) return false;
    if (edgeOf(pcs[0].p) !== edgeOf(pcs[1].p)) return false;
  }
  return true;
}

function centersOK(c) {
  for (let f=0;f<6;f++) for(let r=1;r<=2;r++) for(let q=1;q<=2;q++) if(c.f[f][r][q]!==f) return false;
  return true;
}

if (require.main === module) {
  const ALLM = [];
  for (const f of ["U","D","F","B","L","R"]) for (const w of ["","w"]) for (const s of ["","'","2"]) ALLM.push(f+w+s);
  const rnd = (a) => a[Math.floor(Math.random()*a.length)];
  
  const c = newCube(4);
  let sc = [];
  for (let k=0;k<40;k++) sc.push(rnd(ALLM));
  applyMoves(c, sc.join(" "));
  const d = cloneCube(c);
  
  // centers dulu
  if (!solveCenters(d, [])) { console.log("centers gagal"); process.exit(1); }
  console.log("centers OK");
  
  // iteratif: pair, cek, ulangi sampai semua paired atau max iter
  for (let iter=0; iter<20; iter++) {
    if (allPaired(d) && centersOK(d)) {
      console.log("BERHASIL iter", iter);
      process.exit(0);
    }
    // pair semua yang belum paired
    const mv = [];
    const ok = pairEdges2(d, mv);
    console.log("iter", iter, "pairEdges ok:", ok, "allPaired:", allPaired(d));
    if (!ok) break;
  }
  console.log("GAGAL konvergen");
}
