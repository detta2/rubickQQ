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

// 3D Cube with Three.js
let scene3d = null, camera3d = null, renderer3d = null, cubies3d = [];
let isAnimating3d = false;

function init3DScene() {
  const container = document.getElementById('cube3d');
  container.innerHTML = '';
  const w = 280, h = 280;
  scene3d = new THREE.Scene();
  scene3d.background = new THREE.Color(0x0f0f1a);
  camera3d = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  camera3d.position.set(4.5, 4, 5.5);
  camera3d.lookAt(0, 0, 0);
  renderer3d = new THREE.WebGLRenderer({ antialias: true });
  renderer3d.setSize(w, h);
  container.appendChild(renderer3d.domElement);
  // Lights
  scene3d.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(5, 10, 7);
  scene3d.add(dir);
  // Animation loop
  (function animate() {
    requestAnimationFrame(animate);
    if (renderer3d) renderer3d.render(scene3d, camera3d);
  })();
}

function getStickerColor(face, r, c) {
  return COLORS[cubeState[face][r*3 + c]];
}

function buildCube3D() {
  if (!scene3d) init3DScene();
  // Clear old cubies
  cubies3d.forEach(c => scene3d.remove(c));
  cubies3d = [];
  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  // For each cubie position (x,y,z in -1,0,1)
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const materials = [];
        // Order: +X, -X, +Y, -Y, +Z, -Z
        // +X (R face)
        if (x === 1) {
          const r = 1 - y, c = 1 - z;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(1, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        // -X (L face)
        if (x === -1) {
          const r = 1 - y, c = z + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(4, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        // +Y (U face)
        if (y === 1) {
          const r = z + 1, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(0, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        // -Y (D face)
        if (y === -1) {
          const r = 1 - z, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(3, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        // +Z (F face)
        if (z === 1) {
          const r = 1 - y, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(2, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        // -Z (B face)
        if (z === -1) {
          const r = 1 - y, c = 1 - x;
          materials.push(new THREE.MeshLambertMaterial({ color: getStickerColor(5, r, c) }));
        } else materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 }));
        const cubie = new THREE.Mesh(geo, materials);
        cubie.position.set(x, y, z);
        cubie.userData.home = { x, y, z };
        scene3d.add(cubie);
        cubies3d.push(cubie);
      }
    }
  }
}

function parseMove3d(move) {
  // Returns {axis: 'x'|'y'|'z', slice: -1|1, angle: radians}
  const face = move[0];
  const mod = move.slice(1); // '', "'", '2'
  let axis, slice, baseAngle;
  if (face === 'R') { axis = 'x'; slice = 1; baseAngle = -Math.PI/2; }
  else if (face === 'L') { axis = 'x'; slice = -1; baseAngle = Math.PI/2; }
  else if (face === 'U') { axis = 'y'; slice = 1; baseAngle = -Math.PI/2; }
  else if (face === 'D') { axis = 'y'; slice = -1; baseAngle = Math.PI/2; }
  else if (face === 'F') { axis = 'z'; slice = 1; baseAngle = -Math.PI/2; }
  else if (face === 'B') { axis = 'z'; slice = -1; baseAngle = Math.PI/2; }
  else return null;
  let angle = baseAngle;
  if (mod === "'") angle = -angle;
  else if (mod === '2') angle = Math.PI;
  return { axis, slice, angle };
}

function animateMove3d(move, callback) {
  if (isAnimating3d) { if (callback) callback(); return; }
  const p = parseMove3d(move);
  if (!p) { if (callback) callback(); return; }
  isAnimating3d = true;
  // Find cubies in slice
  const sliceCubies = cubies3d.filter(c => {
    const pos = c.position;
    if (p.axis === 'x') return Math.round(pos.x) === p.slice;
    if (p.axis === 'y') return Math.round(pos.y) === p.slice;
    return Math.round(pos.z) === p.slice;
  });
  // Create pivot group
  const pivot = new THREE.Group();
  scene3d.add(pivot);
  sliceCubies.forEach(c => pivot.attach(c));
  // Animate
  const duration = 300;
  const start = Date.now();
  const startRot = 0;
  (function step() {
    const t = Math.min((Date.now() - start) / duration, 1);
    const eased = t < 0.5 ? 2*t*t : -1 + (4-2*t)*t; // easeInOut
    const rot = startRot + p.angle * eased;
    pivot.rotation[p.axis] = rot;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // Detach, preserve transform
      const inv = new THREE.Matrix4().copy(pivot.matrix).invert();
      sliceCubies.forEach(c => {
        scene3d.attach(c);
        // Snap position to grid
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        // Snap rotation
        c.rotation.set(
          Math.round(c.rotation.x / (Math.PI/2)) * (Math.PI/2),
          Math.round(c.rotation.y / (Math.PI/2)) * (Math.PI/2),
          Math.round(c.rotation.z / (Math.PI/2)) * (Math.PI/2)
        );
      });
      scene3d.remove(pivot);
      isAnimating3d = false;
      if (callback) callback();
    }
  })();
}

document.getElementById('btn-next').addEventListener('click', () => {
  if (currentMoveIndex < solutionMoves.length && !isAnimating3d) {
    const move = solutionMoves[currentMoveIndex];
    animateMove3d(move, () => {
      currentMoveIndex++;
      updateMoveHighlight();
    });
  }
});

document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentMoveIndex > 0 && !isAnimating3d) {
    // For prev, we need to invert the last move
    currentMoveIndex--;
    const move = solutionMoves[currentMoveIndex];
    const inv = move.endsWith("'") ? move[0] : move.endsWith('2') ? move : move + "'";
    animateMove3d(inv, () => {
      updateMoveHighlight();
    });
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
    const stepPlay = () => {
      if (!isPlaying) return;
      if (currentMoveIndex >= solutionMoves.length) {
        isPlaying = false;
        btn.textContent = '▶ Putar';
        return;
      }
      const move = solutionMoves[currentMoveIndex];
      animateMove3d(move, () => {
        currentMoveIndex++;
        updateMoveHighlight();
        if (isPlaying) setTimeout(stepPlay, 200);
      });
    };
    stepPlay();
  }
});

