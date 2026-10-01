// test_full_corners.js — full 5x5 pipeline: scramble → edges (orient-aware wings) →
// centersEP → corners (perm+orient) → verify FULLY solved.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5;
const E = require('/tmp/edgesolve5_fixed.js');
const {solveCentersEP} = require('/home/hatch/workspace/rubickqq/solver5/ep/centers_ep.js');
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {solveCornerPerm} = require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_perm.js');
const {solveCornerOrient} = require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_orient.js');

function scramble(state, seed, n=25){
  let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const faces=['U','D','R','L','F','B','u','d','r','l','f','b','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
  const mods=['',"'",'2'];
  for(let i=0;i<n;i++){ const m=faces[Math.floor(rand()*faces.length)]+mods[Math.floor(rand()*3)]; S5.applyMove5(state,m); }
  return state;
}
function solveWP(state, slots, idxMap, tripleMap, pieceHome, isCorrect, paritySeq){
  let m=E.solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrect, 'x');
  if(m) return m;
  const moves=[];
  for(const mv of paritySeq){ S5.applyMove5(state, mv); moves.push(mv); }
  m=E.solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrect, 'x');
  if(m){ moves.push(...m); return moves; }
  return null;
}

const wingC_orient=(st,sl)=>{
  if(E.edgeIdAt(st,sl)!==Math.floor(sl/3)) return false;
  const pair=E.SLOT_PAIRS[sl];
  const c1=st[pair[0][0]][pair[0][1]*5+pair[0][2]];
  const c2=st[pair[1][0]][pair[1][1]*5+pair[1][2]];
  return c1===pair[0][0] && c2===pair[1][0];
};

let pass=0, fail=0;
const N=20;
for(let t=0;t<N;t++){
  const seed=1000+t*137;
  const s=S5.newSolved5(); scramble(s, seed);
  const allMoves=[];
  const doMoves=ms=>{ for(const m of ms){ S5.applyMove5(s,m); allMoves.push(m); } };
  // track corner state in parallel via CM
  let corner={P:[0,1,2,3,4,5,6,7],T:[0,0,0,0,0,0,0,0]};
  const applyCorner=ms=>{ for(const m of ms) corner=CM.composeC(corner, CM.moveCorner[m]); };

  // 1. middles
  const midPH=(st,sl)=>E.midIdx.get(E.edgeIdAt(st,sl)*3+1);
  const midC=(st,sl)=>E.edgeIdAt(st,sl)===Math.floor(sl/3);
  let m=solveWP(s, E.MIDSLOTS, E.midIdx, E.midTriple, midPH, midC, ['M']);
  if(!m){ console.log(`seed ${seed}: FAIL@middles`); fail++; continue; }
  doMoves(m); applyCorner(m);
  // 2. wings (orientation-aware)
  const wingPH=(st,sl)=>E.edgeIdAt(st,sl);
  m=solveWP(s, E.WINGSLOTS, E.wingIdx, E.wingTriple, wingPH, wingC_orient, ['r']);
  if(!m){ console.log(`seed ${seed}: FAIL@wings`); fail++; continue; }
  doMoves(m); applyCorner(m);
  // 3. centers EP
  m=solveCentersEP(s);
  if(!m){ console.log(`seed ${seed}: FAIL@centers`); fail++; continue; }
  doMoves(m); applyCorner(m);
  // 4. corners perm
  let r=solveCornerPerm(corner);
  if(!r.seq){ console.log(`seed ${seed}: FAIL@cperm ${r.err}`); fail++; continue; }
  doMoves(r.seq); applyCorner(r.seq); corner=r.cur;
  // 5. corners orient
  r=solveCornerOrient(corner);
  if(!r.seq){ console.log(`seed ${seed}: FAIL@cori ${r.err}`); fail++; continue; }
  doMoves(r.seq); applyCorner(r.seq); corner=r.cur;
  // verify fully solved: compare to newSolved5
  const solved=S5.newSolved5();
  let ok=true;
  for(let f=0;f<6 && ok;f++) for(let i=0;i<25;i++) if(s[f][i]!==solved[f][i]){ ok=false; break; }
  if(ok){ pass++; } else { console.log(`seed ${seed}: FAIL@verify`); fail++; }
}
console.log(`FULL PIPELINE: ${pass}/${N} PASS, ${fail} fail`);
