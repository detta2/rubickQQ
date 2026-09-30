// app4.js — rubickQQ 4x4 mode (3D paint + solve)
// State: 6 faces x 16 stickers, color indices 0-5 (U,R,F,D,L,B = white,red,green,yellow,orange,blue)
// Face orientation:
//   U: r=0 @B, r=3 @F, c=0 @L, c=3 @R    D: r=0 @F, r=3 @B, c=0 @L, c=3 @R
//   F: r=0 @U, r=3 @D, c=0 @L, c=3 @R    B: r=0 @U, r=3 @D, c=0 @R, c=3 @L
//   R: r=0 @U, r=3 @D, c=0 @F, c=3 @B    L: r=0 @U, r=3 @D, c=0 @B, c=3 @F

// ================= GEOMETRIC MOVE ENGINE =================
// Sticker (face,r,c) -> 3D position + outward normal. Cubie coords: -1.5..1.5.
function stickerPos4(face, r, c) {
  const o = r - 1.5, q = c - 1.5, H = 1.5;
  switch (face) {
    case 0: return { p: [q, H, o], n: [0, 1, 0] };    // U
    case 3: return { p: [q, -H, -o], n: [0, -1, 0] };  // D
    case 2: return { p: [q, -o, H], n: [0, 0, 1] };    // F
    case 5: return { p: [-q, -o, -H], n: [0, 0, -1] }; // B
    case 1: return { p: [H, -o, -q], n: [1, 0, 0] };   // R
    default: return { p: [-H, -o, q], n: [-1, 0, 0] }; // L
  }
}
function stickerId4(p, n) {
  const x = p[0], y = p[1], z = p[2], nx = n[0], ny = n[1], nz = n[2];
  let face, r, c;
  if (nx === 1) { face = 1; r = 1.5 - y; c = 1.5 - z; }
  else if (nx === -1) { face = 4; r = 1.5 - y; c = z + 1.5; }
  else if (ny === 1) { face = 0; r = z + 1.5; c = x + 1.5; }
  else if (ny === -1) { face = 3; r = 1.5 - z; c = x + 1.5; }
  else if (nz === 1) { face = 2; r = 1.5 - y; c = x + 1.5; }
  else { face = 5; r = 1.5 - y; c = 1.5 - x; }
  return [face, Math.round(r), Math.round(c)];
}
function parseMove4(move) {
  // -> {axis, slices:[...], angle}. Same angle convention as 3x3 (R/U/F = -PI/2).
  const m = /^([UDFBLR])(w?)(['2]?)$/.exec(move);
  if (!m) return null;
  const face = m[1], wide = m[2] === 'w', mod = m[3];
  const H = 1.5, Q = 0.5;
  let axis, outer;
  if (face === 'R') { axis = 'x'; outer = H; }
  else if (face === 'L') { axis = 'x'; outer = -H; }
  else if (face === 'U') { axis = 'y'; outer = H; }
  else if (face === 'D') { axis = 'y'; outer = -H; }
  else if (face === 'F') { axis = 'z'; outer = H; }
  else { axis = 'z'; outer = -H; }
  const slices = wide ? [outer, outer > 0 ? Q : -Q] : [outer];
  const base = (face === 'R' || face === 'U' || face === 'F') ? -Math.PI / 2 : Math.PI / 2;
  const angle = mod === "'" ? -base : mod === '2' ? Math.PI : base;
  return { axis, slices, angle };
}
function rotVec4(v, axis, angle) {
  const x = v[0], y = v[1], z = v[2];
  const c = Math.cos(angle), s = Math.sin(angle);
  let r;
  if (axis === 'x') r = [x, y * c - z * s, y * s + z * c];
  else if (axis === 'y') r = [x * c + z * s, y, -x * s + z * c];
  else r = [x * c - y * s, x * s + y * c, z];
  return [Math.round(r[0] * 2) / 2, Math.round(r[1] * 2) / 2, Math.round(r[2] * 2) / 2];
}
function applyMove4(state, move) {
  const p = parseMove4(move);
  if (!p) return;
  const out = state.map(f => f.slice());
  for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const sp = stickerPos4(f, r, c);
    const coord = p.axis === 'x' ? sp.p[0] : p.axis === 'y' ? sp.p[1] : sp.p[2];
    if (!p.slices.some(s => Math.abs(s - coord) < 0.01)) continue;
    const p2 = rotVec4(sp.p, p.axis, p.angle);
    const n2 = rotVec4(sp.n, p.axis, p.angle);
    const id = stickerId4(p2, n2);
    out[id[0]][id[1] * 4 + id[2]] = state[f][r * 4 + c];
  }
  for (let f = 0; f < 6; f++) state[f] = out[f];
}
function newSolved4() {
  const s = [];
  for (let f = 0; f < 6; f++) s.push(new Array(16).fill(f));
  return s;
}
function isSolved4(state) {
  return state.every(f => f.every(s => s === f[0]));
}
function invertMove4(mv) {
  return mv.endsWith("'") ? mv.slice(0, -1) : mv.endsWith('2') ? mv : mv + "'";
}

// ================= STATE =================
let cubeState4 = newSolved4();
let paintHistory4 = [];
let isAnimatingPaint4 = false;
let scenePaint4 = null, cameraPaint4 = null, rendererPaint4 = null;
let cubiesPaint4 = [];
let solutionMoves4d = [];
let solutionPhases4d = []; // [{name, start, end}]
let currentMoveIdx4d = -1;
let isPlaying4d = false;
let is4x4 = false;
let scene4Ready = false;

function pushPaintHistory4(entry) {
  paintHistory4.push(entry);
  if (paintHistory4.length > 100) paintHistory4.shift();
  updateBackBtn4();
}
function updateBackBtn4() {
  const b = document.getElementById('btn-back-paint4');
  if (b) b.disabled = paintHistory4.length === 0;
}
function hideSolution4d() {
  const el = document.getElementById('solution4d');
  if (el) el.style.display = 'none';
  isPlaying4d = false;
  const pb = document.getElementById('btn-play4d');
  if (pb) pb.textContent = '▶ Putar Otomatis';
}

// ================= 3D SCENE =================
function initPaintScene4() {
  const container = document.getElementById('cube4d-paint');
  if (!container) return;
  container.innerHTML = '';
  const w = container.clientWidth || 320, h = 320;
  scenePaint4 = new THREE.Scene();
  scenePaint4.background = new THREE.Color(0xf0f0f0);
  cameraPaint4 = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  cameraPaint4.position.set(7.2, 6.6, 9.0);
  cameraPaint4.lookAt(0, 0, 0);
  rendererPaint4 = new THREE.WebGLRenderer({ antialias: true });
  rendererPaint4.setSize(w, h);
  container.appendChild(rendererPaint4.domElement);
  scenePaint4.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(5, 10, 7);
  scenePaint4.add(dir);
  (function animate() {
    requestAnimationFrame(animate);
    if (rendererPaint4) rendererPaint4.render(scenePaint4, cameraPaint4);
  })();
  const el = rendererPaint4.domElement;
  const raycaster = new THREE.Raycaster();
  let grabInfo = null;
  let activePointerId = null;
  let dragStart = null, isDragging = false;

  function getNDC(e) {
    const rect = el.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  function raycastCube(e) {
    raycaster.setFromCamera(getNDC(e), cameraPaint4);
    const hits = raycaster.intersectObjects(cubiesPaint4);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const matIndex = hit.face.materialIndex;
    const info = hit.object.userData.faceInfo[matIndex];
    if (!info) return null;
    const normals = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];
    const worldQuat = hit.object.getWorldQuaternion(new THREE.Quaternion());
    const worldNormal = normals[matIndex].clone().applyQuaternion(worldQuat);
    const ax = Math.abs(worldNormal.x), ay = Math.abs(worldNormal.y), az = Math.abs(worldNormal.z);
    if (ax >= ay && ax >= az) worldNormal.set(Math.sign(worldNormal.x), 0, 0);
    else if (ay >= ax && ay >= az) worldNormal.set(0, Math.sign(worldNormal.y), 0);
    else worldNormal.set(0, 0, Math.sign(worldNormal.z));
    return { cubie: hit.object, normal: worldNormal, faceInfo: info, point: hit.point.clone() };
  }
  function planeIntersect(e, planePoint, planeNormal) {
    raycaster.setFromCamera(getNDC(e), cameraPaint4);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const out = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, out) ? out : null;
  }
  el.addEventListener('pointerdown', e => {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    e.preventDefault();
    const hit = raycastCube(e);
    if (hit) {
      grabInfo = Object.assign({}, hit, { turned: false });
      grabInfo.startPlanePoint = planeIntersect(e, hit.point, hit.normal);
    } else {
      grabInfo = null;
    }
    dragStart = { x: e.clientX, y: e.clientY };
    isDragging = false;
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== activePointerId) return;
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) isDragging = true;
    if (grabInfo && !grabInfo.turned && isDragging) {
      const move = dragToMove4(grabInfo, dx, dy);
      if (move) {
        grabInfo.turned = true;
        doPaintTurn4(move);
      } else if (Math.hypot(dx, dy) > 40) {
        grabInfo = null;
        dragStart = { x: e.clientX, y: e.clientY };
      }
    } else if (!grabInfo && isDragging) {
      const angle = dx * 0.01;
      const x = cameraPaint4.position.x, z = cameraPaint4.position.z;
      cameraPaint4.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      cameraPaint4.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      cameraPaint4.position.y = Math.max(-8, Math.min(8, cameraPaint4.position.y - dy * 0.02));
      cameraPaint4.lookAt(0, 0, 0);
      dragStart = { x: e.clientX, y: e.clientY };
    }
  });
  el.addEventListener('pointerup', e => {
    if (e.pointerId !== activePointerId) return;
    if (grabInfo && !grabInfo.turned && !isDragging) handlePaintTap4(e);
    grabInfo = null; dragStart = null; isDragging = false; activePointerId = null;
  });
  el.addEventListener('pointercancel', e => {
    if (e.pointerId !== activePointerId) return;
    grabInfo = null; dragStart = null; isDragging = false; activePointerId = null;
  });
  scene4Ready = true;
}