// Init
initCubeState();
buildPalette();
buildNet();

// ===== LOGICAL MOVE APPLICATION (for paint mode turns) =====
function rotFaceCW(s){return [s[6],s[3],s[0],s[7],s[4],s[1],s[8],s[5],s[2]];}
function applyMoveToState(move){
  const face=move[0], mod=move.slice(1);
  let times=mod==="'"?3:mod==="2"?2:1;
  const fi={U:0,R:1,F:2,D:3,L:4,B:5}[face];
  if(fi===undefined)return;
  for(let t=0;t<times;t++){
    const s=cubeState.map(f=>[...f]);
    cubeState[fi]=rotFaceCW(s[fi]);
    if(face==='U'){
      const tmp=[s[2][0],s[2][1],s[2][2]];
      for(let i=0;i<3;i++){cubeState[2][i]=s[1][i];cubeState[1][i]=s[5][i];cubeState[5][i]=s[4][i];cubeState[4][i]=tmp[i];}
    }else if(face==='D'){
      const tmp=[s[2][6],s[2][7],s[2][8]];
      for(let i=0;i<3;i++){cubeState[2][6+i]=s[4][6+i];cubeState[4][6+i]=s[5][6+i];cubeState[5][6+i]=s[1][6+i];cubeState[1][6+i]=tmp[i];}
    }else if(face==='R'){
      const tmp=[s[0][2],s[0][5],s[0][8]];
      cubeState[0][2]=s[2][2];cubeState[0][5]=s[2][5];cubeState[0][8]=s[2][8];
      cubeState[2][2]=s[3][2];cubeState[2][5]=s[3][5];cubeState[2][8]=s[3][8];
      cubeState[3][2]=s[5][6];cubeState[3][5]=s[5][3];cubeState[3][8]=s[5][0];
      cubeState[5][6]=tmp[0];cubeState[5][3]=tmp[1];cubeState[5][0]=tmp[2];
    }else if(face==='L'){
      const tmp=[s[0][0],s[0][3],s[0][6]];
      cubeState[0][0]=s[5][8];cubeState[0][3]=s[5][5];cubeState[0][6]=s[5][2];
      cubeState[5][8]=s[3][0];cubeState[5][5]=s[3][3];cubeState[5][2]=s[3][6];
      cubeState[3][0]=s[2][0];cubeState[3][3]=s[2][3];cubeState[3][6]=s[2][6];
      cubeState[2][0]=tmp[0];cubeState[2][3]=tmp[1];cubeState[2][6]=tmp[2];
    }else if(face==='F'){
      const tmp=[s[0][6],s[0][7],s[0][8]];
      cubeState[0][6]=s[4][8];cubeState[0][7]=s[4][5];cubeState[0][8]=s[4][2];
      cubeState[4][8]=s[3][2];cubeState[4][5]=s[3][1];cubeState[4][2]=s[3][0];
      cubeState[3][2]=s[1][6];cubeState[3][1]=s[1][3];cubeState[3][0]=s[1][0];
      cubeState[1][6]=tmp[0];cubeState[1][3]=tmp[1];cubeState[1][0]=tmp[2];
    }else if(face==='B'){
      const tmp=[s[0][0],s[0][1],s[0][2]];
      cubeState[0][0]=s[1][2];cubeState[0][1]=s[1][5];cubeState[0][2]=s[1][8];
      cubeState[1][2]=s[3][8];cubeState[1][5]=s[3][7];cubeState[1][8]=s[3][6];
      cubeState[3][8]=s[4][6];cubeState[3][7]=s[4][3];cubeState[3][6]=s[4][0];
      cubeState[4][6]=tmp[0];cubeState[4][3]=tmp[1];cubeState[4][0]=tmp[2];
    }
  }
}

