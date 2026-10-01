# HANDOFF 5x5 — new session start here (2026-10-01)

## Status
- 3x3 + 4x4 LIVE di https://detta2.github.io/rubickQQ/ — jangan utak-atik.
- 5x5 centers: SOLVED, 500/500 scramble PASS (`solver5.js` → `solveCenters5`). JANGAN ubah.
- 5x5 edges: **piece-by-piece solver 20/20 PASS**, tapi MERUSAK centers.

## Files penting
- `solver5.js` — engine 5x5 (move perms, solveCenters5, pairFirst85 = 8-edge slice-join 10/10).
- `archive/edgesolve5.js` — full edge solver: middles dulu (wing-preserving), lalu wings (middle-preserving).
  Exports: `solveOrbitWithParity`, `midTriple`, `wingTriple`, `MIDSLOTS`, `WINGSLOTS`, `midIdx`, `wingIdx`, `SLOT_PAIRS`, `edgeIdAt`, `EDGE_OF`, `findTriple`, `invSeq`.
- `archive/test_r.js` — test harness (20/20 PASS).
- `data/edge_perms.json` (16K) — permutasi 36 edge slot per move.
- `data/longcomm_wing.json` (41K) — 486 wing 3-cycles (100% coverage, preserve middles).
- `data/nocenter_mid.json` (2.7K) — 36 middle 3-cycles (100% coverage, preserve wings).
- `macro5.json`, `macro5d.json`, `macro5e.json` — center macros (existing).

## Breakthrough: parity fix (odd generators)
- `'M'` = single-move 4-cycle pada MIDDLES, preserve wings (odd perm → parity fix middles).
- `'r'` = single-move 4-cycle pada WINGS, preserve middles (odd perm → parity fix wings).
- Pola: coba `solveOrbit`, kalau gagal (odd permutation) → apply parity move sekali → retry.
  Komposisi odd∘odd = even → solvable oleh 3-cycles. Ini yang bawa 20/20 PASS.

## BLOCKER: coupling centers ↔ edges (matematis, bukan bug)
- Pure center 3-cycle yang preserve edges: **TIDAK EKSIS** (0/200.000 tries). Hanya 3+3 (10 ditemukan).
- Pure edge 3-cycle yang preserve centers: **TIDAK EKSIS** (0/300.000 tries).
- Artinya: setelah edges solved, centers tidak bisa di-fix dengan 3-cycle murni tanpa ganggu edges.

## Update 2026-10-01 09:30 — Inverted approach BERHASIL (partial)

### Breakthrough: edge-preserving center 3-cycles ADA!
Konstruksi: M = C · (B C⁻¹ B⁻¹), di mana C = base center commutator, B = sekuens yang
**mensentralisasi** edge-action C (B·PE = PE·B). Maka edge-action M = identity.
Syarat: B TIDAK boleh mensentralisasi center-action C (kalau tidak M trivial).

Ditemukan via random search:
- C3 (cross-center, edge 3-cycle): B=['Rw',"D'","R'",'M'] → single 3-cycle centers, id edges.
- C1 (X-center, edge 3+3): B=['F',"D'",'Dw',"F'"] → single 3-cycle centers, id edges.
- Total: 21 base cycles (12 cross, 9 X), tersimpan di `ep/ep_cycles.json`.

### Modul baru: `ep/centers_ep.js`
- `solveCentersEP(state)`: insertion solver pakai edge-preserving 3-cycles.
- Triple map: 24.288 entries = 100% coverage same-orbit triples (2×12.144).
- **20/20 PASS**: scramble → edges (edgesolve5) → centersEP → centers solved + edges preserved.

### Temuan penting: wing orientation
- `edgesolve5.js` wing solver hanya cek COLORS, tidak orientasi → 6/24 wings flipped.
- Fix: gunakan orientation-aware `isCorrect` (cek kedua sticker di posisi benar).
  Dengan ini, wing solver mencapai 0/24 bad wings (verified).
- File: lihat `/tmp/test_orient.js` untuk contoh (belum diintegrasikan ke archive).

### Blocker tersisa: final 3x3 stage
- Setelah edges+centers solved, 3x3 (cubejs) memecah wings karena wings di-solve ABSOLUT,
  bukan di-pair. Outer moves 3x3 menggerakkan wings ke posisi salah (12/24 bad after 3x3).
