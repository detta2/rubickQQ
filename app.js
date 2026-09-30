// app.js — rubickQQ 3x3 (3D only)
// State: 6 faces x 9 stickers, color indices 0-5 (U,R,F,D,L,B = white,red,green,yellow,orange,blue)

const COLORS = ['#ffffff', '#ff0000', '#00cc00', '#ffff00', '#ff8800', '#0000ff'];
const COLOR_NAMES = ['Putih', 'Merah', 'Hijau', 'Kuning', 'Oranye', 'Biru'];
// Face order for cubejs: U,R,F,D,L,B

let cubeState = [];

function initCubeState() {
  cubeState = [];
  for (let f = 0; f < 6; f++) {
    cubeState.push(new Array(9).fill(f)); // solved state
  }
}

// Init
initCubeState();

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
  scenePaint.background = new THREE.Color(0xf0f0f0);
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
  // Drag-to-turn: drag on sticker turns layer, drag on background rotates camera, tap paints
  const el = rendererPaint.domElement;
  const raycaster = new THREE.Raycaster();
  let grabInfo = null;
  
  function getNDC(e) {
    const rect = el.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  
  function raycastCube(e) {
    raycaster.setFromCamera(getNDC(e), cameraPaint);
    const hits = raycaster.intersectObjects(cubiesPaint);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const matIndex = hit.face.materialIndex;
    const info = hit.object.userData.faceInfo[matIndex];
    if (!info) return null;
    const normals = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];
    return { cubie: hit.object, normal: normals[matIndex], faceInfo: info, point: hit.point.clone() };
  }
  
  function planeIntersect(e, planePoint, planeNormal) {
    raycaster.setFromCamera(getNDC(e), cameraPaint);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const out = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, out) ? out : null;
  }
  
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); // stop page scroll on mobile
    const hit = raycastCube(e);
    if (hit) {
      grabInfo = { ...hit, turned: false,
        startPlanePoint: planeIntersect(e, hit.point, hit.normal) };
    } else {
      grabInfo = null;
    }
    dragStartPaint = { x: e.clientX, y: e.clientY };
    isDraggingPaint = false;
  });
  
  el.addEventListener('pointermove', e => {
    if (!dragStartPaint) return;
    const dx = e.clientX - dragStartPaint.x, dy = e.clientY - dragStartPaint.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) isDraggingPaint = true;
    
    if (grabInfo && !grabInfo.turned && isDraggingPaint) {
      const move = dragToMove(grabInfo, dx, dy);
      if (move) {
        grabInfo.turned = true;
        doPaintTurn(move);
      }
    } else if (!grabInfo && isDraggingPaint) {
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
    if (grabInfo && !grabInfo.turned && !isDraggingPaint) {
      handlePaintTap(e);
    }
    grabInfo = null;
    dragStartPaint = null;
    isDraggingPaint = false;
  });
}

function dragToMove(grab, dxScreen, dyScreen) {
  // Screen-space drag detection: project the face's tangent axes to 2D
  // and pick the one best aligned with the user's drag. Much more forgiving
  // than 3D plane intersection on small touch screens.
  const N = grab.normal.clone(); // face normal in world space
  const dragLen = Math.hypot(dxScreen, dyScreen);
  if (dragLen < 12) return null; // need a real drag, in pixels
  const dx = dxScreen / dragLen, dy = dyScreen / dragLen;

  // Two tangent directions on the face
  const up = Math.abs(N.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const T1 = new THREE.Vector3().crossVectors(up, N).normalize();
  const T2 = new THREE.Vector3().crossVectors(N, T1).normalize();

  // Project a 3D direction to screen-space 2D
  const rect = rendererPaint.domElement.getBoundingClientRect();
  function toScreenDir(dir3) {
    const p0 = grab.cubie.position.clone().project(cameraPaint);
    const p1 = grab.cubie.position.clone().add(dir3.clone().multiplyScalar(0.5)).project(cameraPaint);
    const x0 = (p0.x * 0.5 + 0.5) * rect.width, y0 = (-p0.y * 0.5 + 0.5) * rect.height;
    const x1 = (p1.x * 0.5 + 0.5) * rect.width, y1 = (-p1.y * 0.5 + 0.5) * rect.height;
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x: (x1 - x0) / l, y: (y1 - y0) / l };
  }

  // Try all 4 tangent senses, pick best alignment with drag
  const candidates = [T1, T1.clone().negate(), T2, T2.clone().negate()];
  let best = null, bestDot = 0.3; // must be reasonably aligned
  for (const T of candidates) {
    const s = toScreenDir(T);
    const dot = dx * s.x + dy * s.y;
    if (dot > bestDot) { bestDot = dot; best = T; }
  }
  if (!best) return null;

  // Rotation axis = N x T (right-hand rule)
  const A = new THREE.Vector3().crossVectors(N, best);
  if (A.length() < 0.3) return null;
  A.normalize();
  const ax = Math.abs(A.x), ay = Math.abs(A.y), az = Math.abs(A.z);
  let axis, axisSign, slice;
  const pos = grab.cubie.position;
  if (ax >= ay && ax >= az) { axis = 'x'; axisSign = Math.sign(A.x); slice = Math.round(pos.x); }
  else if (ay >= ax && ay >= az) { axis = 'y'; axisSign = Math.sign(A.y); slice = Math.round(pos.y); }
  else { axis = 'z'; axisSign = Math.sign(A.z); slice = Math.round(pos.z); }
  if (slice === 0) slice = axisSign > 0 ? 1 : -1;
  let base, isPrime;
  if (axis === 'x') { base = slice === 1 ? 'R' : 'L'; isPrime = slice === 1 ? axisSign > 0 : axisSign < 0; }
  else if (axis === 'y') { base = slice === 1 ? 'U' : 'D'; isPrime = slice === 1 ? axisSign > 0 : axisSign < 0; }
  else { base = slice === 1 ? 'F' : 'B'; isPrime = slice === 1 ? axisSign > 0 : axisSign < 0; }
  return isPrime ? base + "'" : base;
}