// ===== 3D PAINT MODE =====
let scenePaint = null, cameraPaint = null, rendererPaint = null;
let cubiesPaint = [];
let paintColor = 0;
let isDraggingPaint = false;
let dragStartPaint = null;

function initPaintScene() {
  const container = document.getElementById('cube3d-paint');
  if (!container) return;
  container.innerHTML = '';
  const w = container.clientWidth || 320, h = 300;
  scenePaint = new THREE.Scene();
  scenePaint.background = new THREE.Color(0x0f0f1a);
  cameraPaint = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  cameraPaint.position.set(4.5, 4, 5.5);
  cameraPaint.lookAt(0, 0, 0);
  rendererPaint = new THREE.WebGLRenderer({ antialias: true });
  rendererPaint.setSize(w, h);
  container.appendChild(rendererPaint.domElement);
  scenePaint.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(5, 10, 7);
  scenePaint.add(dir);
  (function animate() {
    requestAnimationFrame(animate);
    if (rendererPaint) rendererPaint.render(scenePaint, cameraPaint);
  })();
  // Touch/mouse for rotate vs tap
  const el = rendererPaint.domElement;
  el.addEventListener('pointerdown', e => {
    isDraggingPaint = false;
    dragStartPaint = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointermove', e => {
    if (!dragStartPaint) return;
    const dx = e.clientX - dragStartPaint.x, dy = e.clientY - dragStartPaint.y;
    if (Math.abs(dx) + Math.abs(dy) > 10) isDraggingPaint = true;
    if (isDraggingPaint) {
      // Rotate camera around cube
      const angle = dx * 0.01;
      const x = cameraPaint.position.x, z = cameraPaint.position.z;
      cameraPaint.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      cameraPaint.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      cameraPaint.position.y = Math.max(-8, Math.min(8, cameraPaint.position.y - dy * 0.02));
      cameraPaint.lookAt(0, 0, 0);
      dragStartPaint = { x: e.clientX, y: e.clientY };
    }
  });
  el.addEventListener('pointerup', e => {
    if (!isDraggingPaint && dragStartPaint) handlePaintTap(e);
    dragStartPaint = null;
  });
}