- Solusi butuh: corners-only solver (preserve edges+centers), atau edge pairing (bukan absolut).
- Pure corner 3-cycle preserve edges+centers: tidak ditemukan via simple commutator.

### File baru
- `ep/centers_ep.js` — edge-preserving center solver.
- `ep/ep_cycles.json` — 21 base cycles.

## Pendekatan yang masih terbuka (belum dicoba / belum berhasil)
1. **Inverted approach (partial BERHASIL):** edges + centersEP = 20/20. Tersisa 3x3/corner stage.
2. **Layer-by-layer:** belum pernah dicoba sama sekali untuk 5x5.
3. Kociemba Phase 5 (softcube): horizontal 8/8 works, vertical stuck di bad=2-4. Mungkin bisa
   dilanjutkan tapi butuh tabel besar (~3GB) → tidak feasible client-side.

## 20+ pendekatan yang SUDAH GAGAL (jangan ulangi)
SFS+konjugat (invarian partisi A/B), J Perm slice-join (storage deadlock), middle-first
(E-slice hancur u/d), super-piece wing-pair (FALSE, <1/4 eksis), 10+2 (FALSE),
SFS preservation (tiap varian pecah 1 tredge), Kociemba Phase 5 endgame vertical.

## Konteks user
- detta, Bahasa Indonesia santai, "Revisi aja jgn diliatin" (kerja diam, lapor hasil).
- Cost-sensitive: komplain 100M token. Bound research loop, tawarkan stop sebelum burn.
- UI rubickQQ = TERANG saja. Bump `?v=N` tiap push visual.

## Update 2026-10-01 (sesi solver 5x5) — CORNER SOLVER BERHASIL!

### Breakthrough: corners-only solver (preserve edges+centers)
**Status: SELESAI & TERVERIFIKASI.**

Setelah edges+centers solved, tersisa 8 corners. Solver ini memecahkan corners TANPA mengganggu edges/centers yang sudah solved.

**File baru di `ep/`:**
- `corner_model.js` — model corner (permutasi + orientasi) dari engine 3D. Slot-based `{P:[8], T:[8]}`. Terverifikasi: R⁴=id, seq+invers=id 20/20, model-vs-state 20/20.
- `clean336.json` — 336 clean corner 3-cycles (twist-free, pure: identitas di wings/middles/centers). Dibangun via:
  1. Search komutator `[X,Y]` → 192 pure twisted 3-cycles (`pure_twisted.json`).
  2. Pairing 2-term & 4-term untuk cancel twist → 72 clean (`clean_corner3.json`).
  3. BFS konjugasi + verifikasi → 184 clean.
  4. Fill via konjugasi + pairing per-triple → **336/336 (100%)**.
- `pure_twists.json` — 48 pure double-twists (identitas perm, twist 2 corners, pure di wings/middles/centers). Via pairing pureTwisted.
- `solve_corners_perm.js` — insertion solver permutasi corners pakai clean336. **200/200 PASS** (self-test random even perms).
- `solve_corners_orient.js` — solver orientasi corners pakai pure twists (buffer 0 untuk 1..6, (1,7) untuk 7). **200/200 PASS** (self-test random twists).
- `test_corner_integration.js` — **20/20 PASS**: scramble corners pakai clean cycles (preserve edges+centers by construction) → solve perm+orient → verifikasi full 5x5 SOLVED (edges+centers tetap solved).

**Cara kerja:**
1. Permutasi: insertion dengan clean 3-cycles (twist-free, jadi orientasi preserved). Tiap langkah solve 1 corner tanpa ganggu yang solved.
2. Orientasi: untuk tiap corner twisted, aplikasikan pure double-twist dengan buffer (corner 0, kecuali corner 7 pakai buffer 1). Total twist sum=0 → buffer otomatis solved di akhir.

### BLOCKER tersisa: wing ORIENTATION di edge pipeline
**Status: BELUM SELESAI.**

Edge solver (`archive/edgesolve5.js`) solve wings by POSITION (20/20 PASS), tapi meninggalkan ~6/24 wings FLIPPED (orientasi salah). Corner solver preserve wings, jadi wings harus PERFECT sebelum corners.

**Analisis:**
- Semua 12.144 wing 3-cycles di `wingTriple` me-flip TEPAT 3 wings yang digerakkan (verified 2000 sampel).
- Greedy orientation-aware solver (`ep/wing_solver_orient.js`) mencapai 22/24 lalu stuck di local optimum (2 wings mispositioned, paritas ganjil).
- Random search 50k untuk pure double wing flip: 0 ditemukan (probabilitas terlalu rendah).
- Pairing C·C⁻¹ = identitas (tidak memberi flip).

