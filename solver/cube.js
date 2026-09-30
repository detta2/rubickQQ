// Model kubus NxN generik untuk rubickQQ solver.
// Representasi: 6 face, masing2 matriks N x N berisi warna (int).
// Face: 0=U, 1=R, 2=F, 3=D, 4=L, 5=B
// Warna solved: U=putih(0), R=merah(1), F=hijau(2), D=kuning(3), L=oranye(4), B=biru(5)
//
// Langkah diaplikasikan lewat koordinat 3D: tiap stiker punya posisi (x,y,z)
// dengan 0..N-1 per sumbu. Face turn = rotasi 90 derajat slice yang sesuai.
// Konvensi arah: "R" = searah jarum jam dilihat dari sisi R (standar kubus).

const FACES = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
const FACE_NAMES = ["U", "R", "F", "D", "L", "B"];

// Untuk tiap face: sumbu normal, arah rotasi +90deg (right-hand rule) untuk
// gerakan SEARAH jarum jam dilihat dari luar face tersebut, dan slice mana yg kena.
const FACE_DEF = {
  U: { axis: "y", layer: (n, d) => (v) => v >= n - d, cwSign: -1 }, // cw dari atas = -90 ttg +y
  D: { axis: "y", layer: (n, d) => (v) => v < d,      cwSign: +1 }, // cw dari bawah = +90 ttg +y
  R: { axis: "x", layer: (n, d) => (v) => v >= n - d, cwSign: -1 }, // cw dari kanan = -90 ttg +x
  L: { axis: "x", layer: (n, d) => (v) => v < d,      cwSign: +1 }, // cw dari kiri  = +90 ttg +x
  F: { axis: "z", layer: (n, d) => (v) => v >= n - d, cwSign: -1 }, // cw dari depan = -90 ttg +z
  B: { axis: "z", layer: (n, d) => (v) => v < d,      cwSign: +1 }, // cw dari belakang = +90 ttg +z
};

function newCube(n, fill) {
  const c = { n, f: [] };
  for (let k = 0; k < 6; k++) {
    const m = [];
    for (let r = 0; r < n; r++) { m.push(new Array(n).fill(fill !== undefined ? fill : k)); }
    c.f.push(m);
  }
  return c;
}
function cloneCube(c) {
  const n = c.n, o = { n, f: [] };
  for (let k = 0; k < 6; k++) o.f.push(c.f[k].map((row) => row.slice()));
  return o;
}

// index (face,row,col) -> koordinat 3D (x,y,z), 0..n-1.
// Orientasi: U dilihat dari atas dengan B di atas; F/R/B/L dilihat dari depan
// dengan U di atas; D dilihat dari bawah dengan F di atas.
function rc2xyz(face, r, col, n) {
  switch (face) {
    case 0: return [col, n - 1, r];            // U: row0 = sisi B
    case 3: return [col, 0, n - 1 - r];        // D: row0 = sisi F
    case 2: return [col, n - 1 - r, n - 1];    // F
    case 1: return [n - 1, n - 1 - r, n - 1 - col]; // R: col0 = sisi B
    case 5: return [n - 1 - col, n - 1 - r, 0];     // B: col0 = sisi R
    case 4: return [0, n - 1 - r, col];        // L: col0 = sisi F
  }
}
function xyz2rc(face, x, y, z, n) {
  switch (face) {
    case 0: return [z, x];
    case 3: return [n - 1 - z, x];
    case 2: return [n - 1 - y, x];
    case 1: return [n - 1 - y, n - 1 - z];
    case 5: return [n - 1 - y, n - 1 - x];
    case 4: return [n - 1 - y, z];
  }
}
// normal face (nx,ny,nz) dirotasi bersama posisi
function faceNormal(face) {
  return [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]][face];
}
function normal2face(nx, ny, nz) {
  if (nx === 1) return 1; if (nx === -1) return 4;
  if (ny === 1) return 0; if (ny === -1) return 3;
  if (nz === 1) return 2; return 5;
}
// rotasi +90deg (right-hand rule) terhadap sumbu, dalam koordinat 0..n-1
function rotPlus(axis, x, y, z, n) {
  const c = (n - 1) / 2;
  let X = x - c, Y = y - c, Z = z - c, R;
  if (axis === "x") R = [X, -Z, Y];
  else if (axis === "y") R = [Z, Y, -X];
  else R = [-Y, X, Z];
  return [Math.round(R[0] + c), Math.round(R[1] + c), Math.round(R[2] + c)];
}
// rotasi vektor arah (normal) — murni, tanpa translasi
function rotVecPlus(axis, nx, ny, nz) {
  if (axis === "x") return [nx, -nz, ny];
  if (axis === "y") return [nz, ny, -nx];
  return [-ny, nx, nz];
}