function getPaintStickerColor(face, r, c) {
  return COLORS[cubeState[face][r*3 + c]];
}

function buildPaintCube() {
  if (!scenePaint) initPaintScene();
  if (!scenePaint) return;
  cubiesPaint.forEach(c => scenePaint.remove(c));
  cubiesPaint = [];
  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const materials = [];
        const faceInfo = []; // per material index: {face, r, c} or null
        // +X (R=1)
        if (x === 1) {
          const r = 1 - y, c = 1 - z;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(1, r, c) }));
          faceInfo.push({ face: 1, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        // -X (L=4)
        if (x === -1) {
          const r = 1 - y, c = z + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(4, r, c) }));
          faceInfo.push({ face: 4, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        // +Y (U=0)
        if (y === 1) {
          const r = z + 1, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(0, r, c) }));
          faceInfo.push({ face: 0, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        // -Y (D=3)
        if (y === -1) {
          const r = 1 - z, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(3, r, c) }));
          faceInfo.push({ face: 3, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        // +Z (F=2)
        if (z === 1) {
          const r = 1 - y, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(2, r, c) }));
          faceInfo.push({ face: 2, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        // -Z (B=5)
        if (z === -1) {
          const r = 1 - y, c = 1 - x;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(5, r, c) }));
          faceInfo.push({ face: 5, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x111111 })); faceInfo.push(null); }
        const cubie = new THREE.Mesh(geo, materials);
        cubie.position.set(x, y, z);
        cubie.userData.faceInfo = faceInfo;
        scenePaint.add(cubie);
        cubiesPaint.push(cubie);
      }
    }
  }
}

function handlePaintTap(e) {
  const el = rendererPaint.domElement;
  const rect = el.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cameraPaint);
  const hits = raycaster.intersectObjects(cubiesPaint);
  if (hits.length === 0) return;
  const hit = hits[0];
  const matIndex = hit.face.materialIndex;
  const info = hit.object.userData.faceInfo[matIndex];
  if (!info) return;
  // Paint it
  cubeState[info.face][info.r * 3 + info.c] = paintColor;
  hit.object.material[matIndex].color.set(COLORS[paintColor]);
  // Also refresh 2D net
  buildNet();
}

function buildPaintPalette() {
  const pal = document.getElementById('palette3d');
  if (!pal) return;
  pal.innerHTML = '';
  COLORS.forEach((col, i) => {
    const d = document.createElement('div');
    d.style.cssText = `width:44px;height:44px;border-radius:50%;background:${col};cursor:pointer;border:3px solid ${i === paintColor ? '#f2b13d' : 'transparent'}`;
    d.title = COLOR_NAMES[i];
    d.addEventListener('click', () => {
      paintColor = i;
      buildPaintPalette();
    });
    pal.appendChild(d);
  });
}

// Turn buttons in paint mode
document.querySelectorAll('#turn-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    const move = btn.dataset.move;
    applyMoveToState(move);
    buildPaintCube(); // rebuild with new state (instant for now)
    buildNet(); // sync 2D net
  });
});

// Reset to plain white
document.getElementById('btn-reset-paint').addEventListener('click', () => {
  for (let f = 0; f < 6; f++) cubeState[f] = new Array(9).fill(0); // all white
  buildPaintCube();
  buildNet();
});

// Go to solve tab
document.getElementById('btn-paint-to-solve').addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="solve"]').classList.add('active');
  document.getElementById('panel-solve').classList.add('active');
});

// Init paint when tab opened
document.querySelector('[data-tab="paint3d"]').addEventListener('click', () => {
  setTimeout(() => { buildPaintPalette(); buildPaintCube(); }, 50);
});
