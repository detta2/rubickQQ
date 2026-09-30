// test_model.js — verifikasi model 5x5 (pakai ulang ../solver/cube.js generik).
const { newCube, applyMove, applyMoves, invertAlg, isSolved, faceletString } = require("../solver/cube");

let fails = 0;
function ok(cond, name) { if (!cond) { fails++; console.log("FAIL:", name); } else console.log("ok:", name); }

// 1. tiap langkah dasar x4 = identitas (5x5)
for (const f of ["U", "D", "F", "B", "L", "R"]) {
  for (const w of ["", "w"]) {
    const c = newCube(5);
    for (let i = 0; i < 4; i++) applyMove(c, f + w);
    ok(isSolved(c), `5x5 ${f + w} x4 identitas`);
  }
}
// 2. scramble acak + invers = solved (deterministik seed)
{
  const moves = ["R", "U", "F", "D", "L", "B", "Rw", "Uw", "Fw", "Lw", "Dw", "Bw"];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let t = 0; t < 20; t++) {
    const c = newCube(5);
    let scr = "";
    for (let i = 0; i < 40; i++) {
      const m = moves[Math.floor(rnd() * moves.length)] + ["", "'", "2"][Math.floor(rnd() * 3)];
      scr += m + " ";
    }
    applyMoves(c, scr);
    const scrambled = !isSolved(c);
    applyMoves(c, invertAlg(scr));
    ok(scrambled && isSolved(c), `5x5 scramble+invers #${t}`);
  }
}
// 3. facelet R pada 5x5 solved (sanity orientasi, bandingkan pola dengan 3x3)
{
  const c = newCube(5);
  applyMove(c, "R");
  const s = faceletString(c);
  ok(s.length === 150, "facelet 5x5 panjang 150");
  // R face tetap semua R
  ok(s.slice(25, 50) === "R".repeat(25), "face R tetap monokromatik setelah R");
  // U face: kolom kanan (3 kolom terakhir tiap baris... cek pola kolom)
  console.log("  U face setelah R:", s.slice(0, 25));
}
// 4. Rw pada 5x5: 2 lapis kanan ikut berputar, kolom 3-4 U berubah
{
  const c = newCube(5);
  applyMove(c, "Rw");
  const s = faceletString(c);
  ok(!isSolved(c), "Rw mengacak");
  const c2 = newCube(5);
  for (let i = 0; i < 4; i++) applyMove(c2, "Rw");
  ok(isSolved(c2), "Rw x4 identitas");
}
console.log(fails === 0 ? "SEMUA PASS" : `${fails} GAGAL`);
process.exit(fails ? 1 : 0);
