// solver5.js — Rubik's 5x5 reduction solver (centers phase).
//
// Model: state[6][25], faces U=0, R=1, F=2, D=3, L=4, B=5.
// Engine (applyMove5/newSolved5/isSolved5) verified 2026-10-01 (20/20 scramble+inverse).
//
// Centers method: commutator insertion.
//   - Base 3-cycles of center pieces are discovered empirically as commutators
//     [A,B] (middle-slice/wide vs outer turns) and verified at load time.
//   - Each insertion step applies a conjugate T*C*T' (a 3-cycle) whose support
//     avoids already-solved slots, placing one more piece correctly.
//   - The last 2 pieces of an orbit (always a swapped pair) are fixed with two
//     3-cycles using the identity  (p q)(r s) = (p s r) o (p q r).
// The 5x5 has no parity issues (fixed centers).

(function(global){
'use strict';

/* ================= Engine ================= */

function stickerPos5(face, r, c){
  const o=r-2, q=c-2, H=2;
  switch(face){
    case 0: return {p:[q,H,o],   n:[0,1,0]};
    case 3: return {p:[q,-H,-o], n:[0,-1,0]};
    case 2: return {p:[q,-o,H],  n:[0,0,1]};
    case 5: return {p:[-q,-o,-H],n:[0,0,-1]};
    case 1: return {p:[H,-o,-q], n:[1,0,0]};
    default:return {p:[-H,-o,q], n:[-1,0,0]};
  }
}
function stickerId5(p, n){
  const [x,y,z]=p, [nx,ny,nz]=n;
  let face, r, c;
  if(nx===1){face=1; r=2-y; c=2-z;}
  else if(nx===-1){face=4; r=2-y; c=z+2;}
  else if(ny===1){face=0; r=z+2; c=x+2;}
  else if(ny===-1){face=3; r=2-z; c=x+2;}
  else if(nz===1){face=2; r=2-y; c=x+2;}
  else{face=5; r=2-y; c=2-x;}
  return [face, Math.round(r), Math.round(c)];
}
function parseMove5(mv){
  const m=/^([UDFBLRMESudrlfb])(w?)(['2]?)$/.exec(mv);
  if(!m) return null;
  const face=m[1], wide=m[2]==='w', mod=m[3], H=2;
  let axis, outer;
  if(face==='R'){axis='x'; outer=H;}
  else if(face==='L'){axis='x'; outer=-H;}
  else if(face==='U'){axis='y'; outer=H;}
  else if(face==='D'){axis='y'; outer=-H;}
  else if(face==='F'){axis='z'; outer=H;}
  else if(face==='B'){axis='z'; outer=-H;}
  else if(face==='M'){axis='x'; outer=0;}
  else if(face==='E'){axis='y'; outer=0;}
  else if(face==='S'){axis='z'; outer=0;}
  // lowercase = inner slice only (one layer, NOT including the outer face).
  // u/d/r/l/f/b turn the same direction as U/D/R/L/F/B, on the adjacent inner slice.
  else if(face==='u'){axis='y'; outer=1;}
  else if(face==='d'){axis='y'; outer=-1;}
  else if(face==='r'){axis='x'; outer=1;}
  else if(face==='l'){axis='x'; outer=-1;}
  else if(face==='f'){axis='z'; outer=1;}
  else{axis='z'; outer=-1;} // b
  if(wide && (outer===0 || face!==face.toUpperCase())) return null;
  const slices = wide ? [outer, outer>0?1:-1] : [outer];
  // M follows L, E follows D, S follows F (standard cube notation);
  // lowercase slices follow their uppercase face direction.
  const neg = (face==='R'||face==='U'||face==='F'||face==='S'||
               face==='r'||face==='u'||face==='f');
  const base = neg ? -Math.PI/2 : Math.PI/2;
  return {axis, slices, angle: mod==="'" ? -base : mod==='2' ? Math.PI : base};
}
function rotVec5(v, axis, angle){
  const [x,y,z]=v, c=Math.cos(angle), s=Math.sin(angle);
  let r;
  if(axis==='x') r=[x, y*c-z*s, y*s+z*c];
  else if(axis==='y') r=[x*c+z*s, y, -x*s+z*c];
  else r=[x*c-y*s, x*s+y*c, z];
  return [Math.round(r[0]), Math.round(r[1]), Math.round(r[2])];
}
function applyMove5(state, mv){
  const p=parseMove5(mv);
  if(!p) return;
  const out=state.map(f=>f.slice());
  for(let f=0;f<6;f++) for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    if(r===2&&c===2) continue; // fixed centers are core-attached, never move (fixes M/E/S bug 2026-10-01)
    const sp=stickerPos5(f,r,c);
    const coord = p.axis==='x' ? sp.p[0] : p.axis==='y' ? sp.p[1] : sp.p[2];
    if(!p.slices.some(s=>Math.abs(s-coord)<0.01)) continue;
    const id=stickerId5(rotVec5(sp.p,p.axis,p.angle), rotVec5(sp.n,p.axis,p.angle));
    out[id[0]][id[1]*5+id[2]]=state[f][r*5+c];
  }
  for(let f=0;f<6;f++) state[f]=out[f];
}
function newSolved5(){
  const s=[];
  for(let f=0;f<6;f++) s.push(new Array(25).fill(f));
  return s;
}
function isSolved5(st){
  return st.every((f,fi)=>f.every(s=>s===fi));
}

/* ================= Centers ================= */

const CTR5=[[1,1],[1,2],[1,3],[2,1],[2,3],[3,1],[3,2],[3,3]];
const FN5=['U','R','F','D','L','B'];
const homeFace=i=>Math.floor(i/8);
// SLOT_TYPE: 0 = cross ("t-center", edge of the 3x3 center block),
//            1 = X-center (corner of the 3x3 center block). Two disjoint orbits.
const SLOT_TYPE=(()=>{
  const t=new Array(48);
  for(let f=0;f<6;f++) for(let k=0;k<8;k++){
    const [r,c]=CTR5[k];
    const cross=(r===2&&(c===1||c===3))||(c===2&&(r===1||r===3));
    t[f*8+k]=cross?0:1;
  }
  return t;
})();
function slotName(i){
  const [r,c]=CTR5[i%8];
  return FN5[homeFace(i)]+'['+r+','+c+']';
}
function centersSolved5(s){
  for(let f=0;f<6;f++) for(const [r,c] of CTR5) if(s[f][r*5+c]!==f) return false;
  return true;
}
function centerColoring(s){
  const col=new Array(48);
  for(let f=0;f<6;f++) for(let k=0;k<8;k++){
    const [r,c]=CTR5[k];
    col[f*8+k]=s[f][r*5+c];
  }
  return col;
}

function invMove(m){
  return m.endsWith('2') ? m : (m.endsWith("'") ? m.slice(0,-1) : m+"'");
}
function invSeq(seq){
  return seq.slice().reverse().map(invMove);
}

/* ---- permutations on the 48 movable center slots ----
   P[i] = destination slot of the piece currently at slot i. */

const IDENT48=Array.from({length:48},(_,i)=>i);
const _permCache={};
function slotPerm(mv){
  let P=_permCache[mv];
  if(P) return P;
  const lab=newSolved5();
  for(let f=0;f<6;f++) for(let k=0;k<8;k++){
    const [r,c]=CTR5[k];
    lab[f][r*5+c]=100+f*8+k;
  }
  applyMove5(lab,mv);
  P=new Array(48);
  for(let f=0;f<6;f++) for(let k=0;k<8;k++){
    const [r,c]=CTR5[k];
    const v=lab[f][r*5+c];
    if(v<100||v>=148) throw new Error('slotPerm: center escaped its orbit for move '+mv);
    P[v-100]=f*8+k;
  }
  _permCache[mv]=P;
  return P;
}
const compose=(A,B)=>{ // apply A, then B
  const C=new Array(48);
  for(let i=0;i<48;i++) C[i]=B[A[i]];
  return C;
};
const invertP=P=>{
  const I=new Array(48);
  for(let i=0;i<48;i++) I[P[i]]=i;
  return I;
};
function seqPerm(seq){
  let P=IDENT48;
  for(const m of seq) P=compose(P, slotPerm(m));
  return P;
}
function cycPerm(cyc){
  const P=IDENT48.slice();
  for(let i=0;i<cyc.length;i++) P[cyc[i]]=cyc[(i+1)%cyc.length];
  return P;
}
function permCycles(P){
  const seen=new Array(48).fill(false), out=[];
  for(let i=0;i<48;i++){
    if(seen[i]||P[i]===i) continue;
    const cyc=[];
    let j=i;
    while(!seen[j]){ seen[j]=true; cyc.push(j); j=P[j]; }
    if(cyc.length>1) out.push(cyc);
  }
  return out;
}

/* ---- base 3-cycles: commutators [A,B], discovered empirically ----
   Filled by research (research_centers.js); each entry is verified at load:
   the move sequence must act as exactly one 3-cycle on centers. */

const BASE_CYCLES=[
  // pure X-center 3-cycles (discovered 2026-10-01 via commutator search)
  ["Lw'","B","Lw","Fw","Lw'","B'","Lw","Fw'"],                    // (U[3,1] L[3,3] B[1,1])
  ["L","L","F","F","F","Rw","F","Lw","F'","Rw'","F'","F'","F'","L'","L'","Lw'"], // (U[3,1] D[3,3] F[3,1])
  // pure cross-center 3-cycles
  ["E","Lw","S","L","S'","Lw'","E'","L'"],                        // (D[2,3] L[2,3] L[1,2])
  ["M","S","Fw","E","F","E'","Fw'","S'","M'","F'"],              // (F[2,3] L[2,1] F[3,2])
];

const ALLCYCLES=[];
(function initCycles(){
  for(const ms of BASE_CYCLES){
    const P=seqPerm(ms);
    const cycs=permCycles(P);
    if(cycs.length!==1||cycs[0].length!==3)
      throw new Error('base cycle is not a single 3-cycle: '+ms.join(' '));
    ALLCYCLES.push({moves:ms.slice(), cyc:cycs[0], P});
    ALLCYCLES.push({moves:invSeq(ms), cyc:[cycs[0][0],cycs[0][2],cycs[0][1]], P:invertP(P)});
  }
})();

/* ---- triple graph BFS: shortest conjugating sequence for every triple ----
   Nodes are ordered triples (x,y,z) of distinct same-orbit slots.
   Move m sends (x,y,z) -> (Pm[x],Pm[y],Pm[z]).
   Multi-source BFS from the 8 base triples gives, for each reachable triple,
   the shortest B with B(base)=triple. Macro for x->y->z->x is then
   B^-1 C B (since (B^-1 C B) realizes (B(a) B(b) B(c)) for C=(a b c)).
   Map: "x,y,z" -> {Bseq, C}. */

const TMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const TPERMS=TMOVES.map(slotPerm);

const TRIPLE_MAP=new Map();
(function buildTripleMap(){
  const queue=[];
  const push=(x,y,z,Bseq,C)=>{
    const key=x+','+y+','+z;
    if(TRIPLE_MAP.has(key)) return;
    TRIPLE_MAP.set(key,{Bseq,C});
    queue.push([x,y,z]);
  };
  for(const C of ALLCYCLES){
    const [a,b,c]=C.cyc;
    push(a,b,c,[],C);
  }
  while(queue.length){
    const [x,y,z]=queue.shift();
    const cur=TRIPLE_MAP.get(x+','+y+','+z);
    for(let mi=0; mi<TMOVES.length; mi++){
      const P=TPERMS[mi];
      const nx=P[x], ny=P[y], nz=P[z];
      if(nx===ny||ny===nz||nx===nz) continue; // cannot happen (perm), guard anyway
      const key=nx+','+ny+','+nz;
      if(!TRIPLE_MAP.has(key)){
        TRIPLE_MAP.set(key,{Bseq:cur.Bseq.concat(TMOVES[mi]), C:cur.C});
        queue.push([nx,ny,nz]);
      }
    }
  }
})();

// find macro realizing x->y->z->x; returns {Aseq (=B^-1), C} or null
function findTripleXYZ(x,y,z){
  const e=TRIPLE_MAP.get(x+','+y+','+z);
  if(!e) return null;
  return {Aseq:invSeq(e.Bseq), C:e.C};
}

// fallback: on-the-fly BFS (bounded) if the map misses a triple
function searchMacro(pred, maxDepth){
  let layer=[{seq:[], P:IDENT48, last:null}];
  for(let d=0; d<=maxDepth; d++){
    for(const node of layer){
      const PAinv=invertP(node.P);
      for(const C of ALLCYCLES){
        const P=compose(compose(node.P, C.P), PAinv);
        if(pred(P)) return {Aseq:node.seq, C};
      }
    }
    if(d===maxDepth) break;
    const next=[];
    for(const node of layer){
      for(let mi=0; mi<TMOVES.length; mi++){
        const m=TMOVES[mi];
        if(node.last && invMove(m)===node.last) continue;
        next.push({seq:node.seq.concat(m), P:compose(node.P, TPERMS[mi]), last:m});
      }
    }
    layer=next;
  }
  return null;
}

/* ---- move optimizer (same pattern as solver4) ---- */

function optimizeMoves5(moves){
  const fam=m=>m.replace(/['2]$/,'');
  const mod=m=>m.endsWith('2')?2:(m.endsWith("'")?3:1);
  const mk=(f,v)=>v===1?f:(v===2?f+'2':f+"'");
  let cur=moves.slice(), changed=true;
  while(changed){
    changed=false;
    const out=[];
    for(const m of cur){
      const t=out[out.length-1];
      if(t && fam(t)===fam(m)){
        const v=(mod(t)+mod(m))%4;
        out.pop();
        if(v!==0) out.push(mk(fam(m),v));
        changed=true;
      } else out.push(m);
    }
    cur=out;
  }
  return cur;
}

/* ================= solveCenters5 ================= */

function solveCenters5(state){
  if(ALLCYCLES.length===0) throw new Error('solveCenters5: no base 3-cycles (run research first)');
  const moves=[];
  let col=centerColoring(state);
  const solved=new Array(48).fill(false);
  const refresh=()=>{ for(let i=0;i<48;i++) if(col[i]===homeFace(i)) solved[i]=true; };
  const doSeq=seq=>{ for(const m of seq){ applyMove5(state,m); moves.push(m); } };
  const applyMacro=(Aseq,C)=>{
    doSeq(Aseq.concat(C.moves, invSeq(Aseq)));
    col=centerColoring(state);
    refresh();
  };
  refresh();

  const supportOk=(P,allowed)=>{
    for(let i=0;i<48;i++) if(P[i]!==i && !allowed.has(i)) return false;
    return true;
  };

  // Endgame: exactly 2 unsolved slots of one orbit remain; they are always a
  // swapped pair (p,q). Fix with (p q)(r s) = (p s r) o (p q r), where r,s are
  // solved slots of the same orbit on one face (they keep their color).
  const endgame=(p,q)=>{
    const orb=SLOT_TYPE[p];
    let r=-1,s=-1;
    for(let f=0; f<6 && r<0; f++){
      const c=[];
      for(let k=0;k<8;k++){
        const i=f*8+k;
        if(SLOT_TYPE[i]===orb && solved[i]) c.push(i);
      }
      if(c.length>=2){ r=c[0]; s=c[1]; }
    }
    if(r<0) return false;
    // need 3-cycle p->q->r->p, then p->s->r->p
    let m1=findTripleXYZ(p,q,r);
    if(!m1){ // fallback: deeper on-the-fly BFS
      const h=searchMacro(P=>P[p]===q&&P[q]===r&&P[r]===p,6);
      if(!h) return false; m1=h;
    }
    applyMacro(m1.Aseq, m1.C);
    let m2=findTripleXYZ(p,s,r);
    if(!m2){
      const h=searchMacro(P=>P[p]===s&&P[s]===r&&P[r]===p,6);
      if(!h) return false; m2=h;
    }
    applyMacro(m2.Aseq, m2.C);
    return true;
  };

  let guard=0;
  while(true){
    if(solved.every(Boolean)) break;
    if(++guard>300) return null;
    let p=-1;
    for(let i=0;i<48;i++) if(!solved[i]){ p=i; break; }
    const orb=SLOT_TYPE[p];
    const uns=[];
    for(let i=0;i<48;i++) if(SLOT_TYPE[i]===orb && !solved[i]) uns.push(i);
    if(uns.length===2){
      const q=uns[0]===p?uns[1]:uns[0];
      if(!endgame(p,q)) return null;
      continue;
    }
    if(uns.length<3) return null; // unreachable: a lone unsolved slot is always correct
    const need=homeFace(p);
    const q=uns.find(i=>i!==p && col[i]===need);
    if(q===undefined) return null; // unreachable by color counting
    const uset=new Set(uns);
    // need 3-cycle q->p->z->q with z unsolved (support avoids solved slots)
    let hit=null;
    for(const z of uns){
      if(z===q||z===p) continue;
      hit=findTripleXYZ(q,p,z);
      if(hit) break;
    }
    if(!hit){ // fallback: deeper on-the-fly BFS
      const h=searchMacro(P=>P[q]===p && supportOk(P,uset),6);
      if(!h) return null; hit=h;
    }
    applyMacro(hit.Aseq, hit.C);
  }
  return optimizeMoves5(moves);
}

// ============ 5x5 EDGE PAIRING (solveEdges5) ============
// Pairs all 12 edges (2 wings + 1 middle each) via direct BFS.
// For each edge (by colors), BFS (outer moves only, depth <=9) finds a
// sequence bringing its 3 pieces to the same edge slot. Outer moves keep
// centers solved and keep already-paired edges together (3 pieces at a slot
// move as a unit).
const EDGES5=[
 [[0,4,1],[0,4,2],[0,4,3],[2,0,1],[2,0,2],[2,0,3]],
 [[0,1,4],[0,2,4],[0,3,4],[1,0,1],[1,0,2],[1,0,3]],
 [[0,0,1],[0,0,2],[0,0,3],[5,0,1],[5,0,2],[5,0,3]],
 [[0,1,0],[0,2,0],[0,3,0],[4,0,1],[4,0,2],[4,0,3]],
 [[3,0,1],[3,0,2],[3,0,3],[2,4,1],[2,4,2],[2,4,3]],
 [[3,1,4],[3,2,4],[3,3,4],[1,4,1],[1,4,2],[1,4,3]],
 [[3,4,1],[3,4,2],[3,4,3],[5,4,1],[5,4,2],[5,4,3]],
 [[3,1,0],[3,2,0],[3,3,0],[4,4,1],[4,4,2],[4,4,3]],
 [[2,1,4],[2,2,4],[2,3,4],[1,1,0],[1,2,0],[1,3,0]],
 [[2,1,0],[2,2,0],[2,3,0],[4,1,4],[4,2,4],[4,3,4]],
 [[5,1,0],[5,2,0],[5,3,0],[1,1,4],[1,2,4],[1,3,4]],
 [[5,1,4],[5,2,4],[5,3,4],[4,1,0],[4,2,0],[4,3,0]]];
const EDGE_COLORS5=[[0,2],[0,1],[0,5],[0,4],[3,2],[3,1],[3,5],[3,4],[2,1],[2,4],[5,1],[5,4]];
const _edgeStickers5=[];
EDGES5.forEach(stk=>{stk.forEach(([f,r,c])=>_edgeStickers5.push([f,r,c]));});
const _posToSlot5=new Map();
EDGES5.forEach((stk,si)=>{
  stk.forEach(([f,r,c])=>{
    const {p}=stickerPos5(f,r,c);
    _posToSlot5.set(p.join(','),si);
  });
});
const OUTER5=['U','D','F','B','L','R',"U'","D'","F'","B'","L'","R'","U2","D2","F2","B2","L2","R2"];
function _findEdgePieces5(s,c1,c2){
  const target=[Math.min(c1,c2),Math.max(c1,c2)];
  const byCubie=new Map();
  for(const [f,r,c]of _edgeStickers5){
    const {p}=stickerPos5(f,r,c);
    const k=p.join(',');
    if(!byCubie.has(k))byCubie.set(k,[]);
    byCubie.get(k).push([f,r,c,s[f][r*5+c]]);
  }
  const out=[];
  for(const stk of byCubie.values()){
    if(stk.length!==2)continue;
    const cols=[stk[0][3],stk[1][3]].sort((a,b)=>a-b);
    if(cols[0]===target[0]&&cols[1]===target[1]){
      out.push([[stk[0][0],stk[0][1],stk[0][2]],[stk[1][0],stk[1][1],stk[1][2]]]);
    }
  }
  return out;
}
function _bfsTogether5(s,pieces,maxDepth){
  const tag=o=>{
    const t=o.map(f=>f.slice());
    pieces[0].forEach(([f,r,c])=>{t[f][r*5+c]=99;});
    pieces[1].forEach(([f,r,c])=>{t[f][r*5+c]=98;});
    pieces[2].forEach(([f,r,c])=>{t[f][r*5+c]=97;});
    return t;
  };
  const getSlots=t=>{
    const slots={};
    for(let f=0;f<6;f++)for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      const v=t[f][r*5+c];
      if(v>=97&&v<=99){
        const {p}=stickerPos5(f,r,c);
        const slot=_posToSlot5.get(p.join(','));
        if(slot!==undefined&&slots[v]===undefined)slots[v]=slot;
      }
    }
    return [slots[99],slots[98],slots[97]];
  };
  const q=[{t:tag(s),mv:[]}];
  const vis=new Set();
  while(q.length){
    const {t:cur,mv}=q.shift();
    const [s1,s2,s3]=getSlots(cur);
    if(s1===undefined||s2===undefined||s3===undefined)continue;
    const k=s1+','+s2+','+s3;
    if(vis.has(k))continue;
    vis.add(k);
    if(s1===s2&&s2===s3)return mv;
    if(mv.length>=maxDepth)continue;
    for(const m of OUTER5){
      const nxt=cur.map(f=>f.slice());
      applyMove5(nxt,m);
      q.push({t:nxt,mv:mv.concat([m])});
    }
  }
  return null;
}
const WIDE5=['Uw','Dw','Fw','Bw','Lw','Rw',"Uw'","Dw'","Fw'","Bw'","Lw'","Rw'"];
const OUTER_WIDE5=OUTER5.concat(WIDE5);
const PAIR_ALG5=["Uw'","R","U","R'","F","R'","F'","R","Uw"];
const TGT5_9W=[[2,1,0],[4,1,4]];
const TGT5_8W=[[2,1,4],[1,1,0]];
function _pieceKey5(p){
  const ka=p[0].join(','),kb=p[1].join(',');
  return ka<kb?ka+'|'+kb:kb+'|'+ka;
}
// BFS (outer only) to bring 2 tagged wing pieces to TGT5_9W / TGT5_8W.
// Only wings can occupy these positions, so BFS naturally selects wings.
function _bfsWingsToFR5(s,pieces,maxDepth){
  const tag=o=>{
    const t=o.map(f=>f.slice());
    pieces[0].forEach(([f,r,c])=>{t[f][r*5+c]=99;});
    pieces[1].forEach(([f,r,c])=>{t[f][r*5+c]=98;});
    return t;
  };
  const k9=_pieceKey5(TGT5_9W), k8=_pieceKey5(TGT5_8W);
  const getKeys=t=>{
    const p99=[],p98=[];
    for(let f=0;f<6;f++)for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      const v=t[f][r*5+c];
      if(v===99)p99.push([f,r,c]);
      else if(v===98)p98.push([f,r,c]);
    }
    if(p99.length!==2||p98.length!==2)return null;
    return [_pieceKey5(p99),_pieceKey5(p98)];
  };
  const q=[{t:tag(s),mv:[]}];
  const vis=new Set();
  while(q.length){
    const {t:cur,mv}=q.shift();
    const ks=getKeys(cur);
    if(!ks)continue;
    const vk=ks[0]+'#'+ks[1];
    if(vis.has(vk))continue;
    vis.add(vk);
    if((ks[0]===k9&&ks[1]===k8)||(ks[0]===k8&&ks[1]===k9))return mv;
    if(mv.length>=maxDepth)continue;
    for(const m of OUTER5){
      const nxt=cur.map(f=>f.slice());
      applyMove5(nxt,m);
      q.push({t:nxt,mv:mv.concat([m])});
    }
  }
  return null;
}
// Wide-move 3-piece pairing: BFS (outer+wide, depth<=7) to bring 3 pieces to
// the same bin. Wide moves CAN merge bins (unlike outer-only). Breaks centers.
function _bfsTogetherWide5(s,pieces,maxDepth){
  const tag=o=>{
    const t=o.map(f=>f.slice());
    pieces[0].forEach(([f,r,c])=>{t[f][r*5+c]=99;});
    pieces[1].forEach(([f,r,c])=>{t[f][r*5+c]=98;});
    pieces[2].forEach(([f,r,c])=>{t[f][r*5+c]=97;});
    return t;
  };
  const getSlots=t=>{
    const slots={};
    for(let f=0;f<6;f++)for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      const v=t[f][r*5+c];
      if(v>=97&&v<=99){
        const {p}=stickerPos5(f,r,c);
        const slot=_posToSlot5.get(p.join(','));
        if(slot!==undefined&&slots[v]===undefined)slots[v]=slot;
      }
    }
    return [slots[99],slots[98],slots[97]];
  };
  const q=[{t:tag(s),mv:[]}];
  const vis=new Set();
  while(q.length){
    const {t:cur,mv}=q.shift();
    const [s1,s2,s3]=getSlots(cur);
    if(s1===undefined||s2===undefined||s3===undefined)continue;
    const k=s1+','+s2+','+s3;
    if(vis.has(k))continue;
    vis.add(k);
    if(s1===s2&&s2===s3)return mv;
    if(mv.length>=maxDepth)continue;
    for(const m of OUTER_WIDE5){
      const nxt=cur.map(f=>f.slice());
      applyMove5(nxt,m);
      q.push({t:nxt,mv:mv.concat([m])});
    }
  }
  return null;
}
function _edgePaired5(s,c1,c2){
  const pieces=_findEdgePieces5(s,c1,c2);
  if(pieces.length!==3)return true; // nothing to do
  const slots=pieces.map(pc=>{
    const {p}=stickerPos5(pc[0][0],pc[0][1],pc[0][2]);
    return _posToSlot5.get(p.join(','));
  });
  return slots[0]!==undefined&&slots[0]===slots[1]&&slots[1]===slots[2];
}
// ============ 5x5 EDGE PAIRING (solveEdges5) ============
// Strengthened for wide-move scrambles: for each edge, BFS (outer+wide)
// brings its 3 pieces together. Note: wide moves break centers; this is
// intended to be used in an alternating scheme or before centers.
function solveEdges5(s){
  const moves=[];
  for(const [c1,c2]of EDGE_COLORS5){
    if(_edgePaired5(s,c1,c2))continue;
    const pieces=_findEdgePieces5(s,c1,c2);
    if(pieces.length!==3)continue;
    const seq=_bfsTogetherWide5(s,pieces,7);
    if(!seq)continue;
    for(const m of seq){applyMove5(s,m);moves.push(m);}
  }
  return optimizeMoves5(moves);
}

// ============ 3x3 extraction & full solve5x5 ============
// Extract a 3x3 cube state from the 5x5 (after centers + edges).
// 3x3 facelets per face: corners from 5x5 corners, edges from 5x5 edge-middles,
// center from 5x5 face center.
function to3x3_5(s){
  const F2C=['U','R','F','D','L','B'];
  const idx3=[0,2,4,10,12,14,20,22,24];
  let str='';
  for(let f=0;f<6;f++)for(const i of idx3)str+=F2C[s[f][i]];
  return str;
}
// Solve the extracted 3x3 using cubejs (global Cube, from CDN or local).
// Returns array of moves (outer) or null.
let _cubejsInit5=false;
function _solveCubejs3x5(kStr){
  try{
    const Cb=(typeof Cube!=='undefined')?Cube:((typeof global!=='undefined'&&global.Cube)?global.Cube:null);
    if(!Cb||typeof Cb.fromString!=='function')return null;
    if(!_cubejsInit5&&typeof Cb.initSolver==='function'){Cb.initSolver();_cubejsInit5=true;}
    const cube=Cb.fromString(kStr);
    if(typeof cube.solve!=='function')return null;
    const sol=cube.solve();
    if(!sol)return [];
    return sol.trim().split(/\s+/).filter(Boolean);
  }catch(e){ return null; }
}
// ============ 5x5 EDGE PAIRING: 8+4 (slice-join + SFS) ============
// First 8 edges (U/D, bins 0-7) via slice-join (proto12 method).
// Last 4 edges (E-slice, bins 8-11) via SFS-based BFS (pairMiddles5).

// --- Proto12 8-edge slice-join (adapted) ---
const _ALL_ESTK5=[];
_edgeStickers5.forEach(([f,r,c])=>_ALL_ESTK5.push([f,r,c]));
function _probeSeq5(seq){
  const t=newSolved5();
  const posList=[...new Set(_ALL_ESTK5.map(([f,r,c])=>stickerPos5(f,r,c).p.join(',')))];
  const idToPos=new Map();
  posList.forEach((pk,idx)=>{
    const [x,y,z]=pk.split(',').map(Number);
    for(const [f,r,c] of _ALL_ESTK5){
      const {p}=stickerPos5(f,r,c);
      if(p[0]===x&&p[1]===y&&p[2]===z){ t[f][r*5+c]=10+idx; idToPos.set(idx,pk); break; }
    }
  });
  for(const mv of seq) applyMove5(t,mv);
  const perm=new Map();
  for(const [f,r,c] of _ALL_ESTK5){
    const v=t[f][r*5+c];
    if(v>=10){ const idx=v-10; const {p}=stickerPos5(f,r,c); perm.set(idToPos.get(idx), p.join(',')); }
  }
  return perm;
}
function _findPiecesP12(s,c1,c2){
  const target=[Math.min(c1,c2),Math.max(c1,c2)].join(',');
  const byCubie=new Map();
  for(const [f,r,c] of _ALL_ESTK5){
    const {p}=stickerPos5(f,r,c); const k=p.join(',');
    if(!byCubie.has(k))byCubie.set(k,[]);
    byCubie.get(k).push([f,r,c]);
  }
  const out=[];
  for(const [k,stk] of byCubie){
    if(stk.length!==2) continue;
    const cols=[s[stk[0][0]][stk[0][1]*5+stk[0][2]], s[stk[1][0]][stk[1][1]*5+stk[1][2]]].sort((a,b)=>a-b).join(',');
    if(cols===target) out.push(k);
  }
  return out;
}
function _isTredgeP12(s, ei){
  const [c1,c2]=EDGE_COLORS5[ei]; const pcs=_findPiecesP12(s,c1,c2);
  if(pcs.length!==3) return false;
  return new Set(pcs.map(k=>_posToSlot5.get(k))).size===1;
}
const OUTER_P12=['U','D','F','B','L','R',"U'","D'","F'","B'","L'","R'","U2","D2","F2","B2","L2","R2"];
const PERMS_P12={}; for(const mv of OUTER_P12) PERMS_P12[mv]=_probeSeq5([mv]);
const BIN_PERM_P12={};
for(const mv of OUTER_P12){
  const mp=new Map();
  const perm=PERMS_P12[mv];
  for(let b=0;b<12;b++){
    // Find a position in bin b, see where it goes
    for(const [k,slot] of _posToSlot5){
      if(slot===b){ mp.set(b, _posToSlot5.get(perm.get(k))); break; }
    }
  }
  BIN_PERM_P12[mv]=mp;
}
const STORES_P12={0:['R','U',"R'"],1:["F'","U'",'F'],2:['R',"U'","R'"],3:['R','U2',"R'"],4:["R'","D'",'R'],5:['F','D',"F'"],6:["R'",'D','R'],7:["R'",'D2','R']};
const U_POS_P12=['2,1,2','2,1,-2','-2,1,-2','-2,1,2'];
const D_POS_P12=['2,-1,2','2,-1,-2','-2,-1,-2','-2,-1,2'];
const FR_E_P12='2,0,2';
const U_K_P12={'2,1,-2':1,'-2,1,-2':2,'-2,1,2':3,'2,1,2':0};
const D_L_P12={'-2,-1,2':1,'-2,-1,-2':2,'2,-1,-2':3,'2,-1,2':0};
const UD_P12=new Set([0,1,2,3,4,5,6,7]);
const UK_SEQ_P12={0:[],1:['u'],2:['u2'],3:["u'"]};
const DL_SEQ_P12={0:[],1:['d'],2:['d2'],3:["d'"]};
const UK_INV_P12={0:[],1:["u'"],2:['u2'],3:['u']};
const DL_INV_P12={0:[],1:["d'"],2:['d2'],3:['d']};
function _bfsFlexible5(pieces, maxDepth, maxPaths){
  const startKey=[...pieces].sort().join('|');
  const visited=new Set([startKey]);
  const queue=[{keys:pieces, path:[]}];
  const results=[];
  let head=0;
  while(head<queue.length && results.length<maxPaths){
    const {keys,path}=queue[head++];
    if(path.length>=maxDepth) continue;
    for(const mv of OUTER_P12){
      const nk=keys.map(k=>PERMS_P12[mv].get(k));
      const atE=nk.filter(k=>k===FR_E_P12).length;
      const atU=nk.filter(k=>U_POS_P12.includes(k)).length;
      const atD=nk.filter(k=>D_POS_P12.includes(k)).length;
      if(atE===1 && atU===1 && atD===1 && new Set(nk).size===3){
        results.push({path:[...path,mv], positions:nk});
        if(results.length>=maxPaths) break;
        continue;
      }
      const key=[...nk].sort().join('|');
      if(!visited.has(key)){ visited.add(key); queue.push({keys:nk, path:[...path,mv]}); }
    }
  }
  return results;
}
const ALL_BINS_P12=new Set([0,1,2,3,4,5,6,7,8,9,10,11]);
function _tryPairEdge5(s, ei, pairedEdges, allowedBins){
  if(!allowedBins) allowedBins=UD_P12;
  const [c1,c2]=EDGE_COLORS5[ei];
  const pcs=_findPiecesP12(s,c1,c2);
  const pairedBins=new Set(pairedEdges.map(pe=>{
    const [a,b]=EDGE_COLORS5[pe];
    return _posToSlot5.get(_findPiecesP12(s,a,b)[0]);
  }));
  const used=new Set(pairedBins);
  const paths=_bfsFlexible5(pcs, 13, 80);
  for(const {path, positions} of paths){
    let bins=new Set(pairedBins);
    for(const mv of path){
      const nb=new Set();
      for(const b of bins) nb.add(BIN_PERM_P12[mv].get(b));
      bins=nb;
    }
    let ok=true; for(const b of bins) if(!allowedBins.has(b)) ok=false;
    if(!ok) continue;
    const upos=positions.find(k=>U_POS_P12.includes(k));
    const dpos=positions.find(k=>D_POS_P12.includes(k));
    const k=U_K_P12[upos], l=D_L_P12[dpos];
    let tb=null; for(let b=0;b<8;b++) if(!used.has(b)){ tb=b; break; }
    if(tb===null) continue;
    const s2=s.map(f=>f.slice());
    for(const m of path) applyMove5(s2,m);
    for(const m of [...UK_SEQ_P12[k],...DL_SEQ_P12[l]]) applyMove5(s2,m);
    for(const m of STORES_P12[tb]) applyMove5(s2,m);
    for(const m of [...UK_INV_P12[k],...DL_INV_P12[l]]) applyMove5(s2,m);
    if(!centersSolved5(s2)) continue;
    let allGood=true;
    for(const pe of [...pairedEdges, ei]){
      if(!_isTredgeP12(s2,pe)){ allGood=false; break; }
    }
    if(!allGood) continue;
    return [...path, ...UK_SEQ_P12[k], ...DL_SEQ_P12[l], ...STORES_P12[tb], ...UK_INV_P12[k], ...DL_INV_P12[l]];
  }
  return null;
}
function _solveWithOrder5(s, order){
  const paired=[];
  const allMoves=[];
  for(const ei of order){
    const moves=_tryPairEdge5(s, ei, paired);
    if(!moves) return null;
    for(const m of moves) applyMove5(s,m);
    allMoves.push(...moves);
    paired.push(ei);
  }
  return allMoves;
}
// Pair first 8 edges (U/D). Tries multiple orders with backtracking.
function pairFirst85(s){
  const orders=[
    [0,1,2,3,4,5,6,7],
    [7,6,5,4,3,2,1,0],
    [0,2,4,6,1,3,5,7],
    [1,3,5,7,0,2,4,6],
    [4,5,6,7,0,1,2,3],
    [3,2,1,0,7,6,5,4],
  ];
  for(const order of orders){
    const s2=s.map(f=>f.slice());
    const moves=_solveWithOrder5(s2, order);
    if(moves){
      for(const m of moves) applyMove5(s,m);
      return moves;
    }
  }
  return null;
}

// --- Middle-first strategy: pair E-slice edges (8-11) BEFORE U/D edges ---
// Tuple BFS over bin permutations: move 4 tredges from U/D bins to E-slice
// bins (8-11) in one coordinated sequence (avoids displacing each other).
function _bfsTupleToESliceP12(startBins){
  const ESET=new Set([8,9,10,11]);
  const isGoal=(bins)=>bins.every(b=>ESET.has(b))&&new Set(bins).size===4;
  if(isGoal(startBins)) return [];
  const visited=new Set([startBins.join(',')]);
  const queue=[{bins:startBins, path:[]}];
  let head=0;
  while(head<queue.length){
    const {bins,path}=queue[head++];
    if(path.length>=10) continue;
    for(const mv of OUTER_P12){
      const nbins=bins.map(b=>BIN_PERM_P12[mv].get(b));
      if(isGoal(nbins)) return [...path,mv];
      const key=nbins.join(',');
      if(!visited.has(key)){ visited.add(key); queue.push({bins:nbins, path:[...path,mv]}); }
    }
    if(queue.length>600000) return null;
  }
  return null;
}
function _binOfEdgeP12(s, ei){
  const [c1,c2]=EDGE_COLORS5[ei];
  const pcs=_findPiecesP12(s,c1,c2);
  return _posToSlot5.get(pcs[0]);
}
// Pair the 4 middle (E-slice) edges first via slice-join (U/D empty, so storage
// is free), then batch-relocate them to E-slice bins, freeing U/D for phase 2.
// Then pair the 8 U/D edges with relaxed bin constraint.
// Returns full move list or null. Assumes centers solved.
function pairMiddlesFirst(s){
  const allMoves=[];
  const midOrders=[
    [8,9,10,11],
    [11,10,9,8],
    [8,10,9,11],
    [9,8,11,10],
  ];
  let midOk=false;
  for(const morder of midOrders){
    const s2=s.map(f=>f.slice());
    const paired=[];
    const moves=[];
    let ok=true;
    for(const ei of morder){
      const pm=_tryPairEdge5(s2, ei, paired); // standard UD constraint; U/D empty
      if(!pm){ ok=false; break; }
      for(const m of pm) applyMove5(s2,m);
      moves.push(...pm);
      paired.push(ei);
    }
    if(!ok) continue;
    // Batch-relocate the 4 middle tredges from U/D bins to E-slice bins.
    const startBins=morder.map(ei=>_binOfEdgeP12(s2,ei));
    const rel=_bfsTupleToESliceP12(startBins);
    if(!rel) continue;
    for(const m of rel) applyMove5(s2,m);
    moves.push(...rel);
    // Verify: all 4 middles are tredges in E-slice, centers solved.
    let vok=true;
    for(const ei of morder){
      if(!_isTredgeP12(s2,ei)) vok=false;
      if(![8,9,10,11].includes(_binOfEdgeP12(s2,ei))) vok=false;
    }
    if(!vok||!centersSolved5(s2)) continue;
    for(const m of moves) applyMove5(s,m);
    allMoves.push(...moves);
    midOk=true;
    break;
  }
  if(!midOk) return null;
  // Phase 2: pair the 8 U/D edges. Paired middles are in E-slice, so relax
  // the bin constraint to ALL bins (outer moves keep tredges intact anyway,
  // and post-hoc verification rejects any bad path).
  const paired=[8,9,10,11];
  const udOrders=[
    [0,1,2,3,4,5,6,7],
    [7,6,5,4,3,2,1,0],
    [0,2,4,6,1,3,5,7],
    [1,3,5,7,0,2,4,6],
    [4,5,6,7,0,1,2,3],
    [3,2,1,0,7,6,5,4],
  ];
  for(const order of udOrders){
    const s2=s.map(f=>f.slice());
    const p2=[...paired];
    const moves=[];
    let ok=true;
    for(const ei of order){
      const pm=_tryPairEdge5(s2, ei, p2, ALL_BINS_P12);
      if(!pm){ ok=false; break; }
      for(const m of pm) applyMove5(s2,m);
      moves.push(...pm);
      p2.push(ei);
    }
    if(ok){
      for(const m of moves) applyMove5(s,m);
      allMoves.push(...moves);
      return allMoves;
    }
  }
  return null;
}

// --- Last 4 edges (E-slice, bins 8-11) via SFS-based BFS ---
const SFS_SEQ5=["Uw'", "R","U","R'","F","R'","F'","R", "Uw"];
const SFSD_SEQ5=["Dw'", "R","U","R'","F","R'","F'","R", "Dw"];
const MID_MOVES5={
  F2:  {perm:[5,4,3,2,1,0,6,7,8,9,10,11], seq:['F2']},
  B2:  {perm:[0,1,2,3,4,5,11,10,9,8,7,6], seq:['B2']},
  R2:  {perm:[8,7,6,3,4,5,2,1,0,9,10,11], seq:['R2']},
  L2:  {perm:[0,1,2,11,10,9,6,7,8,5,4,3], seq:['L2']},
  S23: {perm:[0,1,3,2,4,5,6,7,8,9,10,11], seq:SFS_SEQ5},
  S08: {perm:[8,1,2,3,4,5,6,7,0,9,10,11], seq:SFSD_SEQ5},
  S58: {perm:[0,1,2,3,4,8,6,7,5,9,10,11], seq:['F2',...SFSD_SEQ5,'F2']},
  S09: {perm:[9,1,2,3,4,5,6,7,8,0,10,11], seq:['B2',...SFSD_SEQ5,'B2']},
  S211:{perm:[0,1,11,3,4,5,6,7,8,9,10,2], seq:['L2',...SFS_SEQ5,'L2']},
  S36: {perm:[0,1,2,6,4,5,3,7,8,9,10,11], seq:['R2',...SFS_SEQ5,'R2']},
};
const MID_MOVE_NAMES5=Object.keys(MID_MOVES5);
const MID_POS_COORDS5=['2,1,2','2,0,2','2,-1,2','-2,1,2','-2,0,2','-2,-1,2','2,1,-2','2,0,-2','2,-1,-2','-2,1,-2','-2,0,-2','-2,-1,-2'];
function _midIsSolved5(st){
  for(let b=0;b<4;b++){ if(!(st[b*3]===st[b*3+1]&&st[b*3+1]===st[b*3+2])) return false; }
  return true;
}
function _bfsMid5(init){
  const startKey=init.join(',');
  if(_midIsSolved5(init)) return [];
  const visited=new Set([startKey]);
  const queue=[{state:init, path:[]}];
  let head=0;
  while(head<queue.length){
    const {state, path}=queue[head++];
    if(path.length>=12) continue;
    for(const mn of MID_MOVE_NAMES5){
      const perm=MID_MOVES5[mn].perm;
      const ns=new Array(12);
      for(let i=0;i<12;i++) ns[i]=state[perm[i]];
      const key=ns.join(',');
      if(visited.has(key)) continue;
      visited.add(key);
      const npath=[...path, mn];
      if(_midIsSolved5(ns)) return npath;
      queue.push({state:ns, path:npath});
    }
    if(queue.length>4000000) return null;
  }
  return null;
}
// --- Last 4 edges (bins 8-11) via §2b slice-join (J Perm method) ---
// Follows report.md §2b EXACTLY:
//   1. Stage midge at E-slice FR slot (2,0,2) via outer turns.
//   2. Stage wings in u-slice (y=1) and d-slice (y=-1).
//   3. u/d to stack all three at FR. (Flip with R U R' F R' F' R if needed.)
//   4. Store via R U R' (STORES_P12) to top layer.
//   5. Restore centers with u'/d'.
// Each step verifies centers remain solved (compares 24 center stickers before/after).
function _tryPairLast45(s, ei){
  const [c1,c2]=EDGE_COLORS5[ei];
  const pcs=_findPiecesP12(s,c1,c2);
  // All 3 pieces must be locatable (they are, in middle layers after first 8)
  const paths=_bfsFlexible5(pcs, 13, 80);
  for(const {path, positions} of paths){
    const upos=positions.find(k=>U_POS_P12.includes(k));
    const dpos=positions.find(k=>D_POS_P12.includes(k));
    if(!upos||!dpos) continue;
    const k=U_K_P12[upos], l=D_L_P12[dpos];
    // §2b step 4: store via R U R' to top layer. Try each U/D bin.
    // (For last 4, U/D bins are occupied; we try all and accept the swap.)
    for(let tb=0; tb<8; tb++){
      const s2=s.map(f=>f.slice());
      const centersBefore=[];
      for(let f=0;f<6;f++)for(let r=1;r<4;r++)for(let c=1;c<4;c++) centersBefore.push(s2[f][r*5+c]);
      for(const m of path) applyMove5(s2,m);
      for(const m of [...UK_SEQ_P12[k],...DL_SEQ_P12[l]]) applyMove5(s2,m);
      for(const m of STORES_P12[tb]) applyMove5(s2,m);
      for(const m of [...UK_INV_P12[k],...DL_INV_P12[l]]) applyMove5(s2,m);
      // Verify centers: compare 24 center stickers before/after
      let centersOk=true;
      let idx=0;
      for(let f=0;f<6&&centersOk;f++)for(let r=1;r<4&&centersOk;r++)for(let c=1;c<4;c++){
        if(s2[f][r*5+c]!==centersBefore[idx++]) centersOk=false;
      }
      if(!centersOk) continue;
      // Verify target edge is now a paired tredge
      if(!_isTredgeP12(s2,ei)) continue;
      return [...path, ...UK_SEQ_P12[k], ...DL_SEQ_P12[l], ...STORES_P12[tb], ...UK_INV_P12[k], ...DL_INV_P12[l]];
    }
  }
  return null;
}
// Pair the last 4 middle edges (bins 8-11) via §2b.
// Assumes centers solved and first 8 edges paired.
// Returns move sequence (may be null if §2b cannot proceed).
function pairLast45(s){
  const allMoves=[];
  const order=[8,9,10,11];
  for(const ei of order){
    // Skip if already paired
    if(_isTredgeP12(s,ei)) continue;
    const moves=_tryPairLast45(s, ei);
    if(!moves) return null;
    for(const m of moves) applyMove5(s,m);
    allMoves.push(...moves);
    // Per-step verification: centers must remain solved
    if(!centersSolved5(s)) return null;
  }
  return allMoves;
}

// Pair the last 4 middle edges (bins 8-11). Assumes first 8 are paired in bins 0-7
// and centers are solved. Returns move sequence or null.
function pairMiddles5(s){
  // Build cubie map: position -> edge index (0-3 for edges 8-11)
  const byCubie=new Map();
  for(const [f,r,c] of _ALL_ESTK5){
    const {p}=stickerPos5(f,r,c); const k=p.join(',');
    if(!byCubie.has(k))byCubie.set(k,[]);
    byCubie.get(k).push([f,r,c]);
  }
  const init12=[];
  for(const coord of MID_POS_COORDS5){
    const stk=byCubie.get(coord);
    if(!stk || stk.length!==2){ return null; }
    const cols=[s[stk[0][0]][stk[0][1]*5+stk[0][2]], s[stk[1][0]][stk[1][1]*5+stk[1][2]]].sort((a,b)=>a-b);
    let ei=-1;
    for(let e=8;e<=11;e++){
      const [c1,c2]=EDGE_COLORS5[e];
      const target=[Math.min(c1,c2),Math.max(c1,c2)];
      if(cols[0]===target[0]&&cols[1]===target[1]){ ei=e-8; break; }
    }
    if(ei<0) return null;
    init12.push(ei);
  }
  const path=_bfsMid5(init12);
  if(!path) return null;
  const moves=[];
  for(const mn of path){
    const seq=MID_MOVES5[mn].seq;
    for(const m of seq){ applyMove5(s,m); moves.push(m); }
  }
  return moves;
}

// Full 5x5 solver: centers -> edges -> 3x3 -> optimize -> verify.
function solve5x5(scrambleMoves){
  const s=newSolved5();
  for(const m of scrambleMoves)applyMove5(s,m);
  const all=[];
  const cm=solveCenters5(s);
  for(const m of cm){all.push(m);}
  // Pair first 8 edges (U/D bins) via slice-join (preserves centers)
  const m8=pairFirst85(s);
  if(!m8) throw new Error('solve5x5: first-8 edge pairing failed');
  for(const m of m8) all.push(m);
  // Pair last 4 middle edges (E-slice bins) via SFS-based BFS (preserves centers + first 8)
  const m4=pairMiddles5(s);
  if(!m4) throw new Error('solve5x5: last-4 edge pairing failed');
  for(const m of m4) all.push(m);
  // Extract 3x3 and solve
  const kStr=to3x3_5(s);
  const sol3=_solveCubejs3x5(kStr);
  if(sol3===null)throw new Error('3x3 solve failed (invalid cube state)');
  for(const m of sol3){applyMove5(s,m);all.push(m);}
  const opt=optimizeMoves5(all);
  // Internal verification
  const v=newSolved5();
  for(const m of scrambleMoves)applyMove5(v,m);
  for(const m of opt)applyMove5(v,m);
  if(!isSolved5(v))throw new Error('solve5x5 verification failed');
  return opt;
}

global.Solve5={
  applyMove5, newSolved5, isSolved5, solveCenters5, centersSolved5, solveEdges5,
  solve5x5, to3x3_5, pairFirst85, pairMiddles5, pairLast45, pairMiddlesFirst,
  // internals exposed for research / testing
  _c:{slotPerm, seqPerm, permCycles, compose, invertP, cycPerm,
      SLOT_TYPE, CTR5, FN5, homeFace, slotName, centerColoring,
      invMove, invSeq, searchMacro, findTripleXYZ, ALLCYCLES, IDENT48, TRIPLE_MAP},
  _edge:{_findEdgePieces5, _edgePaired5, _bfsTogetherWide5, _bfsWingsToFR5, EDGES5, EDGE_COLORS5, _posToSlot5, stickerPos5},
  _p12:{_tryPairEdge5, _isTredgeP12, _solveWithOrder5, _findPiecesP12, _bfsFlexible5,
        _bfsTupleToESliceP12, _binOfEdgeP12,
        BIN_PERM_P12, STORES_P12, UK_SEQ_P12, DL_SEQ_P12, UK_INV_P12, DL_INV_P12,
        U_K_P12, D_L_P12, U_POS_P12, D_POS_P12, FR_E_P12, UD_P12, ALL_BINS_P12, OUTER_P12, PERMS_P12}
};

})(typeof window!=='undefined' ? window : global);
