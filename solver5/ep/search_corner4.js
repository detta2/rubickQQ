// search_corner4.js — classify [X,Y] commutators: pure corner 3-cycles by twist pattern.
// Pure = identity on wings/middles/centers. Record twist vectors for pairing analysis.
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
const MV=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','u','d','r','l','f','b','M','E','S'];
const MV30=MV.concat(MV.map(m=>m+"'"));
const wingMove={},midMove={},centerMove={};
for(const m of MV30){
  const P=edgePerms[m];
  wingMove[m]=WINGSLOTS.map(s=>wingIdx.get(P[s]));
  midMove[m]=MIDSLOTS.map(s=>midIdx.get(P[s]));
  centerMove[m]=CC.slotPerm(m);
}
const seqSub=(seq,mm,n)=>{let P=IDENT(n);for(const m of seq)P=compose(P,mm[m]);return P;};
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=seq=>seq.slice().reverse().map(invMove);
const comm=(X,Y)=>X.concat(Y,invSeq(X),invSeq(Y));

function genSeqs(len){
  const out=[];
  const rec=(cur)=>{
    if(cur.length===len){ out.push(cur.slice()); return; }
    for(const m of MV30){
      if(cur.length && invMove(cur[cur.length-1])===m) continue;
      cur.push(m); rec(cur); cur.pop();
    }
  };
  rec([]);
  return out;
}

const pureTwisted=[]; // {seq, cyc, twist:[8]}
const pureClean=[];
let n3cyc=0;
function test(X,Y){
  const seq=comm(X,[Y]);
  const Mc=CM.seqCorner(seq);
  const cyc=CM.cornerCycles(Mc);
  if(cyc.length!==1||cyc[0].length!==3) return;
  n3cyc++;
  if(!isIdent(seqSub(seq,wingMove,24))) return;
  if(!isIdent(seqSub(seq,midMove,12))) return;
  if(!isIdent(seqSub(seq,centerMove,48))) return;
  // pure corner 3-cycle
  if(Mc.T.every(x=>x===0)) pureClean.push({seq,cyc:cyc[0]});
  else pureTwisted.push({seq,cyc:cyc[0],twist:Mc.T.slice()});
}

const t0=Date.now();
for(const X of genSeqs(2)) for(const Y of MV30) test(X,Y);
console.log(`X2 done: 3-cycles=${n3cyc} pureClean=${pureClean.length} pureTwisted=${pureTwisted.length} (${((Date.now()-t0)/1000).toFixed(0)}s)`);
const X3=genSeqs(3);
for(const X of X3) for(const Y of MV30) test(X,Y);
console.log(`X3 done: 3-cycles=${n3cyc} pureClean=${pureClean.length} pureTwisted=${pureTwisted.length} (${((Date.now()-t0)/1000).toFixed(0)}s)`);

// twist pattern analysis
const patCount={};
for(const h of pureTwisted){
  const [a,b,c]=h.cyc;
  const pat=[h.twist[a],h.twist[b],h.twist[c]].join('');
  patCount[pat]=(patCount[pat]||0)+1;
}
console.log('twist patterns (on support):', JSON.stringify(patCount));
// check twist off-support
let offSup=0;
for(const h of pureTwisted){
  const sup=new Set(h.cyc);
  for(let s=0;s<8;s++) if(!sup.has(s)&&h.twist[s]!==0) offSup++;
}
console.log('off-support twists:', offSup, '/', pureTwisted.length);
// coverage of triples by pureTwisted
const triples=new Set(pureTwisted.map(h=>h.cyc.join(',')));
console.log('distinct triples (pureTwisted):', triples.size, '/ 336');

fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twisted.json',
  JSON.stringify(pureTwisted.map(h=>({seq:h.seq,cyc:h.cyc,twist:h.twist}))));
fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_clean.json',
  JSON.stringify(pureClean.map(h=>({seq:h.seq,cyc:h.cyc}))));
console.log('saved pure_twisted.json, pure_clean.json');
