// search_corner1.js — PILOT: find M = C·B·C⁻¹·B⁻¹ = pure corner 3-cycle.
// C: corner 3-cycle (from commutators). B: centralizes wing/middle/center actions of C.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, CC = S5._c;
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {edgePerms} = require('/tmp/edge_perms.json');

// ---- sub perms ----
const compose = (A,B)=>{ const C=new Array(A.length); for(let i=0;i<A.length;i++) C[i]=B[A[i]]; return C; };
const invertP = P=>{ const I=new Array(P.length); for(let i=0;i<P.length;i++) I[P[i]]=i; return I; };
const IDENT = n=>Array.from({length:n},(_,i)=>i);
const isIdent = P=>P.every((v,i)=>v===i);

const MIDSLOTS=[], WINGSLOTS=[];
for(let s=0;s<36;s++) ((s%3)===1?MIDSLOTS:WINGSLOTS).push(s);
const midIdx=new Map(MIDSLOTS.map((s,i)=>[s,i]));
const wingIdx=new Map(WINGSLOTS.map((s,i)=>[s,i]));
function subPerm(move, slots, idxMap){
  const P=edgePerms[move];
  return slots.map(s=>idxMap.get(P[s]));
}
const BMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const BMOVES30=BMOVES.concat(BMOVES.map(m=>m+"'"));
const wingMove={}, midMove={}, centerMove={};
for(const m of BMOVES30){
  wingMove[m]=subPerm(m,WINGSLOTS,wingIdx);
  midMove[m]=subPerm(m,MIDSLOTS,midIdx);
  centerMove[m]=CC.slotPerm(m);
}
function seqSub(seq, moveMap, n){
  let P=IDENT(n);
  for(const m of seq) P=compose(P, moveMap[m]);
  return P;
}
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=seq=>seq.slice().reverse().map(invMove);

// ---- C candidates: commutators [A,B], A,B in outer moves ----
const OUTER=['U','D','F','B','L','R'];
const Ccands=[];
for(const A of OUTER) for(const B of OUTER){
  if(A===B) continue;
  const seq=[A,B,invMove(A),invMove(B)];
  const Mc=CM.seqCorner(seq);
  const cyc=CM.cornerCycles(Mc);
  if(cyc.length===1 && cyc[0].length===3){
    Ccands.push({seq, cyc:cyc[0], Mc,
      Mw:seqSub(seq,wingMove,24), Mm:seqSub(seq,midMove,12), Mt:seqSub(seq,centerMove,48)});
  }
}
console.log('C candidates (corner 3-cycle commutators):', Ccands.length);
for(const c of Ccands.slice(0,12)) console.log('  ', c.seq.join(' '), 'corner', JSON.stringify(c.cyc));

// ---- pilot: for first few C, random B search ----
let rng=12345; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
function randSeq(n){ const s=[]; for(let i=0;i<n;i++) s.push(BMOVES30[Math.floor(rand()*BMOVES30.length)]); return s; }

function tryC(C, tries){
  let hits=0; const Ms=[];
  for(let t=0;t<tries;t++){
    const blen=1+Math.floor(rand()*5); // 1..5
    const B=randSeq(blen);
    const Bw=seqSub(B,wingMove,24), Bm=seqSub(B,midMove,12), Bt=seqSub(B,centerMove,48);
    // centralize?
    if(!isIdent(compose(Bw,C.Mw)) || !isIdent(compose(C.Mw,Bw))) {
      // need Bw*C.Mw == C.Mw*Bw
    }
    if(JSON.stringify(compose(Bw,C.Mw))!==JSON.stringify(compose(C.Mw,Bw))) continue;
    if(JSON.stringify(compose(Bm,C.Mm))!==JSON.stringify(compose(C.Mm,Bm))) continue;
    if(JSON.stringify(compose(Bt,C.Mt))!==JSON.stringify(compose(C.Mt,Bt))) continue;
    // M = C·B·C⁻¹·B⁻¹
    const seq=C.seq.concat(B, invSeq(C.seq), invSeq(B));
    const Mc=CM.seqCorner(seq);
    const cyc=CM.cornerCycles(Mc);
    if(cyc.length!==1||cyc[0].length!==3) continue;
    if(!Mc.T.every(x=>x===0)) continue;
    if(!isIdent(seqSub(seq,wingMove,24))) continue;
    if(!isIdent(seqSub(seq,midMove,12))) continue;
    if(!isIdent(seqSub(seq,centerMove,48))) continue;
    hits++; Ms.push({seq, cyc:cyc[0]});
    if(hits>=5) break;
  }
  return {hits, Ms};
}

for(const C of Ccands.slice(0,6)){
  const {hits, Ms}=tryC(C, 60000);
  console.log(`C=[${C.seq.join(' ')}] corner${JSON.stringify(C.cyc)}: ${hits} hits/60k`);
  for(const m of Ms) console.log('    M corner', JSON.stringify(m.cyc), 'len', m.seq.length);
}
