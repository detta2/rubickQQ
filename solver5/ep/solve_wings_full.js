// solve_wings_full.js — Complete wing solver: positions + orientations.
// Uses the TRUE color-based flip model (fixed 2026-10-01).
// - Positions: 3-cycle insertion using the 12,144 wing triples (middle-preserving).
// - Parity: 'r' (4-cycle, odd) if P is odd.
// - Orientations: 276 pure double-flips (opposite-direction pairs).
// Verified 20/20 on random scrambles (model + engine).
const WS = '/home/hatch/workspace/rubickqq/solver5';
const WM = require(WS + '/ep/wing_model.js');
const E = require(WS + '/archive/edgesolve5.js');
const dfDB = require(WS + '/ep/wing_doubleflips.json');

const fullSeq = e => WM.invSeq(e.Bseq).concat(e.C.moves, e.Bseq);

// Triple perm map: "a,b,c" -> move sequence for perm [a,b,c] (a->b->c->a)
const tripleMap = new Map();
for (const [k, e] of E.wingTriple) {
  const A = WM.seqWing(fullSeq(e));
  const cyc = WM.permCyclesW(A);
  if (cyc.length !== 1 || cyc[0].length !== 3) continue;
  const pk = cyc[0].join(',');
  if (!tripleMap.has(pk)) tripleMap.set(pk, fullSeq(e));
}

// Double-flip map: "a,b" (a<b) -> move sequence (pure flip of wings a,b)
const dfMap = new Map();
for (const e of dfDB) dfMap.set(e.flips.join(','), e.seq);

function parity(P) {
  const n = P.length, seen = new Array(n).fill(false);
  let c = 0;
  for (let i = 0; i < n; i++) if (!seen[i]) { c++; let j = i; while (!seen[j]) { seen[j] = true; j = P[j]; } }
  return (n - c) % 2;
}

// Solve P (perm on 0..23) to identity using 3-cycles. Returns move list or null.
function solvePos(P) {
  let cur = P.slice();
  const moves = [];
  const applyPerm = (a, b, c) => {
    const Pt = x => x === a ? b : x === b ? c : x === c ? a : x;
    for (let w = 0; w < 24; w++) cur[w] = Pt(cur[w]);
  };
  let guard = 0;
  while (true) {
    const uns = [];
    for (let i = 0; i < 24; i++) if (cur[i] !== i) uns.push(i);
    if (uns.length === 0) break;
    if (++guard > 200) return null;
    if (uns.length === 2) {
      // Even perm cannot have exactly 2 misplaced; this means odd parity.
      // Caller should have fixed parity. Return null.
      return null;
    }
    const s = uns[0], t = cur[s]; // piece s is at slot t; want it at s
    // Find u such that triple [s,u,t] exists. Applies s->u->t->s, sending piece s home.
    let found = null;
    for (const u of uns) {
      if (u === s || u === t) continue;
      const k = s + ',' + u + ',' + t;
      if (tripleMap.has(k)) { found = { u, seq: tripleMap.get(k) }; break; }
    }
    if (!found) return null;
    applyPerm(s, found.u, t);
    moves.push(...found.seq);
  }
  return moves;
}

// Solve wings given (P,F). P[w]=slot of w, F[w]=flip (0/1).
// Returns move sequence or null.
function solveWings(P, F) {
  let curP = P.slice(), curF = F.slice();
  const moves = [];
  // Parity fix: 'r' is a 4-cycle (odd) on wings, preserves middles.
  if (parity(curP) === 1) {
    const Ar = WM.seqWing(['r']);
    const nP = new Array(24), nF = new Array(24);
    for (let s = 0; s < 24; s++) { nP[s] = Ar.P[curP[s]]; nF[s] = curF[s] ^ Ar.F[curP[s]]; }
    curP = nP; curF = nF;
    moves.push('r');
  }
  // Positions
  const pm = solvePos(curP);
  if (!pm) return null;
  moves.push(...pm);
  const Ap = WM.seqWing(pm);
  const Pt = new Array(24), Ft = new Array(24);
  for (let s = 0; s < 24; s++) { Pt[s] = Ap.P[curP[s]]; Ft[s] = curF[s] ^ Ap.F[curP[s]]; }
  if (!Pt.every((x, i) => x === i)) return null;
  // Orientations: pair up flipped wings, apply pure double-flips.
  const fl = [];
  for (let s = 0; s < 24; s++) if (Ft[s]) fl.push(s);
  if (fl.length % 2) return null;
  for (let i = 0; i < fl.length; i += 2) {
    const a = fl[i], b = fl[i + 1];
    const k = a < b ? a + ',' + b : b + ',' + a;
    const sq = dfMap.get(k);
    if (!sq) return null;
    moves.push(...sq);
  }
  return moves;
}

module.exports = { solveWings, solvePos, tripleMap, dfMap, parity };
