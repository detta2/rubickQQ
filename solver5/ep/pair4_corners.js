// pair4_corners.js — 4-term pairing: T1·T2·T3·T4 (all (a b c)) = (a b c),
// twist = τ1 + c(τ2) + c²(τ3) + τ4 = 0. More flexible than 2-term.
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

const raw=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twisted.json','utf8'));
const byTriple=new Map();
for(const h of raw){
  const key=h.cyc.join(',');
  if(!byTriple.has(key)) byTriple.set(key,[]);
  byTriple.get(key).push(h);
}

// c=(a b c). cycTwist(tw, k): apply c^k to twist vector: [c^k(τ)][s] = τ[c^k(s)]
function cycTwist(tw, cyc, k){
  const [a,b,c]=cyc;
  const mp={[a]:[b,c,a][k%3]||a}; // c^k(a)
  // c^0=id, c^1: a->b,b->c,c->a ; c^2: a->c,c->b,b->a
  const f=s=>{
    if(s===a) return [a,b,c][k%3];
    if(s===b) return [b,c,a][k%3];
    if(s===c) return [c,a,b][k%3];
    return s;
  };
  const out=new Array(8);
  for(let s=0;s<8;s++) out[s]=tw[f(s)];
  return out;
}

const clean=[]; const seen=new Set();
for(const [key,list] of byTriple){
  const cyc=list[0].cyc;
  const n=list.length;
  let found=null;
  // 2-term first
  outer2:
  for(let i=0;i<n && !found;i++) for(let j=0;j<n && !found;j++){
    const t2=cycTwist(list[j].twist,cyc,1);
    let ok=true;
    for(let s=0;s<8;s++) if((list[i].twist[s]+t2[s])%3!==0){ok=false;break;}
    if(ok) found=[i,j];
  }
  // 4-term
  if(!found){
    outer4:
    for(let i=0;i<n && !found;i++) for(let j=0;j<n && !found;j++)
    for(let k=0;k<n && !found;k++) for(let l=0;l<n && !found;l++){
      const t2=cycTwist(list[j].twist,cyc,1), t3=cycTwist(list[k].twist,cyc,2);
      let ok=true;
      for(let s=0;s<8;s++) if((list[i].twist[s]+t2[s]+t3[s]+list[l].twist[s])%3!==0){ok=false;break;}
      if(ok) found=[i,j,k,l];
    }
  }
  if(!found) continue;
  const seq=found.map(i=>list[i].seq).flat();
  const Mc=CM.seqCorner(seq);
  const cy=CM.cornerCycles(Mc);
  if(cy.length===1&&cy[0].length===3&&Mc.T.every(x=>x===0)
    &&isIdent(seqSub(seq,wingMove,24))&&isIdent(seqSub(seq,midMove,12))&&isIdent(seqSub(seq,centerMove,48))){
    if(!seen.has(key)){ seen.add(key); clean.push({seq,cyc:cy[0]}); }
  }
}
console.log('clean via 2/4-term pairing:', clean.length, '/', byTriple.size);
if(clean.length){
  const prev=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean_corner3.json','utf8'));
  const all=new Map(prev.map(h=>[h.cyc.join(','),h]));
  for(const h of clean) all.set(h.cyc.join(','),h);
  const arr=[...all.values()];
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean_corner3.json',JSON.stringify(arr,null,1));
  console.log('total clean:', arr.length);
}