function doPaintTurn(move) {
  applyMoveToState(move);
  animateMoveOnScene(move, scenePaint, cubiesPaint, cameraPaint, () => {
    buildPaintCube();
    buildNet();
  });
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

let isAnimatingPaint = false;

function animateMoveOnScene(move, scene, cubies, camera, callback) {
  const p = parseMove3d(move);
  if (!p) { if (callback) callback(); return; }
  if (isAnimatingPaint) { if (callback) callback(); return; } // skip if already animating
  isAnimatingPaint = true;
  const sliceCubies = cubies.filter(c => {
    const pos = c.position;
    if (p.axis === 'x') return Math.round(pos.x) === p.slice;
    if (p.axis === 'y') return Math.round(pos.y) === p.slice;
    return Math.round(pos.z) === p.slice;
  });
  const pivot = new THREE.Group();
  scene.add(pivot);
  sliceCubies.forEach(c => pivot.attach(c));
  const duration = 350; // smoother, slightly longer
  const start = performance.now();
  (function step(now) {
    const t = Math.min(((now || performance.now()) - start) / duration, 1);
    // smooth ease-in-out cubic
    const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    pivot.rotation[p.axis] = p.angle * eased;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      sliceCubies.forEach(c => {
        scene.attach(c);
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        c.rotation.set(
          Math.round(c.rotation.x / (Math.PI/2)) * (Math.PI/2),
          Math.round(c.rotation.y / (Math.PI/2)) * (Math.PI/2),
          Math.round(c.rotation.z / (Math.PI/2)) * (Math.PI/2)
        );
      });
      scene.remove(pivot);
      isAnimatingPaint = false;
      if (callback) callback();
    }
  })();
}

function getPaintStickerColor(face, r, c) {
  return COLORS[cubeState[face][r*3 + c]];
}

function buildPaintCube() {
  if (!scenePaint) initPaintScene();
  if (!scenePaint) return;
  cubiesPaint.forEach(c => scenePaint.remove(c));
  cubiesPaint = [];
  const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
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
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        // -X (L=4)
        if (x === -1) {
          const r = 1 - y, c = z + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(4, r, c) }));
          faceInfo.push({ face: 4, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        // +Y (U=0)
        if (y === 1) {
          const r = z + 1, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(0, r, c) }));
          faceInfo.push({ face: 0, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        // -Y (D=3)
        if (y === -1) {
          const r = 1 - z, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(3, r, c) }));
          faceInfo.push({ face: 3, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        // +Z (F=2)
        if (z === 1) {
          const r = 1 - y, c = x + 1;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(2, r, c) }));
          faceInfo.push({ face: 2, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        // -Z (B=5)
        if (z === -1) {
          const r = 1 - y, c = 1 - x;
          materials.push(new THREE.MeshLambertMaterial({ color: getPaintStickerColor(5, r, c) }));
          faceInfo.push({ face: 5, r, c });
        } else { materials.push(new THREE.MeshLambertMaterial({ color: 0x000000 })); faceInfo.push(null); }
        const cubie = new THREE.Mesh(geo, materials);
        cubie.position.set(x, y, z);
        cubie.userData.faceInfo = faceInfo;
        // Bold black edge outlines (including outer silhouette)
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
        cubie.add(line);
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
    d.style.cssText = `width:52px;height:44px;border-radius:8px;background:${col};cursor:pointer;border:3px solid ${i === paintColor ? '#f2b13d' : '#333'};box-shadow:0 2px 4px rgba(0,0,0,0.2);`;
    d.title = COLOR_NAMES[i];
    d.addEventListener('click', () => {
      paintColor = i;
      buildPaintPalette();
    });
    pal.appendChild(d);
  });
}

