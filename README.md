# rubickQQ 🧊

A web-based Rubik's Cube solver for 3×3 and 4×4 — 100% client-side, no server, no database.

**Live demo:** https://detta2.github.io/rubickQQ/

Paint your cube directly on the 3D model, hit solve, and follow the steps. That's it.

## ✨ Features

- **Interactive 3D cube** — drag to turn layers, paint stickers directly on the cube
- **3×3 solver** — Kociemba two-phase algorithm, near-optimal ~20-move solutions
- **4×4 solver** — reduction method: centers → edge pairing → parity fix → Kociemba
  - Built-in solution verification with automatic parity retry
  - Move optimizer (eliminates redundancies like `R R'`)
- **Guided solution panel** — step-by-step instructions, Back/Next buttons, autoplay
- **Undo** — revert your last paint stroke or turn
- **Shuffle** — scramble with 25 random moves
- **Fully offline-capable** — all computation runs in the browser

## 🚀 Usage

1. Open https://detta2.github.io/rubickQQ/
2. Pick the **3×3** or **4×4** tab
3. Select a color from the palette and tap stickers to paint — or hit **shuffle** to scramble
4. Hit **solve** and follow the steps

## 🛠️ Tech

- [Three.js](https://threejs.org/) — 3D cube rendering
- [cube.js](https://github.com/lorentey/cubejs) — Kociemba two-phase solver for 3×3
- Vanilla JS + HTML/CSS — no framework, no build step

### How the 4×4 solver works

1. **Centers** — solve the 4 center stickers on each face (24 pieces)
2. **Edge pairing** — pair 12 wing pairs into complete dedges
3. **Parity** — fix 4×4-specific OLL and PLL parity cases
4. **3×3 stage** — reduce to a 3×3 and solve with Kociemba

Every solution is programmatically verified before display — if the moves don't actually solve the cube, the solver automatically retries with a different parity combination.

## 📁 Structure

```
├── index.html          # Main page
├── app.js             # 3×3 cube engine (Three.js + logic)
├── app4.js            # 4×4 cube engine
├── solver4/
│   └── solver4.js     # 4×4 solver (reduction method)
└── cubejs/            # Kociemba two-phase library (3×3)
```

## 📄 License

MIT — free to use, modify, and distribute.
