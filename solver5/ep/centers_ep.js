// centers_ep.js — edge-preserving center solver for 5x5 (inverted approach).
// Base: edge-preserving 3-cycles (identity on all 36 edge slots).
// Built from /tmp/ep_cycles.json. Triple-map BFS + insertion (mirrors solveCenters5).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, C = S5._c;
const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('/tmp/ep_cycles.json','utf8'));
const IDENT48 = C.IDENT48;
const compose = C.compose, invertP = C.invertP;
const invSeq = C.invSeq;

// Build ALLCYCLES_EP: verify each is a single 3-cycle on centers.
const ALLCYCLES_EP = [];
for(const {seq, cyc} of raw){
  const P = C.seqPerm(seq);
  const cycs = C.permCycles(P);
  if(cycs.length!==1 || cycs[0].length!==3){
    console.log('SKIP non-3-cycle:', seq.join(' '));
    continue;
  }
  ALLCYCLES_EP.push({moves: seq.slice(), cyc: cycs[0], P});
  ALLCYCLES_EP.push({moves: invSeq(seq), cyc: [cycs[0][0],cycs[0][2],cycs[0][1]], P: invertP(P)});
}
console.log('EP base cycles (w/ inverses):', ALLCYCLES_EP.length);

// Triple map BFS (same pattern as solver5.js TRIPLE_MAP)
const TMOVES = ['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const TPERMS = TMOVES.map(C.slotPerm);
const TRIPLE_MAP_EP = new Map();
(function buildTripleMap(){
  const queue=[];
  const push=(x,y,z,Bseq,Cc)=>{
    const key=x+','+y+','+z;
    if(TRIPLE_MAP_EP.has(key)) return;
    TRIPLE_MAP_EP.set(key,{Bseq,C:Cc});
    queue.push([x,y,z]);
  };
  for(const Cc of ALLCYCLES_EP){
    const [a,b,c]=Cc.cyc;
    push(a,b,c,[],Cc);
  }
  let head=0;
  while(head<queue.length){
    const [x,y,z]=queue[head++];
    const cur=TRIPLE_MAP_EP.get(x+','+y+','+z);
    for(let mi=0; mi<TMOVES.length; mi++){
      const P=TPERMS[mi];
      const nx=P[x], ny=P[y], nz=P[z];
      const key=nx+','+ny+','+nz;
      if(!TRIPLE_MAP_EP.has(key)){
        TRIPLE_MAP_EP.set(key,{Bseq:cur.Bseq.concat(TMOVES[mi]), C:cur.C});
        queue.push([nx,ny,nz]);
      }
    }
    if(queue.length>4000000){ console.log('BFS cap hit'); break; }
  }
})();
const total = 48*47*46;
console.log(`EP triple map: ${TRIPLE_MAP_EP.size}/${total} (${(100*TRIPLE_MAP_EP.size/total).toFixed(1)}%)`);

function findTripleXYZ(x,y,z){
  const e=TRIPLE_MAP_EP.get(x+','+y+','+z);
  if(!e) return null;
  return {Aseq: invSeq(e.Bseq), C: e.C};
}

// Edge-preserving center solver (insertion). Assumes edges are solved; preserves them.
function solveCentersEP(state){
  const moves=[];
  let col=C.centerColoring(state);
  const solved=new Array(48).fill(false);
  const refresh=()=>{ for(let i=0;i<48;i++) if(col[i]===C.homeFace(i)) solved[i]=true; };
  const doSeq=seq=>{ for(const m of seq){ S5.applyMove5(state,m); moves.push(m); } };
  const applyMacro=(Aseq,Cc)=>{
    doSeq(Aseq.concat(Cc.moves, invSeq(Aseq)));
    col=C.centerColoring(state);
    refresh();
  };
  refresh();

  const endgame=(p,q)=>{
    const orb=C.SLOT_TYPE[p];
    let r=-1,s=-1;
    for(let f=0; f<6 && r<0; f++){
      const c=[];
      for(let k=0;k<8;k++){
        const i=f*8+k;
        if(C.SLOT_TYPE[i]===orb && solved[i]) c.push(i);
      }
      if(c.length>=2){ r=c[0]; s=c[1]; }
    }
    if(r<0) return false;
    const m1=findTripleXYZ(p,q,r);
    if(!m1) return false;
    applyMacro(m1.Aseq, m1.C);
    const m2=findTripleXYZ(p,s,r);
    if(!m2) return false;
    applyMacro(m2.Aseq, m2.C);
    return true;
  };

  let guard=0;
  while(true){
    if(solved.every(Boolean)) break;
    if(++guard>300) return null;
    let p=-1;
    for(let i=0;i<48;i++) if(!solved[i]){ p=i; break; }
    const orb=C.SLOT_TYPE[p];
    const uns=[];
    for(let i=0;i<48;i++) if(C.SLOT_TYPE[i]===orb && !solved[i]) uns.push(i);
    if(uns.length===2){
      const q=uns[0]===p?uns[1]:uns[0];
      if(!endgame(p,q)) return null;
      continue;
    }
    if(uns.length<3) return null;
    const need=C.homeFace(p);
    const q=uns.find(i=>i!==p && col[i]===need);
    if(q===undefined) return null;
    const uset=new Set(uns);
    let hit=null;
    for(const z of uns){
      if(z===q||z===p) continue;
      hit=findTripleXYZ(q,p,z);
      if(hit) break;
    }
    if(!hit) return null;
    applyMacro(hit.Aseq, hit.C);
  }
  return moves;
}

module.exports = {solveCentersEP, ALLCYCLES_EP, TRIPLE_MAP_EP, findTripleXYZ};
console.log('centers_ep module loaded');
