// bfs_clean.js — BFS conjugates of clean base cycles, keep verified-clean ones.
// macro = inv(Bseq) · M · Bseq, verified: single 3-cycle + zero twist + pure.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, CC = S5._c;
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {edgePerms} = require('/tmp/edge_perms.json');
const fs = require('fs');

const compose=(A,B)=>{const C=new Array(A.length);for(let i=0;i<A.length;i++)C[i]=B[A[i]];return C;};
const IDENT=n=>Array.from({length:n},(_,i)=>i);
const isIdent=P=>{for(let i=0;i<P.length;i++)if(P[i]!==i)return false;return true;};
const MIDSLOTS=[],WINGSLOTS=[];
for(let s=0;s<36;s++)((s%3)===1?MIDSLOTS:WINGSLOTS).push(s);
const midIdx=new Map(MIDSLOTS.map((s,i)=>[s,i])), wingIdx=new Map(WINGSLOTS.map((s,i)=>[s,i]));
const wingMove={},midMove={},centerMove={};
for(const m of CM.MOVES63){
  const P=edgePerms[m];
  wingMove[m]=WINGSLOTS.map(s=>wingIdx.get(P[s]));
  midMove[m]=MIDSLOTS.map(s=>midIdx.get(P[s]));
  centerMove[m]=CC.slotPerm(m);
}
const seqSub=(seq,mm,n)=>{let P=IDENT(n);for(const m of seq)P=compose(P,mm[m]);return P;};
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=seq=>seq.slice().reverse().map(invMove);

const cleanBase=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean_corner3.json','utf8'));
console.log('clean base:', cleanBase.length);

const SMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const SM30=SMOVES.concat(SMOVES.map(m=>m+"'"));
const cP={}; for(const m of SM30) cP[m]=CM.moveCorner[m].P;

const tripleMap=new Map(); // 'x,y,z' -> {seq}
// seed with base (and inverses for opposite direction)
for(const h of cleanBase){
  tripleMap.set(h.cyc.join(','),{seq:h.seq});
  tripleMap.set([h.cyc[0],h.cyc[2],h.cyc[1]].join(','),{seq:invSeq(h.seq)});
}
// BFS: queue of {triple, Bseq, baseSeq}
const queue=[];
for(const h of cleanBase){ queue.push({t:h.cyc, Bseq:[], base:h.seq}); }
let head=0, checked=0, kept=0;
while(head<queue.length){
  const {t, Bseq, base}=queue[head++];
  for(const m of SM30){
    const nt=[cP[m][t[0]],cP[m][t[1]],cP[m][t[2]]];
    const key=nt.join(',');
    if(tripleMap.has(key)) continue;
    const nBseq=Bseq.concat(m);
    if(nBseq.length>5) continue; // depth cap
    const seq=invSeq(nBseq).concat(base, nBseq);
    checked++;
    const Mc=CM.seqCorner(seq);
    const cy=CM.cornerCycles(Mc);
    if(cy.length===1&&cy[0].length===3&&Mc.T.every(x=>x===0)
      &&isIdent(seqSub(seq,wingMove,24))&&isIdent(seqSub(seq,midMove,12))&&isIdent(seqSub(seq,centerMove,48))){
      tripleMap.set(key,{seq});
      kept++;
      queue.push({t:cy[0], Bseq:nBseq, base});
    }
  }
  if(queue.length>2000000) break;
}
console.log(`checked ${checked}, kept ${kept}, coverage ${tripleMap.size}/336`);
if(tripleMap.size>0){
  const arr=[...tripleMap.entries()].map(([k,v])=>({triple:k,seq:v.seq}));
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json',JSON.stringify(arr));
  console.log('saved clean336.json');
}
