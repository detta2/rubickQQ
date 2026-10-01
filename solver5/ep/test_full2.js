// test_full2.js — full pipeline with greedy wing solver (multiple attempts).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5=global.Solve5;
const E=require('/tmp/edgesolve5_fixed.js');
const {solveCentersEP}=require('/home/hatch/workspace/rubickqq/solver5/ep/centers_ep.js');
const {solveWingsOrient}=require('/home/hatch/workspace/rubickqq/solver5/ep/wing_solver_orient.js');
const CM=require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {solveCornerPerm}=require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_perm.js');
const {solveCornerOrient}=require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_orient.js');

function scramble(state,seed,n=25){
  let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const faces=['U','D','R','L','F','B','u','d','r','l','f','b','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
  const mods=['',"'",'2'];
  for(let i=0;i<n;i++){ const m=faces[Math.floor(rand()*faces.length)]+mods[Math.floor(rand()*3)]; S5.applyMove5(state,m); }
}
function copyState(s){ return s.map(f=>f.slice()); }

let pass=0;
for(let t=0;t<5;t++){
  const seed=1000+t*137;
  const s0=S5.newSolved5(); scramble(s0,seed);
  let solved=false;
  for(let attempt=0;attempt<3 && !solved;attempt++){
    const s=copyState(s0);
    const allMoves=[];
    const doM=ms=>{ for(const m of ms){ S5.applyMove5(s,m); allMoves.push(m); } };
    let corner={P:[0,1,2,3,4,5,6,7],T:[0,0,0,0,0,0,0,0]};
    const doC=ms=>{ for(const m of ms) corner=CM.composeC(corner,CM.moveCorner[m]); };
    // middles
    const midPH=(st,sl)=>E.midIdx.get(E.edgeIdAt(st,sl)*3+1);
    const midC=(st,sl)=>E.edgeIdAt(st,sl)===Math.floor(sl/3);
    let m=E.solveOrbit(s,E.MIDSLOTS,E.midIdx,E.midTriple,midPH,midC,'middle');
    if(!m){ // parity retry
      S5.applyMove5(s,'M'); allMoves.push('M'); corner=CM.composeC(corner,CM.moveCorner['M']);
      m=E.solveOrbit(s,E.MIDSLOTS,E.midIdx,E.midTriple,midPH,midC,'middle');
      if(!m) break;
    }
    doM(m); doC(m);
    // wings (greedy orient-aware, with seed=attempt for shuffle)
    m=solveWingsOrient(s, attempt+1);
    if(!m) continue; // retry with different shuffle
    doM(m); doC(m);
    // centers EP
    m=solveCentersEP(s);
    if(!m) break;
    doM(m); doC(m);
    // corners
    let r=solveCornerPerm(corner);
    if(!r.seq) break;
    doM(r.seq); doC(r.seq); corner=r.cur;
    r=solveCornerOrient(corner);
    if(!r.seq) break;
    doM(r.seq); doC(r.seq);
    // verify
    const sv=S5.newSolved5();
    let ok=true;
    for(let f=0;f<6&&ok;f++) for(let i=0;i<25;i++) if(s[f][i]!==sv[f][i]) ok=false;
    if(ok){ solved=true; console.log(`seed ${seed}: SOLVED (attempt ${attempt}, ${allMoves.length} moves)`); }
  }
  if(solved) pass++; else console.log(`seed ${seed}: FAIL`);
}
console.log(`PASS ${pass}/5`);
