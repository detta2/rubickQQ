// build_clean336.js — for each of 336 ordered triples, build a clean (twist-free)
// pure corner 3-cycle via: conjugate base pureTwisted realizations, then pair to cancel twist.
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

const raw=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twisted.json','utf8'));
// pick base triple: most realizations in a single direction
const byDir=new Map();
for(const h of raw){
  const key=h.cyc.join(',');
  if(!byDir.has(key)) byDir.set(key,[]);
  byDir.get(key).push(h);
}
let bestKey=null,bestN=0;
for(const [k,v] of byDir) if(v.length>bestN){bestN=v.length;bestKey=k;}
console.log('base triple:', bestKey, 'realizations:', bestN);
const baseCyc=bestKey.split(',').map(Number);
const baseReals=byDir.get(bestKey);

// BFS setup map: T with (T(a0),T(b0),T(c0)) = target, T = move sequence
const SMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const SM30=SMOVES.concat(SMOVES.map(m=>m+"'"));
const cPermMove={}; for(const m of SM30) cPermMove[m]=CM.moveCorner[m].P;
const setupMap=new Map(); // 'x,y,z' -> seq
(function(){
  const [a0,b0,c0]=baseCyc;
  const start=a0+','+b0+','+c0;
  setupMap.set(start,[]);
  const queue=[[a0,b0,c0]];
  let head=0;
  while(head<queue.length){
    const [x,y,z]=queue[head++];
    const seq=setupMap.get(x+','+y+','+z);
    for(const m of SM30){
      const P=cPermMove[m];
      const nx=P[x],ny=P[y],nz=P[z];
      const key=nx+','+ny+','+nz;
      if(!setupMap.has(key)){ setupMap.set(key,seq.concat(m)); queue.push([nx,ny,nz]); }
    }
  }
})();
console.log('setup map size:', setupMap.size, '/ 336');

function twistsCancel(t1,t2,cyc){
  const [a,b,c]=cyc;
  return (t1[a]+t2[b])%3===0 && (t1[b]+t2[c])%3===0 && (t1[c]+t2[a])%3===0;
}

const cleanMap=new Map(); // 'x,y,z' -> {seq, cyc}
let fail=0;
for(const [tkey,T] of setupMap){
  const target=tkey.split(',').map(Number);
  // conjugate each base realization
  const conj=baseReals.map(h=>{
    const seq=T.concat(h.seq, invSeq(T));
    const Mc=CM.seqCorner(seq);
    return {seq, twist:Mc.T.slice(), Mc};
  });
  // sanity: each should be a 3-cycle on target
  // pair
  let found=null;
  outer:
  for(const c1 of conj){
    for(const c2 of conj){
      if(twistsCancel(c1.twist,c2.twist,target)){ found=[c1,c2]; break outer; }
    }
  }
  if(!found){ fail++; continue; }
  const seq=found[0].seq.concat(found[1].seq);
  // verify full
  const Mc=CM.seqCorner(seq);
  const cy=CM.cornerCycles(Mc);
  const ok=cy.length===1&&cy[0].length===3&&Mc.T.every(x=>x===0)
    &&isIdent(seqSub(seq,wingMove,24))&&isIdent(seqSub(seq,midMove,12))&&isIdent(seqSub(seq,centerMove,48));
  if(!ok){ fail++; continue; }
  cleanMap.set(tkey,{seq,cyc:cy[0]});
}
console.log(`clean built: ${cleanMap.size}/336, fail: ${fail}`);
if(cleanMap.size){
  const arr=[...cleanMap.entries()].map(([k,v])=>({triple:k,cyc:v.cyc,seq:v.seq}));
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json',JSON.stringify(arr));
  console.log('saved clean336.json, size', JSON.stringify(arr).length);
}
