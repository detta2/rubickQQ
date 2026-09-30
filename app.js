// app.js — rubickQQ 3x3
// State: 6 faces x 9 stickers, color indices 0-5 (U,R,F,D,L,B = white,red,green,yellow,orange,blue)

const COLORS = ['#ffffff', '#ff0000', '#00cc00', '#ffff00', '#ff8800', '#0000ff'];
const COLOR_NAMES = ['Putih', 'Merah', 'Hijau', 'Kuning', 'Oranye', 'Biru'];
const FACE_NAMES = ['PUTIH (atas)', 'MERAH (kanan)', 'HIJAU (depan)', 'KUNING (bawah)', 'ORANYE (kiri)', 'BIRU (belakang)'];
// Face order for cubejs: U,R,F,D,L,B

let cubeState = [];
let selectedColor = 0;
let currentScanFace = 0;
let solutionMoves = [];
let currentMoveIndex = 0;
let isPlaying = false;
let playTimer = null;

function initCubeState() {
  cubeState = [];
  for (let f = 0; f < 6; f++) {
    cubeState.push(new Array(9).fill(f)); // solved state
  }
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// Manual editor
function buildPalette() {
  const pal = document.getElementById('palette');
  pal.innerHTML = '';
  COLORS.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'color' + (i === selectedColor ? ' selected' : '');
    d.style.background = c;
    d.title = COLOR_NAMES[i];
    d.addEventListener('click', () => {
      selectedColor = i;
      buildPalette();
    });
    pal.appendChild(d);
  });
}

function buildNet() {
  const net = document.getElementById('net');
  net.innerHTML = '';
  // Layout:     [U]
  //         [L][F][R][B]
  //             [D]
  const layout = [
    [null, 0, null, null],
    [4, 2, 1, 5],
    [null, 3, null, null],
  ];
  layout.forEach(row => {
    row.forEach(f => {
      const cell = document.createElement('div');
      if (f === null) {
        cell.style.visibility = 'hidden';
      } else {
        cell.className = 'face-grid';
        for (let i = 0; i < 9; i++) {
          const s = document.createElement('div');
          s.className = 'sticker';
          s.style.background = COLORS[cubeState[f][i]];
          s.dataset.face = f;
          s.dataset.idx = i;
          s.addEventListener('click', () => {
            cubeState[f][i] = selectedColor;
            s.style.background = COLORS[selectedColor];
          });
          cell.appendChild(s);
        }
      }
      net.appendChild(cell);
    });
  });
}

document.getElementById('btn-reset-manual').addEventListener('click', () => {
  initCubeState();
  buildNet();
});

// Camera
let videoStream = null;
document.getElementById('btn-start-cam').addEventListener('click', async () => {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
    });
    const video = document.getElementById('video');
    video.srcObject = videoStream;
    drawOverlay();
  } catch (e) {
    alert('Kamera tidak bisa diakses: ' + e.message);
  }
});

function drawOverlay() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas-overlay');
  const ctx = canvas.getContext('2d');
  function loop() {
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const w = canvas.width, h = canvas.height;
      const size = Math.min(w, h) * 0.7;
      const x0 = (w - size) / 2, y0 = (h - size) / 2;
      const cell = size / 3;
      ctx.strokeStyle = '#f2b13d';
      ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.strokeRect(x0 + c * cell, y0 + r * cell, cell, cell);
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

document.getElementById('btn-capture').addEventListener('click', () => {
  const video = document.getElementById('video');
  if (!video.videoWidth) {
    alert('Nyalakan kamera dulu!');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const w = canvas.width, h = canvas.height;
  const size = Math.min(w, h) * 0.7;
  const x0 = (w - size) / 2, y0 = (h - size) / 2;
  const cell = size / 3;
  
  const faceColors = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      // Sample center of cell
      const sx = x0 + c * cell + cell / 2;
      const sy = y0 + r * cell + cell / 2;
      const data = ctx.getImageData(sx - 5, sy - 5, 10, 10).data;
      let rr = 0, gg = 0, bb = 0;
      for (let i = 0; i < data.length; i += 4) {
        rr += data[i]; gg += data[i+1]; bb += data[i+2];
      }
      const n = data.length / 4;
      rr /= n; gg /= n; bb /= n;
      faceColors.push(closestColor(rr, gg, bb));
    }
  }
  
  cubeState[currentScanFace] = faceColors;
  currentScanFace++;
  if (currentScanFace >= 6) {
    currentScanFace = 0;
    alert('Semua sisi sudah di-scan! Buka tab Solve.');
    document.querySelector('[data-tab="solve"]').click();
  } else {
    document.getElementById('face-name').textContent = FACE_NAMES[currentScanFace];
  }
  buildNet(); // update manual editor too
});