// moveStr: "R", "R'", "R2", "Rw", "Rw'", "Rw2" (w = 2 lapis)
// Mengembalikan {face, depth, turns} turns: 1=cw, 2=180, 3=ccw
function parseMove(s) {
  const m = /^([URFDLB])(w?)(['2]?)$/.exec(s);
  if (!m) throw new Error("langkah tidak dikenal: " + s);
  return {
    face: m[1],
    depth: m[2] ? 2 : 1,
    turns: m[3] === "'" ? 3 : m[3] === "2" ? 2 : 1,
  };
}

function applyMove(c, moveStr) {
  const { face, depth, turns } = parseMove(moveStr);
  const n = c.n, def = FACE_DEF[face];
  const effTurns = def.cwSign === 1 ? turns : (4 - turns) % 4; // samakan ke rotasi +90
  for (let t = 0; t < effTurns; t++) {
    const nf = [];
    for (let k = 0; k < 6; k++) nf.push(c.f[k].map((row) => row.slice()));
    const inLayer = def.layer(n, depth);
    for (let f = 0; f < 6; f++)
      for (let r = 0; r < n; r++)
        for (let col = 0; col < n; col++) {
          let [x, y, z] = rc2xyz(f, r, col, n);
          const coord = def.axis === "x" ? x : def.axis === "y" ? y : z;
          if (!inLayer(coord)) continue;
          let [nx, ny, nz] = faceNormal(f);
          [x, y, z] = rotPlus(def.axis, x, y, z, n);
          [nx, ny, nz] = rotVecPlus(def.axis, nx, ny, nz);
          const nf2 = normal2face(nx, ny, nz);
          const [rr, cc] = xyz2rc(nf2, x, y, z, n);
          nf[nf2][rr][cc] = c.f[f][r][col];
        }
    c.f = nf;
  }
  return c;
}
function applyMoves(c, str) {
  for (const s of str.trim().split(/\s+/)) if (s) applyMove(c, s);
  return c;
}
function invertMove(s) {
  const p = parseMove(s);
  const inv = p.turns === 1 ? "'" : p.turns === 3 ? "" : "2";
  return p.face + (p.depth === 2 ? "w" : "") + inv;
}
function invertAlg(str) {
  return str.trim().split(/\s+/).filter(Boolean).reverse().map(invertMove).join(" ");
}
function isSolved(c) {
  for (let f = 0; f < 6; f++) {
    const v = c.f[f][0][0];
    for (let r = 0; r < c.n; r++) for (let col = 0; col < c.n; col++)
      if (c.f[f][r][col] !== v) return false;
  }
  return true;
}
// string 54 facelet urutan U,R,F,D,L,B, per face baris per baris (untuk Kociemba 3x3)
const COLOR_LETTER = ["U", "R", "F", "D", "L", "B"];
function faceletString(c) {
  let s = "";
  for (let f = 0; f < 6; f++) for (let r = 0; r < c.n; r++) for (let col = 0; col < c.n; col++)
    s += COLOR_LETTER[c.f[f][r][col]];
  return s;
}
function countMoves(str) { return str.trim().split(/\s+/).filter(Boolean).length; }

module.exports = {
  FACES, FACE_NAMES, newCube, cloneCube, parseMove, applyMove, applyMoves,
  invertMove, invertAlg, isSolved, faceletString, countMoves,
};
