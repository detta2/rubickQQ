// find_pair_macro.js — cari macro untuk pairing 2 wings.
// Setup: W1 di UF, W2 di UB (keduanya di face U).
// Cari sekuens yang memasangkan mereka dan menjaga centers.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");
const { solveCenters } = require("./solve_centers");

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

function edgeOf(positions) {
  const s = new Set(positions.map(p => p.join(",")));
  for (let i = 0; i < EDGES.length; i++) {
    const es = new Set(EDGES[i].map(p => p.join(",")));
    let ok = true;
    for (const k of s) if (!es.has(k)) ok = false;
    if (ok) return i;
  }
  return -1;
}

// buat kubus test: centers solved, W1 (99) di UF, W2 (98) di UB
function makeTest() {
  const c = newCube(4);
  // kosongkan wings, isi manual? Lebih mudah: scramble lalu solve centers, lalu pindahkan.
  // Alternatif: buat dari solved, lalu pindahkan 2 wings ke UF dan UB via moves yang diketahui.
  // 
  // Cara: dari solved, UF sudah punya 2 wings {0,2}. UB punya 2 wings {0,5}.
  // Kita mau W1={0,2} di UF, W2={0,5} di UB. Di solved, mereka SUDAH di sana!
  // Tapi mereka sudah paired (masing-masing edge punya 2 wings yang cocok).
  // Kita butuh mereka TERPISAH.
  //
  // Pisahkan: dari solved, lakukan U (memindahkan UB ke UR, tapi UF tetap?).
  // U: UB->UR, UR->UF, UF->UL, UL->UB. Jadi setelah U, UF (pos) berisi wings dari UR ({0,1}).
  // Ini mengacaukan.
  //
  // Lebih baik: buat manual dengan menempatkan stiker.
  // Kita tidak peduli warna asli; kita tag dengan 99 dan 98.
  const d = newCube(4);
  // W1 di UF: posisi [0,3,1] dan [2,0,1]
  d.f[0][3][1] = 99; d.f[2][0][1] = 99;
  // W2 di UB: posisi [0,0,1] dan [5,0,2] (ingat pairing: U(0,1)<->B(0,2))
  d.f[0][0][1] = 98; d.f[5][0][2] = 98;
  return d;
}

function isPaired(cc) {
  const p99 = [], p98 = [];
  for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    if (cc.f[f][r][q] === 99) p99.push([f, r, q]);
    if (cc.f[f][r][q] === 98) p98.push([f, r, q]);
  }
  if (p99.length !== 2 || p98.length !== 2) return false;
  const e1 = edgeOf(p99), e2 = edgeOf(p98);
  return e1 !== -1 && e1 === e2;
}

function centersSolved(cc) {
  for (let f = 0; f < 6; f++) for (let r = 1; r <= 2; r++) for (let q = 1; q <= 2; q++) {
    if (cc.f[f][r][q] !== f) return false;
  }
  return true;
}

// BFS cari macro
const MOVES = [];
for (const f of ["U", "D", "F", "B", "L", "R"]) for (const w of ["", "w"]) for (const s of ["", "'", "2"]) {
  // batasi: hanya U, Uw, dan outer untuk setup? Untuk macro, kita butuh slice.
  MOVES.push(f + w + s);
}
// kurangi: hanya yang relevan untuk pairing di U
const SEARCH_MOVES = ["U", "U'", "U2", "Uw", "Uw'", "Uw2", "F", "F'", "R", "R'"];

function search() {
  const start = makeTest();
  console.log("centers solved awal:", centersSolved(start));
  console.log("paired awal:", isPaired(start));
  
  const visited = new Set();
  const queue = [{ c: start, mv: [] }];
  // state key: posisi 99,98 + centers (ringkas)
  function key(cc) {
    let k = "";
    for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      if (cc.f[f][r][q] === 99 || cc.f[f][r][q] === 98) k += f + "," + r + "," + q + ":" + cc.f[f][r][q] + ";";
    }
    // centers
    for (let f = 0; f < 6; f++) for (let r = 1; r <= 2; r++) for (let q = 1; q <= 2; q++) {
      k += cc.f[f][r][q];
    }
    return k;
  }
  visited.add(key(start));
  let iter = 0;
  while (queue.length > 0 && iter < 200000) {
    iter++;
    const { c: cur, mv } = queue.shift();
    if (mv.length >= 7) continue;
    for (const m of SEARCH_MOVES) {
      const nxt = cloneCube(cur);
      applyMove(nxt, m);
      if (isPaired(nxt) && centersSolved(nxt)) {
        console.log("KETEMU:", mv.concat([m]).join(" "), "iter", iter);
        return mv.concat([m]);
      }
      const k = key(nxt);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ c: nxt, mv: mv.concat([m]) });
      }
    }
  }
  console.log("tidak ketemu, iter", iter);
  return null;
}

if (require.main === module) search();
module.exports = { search };
