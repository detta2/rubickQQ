// fill_clean336.js — for missing triples: gather conjugated pureTwisted realizations
// from ALL base triples, then 2-term / 4-term pair to cancel twist.
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
const byTriple=new Map();
for(const h of raw){
  const key=h.cyc.join(',');
  if(!byTriple.has(key)) byTriple.set(key,[]);
  byTriple.get(key).push(h);
}
const baseTriples=[...byTriple.keys()].map(k=>k.split(',').map(Number));
console.log('base triples:', baseTriples.length);

// setup T mapping base->target (BFS per base, cached)
const SMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const SM30=SMOVES.concat(SMOVES.map(m=>m+"'"));
const cP={}; for(const m of SM30) cP[m]=CM.moveCorner[m].P;
const setupCache=new Map();
function findSetup(base,target){
  const ck=base.join(',')+'>'+target.join(',');
  if(setupCache.has(ck)) return setupCache.get(ck);
  const [a0,b0,c0]=base;
  const tkey=target.join(',');
  // BFS
  const seen=new Set([a0+','+b0+','+c0]);
  const queue=[[[a0,b0,c0],[]]];
  let res=null, head=0;
  while(head<queue.length){
    const [[x,y,z],seq]=queue[head++];
    if(x+','+y+','+z===tkey){ res=seq; break; }
    if(seq.length>=7) continue;
    for(const m of SM30){
      const nx=cP[m][x],ny=cP[m][y],nz=cP[m][z];
      const k=nx+','+ny+','+nz;
      if(!seen.has(k)){ seen.add(k); queue.push([[nx,ny,nz],seq.concat(m)]); }
    }
  }
  setupCache.set(ck,res);
  return res;
}

function cycTwist(tw,cyc,k){
  const [a,b,c]=cyc;
  const f=s=> s===a?[a,b,c][k%3] : s===b?[b,c,a][k%3] : s===c?[c,a,b][k%3] : s;
  const out=new Array(8);
  for(let s=0;s<8;s++) out[s]=tw[f(s)];
  return out;
}

// existing clean336
const existing=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json','utf8'));
const have=new Set(existing.map(h=>h.triple));
console.log('have:', have.size);
// all 336 triples
const allT=[];
for(let a=0;a<8;a++)for(let b=0;b<8;b++)if(b!==a)for(let c=0;c<8;c++)if(c!==a&&c!==b)allT.push([a,b,c]);
const missing=allT.filter(t=>!have.has(t.join(',')));
console.log('missing:', missing.length);

const newOnes=[];
let done=0;
for(const target of missing){
  const tkey=target.join(',');
  // gather conjugated realizations from all base triples
  const reals=[];
  for(const base of baseTriples){
    const T=findSetup(base,target);
    if(!T) continue;
    for(const h of byTriple.get(base.join(','))){
      const seq=T.concat(h.seq, invSeq(T));
      const Mc=CM.seqCorner(seq);
      // must be 3-cycle on target (allow rotation: (y z x) == (x y z))
      const cy=CM.cornerCycles(Mc);
      if(cy.length===1&&cy[0].length===3){
        const c=cy[0];
        const isRot=(c[0]===target[0]&&c[1]===target[1]&&c[2]===target[2])
          ||(c[0]===target[1]&&c[1]===target[2]&&c[2]===target[0])
          ||(c[0]===target[2]&&c[1]===target[0]&&c[2]===target[1]);
        if(isRot) reals.push({seq,twist:Mc.T.slice()});
      }
    }
    if(reals.length>=40) break; // enough
  }
  if(reals.length<2) continue;
  const n=reals.length;
  let found=null;
  // 2-term
  outer2:
  for(let i=0;i<n&&!found;i++)for(let j=0;j<n&&!found;j++){
    const t2=cycTwist(reals[j].twist,target,1);
    let ok=true;
    for(let s=0;s<8;s++) if((reals[i].twist[s]+t2[s])%3!==0){ok=false;break;}
    if(ok) found=[i,j];
  }
  // 4-term (limited)
  if(!found && n>=2){
    const LIM=Math.min(n,12);
    outer4:
    for(let i=0;i<LIM&&!found;i++)for(let j=0;j<LIM&&!found;j++)
    for(let k=0;k<LIM&&!found;k++)for(let l=0;l<LIM&&!found;l++){
      const t2=cycTwist(reals[j].twist,target,1), t3=cycTwist(reals[k].twist,target,2);
      let ok=true;
      for(let s=0;s<8;s++) if((reals[i].twist[s]+t2[s]+t3[s]+reals[l].twist[s])%3!==0){ok=false;break;}
      if(ok) found=[i,j,k,l];
    }
  }
  if(!found) continue;
  const seq=found.map(i=>reals[i].seq).flat();
  const Mc=CM.seqCorner(seq);
  const cy=CM.cornerCycles(Mc);
  if(cy.length===1&&cy[0].length===3&&Mc.T.every(x=>x===0)
    &&isIdent(seqSub(seq,wingMove,24))&&isIdent(seqSub(seq,midMove,12))&&isIdent(seqSub(seq,centerMove,48))){
    newOnes.push({triple:tkey,seq});
    done++;
  }
}
console.log('filled:', done, '/', missing.length);
const all=existing.concat(newOnes);
fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json',JSON.stringify(all));
console.log('total clean336:', all.length, '/ 336');
