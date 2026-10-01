# Blueprint Solver 5x5 rubickQQ — Karya Orisinal Kita

## Visi
rubickQQ bukan sekadar "solver yang nempel engine orang". Targetnya: solver 5x5 yang kodenya 100% kita tulis sendiri, jalan enteng di HP, dengan visual 3D yang nggak dimiliki solver lain.

## Posisi Sekarang
- 3x3: DONE (Kociemba + 3D playback Three.js, live)
- 4x4: PAUSED (centers ok, edge pairing mentok 10/12)
- 5x5: BELUM MULAI (file riset partial di solver5x5/)

## Tiga Pendekatan (pilih satu)

### Opsi A: Reduction Murni — Derive Sendiri Semua
Bangun dari nol: model 5x5 → center solver (algoritma kita derive sendiri) → edge pairing triple (sequence kita temukan sendiri) → Kociemba untuk stage 3x3.
- **Plus:** Paling orisinal. Setiap sequence didokumentasikan sebagai karya kita. Bisa dipublish sebagai repo standalone yang dibanggakan.
- **Minus:** Paling lama. Edge pairing triple adalah problem tersulit — butuh riset berminggu-minggu. Risiko mentok seperti 4x4 kemarin.
- **Orisinalitas:** ⭐⭐⭐⭐⭐

### Opsi B: Hybrid Cerdas — Fokus ke Yang Unik
Pakai konsep reduction yang public knowledge untuk kerangka, tapi inovasi di tiga titik:
1. **Center solver** kita derive sendiri (lebih gampang dari edge pairing)
2. **Edge pairing** pakai pendekatan "smart brute force": search dangkal (depth 6-8) dengan pruning, bukan sequence hafalan — ini justru lebih orisinal karena adaptif, bukan textbook
3. **3D visual solver** — animasi 3D tiap tahap (centers ngebentuk, edges kepair) — ini yang nggak ada di solver manapun
- **Plus:** Lebih cepat jadi. Bagian "cerdas"-nya (search adaptif + visual 3D) justru lebih unik dari sequence hafalan.
- **Minus:** Edge pairing via search bisa lambat di HP kentang untuk kasus sulit.
- **Orisinalitas:** ⭐⭐⭐⭐

### Opsi C: 3x3 Dulu Sampai Sempurna, 5x5 Menyusul
Tunda 5x5. Fokus bikin 3x3 jadi solver 3x3 terbaik di kelasnya: pattern mode, timer speedcubing, tutorial interaktif, share solusi via link. 5x5 dikerjain setelah 3x3 solid.
- **Plus:** Hasil langsung kerasa. 3x3 yang bagus > 5x5 yang setengah jadi.
- **Minus:** 5x5 mundur jauh. Nggak jawab tantangan "karya orisinal" dalam waktu dekat.
- **Orisinalitas:** ⭐⭐⭐ (di fitur, bukan algoritma)

## Rekomendasi Saya: Opsi B
Alasannya:
1. **Search adaptif untuk edge pairing** itu justru lebih "AI" dan lebih orisinal daripada ngapalin sequence dari buku. Kita bikin solver yang *mikir*, bukan yang *ngapalin*.
2. **3D visual per tahap** bikin rubickQQ beda dari semua solver 5x5 yang ada (grubiks, cube-solver — semuanya 2D atau 3D statis).
3. Realistis selesai dalam waktu masuk akal, nggak mentok berminggu-minggu.

## Arsitektur Opsi B (jika dipilih)

```
Input (scan/manual)
  → Model 5x5 (kode kita, 150 stickers)
  → Phase 1: Centers (algoritma derive sendiri, 8 movable per face)
  → Phase 2: Edges (smart search depth 6-8 + pruning, pairing triple adaptif)
  → Phase 3: 3x3 (Kociemba existing)
  → Output: daftar langkah + animasi 3D per phase
```

File:
- `solver5x5/cube5.js` — model (dari nol)
- `solver5x5/centers.js` — center solver (derive sendiri)
- `solver5x5/edges.js` — smart search pairing (inovasi kita)
- `solver5x5/ALGORITMA.md` — dokumentasi setiap temuan (bukti orisinalitas)
- Integrasi ke app.js + Three.js untuk visual 3D per tahap

## Keputusan di Tangan Detta
Pilih A, B, atau C — atau campur. Saya jalanin yang kamu pilih.
