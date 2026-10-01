// wing_model.js — wing permutation + orientation model for 5x5.
// Mirrors corner_model.js. Slot-based representation on 24 wing sub-slots:
//   moveWing[m] = {P:[24], F:[24]} — wing at sub-slot s moves to slot P[s],
//   gaining flip F[s] (mod 2). Compose: apply A then B:
//   P[s] = B.P[A.P[s]], F[s] = (A.F[s] + B.F[A.P[s]]) % 2.
//
// Flip convention: F=1 means the wing is physically flipped (its two colors
// are swapped relative to the faces at its slot), matching the engine's
// color-check orientation. Derived from the engine by labeling + color check.
const WS = '/home/hatch/workspace/rubickqq/solver5';
require(WS + '/solver5.js');
const S5 = global.Solve5;
const E = require(WS + '/archive/edgesolve5.js');
const {edgePerms, moves: MOVES63} = require(WS + '/data/edge_perms.json');

const WINGSLOTS = E.WINGSLOTS;       // 24 edge slots (subset of 0..35)
const SLOT_PAIRS = E.SLOT_PAIRS;     // edge slot -> [[f,r,c],[f,r,c]]
const wingIdx = E.wingIdx;           // edge slot -> sub-slot 0..23

// ---- per-move wing action via sticker labeling + engine color check ----
// P[w] = slot where wing w moves. F[w] = TRUE flip (color-vs-face, matching
// the engine's orientation): 0 iff the wing's colors match the faces at its
// new slot. (An earlier label-based F was pure gauge: F = phi ^ phi∘P for all
// moves, making pure flips look impossible. The color-based F is the physical
// orientation.)
const moveWing = {};
(function buildMoveWing(){
  for (const m of MOVES63) {
    const lab = S5.newSolved5();
    // label wing stickers: wing at sub-slot i gets labels (i*2+0, i*2+1)
    for (let i = 0; i < 24; i++) {
      const s = WINGSLOTS[i];
      const pair = SLOT_PAIRS[s];
      lab[pair[0][0]][pair[0][1]*5+pair[0][2]] = i*2+0;
      lab[pair[1][0]][pair[1][1]*5+pair[1][2]] = i*2+1;
    }
    S5.applyMove5(lab, m);
    const col = S5.newSolved5();
    S5.applyMove5(col, m);
    const P = new Array(24), F = new Array(24);
    for (let j = 0; j < 24; j++) {
      const s = WINGSLOTS[j];
      const pair = SLOT_PAIRS[s];
      const l0 = lab[pair[0][0]][pair[0][1]*5+pair[0][2]];
      const l1 = lab[pair[1][0]][pair[1][1]*5+pair[1][2]];
      const w = Math.floor(l0 / 2);
      // sanity: both labels belong to same wing
      if (Math.floor(l1/2) !== w) throw new Error('wing split by move '+m);
      P[w] = j;
      const c0 = col[pair[0][0]][pair[0][1]*5+pair[0][2]];
      const c1 = col[pair[1][0]][pair[1][1]*5+pair[1][2]];
      F[w] = (c0 === pair[0][0] && c1 === pair[1][0]) ? 0 : 1;
    }
    moveWing[m] = {P, F};
  }
})();

const IDENT_W = {P: Array.from({length:24},(_,i)=>i), F: new Array(24).fill(0)};
function composeW(A, B) { // apply A then B
  const P = new Array(24), F = new Array(24);
  for (let s = 0; s < 24; s++) { P[s] = B.P[A.P[s]]; F[s] = (A.F[s] + B.F[A.P[s]]) % 2; }
  return {P, F};
}
function invertW(A) {
  const P = new Array(24), F = new Array(24);
  for (let s = 0; s < 24; s++) { P[A.P[s]] = s; F[A.P[s]] = A.F[s]; }
  return {P, F};
}
const invMove = m => m.endsWith('2') ? m : (m.endsWith("'") ? m.slice(0,-1) : m+"'");
const invSeq = seq => seq.slice().reverse().map(invMove);
function seqWing(seq) {
  let A = IDENT_W;
  for (const m of seq) {
    const M = moveWing[m];
    if (!M) throw new Error('unknown move ' + m);
    A = composeW(A, M);
  }
  return A;
}
function isIdentW(A) {
  for (let s = 0; s < 24; s++) if (A.P[s] !== s || A.F[s] !== 0) return false;
  return true;
}
function permCyclesW(A) {
  const seen = new Array(24).fill(false), out = [];
  for (let i = 0; i < 24; i++) {
    if (seen[i] || A.P[i] === i) continue;
    const cyc = []; let j = i;
    while (!seen[j]) { seen[j] = true; cyc.push(j); j = A.P[j]; }
    if (cyc.length > 1) out.push(cyc);
  }
  return out;
}
function flipSet(A) {
  const out = [];
  for (let s = 0; s < 24; s++) if (A.F[s]) out.push(s);
  return out;
}
// read wing orientation state from cube: returns {piece:[24] home edge of wing at slot s, flip:[24]}
function readWings(state) {
  const piece = new Array(24), flip = new Array(24);
  for (let i = 0; i < 24; i++) {
    const s = WINGSLOTS[i];
    const pair = SLOT_PAIRS[s];
    const c1 = state[pair[0][0]][pair[0][1]*5+pair[0][2]];
    const c2 = state[pair[1][0]][pair[1][1]*5+pair[1][2]];
    piece[i] = E.edgeIdAt(state, s);
    flip[i] = (c1 === pair[0][0] && c2 === pair[1][0]) ? 0 : 1;
  }
  return {piece, flip};
}

module.exports = {moveWing, MOVES63, IDENT_W, composeW, invertW, seqWing,
  invMove, invSeq, isIdentW, permCyclesW, flipSet, readWings,
  WINGSLOTS, SLOT_PAIRS, wingIdx};
console.log('wing_model loaded: 24 slots,', Object.keys(moveWing).length, 'moves');