function getPaintStickerColor4(face, r, c) {
  return COLORS[cubeState4[face][r * 4 + c]];
}

function buildPaintCube4() {
  if (!scenePaint4) initPaintScene4();
  if (!scenePaint4) return;
  cubiesPaint4.forEach(c => scenePaint4.remove(c));
  cubiesPaint4 = [];
  const geo = new THREE.BoxGeometry(0.99, 0.99, 0.99);
  const black = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const coords = [-1.5, -0.5, 0.5, 1.5];
  for (const x of coords) for (const y of coords) for (const z of coords) {
    const materials = [];
    const faceInfo = [];
    // +X (R=1): r = 1.5-y, c = 1.5-z
    if (x === 1.5) {
      const r = Math.round(1.5 - y), c = Math.round(1.5 - z);
      materials.push(stickerMaterial(getPaintStickerColor4(1, r, c)));
      faceInfo.push({ face: 1, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    // -X (L=4): r = 1.5-y, c = z+1.5
    if (x === -1.5) {
      const r = Math.round(1.5 - y), c = Math.round(z + 1.5);
      materials.push(stickerMaterial(getPaintStickerColor4(4, r, c)));
      faceInfo.push({ face: 4, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    // +Y (U=0): r = z+1.5, c = x+1.5
    if (y === 1.5) {
      const r = Math.round(z + 1.5), c = Math.round(x + 1.5);
      materials.push(stickerMaterial(getPaintStickerColor4(0, r, c)));
      faceInfo.push({ face: 0, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    // -Y (D=3): r = 1.5-z, c = x+1.5
    if (y === -1.5) {
      const r = Math.round(1.5 - z), c = Math.round(x + 1.5);
      materials.push(stickerMaterial(getPaintStickerColor4(3, r, c)));
      faceInfo.push({ face: 3, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    // +Z (F=2): r = 1.5-y, c = x+1.5
    if (z === 1.5) {
      const r = Math.round(1.5 - y), c = Math.round(x + 1.5);
      materials.push(stickerMaterial(getPaintStickerColor4(2, r, c)));
      faceInfo.push({ face: 2, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    // -Z (B=5): r = 1.5-y, c = 1.5-x
    if (z === -1.5) {
      const r = Math.round(1.5 - y), c = Math.round(1.5 - x);
      materials.push(stickerMaterial(getPaintStickerColor4(5, r, c)));
      faceInfo.push({ face: 5, r, c });
    } else { materials.push(black); faceInfo.push(null); }
    const cubie = new THREE.Mesh(geo, materials);
    cubie.position.set(x, y, z);
    cubie.userData.faceInfo = faceInfo;
    const edges = new THREE.EdgesGeometry(geo);
    cubie.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })));
    scenePaint4.add(cubie);
    cubiesPaint4.push(cubie);
  }
}

function handlePaintTap4(e) {
  if (isAnimatingPaint4) return;
  const el = rendererPaint4.domElement;
  const rect = el.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, cameraPaint4);
  const hits = raycaster.intersectObjects(cubiesPaint4);
  if (hits.length === 0) return;
  const hit = hits[0];
  const matIndex = hit.face.materialIndex;
  const info = hit.object.userData.faceInfo[matIndex];
  if (!info) return;
  const pIdx = info.r * 4 + info.c;
  if (cubeState4[info.face][pIdx] !== paintColor) {
    pushPaintHistory4({ type: 'paint', face: info.face, idx: pIdx, prev: cubeState4[info.face][pIdx] });
    cubeState4[info.face][pIdx] = paintColor;
  }
  const pm = hit.object.material[matIndex];
  pm.map = getStickerTexture(COLORS[paintColor]);
  pm.needsUpdate = true;
}

function dragToMove4(grab, dxScreen, dyScreen) {
  const N = grab.normal.clone();
  const dragLen = Math.hypot(dxScreen, dyScreen);
  if (dragLen < 12) return null;
  const dx = dxScreen / dragLen, dy = dyScreen / dragLen;
  const up = Math.abs(N.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const T1 = new THREE.Vector3().crossVectors(up, N).normalize();
  const T2 = new THREE.Vector3().crossVectors(N, T1).normalize();
  const rect = rendererPaint4.domElement.getBoundingClientRect();
  function toScreenDir(dir3) {
    const p0 = grab.cubie.position.clone().project(cameraPaint4);
    const p1 = grab.cubie.position.clone().add(dir3.clone().multiplyScalar(0.5)).project(cameraPaint4);
    const x0 = (p0.x * 0.5 + 0.5) * rect.width, y0 = (-p0.y * 0.5 + 0.5) * rect.height;
    const x1 = (p1.x * 0.5 + 0.5) * rect.width, y1 = (-p1.y * 0.5 + 0.5) * rect.height;
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x: (x1 - x0) / l, y: (y1 - y0) / l };
  }
  const candidates = [T1, T1.clone().negate(), T2, T2.clone().negate()];
  let best = null, bestDot = 0.3;
  for (const T of candidates) {
    const s = toScreenDir(T);
    const dot = dx * s.x + dy * s.y;
    if (dot > bestDot) { bestDot = dot; best = T; }
  }
  if (!best) return null;
  const A = new THREE.Vector3().crossVectors(N, best);
  if (A.length() < 0.3) return null;
  A.normalize();
  const ax = Math.abs(A.x), ay = Math.abs(A.y), az = Math.abs(A.z);
  let axis, axisSign, slicePos;
  const pos = grab.cubie.position;
  if (ax >= ay && ax >= az) { axis = 'x'; axisSign = Math.sign(A.x); slicePos = pos.x; }
  else if (ay >= ax && ay >= az) { axis = 'y'; axisSign = Math.sign(A.y); slicePos = pos.y; }
  else { axis = 'z'; axisSign = Math.sign(A.z); slicePos = pos.z; }
  const outer = slicePos > 0;
  const wide = Math.abs(slicePos) < 1.0; // inner slice -> wide move
  let base, isPrime;
  if (axis === 'x') { base = outer ? 'R' : 'L'; isPrime = outer ? axisSign > 0 : axisSign < 0; }
  else if (axis === 'y') { base = outer ? 'U' : 'D'; isPrime = outer ? axisSign > 0 : axisSign < 0; }
  else { base = outer ? 'F' : 'B'; isPrime = outer ? axisSign > 0 : axisSign < 0; }
  if (wide) base += 'w';
  return isPrime ? base + "'" : base;
}

function animateMoveOnScene4(move, callback) {
  const p = parseMove4(move);
  if (!p) { if (callback) callback(); return; }
  if (isAnimatingPaint4) return;
  isAnimatingPaint4 = true;
  const sliceCubies = cubiesPaint4.filter(c => {
    const pos = c.position;
    const v = p.axis === 'x' ? pos.x : p.axis === 'y' ? pos.y : pos.z;
    return p.slices.some(s => Math.abs(v - s) < 0.1);
  });
  const pivot = new THREE.Group();
  scenePaint4.add(pivot);
  sliceCubies.forEach(c => pivot.attach(c));
  const duration = 550;
  const start = performance.now();
  (function step(now) {
    const t = Math.min(((now || performance.now()) - start) / duration, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    pivot.rotation[p.axis] = p.angle * eased;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      sliceCubies.forEach(c => {
        scenePaint4.attach(c);
        c.position.set(Math.round(c.position.x * 2) / 2, Math.round(c.position.y * 2) / 2, Math.round(c.position.z * 2) / 2);
        c.rotation.set(
          Math.round(c.rotation.x / (Math.PI / 2)) * (Math.PI / 2),
          Math.round(c.rotation.y / (Math.PI / 2)) * (Math.PI / 2),
          Math.round(c.rotation.z / (Math.PI / 2)) * (Math.PI / 2)
        );
      });
      scenePaint4.remove(pivot);
      isAnimatingPaint4 = false;
      if (callback) callback();
    }
  })();
}

function doPaintTurn4(move) {
  if (isAnimatingPaint4) return;
  pushPaintHistory4({ type: 'move', move });
  applyMove4(cubeState4, move);
  animateMoveOnScene4(move, () => {
    buildPaintCube4();
    hideSolution4d();
  });
  hideSolution4d();
}

// ================= PALETTE =================
function buildPaintPalette4() {
  const pal = document.getElementById('palette4d');
  if (!pal) return;
  pal.innerHTML = '';
  COLORS.forEach((col, i) => {
    const d = document.createElement('div');
    d.style.cssText = `width:52px;height:44px;border-radius:8px;background:${col};cursor:pointer;border:3px solid ${i === paintColor ? '#f2b13d' : '#333'};box-shadow:0 2px 4px rgba(0,0,0,0.2);`;
    d.title = COLOR_NAMES[i];
    d.addEventListener('click', () => {
      paintColor = i;
      buildPaintPalette4();
      if (typeof buildPaintPalette === 'function') buildPaintPalette();
    });
    pal.appendChild(d);
  });
}

// ================= BUTTONS =================
document.getElementById('btn-back-paint4').addEventListener('click', () => {
  if (isAnimatingPaint4) return;
  const h = paintHistory4.pop();
  if (!h) return;
  if (h.type === 'paint') {
    cubeState4[h.face][h.idx] = h.prev;
  } else if (h.type === 'snapshot') {
    cubeState4 = h.state.map(f => f.slice());
  } else {
    applyMove4(cubeState4, invertMove4(h.move));
  }
  updateBackBtn4();
  hideSolution4d();
  buildPaintCube4();
});

document.getElementById('btn-shuffle-paint4').addEventListener('click', () => {
  if (isAnimatingPaint4) return;
  pushPaintHistory4({ type: 'snapshot', state: cubeState4.map(f => f.slice()) });
  const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
  const mods = ['', "'", '2'];
  const wides = ['', 'w'];
  let lastFace = '';
  for (let i = 0; i < 40; i++) {
    let f;
    do { f = faces[Math.floor(Math.random() * 6)]; } while (f === lastFace);
    lastFace = f;
    const w = wides[Math.floor(Math.random() * 2)];
    applyMove4(cubeState4, f + w + mods[Math.floor(Math.random() * 3)]);
  }
  hideSolution4d();
  buildPaintCube4();
});

document.getElementById('btn-reset-paint4').addEventListener('click', () => {
  if (isAnimatingPaint4) return;
  pushPaintHistory4({ type: 'snapshot', state: cubeState4.map(f => f.slice()) });
  cubeState4 = newSolved4();
  hideSolution4d();
  buildPaintCube4();
});

document.getElementById('btn-blank-paint4').addEventListener('click', () => {
  if (isAnimatingPaint4) return;
  pushPaintHistory4({ type: 'snapshot', state: cubeState4.map(f => f.slice()) });
  for (let f = 0; f < 6; f++) cubeState4[f] = new Array(16).fill(0);
  hideSolution4d();
  buildPaintCube4();
});

// ================= SOLVE =================
function describeMove4(mv) {
  if (!mv) return 'Selesai! 🎉 Kubus sudah solved.';
  const m = /^([UDFBLR])(w?)(['2]?)$/.exec(mv);
  if (!m) return mv;
  const names = { U: 'ATAS', D: 'BAWAH', R: 'KANAN', L: 'KIRI', F: 'DEPAN', B: 'BELAKANG' };
  const layer = (m[2] ? 'DUA lapisan ' : 'lapisan ') + names[m[1]];
  if (m[3] === '2') return `Putar ${layer} 180°.`;
  if (m[3] === "'") return `Putar ${layer} 90° berlawanan arah jarum jam.`;
  return `Putar ${layer} 90° searah jarum jam.`;
}

document.getElementById('btn-solve-4d').addEventListener('click', () => {
  if (typeof Solve4 === 'undefined' || typeof Solve4.solve4x4 !== 'function') {
    alert('Solver 4x4 masih disiapin, bentar ya. Sementara bisa cat/acak/drag dulu.');
    return;
  }
  const counts = [0, 0, 0, 0, 0, 0];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 16; i++) counts[cubeState4[f][i]]++;
  for (let c = 0; c < 6; c++) {
    if (counts[c] !== 16) {
      alert(`Warna ${COLOR_NAMES[c]} ada ${counts[c]}, harus 16. Lengkapi dulu warnanya!`);
      return;
    }
  }
  const btn = document.getElementById('btn-solve-4d');
  const origText = btn.textContent;
  btn.textContent = '⏳ Menghitung...';
  btn.disabled = true;
  setTimeout(() => {
    try {
      const res = Solve4.solve4x4(cubeState4.map(f => f.slice()));
      if (!res || res.error) throw new Error((res && res.error) || 'solver gagal');
      const moves = res.moves.filter(s => s.length > 0);
      // Verify: apply solution to a copy, must end solved
      const test = cubeState4.map(f => f.slice());
      for (const mv of moves) applyMove4(test, mv);
      if (!isSolved4(test)) {
        alert('Warnanya nggak valid (kombinasi mustahil di kubus asli).\nCek lagi cat warnanya, atau tekan reset lalu shuffle.');
        btn.textContent = origText; btn.disabled = false;
        return;
      }
      solutionMoves4d = moves;
      solutionPhases4d = [];
      if (res.phases) {
        let idx = 0;
        const labels = { centers: 'centers', edges: 'pairing edges', parity: 'parity', cube: 'solve 3×3' };
        for (const ph of res.phases) {
          const n = ph.moves.filter(s => s.length > 0).length;
          if (n > 0) solutionPhases4d.push({ name: labels[ph.name] || ph.name, start: idx, end: idx + n - 1 });
          idx += n;
        }
      }
      currentMoveIdx4d = -1;
      displaySolution4d();
      document.getElementById('solution4d').style.display = 'block';
      document.getElementById('solution4d').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      alert('Gagal solve: ' + err.message);
    }
    btn.textContent = origText;
    btn.disabled = false;
  }, 50);
});

function phaseName4d(idx) {
  for (const ph of solutionPhases4d) {
    if (idx >= ph.start && idx <= ph.end) return ph.name;
  }
  return '';
}

function displaySolution4d() {
  const container = document.getElementById('moves4d');
  container.innerHTML = '';
  solutionMoves4d.forEach((mv, idx) => {
    const chip = document.createElement('span');
    chip.textContent = mv;
    chip.style.cssText = `padding:6px 12px;border-radius:8px;background:${idx <= currentMoveIdx4d ? '#f2b13d' : '#fff'};color:#000;font-weight:bold;cursor:pointer;border:2px solid #333;`;
    chip.addEventListener('click', () => jumpToMove4d(idx));
    container.appendChild(chip);
  });
  const instrEl = document.getElementById('step-instruction4');
  const counterEl = document.getElementById('step-counter4');
  const phaseEl = document.getElementById('phase4d');
  const nextIdx = currentMoveIdx4d + 1;
  if (instrEl) {
    instrEl.textContent = nextIdx < solutionMoves4d.length
      ? describeMove4(solutionMoves4d[nextIdx])
      : 'Selesai! 🎉 Kubus sudah solved.';
  }
  if (phaseEl) {
    const pn = nextIdx < solutionMoves4d.length ? phaseName4d(nextIdx) : '';
    phaseEl.textContent = pn ? `Tahap: ${pn}` : '';
  }
  if (counterEl) {
    counterEl.textContent = `Langkah ${Math.min(currentMoveIdx4d + 1, solutionMoves4d.length)} dari ${solutionMoves4d.length}`;
  }
  const prevBtn = document.getElementById('btn-prev4d');
  const nextBtn = document.getElementById('btn-next4d');
  if (prevBtn) prevBtn.disabled = currentMoveIdx4d < 0;
  if (nextBtn) nextBtn.textContent = (currentMoveIdx4d >= solutionMoves4d.length - 1) ? 'Selesai ✓' : 'Next ▶';
}

function jumpToMove4d(idx) {
  if (isAnimatingPaint4) return;
  isPlaying4d = false;
  const playBtn = document.getElementById('btn-play4d');
  if (playBtn) playBtn.textContent = '▶ Putar Otomatis';
  idx = Math.max(-1, Math.min(solutionMoves4d.length - 1, idx));
  while (currentMoveIdx4d < idx) {
    currentMoveIdx4d++;
    applyMove4(cubeState4, solutionMoves4d[currentMoveIdx4d]);
  }
  while (currentMoveIdx4d > idx) {
    applyMove4(cubeState4, invertMove4(solutionMoves4d[currentMoveIdx4d]));
    currentMoveIdx4d--;
  }
  buildPaintCube4();
  displaySolution4d();
}

function stepForward4d() {
  if (currentMoveIdx4d >= solutionMoves4d.length - 1) return;
  if (isAnimatingPaint4) return;
  currentMoveIdx4d++;
  const mv = solutionMoves4d[currentMoveIdx4d];
  applyMove4(cubeState4, mv);
  displaySolution4d();
  animateMoveOnScene4(mv, () => {
    buildPaintCube4();
    displaySolution4d();
  });
}

function stepBackward4d() {
  if (currentMoveIdx4d < 0) return;
  if (isAnimatingPaint4) return;
  const mv = solutionMoves4d[currentMoveIdx4d];
  currentMoveIdx4d--;
  applyMove4(cubeState4, invertMove4(mv));
  displaySolution4d();
  animateMoveOnScene4(invertMove4(mv), () => {
    buildPaintCube4();
    displaySolution4d();
  });
}

document.getElementById('btn-next4d').addEventListener('click', stepForward4d);
document.getElementById('btn-prev4d').addEventListener('click', stepBackward4d);
document.getElementById('btn-play4d').addEventListener('click', function () {
  if (isPlaying4d) { isPlaying4d = false; this.textContent = '▶ Putar Otomatis'; return; }
  isPlaying4d = true;
  this.textContent = '⏸ Pause';
  (function playNext() {
    if (currentMoveIdx4d >= solutionMoves4d.length - 1) {
      isPlaying4d = false;
      document.getElementById('btn-play4d').textContent = '▶ Putar Otomatis';
      return;
    }
    stepForward4d();
    setTimeout(() => { if (isPlaying4d) playNext(); }, 900);
  })();
});

// ================= MINI CUBE LOGO + MODE TABS =================
function renderMiniCube(n) {
  const el = document.getElementById('mini-cube');
  if (!el) return;
  const T0 = [20, 2], T1 = [36, 10], T2 = [20, 18], T3 = [4, 10];
  const L2 = [20, 40], L3 = [4, 32];
  const R2 = [36, 32], R3 = [20, 40];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let lines = '';
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = (a, b) => lerp(a, b, t).map(v => v.toFixed(1)).join(',');
    lines += `<line x1="${p(T0, T3).split(',')[0]}" y1="${p(T0, T3).split(',')[1]}" x2="${p(T1, T2).split(',')[0]}" y2="${p(T1, T2).split(',')[1]}"/>`;
    lines += `<line x1="${p(T0, T1).split(',')[0]}" y1="${p(T0, T1).split(',')[1]}" x2="${p(T3, T2).split(',')[0]}" y2="${p(T3, T2).split(',')[1]}"/>`;
    lines += `<line x1="${p(T3, L3).split(',')[0]}" y1="${p(T3, L3).split(',')[1]}" x2="${p(T2, L2).split(',')[0]}" y2="${p(T2, L2).split(',')[1]}"/>`;
    lines += `<line x1="${p(T3, T2).split(',')[0]}" y1="${p(T3, T2).split(',')[1]}" x2="${p(L3, L2).split(',')[0]}" y2="${p(L3, L2).split(',')[1]}"/>`;
    lines += `<line x1="${p(T1, R2).split(',')[0]}" y1="${p(T1, R2).split(',')[1]}" x2="${p(T2, R3).split(',')[0]}" y2="${p(T2, R3).split(',')[1]}"/>`;
    lines += `<line x1="${p(T1, T2).split(',')[0]}" y1="${p(T1, T2).split(',')[1]}" x2="${p(R2, R3).split(',')[0]}" y2="${p(R2, R3).split(',')[1]}"/>`;
  }
  const poly = pts => pts.map(p => p.join(',')).join(' ');
  el.innerHTML =
    `<svg width="34" height="38" viewBox="0 0 40 44">` +
    `<polygon points="${poly([T0, T1, T2, T3])}" fill="#ffffff" stroke="#222" stroke-width="1.6"/>` +
    `<polygon points="${poly([T3, T2, L2, L3])}" fill="#00cc00" stroke="#222" stroke-width="1.6"/>` +
    `<polygon points="${poly([T1, R2, R3, T2])}" fill="#ff4444" stroke="#222" stroke-width="1.6"/>` +
    `<g stroke="#222" stroke-width="0.8">${lines}</g></svg>`;
}

function switchMode(m) {
  is4x4 = (m === '4');
  document.getElementById('view3').style.display = is4x4 ? 'none' : '';
  document.getElementById('view4').style.display = is4x4 ? '' : 'none';
  document.getElementById('tab-3x3').classList.toggle('active', !is4x4);
  document.getElementById('tab-4x4').classList.toggle('active', is4x4);
  renderMiniCube(is4x4 ? 4 : 3);
  if (is4x4 && !scene4Ready) {
    buildPaintPalette4();
    buildPaintCube4();
    updateBackBtn4();
  } else if (is4x4) {
    buildPaintCube4();
  }
  window.scrollTo(0, 0);
}

document.getElementById('tab-3x3').addEventListener('click', () => switchMode('3'));
document.getElementById('tab-4x4').addEventListener('click', () => switchMode('4'));
renderMiniCube(3);