**Opsi ke depan:**
1. Cari pure wing double-flip via pairing 3-cycles dengan pola flip berbeda (seperti teknik corner: 4-term pairing).
2. Bangun model orientasi wing eksplisit + insertion orientation-aware (seperti corner_model).
3. Cari flip-free wing 3-cycles via komutator berbeda (semua yang ada flip 3).
4. Wing phase TERAKHIR (setelah corners) dengan wing cycles yang preserve corners (perlu search baru).

### File research (tidak untuk live)
- `ep/search_corner*.js`, `ep/pair_*.js`, `ep/build_*.js`, `ep/bfs_*.js`, `ep/fill_*.js`, `ep/find_twists.js` — script research corner solver.
- `ep/wing_solver_orient.js` — wing solver eksperimental (belum reliable).
- `ep/test_full*.js` — test pipeline penuh (blocked on wings).

### Kesimpulan
**Corner solver SELESAI dan terverifikasi 20/20.** Ini adalah blocker utama dari sesi sebelumnya ("final 3x3 stage"). Full 5x5 solver tinggal butuh wing orientation fix di edge pipeline.

## Update 2026-10-01 (sesi wing orientation) — WING SOLVER BERHASIL! 🎉

### Breakthrough: root cause flip model (gauge bug)
**Status: SELESAI & TERVERIFIKASI 20/20.**

**Root cause:** Model flip wing berbasis LABEL (`F` dari `permCyclesW`) adalah pure gauge — terbukti via eliminasi Gauss GF(2) pada 36.432 persamaan dari 12.144 triples: ada φ (`011010011010010110010110`) dengan `F = φ ^ φ∘P` untuk SEMUA 12.144 triples DAN 63 engine moves (0 violations). Dalam koordinat itu, `(id, F≠0)` mustahil secara matematis — inilah kenapa pencarian pure flips (50k–500k sampel, 3.3M disjoint commutators, DT-pairing) selalu nol.

**Fix:** Rebuild move table dengan TRUE engine flip: `F[w] = (c0 === pair[0][0] && c1 === pair[1][0]) ? 0 : 1` (color-vs-face, cocok dengan `readWings`). Model baru: `ep/wing_model.js` (sudah diupdate).

### File baru
- `ep/wing_model.js` — FIXED (TRUE color-based flip). Header comment diupdate.
- `ep/wing_doubleflips.json` — **276/276 pure double-flips** (opposite-direction pairs C1=(a b c), C2=(a c b) pada triple yang sama). Semua terverifikasi `(id, pair)` vs model. Distribusi flip-weight true 3-cycles: 0:2.246 / 2:9.884 / 4:2 / 6:12.
- `ep/solve_wings_full.js` — **modul solver wing lengkap** (positions + orientations):
  - Positions: 3-cycle insertion pakai 12.144 wing triples (middle-preserving). Endgame 2-case ditangani via parity fix.
  - Parity: `'r'` (4-cycle, odd) jika P ganjil. Preserves middles.
  - Orientations: pairing flipped wings → pure double-flips dari `wing_doubleflips.json`.
  - **20/20 PASS** (model + engine verified).

### Cara pakai
```js
const {solveWings} = require('./ep/solve_wings_full.js');
// (P,F) dari WM.seqWing(moveList) — P[w]=slot of w, F[w]=flip
const moves = solveWings(P, F); // null jika gagal
```

### Integrasi pipeline
Urutan: middles (E.solveOrbit) → wings (solveWings) → centersEP → corners.
- Wing solver preserve middles (triples dari 12.144 + 'r' + double-flips semua middle-preserving). Terverifikasi.
- Corner solver preserve wings (positions DAN orientations). Terverifikasi.

### Blocker tersisa: centersEP
`ep/centers_ep.js` `solveCentersEP(state)` **tidak berfungsi** — mengembalikan ~900 moves tapi centers tidak berubah (terverifikasi pada fresh scramble maupun setelah wings). Perlu diperbaiki atau diganti. Ini blocker terakhir untuk full 5x5 pipeline.

### Kesimpulan
**Wing orientation SELESAI 20/20.** Full 5x5 solver tinggal butuh center solver yang berfungsi.
