// wing_solver_orient.js — orientation-aware wing solver via simulation-greedy.
// Uses wingTriple 3-cycles; picks moves that increase solved count (pos+orient).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5=global.Solve5; const E=require('/tmp/edgesolve5_fixed.js');
const invM=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invS=s=>s.slice().reverse().map(invM);
function fullSeq(e){ return invS(e.Bseq).concat(e.C.moves, e.Bseq); }
// deep copy 5x5 state
function copyState(s){ return s.map(f=>f.slice()); }
function applySeq(s, seq){ for(const m of seq) S5.applyMove5(s,m); }

// solved count (position + orientation)
function solvedInfo(s){
  let n=0; const bad=[];
  for(const sl of E.WINGSLOTS){
    const okPos = E.edgeIdAt(s,sl)===Math.floor(sl/3);
    const pair=E.SLOT_PAIRS[sl];
    const c1=s[pair[0][0]][pair[0][1]*5+pair[0][2]];
    const c2=s[pair[1][0]][pair[1][1]*5+pair[1][2]];
    const okOri = c1===pair[0][0] && c2===pair[1][0];
    if(okPos&&okOri) n++; else bad.push(sl);
  }
  return {n, bad};
}

// Precompute full seqs for all triples (as arrays)
const tripleSeqs=[];
for(const [k,e] of E.wingTriple){
  tripleSeqs.push({key:k, seq:fullSeq(e), cyc:e.C.cyc});
}
console.log('tripleSeqs:', tripleSeqs.length);

function solveWingsOrient(state, seed=0){
  const moves=[];
  let guard=0;
  const order=[...tripleSeqs];
  let rng=seed||1;
  const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
  for(let i=order.length-1;i>0;i--){ const j=(rand()*(i+1))|0; [order[i],order[j]]=[order[j],order[i]]; }
  while(true){
    const {n, bad}=solvedInfo(state);
    if(n===24) return moves;
    if(++guard>500) return null;
    let best=null;
    const badSet=new Set(bad);
    for(const t of order){
      const [a,b,c]=t.cyc;
      if(!badSet.has(a)&&!badSet.has(b)&&!badSet.has(c)) continue;
      const cp=copyState(state);
      applySeq(cp, t.seq);
      const nn=solvedInfo(cp).n;
      if(nn>n){ best=t; break; }
    }
    if(!best) return null;
    applySeq(state, best.seq);
    moves.push(...best.seq);
  }
}

if(require.main===module){
  function scramble(state, seed, n=25){
    let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
    const faces=['U','D','R','L','F','B','u','d','r','l','f','b','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
    const mods=['',"'",'2'];
    for(let i=0;i<n;i++){ const m=faces[Math.floor(rand()*faces.length)]+mods[Math.floor(rand()*3)]; S5.applyMove5(state,m); }
  }
  let pass=0;
  for(let t=0;t<5;t++){
    const seed=1000+t*137;
    const s=S5.newSolved5(); scramble(s,seed);
    const midPH=(st,sl)=>E.midIdx.get(E.edgeIdAt(st,sl)*3+1);
    const midC=(st,sl)=>E.edgeIdAt(st,sl)===Math.floor(sl/3);
    let m=E.solveOrbit(s,E.MIDSLOTS,E.midIdx,E.midTriple,midPH,midC,'middle');
    applySeq(s,m);
    // wings: position first? Or direct orient-aware from scratch?
    // Try direct orient-aware (it handles position too)
    const t0=Date.now();
    m=solveWingsOrient(s);
    console.log(`seed ${seed}: ${m?('OK len '+m.length+' time '+(Date.now()-t0)+'ms'):'FAIL'}`);
    if(m) pass++;
  }
  console.log(`${pass}/5`);
}
module.exports={solveWingsOrient};
