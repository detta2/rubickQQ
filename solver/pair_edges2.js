// pair_edges2.js — edge pairing 4x4 dengan macro + joint BFS.
// Macro: F Uw F' U F Uw' memasangkan W1 di UF-left ([0,3,1],[2,0,1])
//        dengan W2 di UB-left ([0,0,1],[5,0,2]), menjaga centers.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");

const EDGES = [
  [[0,3,1],[0,3,2],[2,0,1],[2,0,2]],
  [[0,1,3],[0,2,3],[1,0,2],[1,0,1]],
  [[0,0,1],[0,0,2],[5,0,2],[5,0,1]],
  [[0,1,0],[0,2,0],[4,0,1],[4,0,2]],
  [[3,0,1],[3,0,2],[2,3,1],[2,3,2]],
  [[3,1,3],[3,2,3],[1,3,1],[1,3,2]],
  [[3,3,1],[3,3,2],[5,3,2],[5,3,1]],
  [[3,1,0],[3,2,0],[4,3,2],[4,3,1]],
  [[2,1,3],[2,2,3],[1,1,0],[1,2,0]],
  [[2,1,0],[2,2,0],[4,1,3],[4,2,3]],
  [[5,1,0],[5,2,0],[1,1,3],[1,2,3]],
  [[5,1,3],[5,2,3],[4,1,0],[4,2,0]],
];
const DEDGE_COLORS = [
  [0,2],[0,1],[0,5],[0,4],
  [3,2],[3,1],[3,5],[3,4],
  [2,1],[2,4],[5,1],[5,4],
];

const UF_LEFT = [[0,3,1],[2,0,1]];
const UB_LEFT = [[0,0,1],[5,0,2]];
const MACRO = ["F", "Uw", "F'", "U", "F", "Uw'"];

function posKey(p) { return p.join(","); }
function setKey(positions) { return positions.map(posKey).sort().join("|"); }

function edgeOf(positions) {
  const s = new Set(positions.map(posKey));
  for (let i = 0; i < EDGES.length; i++) {
    const es = new Set(EDGES[i].map(posKey));
    let ok = true;
    for (const k of s) if (!es.has(k)) ok = false;
    if (ok) return i;
  }
  return -1;
}

function findPieces(c, c1, c2) {
  const pieces = [];
  for (const e of EDGES) {
    const cols = e.map(p => c.f[p[0]][p[1]][p[2]]);
    const p1 = { p: [e[0], e[2]], col: [cols[0], cols[2]] };
    const p2 = { p: [e[1], e[3]], col: [cols[1], cols[3]] };
    for (const pc of [p1, p2]) {
      const s = new Set(pc.col);
      if (s.has(c1) && s.has(c2) && pc.col[0] !== pc.col[1]) pieces.push(pc);
    }
  }
  return pieces;
}

const OUTER = [];
for (const f of ["U","R","F","D","L","B"]) for (const s of ["","'","2"]) OUTER.push(f+s);

// Joint BFS: bawa 99 ke UF_LEFT dan 98 ke UB_LEFT (atau sebaliknya), via outer turns.
// Return sequence atau null.
function setupBFS(cube, pcs) {
  const tag = cloneCube(cube);
  for (const p of pcs[0].p) tag.f[p[0]][p[1]][p[2]] = 99;
  for (const p of pcs[1].p) tag.f[p[0]][p[1]][p[2]] = 98;

  function getPositions(cc) {
    const p99 = [], p98 = [];
    for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      if (cc.f[f][r][q] === 99) p99.push([f,r,q]);
      if (cc.f[f][r][q] === 98) p98.push([f,r,q]);
    }
    return [p99, p98];
  }
  function isGoal(p99, p98) {
    const k99 = setKey(p99), k98 = setKey(p98);
    const kUF = setKey(UF_LEFT), kUB = setKey(UB_LEFT);
    return (k99 === kUF && k98 === kUB) || (k99 === kUB && k98 === kUF);
  }

  const [sp99, sp98] = getPositions(tag);
  if (isGoal(sp99, sp98)) return [];

  const visited = new Set();
  const startKey = setKey(sp99) + "#" + setKey(sp98);
  visited.add(startKey);
  const queue = [{ c: tag, mv: [] }];
  let iter = 0;
  while (queue.length > 0 && iter < 100000) {
    iter++;
    const { c: cur, mv } = queue.shift();
    if (mv.length >= 8) continue;
    for (const m of OUTER) {
      const nxt = cloneCube(cur);
      applyMove(nxt, m);
      const [n99, n98] = getPositions(nxt);
      if (isGoal(n99, n98)) return mv.concat([m]);
      const key = setKey(n99) + "#" + setKey(n98);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ c: nxt, mv: mv.concat([m]) });
      }
    }
  }
  return null;
}

function pairOne(cube, c1, c2) {
  const pieces = findPieces(cube, c1, c2);
  if (pieces.length !== 2) return null;
  const e1 = edgeOf(pieces[0].p), e2 = edgeOf(pieces[1].p);
  if (e1 !== -1 && e1 === e2) return []; // sudah paired

  const setup = setupBFS(cube, pieces);
  if (setup === null) return null;
  return setup.concat(MACRO);
}

function pairEdges(c, mv) {
  for (const [c1, c2] of DEDGE_COLORS) {
    const seq = pairOne(c, c1, c2);
    if (seq === null) return false;
    if (seq.length > 0) {
      applyMoves(c, seq.join(" "));
      if (mv) mv.push(seq.join(" "));
    }
  }
  return true;
}

module.exports = { pairEdges, findPieces, edgeOf };

if (require.main === module) {
  const { solveCenters } = require("./solve_centers");
  const ALLM = [];
  for (const f of ["U","D","F","B","L","R"]) for (const w of ["","w"]) for (const s of ["","'","2"]) ALLM.push(f+w+s);
  const rnd = (a) => a[Math.floor(Math.random()*a.length)];
  let ok = 0;
  const N = 10;
  for (let i = 0; i < N; i++) {
    const c = newCube(4);
    let sc = [];
    for (let k = 0; k < 40; k++) sc.push(rnd(ALLM));
    applyMoves(c, sc.join(" "));
    const d = cloneCube(c);
    const mv1 = [];
    if (!solveCenters(d, mv1)) { console.log(i, "centers gagal"); continue; }
    const mv2 = [];
    if (!pairEdges(d, mv2)) { console.log(i, "pairing gagal"); continue; }
    let paired = true;
    for (const [c1,c2] of DEDGE_COLORS) {
      const pcs = findPieces(d, c1, c2);
      if (pcs.length !== 2 || edgeOf(pcs[0].p) !== edgeOf(pcs[1].p)) paired = false;
    }
    // cek centers masih solved
    let cs = true;
    for (let f = 0; f < 6; f++) for (let r = 1; r <= 2; r++) for (let q = 1; q <= 2; q++) {
      if (d.f[f][r][q] !== f) cs = false;
    }
    if (paired && cs) {
      ok++;
      const tot = (mv1.join(" ")+" "+mv2.join(" ")).split(" ").filter(Boolean).length;
      console.log(i, "OK, total", tot);
    } else console.log(i, "gagal paired="+paired+" centers="+cs);
  }
  console.log(`pairing: ${ok}/${N}`);
}
