// pair_edges.js — edge pairing 4x4 via BFS outer-turns.
// Invarian: outer face turns tak merusak centers (monokromatik) dan tak memisahkan
// dedge yang sudah paired. Jadi tiap dedge bisa dipair independen via BFS.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");

const FN = ["U", "R", "F", "D", "L", "B"];
const OUTER = [];
for (const f of FN) for (const s of ["", "'", "2"]) OUTER.push(f + s);

// 12 edge slots 4x4; tiap slot = 4 posisi [f,r,q]. Urutan: 2 di face A, 2 di face B.
// Piece 1 = pos[0]+pos[2], Piece 2 = pos[1]+pos[3].
// Diturunkan dari rc2xyz di cube.js (bukan dari komentar yang salah).
const EDGES = [
  [[0,3,1],[0,3,2],[2,0,1],[2,0,2]], // UF
  [[0,1,3],[0,2,3],[1,0,2],[1,0,1]], // UR (R: 0,2<->0,1)
  [[0,0,1],[0,0,2],[5,0,2],[5,0,1]], // UB (B mirrored)
  [[0,1,0],[0,2,0],[4,0,1],[4,0,2]], // UL
  [[3,0,1],[3,0,2],[2,3,1],[2,3,2]], // DF
  [[3,1,3],[3,2,3],[1,3,1],[1,3,2]], // DR
  [[3,3,1],[3,3,2],[5,3,2],[5,3,1]], // DB (B mirrored)
  [[3,1,0],[3,2,0],[4,3,2],[4,3,1]], // DL (L swapped)
  [[2,1,3],[2,2,3],[1,1,0],[1,2,0]], // FR
  [[2,1,0],[2,2,0],[4,1,3],[4,2,3]], // FL
  [[5,1,0],[5,2,0],[1,1,3],[1,2,3]], // BR (B col0 = sisi R)
  [[5,1,3],[5,2,3],[4,1,0],[4,2,0]], // BL (B col3 = sisi L)
];
const DEDGE_COLORS = [
  [0,2],[0,1],[0,5],[0,4],
  [3,2],[3,1],[3,5],[3,4],
  [2,1],[2,4],[5,1],[5,4],
];

function posKey(p) { return p[0] + "," + p[1] + "," + p[2]; }

// cari 2 wing pieces dengan pasangan warna {c1,c2}.
// Return: [{p:[posA,posB]}, {p:[posC,posD]}] (tiap piece 2 posisi)
function findPieces(c, c1, c2) {
  const pieces = [];
  for (const e of EDGES) {
    // baca warna di 4 posisi
    const cols = e.map(p => c.f[p[0]][p[1]][p[2]]);
    // bentuk 2 pieces: (0,2) dan (1,3)
    const p1 = { p: [e[0], e[2]], col: [cols[0], cols[2]] };
    const p2 = { p: [e[1], e[3]], col: [cols[1], cols[3]] };
    for (const pc of [p1, p2]) {
      const s = new Set(pc.col);
      if (s.has(c1) && s.has(c2) && pc.col[0] !== pc.col[1]) {
        // pastikan ini wing piece valid (bukan center/corner — tapi EDGES hanya wing)
        pieces.push(pc);
      }
    }
  }
  // harusnya tepat 2
  return pieces;
}

// edge index dari sebuah piece (2 posisi); -1 jika tak ditemukan
function edgeOfPiece(piece) {
  const s = new Set(piece.p.map(posKey));
  for (let i = 0; i < EDGES.length; i++) {
    const es = new Set(EDGES[i].map(posKey));
    let ok = true;
    for (const k of s) if (!es.has(k)) ok = false;
    if (ok) return i;
  }
  return -1;
}

// pair satu dedge; return urutan langkah (mungkin kosong)
function pairOne(cube, c1, c2) {
  let pieces = findPieces(cube, c1, c2);
  if (pieces.length !== 2) return null; // error
  const e1 = edgeOfPiece(pieces[0]), e2 = edgeOfPiece(pieces[1]);
  if (e1 === e2 && e1 !== -1) return []; // sudah paired

  // Tag pieces pada clone: piece0 -> 99, piece1 -> 98
  const tagCube = cloneCube(cube);
  for (const p of pieces[0].p) tagCube.f[p[0]][p[1]][p[2]] = 99;
  for (const p of pieces[1].p) tagCube.f[p[0]][p[1]][p[2]] = 98;

  // BFS: state = (edge99, edge98)
  function edgesOfTagged(cc) {
    const p99 = [], p98 = [];
    for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      if (cc.f[f][r][q] === 99) p99.push([f, r, q]);
      if (cc.f[f][r][q] === 98) p98.push([f, r, q]);
    }
    return [edgeOfPiece({ p: p99 }), edgeOfPiece({ p: p98 })];
  }

  const visited = new Set();
  const queue = [{ c: tagCube, mv: [] }];
  const start = edgesOfTagged(tagCube);
  visited.add(start[0] + "," + start[1]);

  while (queue.length > 0) {
    const { c: cur, mv } = queue.shift();
    if (mv.length >= 9) continue; // batas kedalaman
    for (const m of OUTER) {
      const nxt = cloneCube(cur);
      applyMove(nxt, m);
      const [ne1, ne2] = edgesOfTagged(nxt);
      if (ne1 !== -1 && ne1 === ne2) return mv.concat([m]);
      const key = ne1 + "," + ne2;
      const key2 = ne2 + "," + ne1;
      if (!visited.has(key) && !visited.has(key2)) {
        visited.add(key);
        queue.push({ c: nxt, mv: mv.concat([m]) });
      }
    }
  }
  return null; // gagal
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

module.exports = { pairEdges, findPieces, edgeOfPiece };

if (require.main === module) {
  const { solveCenters } = require("./solve_centers");
  const ALLM = [];
  for (const f of ["U", "D", "F", "B", "L", "R"]) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) ALLM.push(f + w + s);
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
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
    // verifikasi: tiap edge slot punya 2 pasang warna cocok
    let paired = true;
    for (const [c1, c2] of DEDGE_COLORS) {
      const pcs = findPieces(d, c1, c2);
      if (pcs.length !== 2 || edgeOfPiece(pcs[0]) !== edgeOfPiece(pcs[1])) paired = false;
    }
    if (paired) {
      ok++;
      const tot = (mv1.join(" ") + " " + mv2.join(" ")).split(" ").filter(Boolean).length;
      console.log(i, "OK, total", tot, "langkah");
    } else console.log(i, "verifikasi gagal");
  }
  console.log(`pairing: ${ok}/${N}`);
}