// Reset to plain white
document.getElementById('btn-reset-paint').addEventListener('click', () => {
  for (let f = 0; f < 6; f++) cubeState[f] = new Array(9).fill(0); // all white
  buildPaintCube();
  buildNet();
});

// Init 3D on page load (single view, no tabs)
window.addEventListener('load', () => {
  setTimeout(() => { buildPaintPalette(); buildPaintCube(); }, 100);
});
// Also try immediate init in case load already fired
setTimeout(() => { buildPaintPalette(); buildPaintCube(); }, 500);

// ===== SOLVE in 3D view =====
let solutionMoves3d = [];
let currentMoveIdx3d = -1;

document.getElementById('btn-solve-3d').addEventListener('click', () => {
  // Validate: each color must appear exactly 9 times
  const counts = [0,0,0,0,0,0];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 9; i++) counts[cubeState[f][i]]++;
  }
  for (let c = 0; c < 6; c++) {
    if (counts[c] !== 9) {
      alert(`Warna ${COLOR_NAMES[c]} ada ${counts[c]}, harus 9. Lengkapi dulu warnanya!`);
      return;
    }
  }
  // Convert cubeState to Kociemba string
  // cubeState faces: 0=U,1=R,2=F,3=D,4=L,5=B. Kociemba expects URFDLB order.
  const faceMap = ['U','R','F','D','L','B'];
  let kStr = '';
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 9; i++) {
      kStr += faceMap[cubeState[f][i]];
    }
  }
  try {
    Cube.initSolver();
    const cube = Cube.fromString(kStr);
    const sol = cube.solve();
    solutionMoves3d = sol.split(' ').filter(s => s.length > 0);
    currentMoveIdx3d = -1;
    displaySolution3d();
    document.getElementById('solution3d').style.display = 'block';
    document.getElementById('solution3d').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    alert('Gagal solve: ' + err.message + '\nPastikan warnanya valid (masing-masing 9).');
  }
});

function displaySolution3d() {
  const container = document.getElementById('moves3d');
  container.innerHTML = '';
  solutionMoves3d.forEach((mv, idx) => {
    const chip = document.createElement('span');
    chip.textContent = mv;
    chip.style.cssText = `padding:6px 12px;border-radius:8px;background:${idx <= currentMoveIdx3d ? '#f2b13d' : '#2a2a3a'};color:${idx <= currentMoveIdx3d ? '#000' : '#fff'};font-weight:bold;cursor:pointer;`;
    chip.addEventListener('click', () => jumpToMove3d(idx));
    container.appendChild(chip);
  });
}

function jumpToMove3d(idx) {
  // Reset to original painted state, then apply moves up to idx
  // For simplicity, we track moves applied. Rebuild from scratch is complex.
  // Instead, step forward/backward from current.
  while (currentMoveIdx3d < idx) { stepForward3d(); }
  while (currentMoveIdx3d > idx) { stepBackward3d(); }
}

function stepForward3d() {
  if (currentMoveIdx3d >= solutionMoves3d.length - 1) return;
  currentMoveIdx3d++;
  const mv = solutionMoves3d[currentMoveIdx3d];
  applyMoveToState(mv);
  animateMoveOnScene(mv, scenePaint, cubiesPaint, cameraPaint, () => {
    buildPaintCube();
    displaySolution3d();
  });
  displaySolution3d();
}

function stepBackward3d() {
  if (currentMoveIdx3d < 0) return;
  const mv = solutionMoves3d[currentMoveIdx3d];
  const inv = mv.endsWith("'") ? mv.slice(0,-1) : mv.endsWith('2') ? mv : mv + "'";
  currentMoveIdx3d--;
  applyMoveToState(inv);
  animateMoveOnScene(inv, scenePaint, cubiesPaint, cameraPaint, () => {
    buildPaintCube();
    displaySolution3d();
  });
  displaySolution3d();
}

document.getElementById('btn-next3d').addEventListener('click', stepForward3d);
document.getElementById('btn-prev3d').addEventListener('click', stepBackward3d);

let isPlaying3d = false;
document.getElementById('btn-play3d').addEventListener('click', function() {
  if (isPlaying3d) return;
  isPlaying3d = true;
  this.textContent = '⏸ Pause';
  (function playNext() {
    if (currentMoveIdx3d >= solutionMoves3d.length - 1) {
      isPlaying3d = false;
      document.getElementById('btn-play3d').textContent = '▶ Putar Solusi';
      return;
    }
    stepForward3d();
    setTimeout(() => { if (isPlaying3d) playNext(); }, 600);
  })();
});
