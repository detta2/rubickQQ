// middle_model.js — middle permutation + orientation model for 5x5.
// Mirrors wing_model.js. Slot-based on 12 middle sub-slots.
const WS = '/home/hatch/workspace/rubickqq/solver5';
require(WS + '/solver5.js');
const S5 = global.Solve5;
const E = require(WS + '/archive/edgesolve5.js');

const MIDSLOTS = E.MIDSLOTS;       // 12 edge slots
const SLOT_PAIRS = E.SLOT_PAIRS;   // edge slot -> [[f,r,c],[f,r,c]]
const {moves: MOVES63} = require(WS + '/data/edge_perms.json');

const moveMiddle = {};
(function buildMoveMiddle(){
  for (const m of MOVES63) {
    const lab = S5.newSolved5();
    for (let i = 0; i < 12; i++) {
      const s = MIDSLOTS[i];
      const pair = SLOT_PAIRS[s];
      if(!pair) continue;
      lab[pair[0][0]][pair[0][1]*5+pair[0][2]] = i*2+0;
      lab[pair[1][0]][pair[1][1]*5+pair[1][2]] = i*2+1;
    }
    try { S5.applyMove5(lab, m); } catch(e){ continue; }
    const col = S5.newSolved5();
    try { S5.applyMove5(col, m); } catch(e){ continue; }
    const P = new Array(12), F = new Array(12);
    let ok=true;
    for (let j = 0; j < 12; j++) {
      const s = MIDSLOTS[j];
      const pair = SLOT_PAIRS[s];
      if(!pair){ ok=false; break; }
      const l0 = lab[pair[0][0]][pair[0][1]*5+pair[0][2]];
      const l1 = lab[pair[1][0]][pair[1][1]*5+pair[1][2]];
      if(l0===undefined||l1===undefined){ ok=false; break; }
      const w = Math.floor(l0 / 2);
      if (Math.floor(l1/2) !== w){ ok=false; break; }
      P[w] = j;
      const c0 = col[pair[0][0]][pair[0][1]*5+pair[0][2]];
      const c1 = col[pair[1][0]][pair[1][1]*5+pair[1][2]];
      F[w] = (c0 === pair[0][0] && c1 === pair[1][0]) ? 0 : 1;
    }
    if(ok) moveMiddle[m] = {P, F};
  }
})();

const IDENT_M = {P: Array.from({length:12},(_,i)=>i), F: new Array(12).fill(0)};
function composeM(A, B) {
  const P = new Array(12), F = new Array(12);
  for (let s = 0; s < 12; s++) { P[s] = B.P[A.P[s]]; F[s] = (A.F[s] + B.F[A.P[s]]) % 2; }
  return {P, F};
}
const invMove = m => m.endsWith('2') ? m : (m.endsWith("'") ? m.slice(0,-1) : m+"'");
function seqMiddle(seq) {
  let A = IDENT_M;
  for (const m of seq) {
    const M = moveMiddle[m];
    if (!M) throw new Error('unknown move ' + m);
    A = composeM(A, M);
  }
  return A;
}

module.exports = {moveMiddle, seqMiddle, composeM, IDENT_M, MIDSLOTS};
console.log('middle_model loaded, moves:', Object.keys(moveMiddle).length);
