// solver4.js — Solver Rubik 4x4 metode reduction
// Centers -> Pair Edges -> Parity -> 3x3 (Kociemba)
// Bergantung pada: applyMove4, isSolved4 dari app4.js; Cube (kociemba) dari CDN.

(function(global) {
  'use strict';

  // ============ CENTERS SOLVER (port dari solver/solve_centers.js) ============
  // Minimal old-cube model untuk solveCenters
  function oldNewCube() {
    const c = { n: 4, f: [] };
    for (let k = 0; k < 6; k++) {
      const m = [];
      for (let r = 0; r < 4; r++) m.push([k, k, k, k]);
      c.f.push(m);
    }
    return c;
  }
  function oldClone(c) {
    const o = { n: 4, f: [] };
    for (let k = 0; k < 6; k++) o.f.push(c.f[k].map(row => row.slice()));
    return o;
  }
  // Konversi state baru (6x16) ke model lama
  function toOld(s) {
    const c = { n: 4, f: [] };
    for (let f = 0; f < 6; f++) {
      const m = [];
      for (let r = 0; r < 4; r++) {
        m.push([s[f][r*4+0], s[f][r*4+1], s[f][r*4+2], s[f][r*4+3]]);
      }
      c.f.push(m);
    }
    return c;
  }
  function fromOld(c, s) {
    for (let f = 0; f < 6; f++)
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 4; q++)
          s[f][r*4+q] = c.f[f][r][q];
  }
  // Apply move ke model lama via applyMove4 (engine baru, sudah terverifikasi sama)
  function oldApplyMove(c, mv) {
    // Konversi ke state baru, apply, konversi balik
    const s = [];
    for (let f = 0; f < 6; f++) {
      s.push(new Array(16));
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 4; q++)
          s[f][r*4+q] = c.f[f][r][q];
    }
    applyMove4(s, mv);
    // Update c langsung dari s
    for (let f = 0; f < 6; f++)
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 4; q++)
          c.f[f][r][q] = s[f][r*4+q];
  }
  function oldApplyMoves(c, str) {
    for (const s of str.trim().split(/\s+/)) if (s) oldApplyMove(c, s);
  }

  // MACRO data (dari solver/macro_basic.json)
  const MACRO = {"0,2,1,1":"Fw Lw F' Lw' Fw'","0,2,1,2":"Fw Lw F2 Lw' Fw'","0,2,2,1":"Uw Lw' U' Lw Uw'","0,2,2,2":"Lw F Lw'","0,1,1,1":"Fw' Lw F Lw' Fw","0,1,1,2":"Lw' Uw' B Uw Lw","0,1,2,1":"Fw' U' Fw","0,1,2,2":"Uw' Fw R Fw' Uw","0,5,1,1":"Lw' B Lw","0,5,1,2":null,"0,5,2,1":"Uw' Lw' B' Lw Uw","0,5,2,2":null,"0,4,1,1":null,"0,4,1,2":"Fw U' Fw'","0,4,2,1":null,"0,4,2,2":"Uw Fw U Fw' Uw'","3,2,1,1":null,"3,2,1,2":"Uw' Fw' R' Fw Uw","3,2,2,1":null,"3,2,2,2":"Lw' F Lw","3,1,1,1":"Uw' Lw B Lw' Uw","3,1,1,2":"Fw' R' Fw","3,1,2,1":"Lw' Uw' R Uw Lw","3,1,2,2":"Fw' Uw R Uw' Fw","3,5,1,1":"Lw B Lw'","3,5,1,2":"Uw Fw' R' Fw Uw'","3,5,2,1":"Fw Uw B2 Uw' Fw'","3,5,2,2":"Fw Uw B' Uw' Fw'","3,4,1,1":"Uw Lw B Lw' Uw'","3,4,1,2":null,"3,4,2,1":"Fw L' Fw'","3,4,2,2":null,"4,2,1,1":null,"4,2,1,2":null,"4,2,2,1":null,"4,2,2,2":"Uw' F' Uw","4,5,1,1":null,"4,5,1,2":null,"4,5,2,1":null,"4,5,2,2":"Uw B' Uw'","4,1,1,1":"Fw Fw L Fw' Fw'","4,1,1,2":null,"4,1,2,1":null,"4,1,2,2":"Uw Uw R' Uw' Uw'","1,2,1,1":null,"1,2,1,2":null,"1,2,2,1":null,"1,2,2,2":"Uw F' Uw'","1,5,1,1":null,"1,5,1,2":null,"1,5,2,1":null,"1,5,2,2":"Uw' B' Uw","1,4,1,1":"Fw Fw L Fw' Fw'","1,4,1,2":null,"1,4,2,1":null,"1,4,2,2":"Uw Uw L' Uw' Uw'","2,1,1,1":null,"2,1,1,2":null,"2,1,2,1":null,"2,1,2,2":"Uw' R' Uw","2,4,1,1":null,"2,4,1,2":null,"2,4,2,1":null,"2,4,2,2":"Uw L' Uw'","2,5,1,1":"Lw Lw B Lw' Lw'","2,5,1,2":null,"2,5,2,1":null,"2,5,2,2":"Uw Uw B' Uw' Uw'","5,1,1,1":null,"5,1,1,2":null,"5,1,2,1":null,"5,1,2,2":"Uw R' Uw'","5,4,1,1":null,"5,4,1,2":null,"5,4,2,1":null,"5,4,2,2":"Uw' L' Uw","5,2,1,1":"Lw Lw B Lw' Lw'","5,2,1,2":null,"5,2,2,1":null,"5,2,2,2":"Uw Uw F' Uw' Uw'","0,3,1,1":"Fw Fw U' Fw' Fw'","0,3,2,2":"Lw Lw D Lw' Lw'"};

  const FN = ["U", "R", "F", "D", "L", "B"];
  const P0 = {};
  for (const k of Object.keys(MACRO)) {
    if (!MACRO[k]) continue;
    const [T, S, sr, sq] = k.split(",").map(Number);
    const key = `${T},${S}`;
    if (!P0[key]) P0[key] = [];
    P0[key].push([sr, sq]);
  }

  function countColorOn(c, color, f) {
    let n = 0;
    for (let r = 1; r < 3; r++) for (let q = 1; q < 3; q++) if (c.f[f][r][q] === color) n++;
    return n;
  }
  function faceMono(c, f) {
    const v = c.f[f][1][1];
    for (let r = 1; r < 3; r++) for (let q = 1; q < 3; q++) if (c.f[f][r][q] !== v) return false;
    return true;
  }
  function findTurns(c, F, r, q, r0, q0) {
    for (let tt = 0; tt < 4; tt++) {
      const d = oldClone(c);
      d.f[F][r][q] = 99;
      for (let k = 0; k < tt; k++) oldApplyMove(d, FN[F]);
      if (d.f[F][r0][q0] === 99) return tt;
    }
    return -1;
  }
  function turnStr(F, t) {
    return t === 0 ? "" : t === 1 ? FN[F] : t === 2 ? FN[F] + "2" : FN[F] + "'";
  }

  function solveCentersOld(c, mv) {
    const need = 4;
    const order = [0, 3, 4, 1, 2];
    const solved = [];
    for (const T of order) {
      let guard = 0;
      while (countColorOn(c, T, T) < need && guard++ < 100) {
        const before = countColorOn(c, T, T);
        let applied = false;
        const cands = [];
        for (let S = 0; S < 6; S++) {
          if (S === T || solved.includes(S)) continue;
          const key = `${T},${S}`;
          if (!P0[key] || P0[key].length === 0) continue;
          for (let r = 1; r < 3; r++) for (let q = 1; q < 3; q++) {
            if (c.f[S][r][q] === T) cands.push({ S, r, q });
          }
        }
        for (const { S, r, q } of cands) {
          const key = `${T},${S}`;
          for (const [sr, sq] of P0[key]) {
            const macro = MACRO[`${T},${S},${sr},${sq}`];
            if (!macro) continue;
            const t = findTurns(c, S, r, q, sr, sq);
            if (t < 0) continue;
            const sTurn = turnStr(S, t);
            const d1 = oldClone(c);
            if (sTurn) oldApplyMoves(d1, sTurn);
            let hr = -1, hq = -1;
            for (let rr = 1; rr < 3 && hr < 0; rr++) for (let qq = 1; qq < 3 && hr < 0; qq++) {
              if (d1.f[T][rr][qq] !== T) { hr = rr; hq = qq; }
            }
            if (hr < 0) continue;
            const u = findTurns(d1, T, hr, hq, 1, 1);
            if (u < 0) continue;
            const tTurn = turnStr(T, u);
            const seq = (sTurn ? sTurn + " " : "") + (tTurn ? tTurn + " " : "") + macro;
            const d2 = oldClone(c);
            oldApplyMoves(d2, seq);
            const after = countColorOn(d2, T, T);
            const presOK = solved.every((pf) => faceMono(d2, pf));
            if (after > before && presOK) {
              oldApplyMoves(c, seq);
              if (mv) {
                const parts = seq.trim().split(/\s+/);
                for (const p of parts) if (p) mv.push(p);
              }
              applied = true;
              break;
            }
          }
          if (applied) break;
        }
        if (!applied) return false;
      }
      if (countColorOn(c, T, T) < need) return false;
      solved.push(T);
    }
    return true;
  }

  function solveCentersNew(s) {
    const c = toOld(s);
    const mv = [];
    const ok = solveCentersOld(c, mv);
    if (!ok) return null;
    fromOld(c, s);
    return mv;
  }

  // ============ PAIRING (alg: Uw' R U R' F R' F' R Uw) ============
  const SLOTS = [
    [[0,3,1],[0,3,2],[2,0,1],[2,0,2]], [[0,1,3],[0,2,3],[1,0,2],[1,0,1]],
    [[0,0,1],[0,0,2],[5,0,2],[5,0,1]], [[0,1,0],[0,2,0],[4,0,1],[4,0,2]],
    [[3,0,1],[3,0,2],[2,3,1],[2,3,2]], [[3,1,3],[3,2,3],[1,3,1],[1,3,2]],
    [[3,3,1],[3,3,2],[5,3,2],[5,3,1]], [[3,1,0],[3,2,0],[4,3,2],[4,3,1]],
    [[2,1,3],[2,2,3],[1,1,0],[1,2,0]], [[2,1,0],[2,2,0],[4,1,3],[4,2,3]],
    [[5,1,0],[5,2,0],[1,1,3],[1,2,3]], [[5,1,3],[5,2,3],[4,1,0],[4,2,0]]
  ];
  const DEDGE_COLORS = [[0,2],[0,1],[0,5],[0,4],[3,2],[3,1],[3,5],[3,4],[2,1],[2,4],[5,1],[5,4]];
  const OUTER = [];
  for (const f of ['U','D','F','B','L','R']) for (const m of ['', "'", '2']) OUTER.push(f + m);
  const FR_L = [[2,1,3],[1,1,0]], FL_L = [[2,1,0],[4,1,3]];
  const PAIR_ALG = ["Uw'", "R", "U", "R'", "F", "R'", "F'", "R", "Uw"];

  function findWings(s, c1, c2) {
    const res = [];
    for (const sl of SLOTS) {
      for (const w of [[sl[0], sl[2]], [sl[1], sl[3]]]) {
        const cols = w.map(([f, r, c]) => s[f][r*4+c]);
        if (cols.includes(c1) && cols.includes(c2)) res.push(w);
      }
    }
    return res;
  }
  function keyOf(pos) { return pos.map(p => p.join(',')).sort().join('|'); }
  function wingToSlot(wp) {
    const k = keyOf(wp);
    for (let i = 0; i < SLOTS.length; i++) {
      const sl = SLOTS[i];
      if (keyOf([sl[0], sl[2]]) === k || keyOf([sl[1], sl[3]]) === k) return i;
    }
    return -1;
  }
  function bfsSetup(s, w1, w2) {
    const tag = (orig) => {
      const t = orig.map(f => f.slice());
      for (const [f, r, c] of w1) t[f][r*4+c] = 99;
      for (const [f, r, c] of w2) t[f][r*4+c] = 98;
      return t;
    };
    const getPos = (t) => {
      const p1 = [], p2 = [];
      for (let f = 0; f < 6; f++) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (t[f][r*4+c] === 99) p1.push([f, r, c]);
        if (t[f][r*4+c] === 98) p2.push([f, r, c]);
      }
      return [p1, p2];
    };
    const k1 = keyOf(FR_L), k2 = keyOf(FL_L);
    const isGoal = (p1, p2) => {
      const a = keyOf(p1), b = keyOf(p2);
      return (a === k1 && b === k2) || (a === k2 && b === k1);
    };
    const start = tag(s);
    const q = [{ t: start, mv: [] }];
    const vis = new Set();
    while (q.length) {
      const { t: cur, mv } = q.shift();
      const [p1, p2] = getPos(cur);
      const k = keyOf(p1) + '#' + keyOf(p2);
      if (vis.has(k)) continue;
      vis.add(k);
      if (isGoal(p1, p2)) return mv;
      if (mv.length >= 8) continue;
      for (const m of OUTER) {
        const nxt = cur.map(f => f.slice());
        applyMove4(nxt, m);
        q.push({ t: nxt, mv: mv.concat([m]) });
      }
    }
    return null;
  }
  function pairAll(s) {
    const moves = [];
    for (const [c1, c2] of DEDGE_COLORS) {
      const wings = findWings(s, c1, c2);
      if (wings.length !== 2) continue;
      if (wingToSlot(wings[0]) === wingToSlot(wings[1])) continue;
      const setup = bfsSetup(s, wings[0], wings[1]);
      if (!setup) continue;
      for (const m of setup) { applyMove4(s, m); moves.push(m); }
      for (const m of PAIR_ALG) { applyMove4(s, m); moves.push(m); }
    }
    return moves;
  }

  // ============ PARITY ============
  const SLOT_FACES = [[0,2],[0,1],[0,5],[0,4],[3,2],[3,1],[3,5],[3,4],[2,1],[2,4],[5,1],[5,4]];
  const SLOT_WING1 = [
    [[0,3,1],[2,0,1]], [[0,1,3],[1,0,2]], [[0,0,1],[5,0,2]], [[0,1,0],[4,0,1]],
    [[3,0,1],[2,3,1]], [[3,1,3],[1,3,1]], [[3,3,1],[5,3,2]], [[3,1,0],[4,3,2]],
    [[2,1,3],[1,1,0]], [[2,1,0],[4,1,3]], [[5,1,0],[1,1,3]], [[5,1,3],[4,1,0]]
  ];
  function countFlipped(s) {
    let flipped = 0;
    for (let si = 0; si < 12; si++) {
      const [f1, f2] = SLOT_FACES[si];
      const [[a1,b1,c1],[a2,b2,c2]] = SLOT_WING1[si];
      const col1 = s[a1][b1*4+c1], col2 = s[a2][b2*4+c2];
      const hasUD = (col1 === 0 || col1 === 3 || col2 === 0 || col2 === 3);
      let isFlipped = false;
      if (hasUD) {
        const udCol = (col1 === 0 || col1 === 3) ? col1 : col2;
        if (f1 === 0 || f1 === 3) isFlipped = (col1 !== udCol);
        else isFlipped = (col2 !== udCol);
      } else {
        const fbCol = (col1 === 2 || col1 === 5) ? col1 : col2;
        if (f1 === 2 || f1 === 5) isFlipped = (col1 !== fbCol);
        else isFlipped = (col2 !== fbCol);
      }
      if (isFlipped) flipped++;
    }
    return flipped;
  }
  function getDedgeAtSlot(s, si) {
    const sl = SLOTS[si];
    const w1 = [sl[0], sl[2]];
    const cols = w1.map(([f, r, c]) => s[f][r*4+c]);
    return cols.sort((a, b) => a - b);
  }
  function dedgePermParity(s) {
    const perm = [];
    for (let si = 0; si < 12; si++) {
      const cols = getDedgeAtSlot(s, si);
      let idx = -1;
      for (let j = 0; j < 12; j++) {
        const dc = DEDGE_COLORS[j].slice().sort((a, b) => a - b);
        if (dc[0] === cols[0] && dc[1] === cols[1]) { idx = j; break; }
      }
      perm.push(idx);
    }
    let inv = 0;
    for (let i = 0; i < 12; i++) for (let j = i+1; j < 12; j++) if (perm[i] > perm[j]) inv++;
    return inv % 2;
  }
  const OLL_ALG = ["Rw'", "U2", "Lw", "F2", "Lw'", "F2", "Rw2", "U2", "Rw", "U2", "Rw'", "U2", "F2", "Rw2", "F2"];
  const PLL_ALG = ["Rw2", "F2", "U2", "Rw2", "R2", "U2", "F2", "Rw2"];

  // ============ 3x3 CONVERSION ============
  function to3x3(s) {
    const s3 = [];
    for (let f = 0; f < 6; f++) {
      s3.push(new Array(9));
      s3[f][0] = s[f][0]; s3[f][2] = s[f][3];
      s3[f][6] = s[f][12]; s3[f][8] = s[f][15];
      s3[f][1] = s[f][1]; s3[f][3] = s[f][4];
      s3[f][5] = s[f][7]; s3[f][7] = s[f][13];
      s3[f][4] = s[f][5];
    }
    return s3;
  }

  // ============ OPTIMIZER ============
  // Gabungkan langkah berurutan di face yang sama: R R' -> hilang, R R -> R2, dll.
  function optimizeMoves(moves) {
    function parse(m) {
      const wide = m.length > 1 && m[1] === 'w';
      const face = wide ? m.slice(0, 2) : m[0];
      const suf = wide ? m.slice(2) : m.slice(1);
      let amt = 1;
      if (suf === "'") amt = 3;
      else if (suf === '2' || suf === '2\'') amt = 2;
      return { face, amt };
    }
    const stack = [];
    for (const m of moves) {
      const { face, amt } = parse(m);
      if (stack.length && stack[stack.length-1].face === face) {
        const top = stack.pop();
        const na = (top.amt + amt) % 4;
        if (na === 1) stack.push({ face, amt: 1 });
        else if (na === 2) stack.push({ face, amt: 2 });
        else if (na === 3) stack.push({ face, amt: 3 });
        // na===0 -> hilang
      } else {
        stack.push({ face, amt });
      }
    }
    return stack.map(({ face, amt }) => amt === 1 ? face : amt === 2 ? face + '2' : face + "'");
  }

  // ============ MAIN SOLVER ============
  // Helper: cek apakah state solved (4x4)
  function isSolvedState(s) {
    for (let f = 0; f < 6; f++) for (let i = 0; i < 16; i++) if (s[f][i] !== f) return false;
    return true;
  }
  // Helper: hitung dedge yang paired
  function countPaired(s) {
    let n = 0;
    for (let si = 0; si < 12; si++) {
      const sl = SLOTS[si];
      const w1 = [sl[0], sl[2]], w2 = [sl[1], sl[3]];
      const c1 = w1.map(([f,r,c]) => s[f][r*4+c]).sort((a,b)=>a-b).join(',');
      const c2 = w2.map(([f,r,c]) => s[f][r*4+c]).sort((a,b)=>a-b).join(',');
      if (c1 === c2) n++;
    }
    return n;
  }

  function solve4x4(state) {
    const orig = state.map(f => f.slice());
    
    // Coba hingga 4 kombinasi parity: [OLL?, PLL?]
    const parityCombos = [[false,false],[true,false],[false,true],[true,true]];
    // Deteksi awal untuk urutan coba (yang terdeteksi dulu)
    const sDetect = orig.map(f => f.slice());
    const cm0 = solveCentersNew(sDetect);
    if (!cm0) return { error: 'centers gagal' };
    pairAll(sDetect);
    const detOLL = countFlipped(sDetect) % 2 === 1;
    const detPLL = dedgePermParity(sDetect) === 1;
    // Urutkan: kombinasi terdeteksi dulu, lalu yang lain
    parityCombos.sort((a,b) => {
      const sa = (a[0]===detOLL?0:1)+(a[1]===detPLL?0:1);
      const sb = (b[0]===detOLL?0:1)+(b[1]===detPLL?0:1);
      return sa-sb;
    });

    for (const [useOLL, usePLL] of parityCombos) {
      const s = orig.map(f => f.slice());
      const phases = [];
      let moves = [];

      // Phase 1: Centers
      const cm = solveCentersNew(s);
      if (!cm) continue;
      phases.push({ name: 'centers', moves: cm });
      moves = moves.concat(cm);

      // Phase 2: Pair edges
      const pm = pairAll(s);
      // Verifikasi pairing 12/12
      if (countPaired(s) !== 12) continue;
      phases.push({ name: 'edges', moves: pm });
      moves = moves.concat(pm);

      // Phase 3: Parity (coba kombinasi)
      const parityMoves = [];
      if (useOLL) {
        for (const m of OLL_ALG) { applyMove4(s, m); parityMoves.push(m); }
      }
      if (usePLL) {
        for (const m of PLL_ALG) { applyMove4(s, m); parityMoves.push(m); }
      }
      if (parityMoves.length > 0) phases.push({ name: 'parity', moves: parityMoves });
      moves = moves.concat(parityMoves);

      // Phase 4: 3x3 stage via Kociemba
      const s3 = to3x3(s);
      const faceOrder = ['U','R','F','D','L','B'];
      const colorToFace = {};
      for (let f = 0; f < 6; f++) colorToFace[s3[f][4]] = faceOrder[f];
      let kStr = '';
      for (let f = 0; f < 6; f++) for (let i = 0; i < 9; i++) {
        const cf = colorToFace[s3[f][i]];
        if (!cf) { kStr = null; break; }
        kStr += cf;
      }
      if (!kStr) continue;
      let cubeMoves = [];
      try {
        if (typeof Cube === 'undefined') throw new Error('Kociemba belum siap');
        const cube = Cube.fromString(kStr);
        const sol = cube.solve();
        cubeMoves = sol.trim().split(/\s+/).filter(x => x.length > 0);
      } catch (e) {
        continue; // coba kombinasi parity lain
      }
      phases.push({ name: 'cube', moves: cubeMoves });
      const allMoves = moves.concat(cubeMoves);

      // VERIFIKASI INTERNAL: apply semua moves ke orig, harus solved
      const t = orig.map(f => f.slice());
      for (const mv of allMoves) applyMove4(t, mv);
      if (!isSolvedState(t)) continue; // coba kombinasi parity berikutnya

      // OPTIMASI: gabungkan langkah redundan (R R' -> hilang, R R -> R2)
      const optMoves = optimizeMoves(allMoves);
      // Verifikasi hasil optimasi
      const t2 = orig.map(f => f.slice());
      for (const mv of optMoves) applyMove4(t2, mv);
      if (!isSolvedState(t2)) {
        return { moves: allMoves, phases }; // fallback: tanpa optimasi
      }
      // Optimasi tiap phase untuk label display
      const optPhases = phases.map(ph => ({ name: ph.name, moves: optimizeMoves(ph.moves) }));
      return { moves: optMoves, phases: optPhases };
    }
    return { error: 'solver tidak menemukan solusi (coba shuffle ulang)' };
  }

  global.Solve4 = { solve4x4 };
})(typeof window !== 'undefined' ? window : global);
