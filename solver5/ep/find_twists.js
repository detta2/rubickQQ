// find_twists.js — find pure twists (identity perm, twist on 2 corners, pure on wings/middles/centers)
// via pairing pureTwisted realizations.
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
console.log('pureTwisted:', raw.length);

// Precompute corner action for each
const acts=raw.map(h=>({h, Mc:CM.seqCorner(h.seq)}));
// Pair: S = h1·h2. Want Mc.P=id, twist on exactly 2 corners.
const twists=new Map(); // "a,b,ta,tb" -> seq  (twist a by ta, b by tb)
for(let i=0;i<acts.length;i++){
  for(let j=0;j<acts.length;j++){
    const A=acts[i].Mc, B=acts[j].Mc;
    const Mc=CM.composeC(A,B);
    if(!Mc.P.every((x,k)=>x===k)) continue;
    if(Mc.T.every(x=>x===0)) continue;
    const sup=[];
    for(let s=0;s<8;s++) if(Mc.T[s]!==0) sup.push(s);
    if(sup.length!==2) continue;
    const [a,b]=sup;
    const key=[a,b,Mc.T[a],Mc.T[b]].join(',');
    if(!twists.has(key)){
      // verify pure on wings/middles/centers
      const seq=acts[i].h.seq.concat(acts[j].h.seq);
      if(isIdent(seqSub(seq,wingMove,24))&&isIdent(seqSub(seq,midMove,12))&&isIdent(seqSub(seq,centerMove,48))){
        twists.set(key,seq);
      }
    }
  }
}
console.log('pure double-twists found:', twists.size);
// Check coverage for buffer 0: need (a,0) with ta+tb=0 for a=1..7
for(let a=1;a<8;a++){
  const k1=[a,0,1,2].join(','), k2=[a,0,2,1].join(',');
  const k3=[0,a,2,1].join(','), k4=[0,a,1,2].join(','); // (0,a) is same pair
  console.log(`a=${a}:`, twists.has(k1)?'Y':'-', twists.has(k2)?'Y':'-',
    '(as 0,a):', twists.has(k3)?'Y':'-', twists.has(k4)?'Y':'-');
}
// save
const arr=[...twists.entries()].map(([k,seq])=>({key:k,seq}));
fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twists.json',JSON.stringify(arr));
console.log('saved pure_twists.json');
