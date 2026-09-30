// pair_edges3.js — edge pairing 4x4 dengan algoritma standar Dw R U R' Dw'.
// Setup: W1 di FR-left ([2,1,3],[1,1,0]), W2 di FL-right ([2,2,0],[4,2,3]).
// Dw memasangkan mereka di FR, R memindahkan ke UR (top), U menyimpan di top.
// U dipilih adaptif agar tidak merusak dedge yang sudah dipair.
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

// Case positions: W1 di FR-left, W2 di FL-right.
// Dw akan memasangkan mereka di FR.
const W1_POS = [[2,1,3],[1,1,0]]; // FR-left
const W2_POS = [[2,2,0],[4,2,3]]; // FL-right

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

// BFS setup: bawa 99 ke W1_POS dan 98 ke W2_POS (atau sebaliknya)
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
  const kW1 = setKey(W1_POS), kW2 = setKey(W2_POS);
  function isGoal(p99, p98) {
    const k99 = setKey(p99), k98 = setKey(p98);
    return (k99 === kW1 && k98 === kW2) || (k99 === kW2 && k98 === kW1);
  }

  const [sp99, sp98] = getPositions(tag);
  if (isGoal(sp99, sp98)) return [];

  const visited = new Set([setKey(sp99) + "#" + setKey(sp98)]);
  const queue = [{ c: tag, mv: [] }];
  let iter = 0;
  while (queue.length > 0 && iter < 80000) {
    iter++;
    const { c: cur, mv } = queue.shift();
    if (mv.length >= 7) continue;
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

// Cek apakah sebuah edge (by index) sudah paired (untuk dedge tertentu)
// Kita butuh tahu posisi dedge yang sudah paired, untuk memilih U.
function getPairedEdges(c, pairedSet) {
  // pairedSet: Set dari "c1,c2" yang sudah dipair
  // Return: Set dari edge index yang ditempati oleh paired dedges
  const occupied = new Set();
  for (const key of pairedSet) {
    const [c1, c2] = key.split(",").map(Number);
    const pcs = findPieces(c, c1, c2);
    if (pcs.length === 2) {
      const e = edgeOf(pcs[0].p);
      if (e !== -1 && e === edgeOf(pcs[1].p)) occupied.add(e);
    }
  }
  return occupied;
}

function pairOne(cube, c1, c2, pairedSet) {
  const pieces = findPieces(cube, c1, c2);
  if (pieces.length !== 2) return null;
  const e1 = edgeOf(pieces[0].p), e2 = edgeOf(pieces[1].p);
  if (e1 !== -1 && e1 === e2) return []; // sudah paired

  const setup = setupBFS(cube, pieces);
  if (setup === null) return null;

  // Simulasi: setup, lalu Dw, R, lalu pilih U
  const sim = cloneCube(cube);
  applyMoves(sim, setup.join(" "));
  // Dw memasangkan di FR
  applyMoves(sim, "Dw");
  applyMoves(sim, "R");
  // Sekarang paired dedge ada di UR (edge 1). Kita akan U untuk memindahkannya
  // ke posisi aman, dan memastikan R' tidak membawa turun paired dedge.
  //
  // Posisi yang akan dibawa turun oleh R' adalah UR (edge 1) setelah U.
  // Kita pilih U sehingga:
  // 1. Paired dedge (sekarang di UR) pindah ke edge yang TIDAK akan di-R'.
  //    Setelah U, paired dedge ada di edge X. R' mengambil dari UR.
  //    Jadi X != 1 (UR).
  // 2. Edge 1 (UR) setelah U harus TIDAK berisi paired dedge.
  //
  // Edge UR = index 1. Setelah U clockwise:
  //   UF(0) -> UR(1) -> UB(2) -> UL(3) -> UF(0)
  // Jadi jika paired dedge di UR(1), setelah U:
  //   U: 1->2 (UB), U2: 1->3 (UL), U': 1->0 (UF)
  //
  // Kita pilih U yang memindahkan paired dedge ke edge yang aman,
  // dan membawa ke UR sebuah edge yang tidak paired.
  
  const occupied = getPairedEdges(sim, pairedSet);
  // paired dedge yang baru (c1,c2) sekarang di UR (edge 1), tapi belum di pairedSet.
  // Kita tidak ingin U memindahkannya ke edge yang occupied.
  // Dan kita tidak ingin R' membawa turun edge yang occupied.
  
  // Setelah U, posisi UR (1) akan ditempati oleh:
  //   U: UF(0), U2: UB(2), U': UL(3)
  // U tidak boleh kosong (R R' akan cancel).
  // Kita butuh posisi tersebut TIDAK di occupied.
  const candidates = [
    { u: "U", from: 0, dest: 2 },   // UF->UR, paired UR->UB
    { u: "U2", from: 2, dest: 3 },  // UB->UR, paired UR->UL
    { u: "U'", from: 3, dest: 0 },  // UL->UR, paired UR->UF
  ];
  let chosenU = null;
  for (const cand of candidates) {
    if (!occupied.has(cand.from) && !occupied.has(cand.dest)) {
      chosenU = cand.u;
      break;
    }
  }
  if (chosenU === null) {
    // Fallback: pilih yang from-nya tidak occupied
    for (const cand of candidates) {
      if (!occupied.has(cand.from)) { chosenU = cand.u; break; }
    }
  }
  if (chosenU === null) chosenU = "U"; // last resort
  
  const seq = setup.concat(["Dw", "R"]);
  if (chosenU) seq.push(chosenU);
  seq.push("R'", "Dw'");
  return seq;
}

function pairEdges(c, mv) {
  const pairedSet = new Set();
  // tandai yang sudah paired
  for (const [c1, c2] of DEDGE_COLORS) {
    const pcs = findPieces(c, c1, c2);
    if (pcs.length === 2 && edgeOf(pcs[0].p) === edgeOf(pcs[1].p)) {
      pairedSet.add(c1 + "," + c2);
    }
  }
  
  for (const [c1, c2] of DEDGE_COLORS) {
    const key = c1 + "," + c2;
    if (pairedSet.has(key)) continue;
    const seq = pairOne(c, c1, c2, pairedSet);
    if (seq === null) return false;
    if (seq.length > 0) {
      applyMoves(c, seq.join(" "));
      if (mv) mv.push(seq.join(" "));
    }
    pairedSet.add(key);
  }
  return true;
}

module.exports = { pairEdges, pairOne, findPieces, edgeOf };

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
