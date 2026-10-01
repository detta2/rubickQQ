// search_corner3.js — commutator search for PURE corner 3-cycles.
// [X,Y] with X = seq length 2-3, Y = single move. Require:
//   corner = single 3-cycle, twist = 0; wings/middles/centers = identity.
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

// X sequences: length 2 and 3 (from MV30, avoid immediate inverse pairs)
function genSeqs(len){
  const out=[];
  const rec=(cur)=>{
    if(cur.length===len){ out.push(cur.slice()); return; }
    for(const m of MV30){
      if(cur.length && invMove(cur[cur.length-1])===m) continue;
      // avoid same-face repeats like U U' handled; also avoid U U (use U2? skip)
      cur.push(m); rec(cur); cur.pop();
    }
  };
  rec([]);
  return out;
}
const X2=genSeqs(2), X3=genSeqs(3);
console.log(`X2: ${X2.length}, X3: ${X3.length}, Y: ${MV30.length}`);

const hits=[], seen=new Set();
let twisted=0;
function test(X,Y){
  const seq=comm(X,[Y]);
  const Mc=CM.seqCorner(seq);
  const cyc=CM.cornerCycles(Mc);
  if(cyc.length!==1||cyc[0].length!==3) return;
  if(!Mc.T.every(x=>x===0)){ twisted++; return; }
  if(!isIdent(seqSub(seq,wingMove,24))) return;
  if(!isIdent(seqSub(seq,midMove,12))) return;
  if(!isIdent(seqSub(seq,centerMove,48))) return;
  const key=cyc[0].join(',');
  if(seen.has(key)) return;
  seen.add(key);
  hits.push({seq, cyc:cyc[0]});
}

const t0=Date.now();
for(const X of X2) for(const Y of MV30){ test(X,Y); }
console.log(`after X2: ${hits.length} pure, ${twisted} twisted 3-cycles (${((Date.now()-t0)/1000).toFixed(0)}s)`);
for(const X of X3){ for(const Y of MV30){ test(X,Y); } }
console.log(`after X3: ${hits.length} pure, ${twisted} twisted 3-cycles (${((Date.now()-t0)/1000).toFixed(0)}s)`);
for(const h of hits.slice(0,15)) console.log('  ', JSON.stringify(h.cyc), h.seq.join(' '));
if(hits.length){
  fs.writeFileSync('/home/hatch/workspace/rubickqq/solver5/ep/corner_cycles.json',
    JSON.stringify(hits.map(h=>({seq:h.seq,cyc:h.cyc})),null,1));
  console.log('saved ep/corner_cycles.json');
}