function closestColor(r, g, b) {
  // Simple RGB distance to 6 cube colors
  const targets = [
    [255,255,255], // white
    [255,0,0],     // red
    [0,200,0],     // green
    [255,255,0],   // yellow
    [255,136,0],   // orange
    [0,0,255],     // blue
  ];
  let best = 0, bestDist = Infinity;
  targets.forEach((t, i) => {
    const d = (r-t[0])**2 + (g-t[1])**2 + (b-t[2])**2;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

// Solver
document.getElementById('btn-solve').addEventListener('click', () => {
  try {
    // Cek apakah kubus sudah solved (setiap face 9 stiker = warna face)
    let isSolved = true;
    for (let f = 0; f < 6 && isSolved; f++) {
      for (let i = 0; i < 9; i++) {
        if (cubeState[f][i] !== f) { isSolved = false; break; }
      }
    }
    if (isSolved) {
      solutionMoves = [];
      const movesDiv = document.getElementById('moves');
      movesDiv.innerHTML = '<div style="color:#4caf50;font-weight:700;padding:12px">✅ Kubus sudah solved! Tidak ada langkah.</div>';
      document.getElementById('solution').style.display = 'block';
      currentMoveIndex = 0;
      return;
    }
    // Convert cubeState to facelet string (U,R,F,D,L,B order)
    const colorLetter = ['U', 'R', 'F', 'D', 'L', 'B'];
    let facelet = '';
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 9; i++) {
        facelet += colorLetter[cubeState[f][i]];
      }
    }
    Cube.initSolver();
    const cube = Cube.fromString(facelet);
    const solution = cube.solve();
    solutionMoves = solution.split(' ').filter(s => s);
    
    // Display
    const movesDiv = document.getElementById('moves');
    movesDiv.innerHTML = '';
    solutionMoves.forEach((m, i) => {
      const d = document.createElement('div');
      d.className = 'move';
      d.textContent = m;
      d.id = 'move-' + i;
      movesDiv.appendChild(d);
    });
    document.getElementById('solution').style.display = 'block';
    currentMoveIndex = 0;
    updateMoveHighlight();
    buildCube3D();
  } catch (e) {
    alert('Gagal solve: ' + e.message + '\nPastikan warna sudah benar (9 stiker per warna).');
  }
});

function updateMoveHighlight() {
  document.querySelectorAll('.move').forEach((d, i) => {
    d.classList.remove('done', 'current');
    if (i < currentMoveIndex) d.classList.add('done');
    if (i === currentMoveIndex) d.classList.add('current');
  });
}

// 3D Cube (simple CSS-based)
function buildCube3D() {
  // For now, just show a placeholder. Full 3D playback is complex.
  // We'll do a simple 2D net that updates with moves.
  const container = document.getElementById('cube3d');
  container.innerHTML = '<p style="text-align:center;color:#888">3D playback segera hadir<br>Gunakan daftar langkah di atas</p>';
}

document.getElementById('btn-next').addEventListener('click', () => {
  if (currentMoveIndex < solutionMoves.length) {
    currentMoveIndex++;
    updateMoveHighlight();
  }
});

document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentMoveIndex > 0) {
    currentMoveIndex--;
    updateMoveHighlight();
  }
});

document.getElementById('btn-play').addEventListener('click', () => {
  const btn = document.getElementById('btn-play');
  if (isPlaying) {
    clearInterval(playTimer);
    isPlaying = false;
    btn.textContent = '▶ Putar';
  } else {
    isPlaying = true;
    btn.textContent = '⏸ Jeda';
    playTimer = setInterval(() => {
      if (currentMoveIndex >= solutionMoves.length) {
        clearInterval(playTimer);
        isPlaying = false;
        btn.textContent = '▶ Putar';
      } else {
        currentMoveIndex++;
        updateMoveHighlight();
      }
    }, 800);
  }
});

// Init
initCubeState();
buildPalette();
buildNet();
