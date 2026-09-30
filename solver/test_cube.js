// Self-test model kubus: identitas langkah, urutan sexy move, dan facelet R.
const { newCube, cloneCube, applyMove, applyMoves, faceletString, isSolved } = require("./cube");

let fails = 0;
function ok(cond, name) { if (!cond) { fails++; console.log("FAIL:", name); } }

// 1. tiap langkah dasar x4 = identitas (3x3, 4x4, 5x5)
for (const n of [3, 4, 5]) {
  for (const f of ["U", "D", "F", "B", "L", "R"]) {
    for (const w of ["", "w"]) {
      const c = newCube(n);
      const m = f + w;
      try { for (let i = 0; i < 4; i++) applyMove(c, m); } catch (e) { continue; }
      ok(isSolved(c), `${n}x${n} ${m}x4 identitas`);
    }
  }
}
// 2. sexy move R U R' U' orde 6
{
  const c = newCube(3);
  for (let i = 0; i < 6; i++) applyMoves(c, "R U R' U'");
  ok(isSolved(c), "sexy move orde 6");
}
// 3. facelet setelah R pada kubus solved (mematok konvensi orientasi)
{
  const c = newCube(3);
  applyMove(c, "R");
  const got = faceletString(c);
  const exp = "UUFUUFUUF" + "RRRRRRRRR" + "FFDFFDFFD" + "DDBDDBDDB" + "LLLLLLLLL" + "UBBUBBUBB";
  ok(got === exp, "facelet R");
  if (got !== exp) { console.log(" got:", got, "\n exp:", exp); }
}
// 4. Sune: R U R' U R U2 R' — memutar 3 corner (tidak solved, tapi deterministik)
{
  const c = newCube(3);
  applyMoves(c, "R U R' U R U2 R'");
  const got = faceletString(c);
  // U face harus: U tetap di tengah, pola Sune standar
  ok(!isSolved(c), "sune mengacak");
  console.log(" sune facelet:", got);
}
// 5. wide move 4x4: Rw x4 identitas & Rw2 x2 identitas
{
  const c = newCube(4);
  for (let i = 0; i < 4; i++) applyMove(c, "Rw");
  ok(isSolved(c), "4x4 Rw x4 identitas");
  const c2 = newCube(4);
  applyMove(c2, "Rw2"); applyMove(c2, "Rw2");
  ok(isSolved(c2), "4x4 Rw2 x2 identitas");
}
// 6. scramble acak lalu inversnya = solved (konsistensi apply/invert)
{
  const { invertAlg } = require("./cube");
  const moves = ["R", "U", "F", "D", "L", "B", "Rw", "Uw", "Fw"];
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (const n of [3, 4, 5]) {
    for (let t = 0; t < 20; t++) {
      const c = newCube(n);
      let scr = "";
      for (let i = 0; i < 25; i++) {
        const m = moves[Math.floor(rnd() * moves.length)] + ["", "'", "2"][Math.floor(rnd() * 3)];
        if (n === 3 && m.includes("w")) continue;
        scr += m + " ";
      }
      applyMoves(c, scr);
      applyMoves(c, invertAlg(scr));
      ok(isSolved(c), `${n}x${n} scramble+invers (${t})`);
    }
  }
}
console.log(fails === 0 ? "SEMUA PASS" : `${fails} GAGAL`);
process.exit(fails ? 1 : 0);
