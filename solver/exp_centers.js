// Eksperimen: bisakah centers 4x4 diselesaikan dengan greedy + random restart?
// Heuristik: tiap warna harus mengumpul di satu face.
const { newCube, applyMove, applyMoves, isSolved } = require("./cube");

const MOVES36 = [];
for (const f of ["U", "D", "F", "B", "L", "R"])
  for (const w of ["", "w"]) for (const s of ["", "'", "2"]) MOVES36.push(f + w + s);

function centerPositions(n) {
  const pos = [];
  for (let f = 0; f < 6; f++)
    for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) pos.push([f, r, c]);
  return pos;
}
// h = 0 jika tiap face monokromatik
function hCenters(c) {
  const n = c.n;
  let bad = 0;
  for (let f = 0; f < 6; f++) {
    const cnt = {};
    for (let r = 1; r < n - 1; r++) for (let col = 1; col < n - 1; col++)
      cnt[c.f[f][r][col]] = (cnt[c.f[f][r][col]] || 0) + 1;
    const mx = Math.max(...Object.values(cnt));
    bad += (n - 2) * (n - 2) - mx;
  }
  return bad;
}

function greedyCenters(c, maxSteps) {
  const sol = [];
  let h = hCenters(c);
  let steps = 0;
  while (h > 0 && steps < maxSteps) {
    let best = null, bestH = h;
    // acak urutan move biar tidak deterministik mentok
    const order = MOVES36.slice().sort(() => Math.random() - 0.5);
    for (const m of order) {
      applyMove(c, m);
      const hh = hCenters(c);
      applyMove(c, invert(m));
      if (hh < bestH) { bestH = hh; best = m; if (hh === 0) break; }
    }
    if (best) { applyMove(c, best); sol.push(best); h = bestH; }
    else {
      // plateau: jalan acak 3 langkah
      for (let i = 0; i < 3; i++) {
        const m = MOVES36[Math.floor(Math.random() * MOVES36.length)];
        applyMove(c, m); sol.push(m);
      }
      h = hCenters(c);
    }
    steps++;
  }
  return h === 0 ? sol : null;
}
function invert(m) {
  const p = require("./cube").parseMove(m);
  return p.face + (p.depth === 2 ? "w" : "") + (p.turns === 1 ? "'" : p.turns === 3 ? "" : "2");
}

// uji: 30 scramble acak 4x4
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let okCount = 0, totLen = 0;
for (let t = 0; t < 30; t++) {
  const c = newCube(4);
  let scr = "";
  for (let i = 0; i < 40; i++) scr += MOVES36[Math.floor(rnd() * MOVES36.length)] + " ";
  applyMoves(c, scr);
  const c2 = JSON.parse(JSON.stringify(c.f));
  const sol = greedyCenters(c, 400);
  if (sol && hCenters(c) === 0) { okCount++; totLen += sol.length; }
  else console.log("  gagal pada scramble", t);
}
console.log(`greedy centers: ${okCount}/30 solved, rata2 ${okCount ? (totLen / okCount).toFixed(1) : "-"} langkah`);
