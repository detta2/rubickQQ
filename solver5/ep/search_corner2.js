// search_corner2.js — broad search for M = C·B·C⁻¹·B⁻¹ = pure corner 3-cycle.
// Phase A: C pool (random seqs, corner = single 3-cycle).
// Phase B: B pool (random seqs, store actions).
// Phase C: match centralizers, verify M.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, CC = S5._c;
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {edgePerms} = require('/tmp/edge_perms.json');
const fs = require('fs');

const compose=(A,B)=>{const C=new Array(A.length);for(let i=0;i<A.length;i++)C[i]=B[A[i]];return C;};
const invertP=P=>{const I=new Array(P.length);for(let i=0;i<P.length;i++)I[P[i]]=i;return I;};
const IDENT=n=>Array.from({length:n},(_,i)=>i);
const isIdent=P=>{for(let i=0;i<P.length;i++)if(P[i]!==i)return false;return true;};
const eq=(A,B)=>{for(let i=0;i<A.length;i++)if(A[i]!==B[i])return false;return true;};

const MIDSLOTS=[],WINGSLOTS=[];
for(let s=0;s<36;s++)((s%3)===1?MIDSLOTS:WINGSLOTS).push(s);
const midIdx=new Map(MIDSLOTS.map((s,i)=>[s,i])), wingIdx=new Map(WINGSLOTS.map((s,i)=>[s,i]));
const BMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const BM30=BMOVES.concat(BMOVES.map(m=>m+"'"));
const wingMove={},midMove={},centerMove={};
for(const m of BM30){
  const P=edgePerms[m];
  wingMove[m]=WINGSLOTS.map(s=>wingIdx.get(P[s]));
  midMove[m]=MIDSLOTS.map(s=>midIdx.get(P[s]));
  centerMove[m]=CC.slotPerm(m);
}
const seqSub=(seq,mm,n)=>{let P=IDENT(n);for(const m of seq)P=compose(P,mm[m]);return P;};
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=seq=>seq.slice().reverse().map(invMove);

let rng=987654321; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
const randSeq=(n,set)=>{const s=[];for(let i=0;i<n;i++)s.push(set[Math.floor(rand()*set.length)]);return s;};

// ---------- Phase A: C pool ----------
console.log('Phase A: building C pool...');
const Cpool=[]; const seenC=new Set();
const CLEN=9;
let tries=0;
while(Cpool.length<150 && tries<3000000){
  tries++;
  const seq=randSeq(CLEN,BM30);
  const Mc=CM.seqCorner(seq);
  const cyc=CM.cornerCycles(Mc);
  if(cyc.length!==1||cyc[0].length!==3) continue;
  const key=cyc[0].join(',');
  if(seenC.has(key)) continue;
  seenC.add(key);
  Cpool.push({seq, cyc:cyc[0], Mc,
    Mw:seqSub(seq,wingMove,24), Mm:seqSub(seq,midMove,12), Mt:seqSub(seq,centerMove,48)});
}
console.log(`  C pool: ${Cpool.length} (tries ${tries})`);

// ---------- Phase B: B pool ----------
console.log('Phase B: building B pool...');
const Bpool=[];
const BN=120000;
for(let i=0;i<BN;i++){
  const seq=randSeq(2+Math.floor(rand()*6),BM30);
  Bpool.push({seq, Bw:seqSub(seq,wingMove,24), Bm:seqSub(seq,midMove,12),
    Bt:seqSub(seq,centerMove,48), Bc:CM.seqCorner(seq)});
}
console.log(`  B pool: ${Bpool.length}`);

// ---------- Phase C: match ----------
console.log('Phase C: matching...');
const hits=[]; const seenM=new Set();
const t0=Date.now();
for(const C of Cpool){
  for(const B of Bpool){
    if(!eq(compose(B.Bw,C.Mw),compose(C.Mw,B.Bw))) continue;
    if(!eq(compose(B.Bm,C.Mm),compose(C.Mm,B.Bm))) continue;
    if(!eq(compose(B.Bt,C.Mt),compose(C.Mt,B.Bt))) continue;
    const seq=C.seq.concat(B.seq, invSeq(C.seq), invSeq(B.seq));
    const Mc=CM.seqCorner(seq);
    const cyc=CM.cornerCycles(Mc);
    if(cyc.length!==1||cyc[0].length!==3) continue;
    if(!Mc.T.every(x=>x===0)) continue;
    if(!isIdent(seqSub(seq,wingMove,24))) continue;
    if(!isIdent(seqSub(seq,midMove,12))) continue;
    if(!isIdent(seqSub(seq,centerMove,48))) continue;
    const key=cyc[0].join(',');
    if(seenM.has(key)) continue;
    seenM.add(key);
    hits.push({seq, cyc:cyc[0]});
    if(hits.length>=40) break;
  }
  if(hits.length>=40) break;
}
console.log(`  hits: ${hits.length} distinct corner 3-cycles (${((Date.now()-t0)/1000).toFixed(1)}s)`);
for(const h of hits.slice(0,10)) console.log('   ', JSON.stringify(h.cyc), 'len', h.seq.length);
if(hits.length){
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/corner_cycles.json',
    JSON.stringify(hits.map(h=>({seq:h.seq,cyc:h.cyc})),null,1));
  console.log('  saved ep/corner_cycles.json');
}
// also report twist distribution: how many had perm-3-cycle but twist!=0 (for diagnostics)
