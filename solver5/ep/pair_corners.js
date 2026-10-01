// pair_corners.js — pair pureTwisted 3-cycles to cancel twist.
// For triple (a b c), T1=(a b c),τ1 and T2=(a b c),τ2 with τ1 + c(τ2) = 0
//   => T1·T2 = clean (twist-free) pure 3-cycle (a c b). Inverse gives (a b c).
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
// group by triple+direction: key = cyc.join(',')
const byTriple=new Map();
for(const h of raw){
  const key=h.cyc.join(',');
  if(!byTriple.has(key)) byTriple.set(key,[]);
  byTriple.get(key).push(h);
}
console.log('base triples with pureTwisted:', byTriple.size);

// Product seq1·seq2: tw[s] = T1_tw[s] + T2_tw[P1[s]]. For c=(a b c): P1(a)=b etc.
// Need: τ1[a]+τ2[b]=0, τ1[b]+τ2[c]=0, τ1[c]+τ2[a]=0.
function twistsCancel(t1, t2, cyc){
  const [a,b,c]=cyc;
  return (t1[a]+t2[b])%3===0 && (t1[b]+t2[c])%3===0 && (t1[c]+t2[a])%3===0;
}

const clean=[]; const seen=new Set();
for(const [key, list] of byTriple){
  const cyc=list[0].cyc;
  let found=null;
  outer:
  for(const h1 of list){
    for(const h2 of list){
      if(twistsCancel(h1.twist, h2.twist, cyc)){ found=[h1,h2]; break outer; }
    }
  }
  if(found){
    const seq=found[0].seq.concat(found[1].seq);
    // verify
    const Mc=CM.seqCorner(seq);
    const cy=CM.cornerCycles(Mc);
    const okCyc = cy.length===1&&cy[0].length===3;
    const okTw = Mc.T.every(x=>x===0);
    const okW = isIdent(seqSub(seq,wingMove,24)), okM = isIdent(seqSub(seq,midMove,12)), okT = isIdent(seqSub(seq,centerMove,48));
    if(okCyc&&okTw&&okW&&okM&&okT){
      // product cycle should be (a c b)
      clean.push({seq, cyc:cy[0]});
    } else {
      console.log('VERIFY FAIL for', key, {okCyc,okTw,okW,okM,okT});
    }
  }
}
console.log('clean 3-cycles via pairing:', clean.length, '/', byTriple.size);
const cov=new Set(clean.map(h=>h.cyc.join(',')));
console.log('distinct clean triples:', cov.size);
for(const h of clean.slice(0,8)) console.log('  ', JSON.stringify(h.cyc), 'len', h.seq.length);
if(clean.length){
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean_corner3.json',
    JSON.stringify(clean.map(h=>({seq:h.seq,cyc:h.cyc})),null,1));
  console.log('saved clean_corner3.json');
}
