# rubickQQ 🧊

Solver Rubik 3×3 dan 4×4 berbasis web — 100% client-side, tanpa server, tanpa database.

**Live demo:** https://detta2.github.io/rubickQQ/

Cat warna langsung di kubus 3D, tekan solve, ikuti langkahnya. Sesederhana itu.

## ✨ Fitur

- **Kubus 3D interaktif** — putar layer dengan drag, cat stiker langsung di kubus
- **Solver 3×3** — algoritma Kociemba two-phase, solusi optimal ~20 langkah
- **Solver 4×4** — metode reduction: centers → edge pairing → parity fix → Kociemba
  - Verifikasi internal otomatis + retry kombinasi parity
  - Optimasi langkah (buang gerakan redundan seperti `R R'`)
- **Panel solusi ala tutorial** — instruksi Bahasa Indonesia per langkah, tombol Back/Next, autoplay
- **Undo** — batalkan cat warna atau putaran terakhir
- **Shuffle** — acak kubus dengan 25 langkah
- **100% offline-capable** — semua komputasi jalan di browser

## 🚀 Cara Pakai

1. Buka https://detta2.github.io/rubickQQ/
2. Pilih tab **3×3** atau **4×4**
3. Pilih warna dari palet, ketuk stiker di kubus untuk mewarnai — atau tekan **shuffle** untuk acak otomatis
4. Tekan **solve** — ikuti langkahnya sampai selesai

## 🛠️ Teknologi

- [Three.js](https://threejs.org/) — render kubus 3D
- [cube.js](https://github.com/lorentey/cubejs) — solver Kociemba two-phase untuk 3×3
- Vanilla JS + HTML/CSS — tanpa framework, tanpa build step

### Cara kerja solver 4×4

1. **Centers** — selesaikan 4 stiker tengah tiap sisi (24 pieces)
2. **Edge pairing** — pasangkan 12 pasang wing jadi dedge utuh
3. **Parity** — perbaiki OLL parity & PLL parity khas 4×4
4. **3×3 stage** — reduksi jadi kubus 3×3, selesaikan dengan Kociemba

Setiap solusi diverifikasi secara programatik sebelum ditampilkan — kalau langkahnya tidak benar-benar menyelesaikan kubus, solver mencoba ulang otomatis.

## 📁 Struktur

```
├── index.html          # Halaman utama
├── app.js             # Engine kubus 3×3 (Three.js + logika)
├── app4.js            # Engine kubus 4×4
├── solver4/
│   └── solver4.js     # Solver 4×4 (reduction method)
└── cubejs/            # Library Kociemba two-phase (3×3)
```

## 📄 Lisensi

MIT — bebas dipakai, dimodifikasi, dan disebarluaskan.
