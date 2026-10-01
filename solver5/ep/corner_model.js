// corner_model.js — corner permutation + orientation model for 5x5.
// Derived from the 3D engine (solver5.js). Slot-based representation:
//   moveCorner[m] = {P:[8], T:[8]} — piece at slot s moves to slot P[s],
//   gaining twist T[s] (mod 3). Compose: apply A then B:
//   P[s] = B.P[A.P[s]], T[s] = (A.T[s] + B.T[A.P[s]]) % 3.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5;
const SP5 = S5._edge.stickerPos5;

// ---- corner slots: group stickers by 3D position, |x|=|y|=|z|=2 ----
const slotPos = [];   // slotPos[s] = [p1,p2,p3] sticker positions in cyclic order
const slotNorm = [];  // slotNorm[s] = [n1,n2,n3] corresponding normals
(function buildSlots(){
  const byPos = new Map();
  for(let f=0;f<6;f++) for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    const sp = SP5(f,r,c);
    const [x,y,z] = sp.p;
    if(Math.abs(x)!==2 || Math.abs(y)!==2 || Math.abs(z)!==2) continue;
    const key = sp.p.join(',');
    if(!byPos.has(key)) byPos.set(key, []);
    byPos.get(key).push({f,r,c,n:sp.n,p:sp.p});
  }
  // canonical order: sort corners by (y desc, then z, then x) for stable indexing
  const keys = [...byPos.keys()].sort((a,b)=>{
    const pa=a.split(',').map(Number), pb=b.split(',').map(Number);
    if(pb[1]!==pa[1]) return pb[1]-pa[1];
    if(pa[2]!==pb[2]) return pa[2]-pb[2];
    return pa[0]-pb[0];
  });
  for(const key of keys){
    const sts = byPos.get(key);
    const p = sts[0].p;
    const d = [p[0]/2, p[1]/2, p[2]/2]; // outward diagonal (unit-ish)
    // basis for plane ⊥ d
    const helper = Math.abs(d[1])>0.9 ? [1,0,0] : [0,1,0];
    const e1 = norm3(cross3(helper, d));
    const e2 = cross3(d, e1);
    const withAng = sts.map(st=>{
      const v = sub3(st.n, scale3(d, dot3(st.n,d)));
      return {st, ang: Math.atan2(dot3(v,e2), dot3(v,e1))};
    }).sort((a,b)=>a.ang-b.ang);
    // rotate so UD sticker (normal ±y) is first
    let ui = withAng.findIndex(o=>Math.abs(o.st.n[1])===1);
    const ordered = withAng.slice(ui).concat(withAng.slice(0,ui));
    slotPos.push(ordered.map(o=>o.st));
    slotNorm.push(ordered.map(o=>o.st.n));
  }
})();
function norm3(v){ const l=Math.hypot(...v); return [v[0]/l,v[1]/l,v[2]/l]; }
function cross3(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function dot3(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function sub3(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function scale3(a,s){ return [a[0]*s,a[1]*s,a[2]*s]; }

// home corner index by color set (sorted triple) -> slot
const HOME_BY_COLORS = new Map();
const UD_COLOR = new Array(8); // UD face color (0 or 3) of home cubie s
(function(){
  const s = S5.newSolved5();
  for(let k=0;k<8;k++){
    const cols = slotPos[k].map(st=>s[st.f][st.r*5+st.c]).sort((a,b)=>a-b);
    HOME_BY_COLORS.set(cols.join(','), k);
    UD_COLOR[k] = slotPos[k][0] ? s[slotPos[k][0].f][slotPos[k][0].r*5+slotPos[k][0].c] : -1;
  }
})();

// ---- per-move corner action ----
const MOVES63 = require('/tmp/edge_perms.json').moves;
const moveCorner = {};
(function buildMoveCorner(){
  for(const m of MOVES63){
    const lab = S5.newSolved5();
    for(let s=0;s<8;s++) for(let j=0;j<3;j++){
      const st = slotPos[s][j];
      lab[st.f][st.r*5+st.c] = s*3+j;
    }
    S5.applyMove5(lab, m);
    const P = new Array(8), T = new Array(8);
    // at slot s2 (positions in cyclic order), find label s*3+0
    const at = new Map(); // label -> [slot, idx]
    for(let s2=0;s2<8;s2++) for(let j2=0;j2<3;j2++){
      const st = slotPos[s2][j2];
      at.set(lab[st.f][st.r*5+st.c], [s2, j2]);
    }
    for(let s=0;s<8;s++){
      const [s2, j2] = at.get(s*3+0);
      P[s] = s2; T[s] = j2;
    }
    moveCorner[m] = {P, T};
  }
})();

const IDENT_C = {P:[0,1,2,3,4,5,6,7], T:[0,0,0,0,0,0,0,0]};
function composeC(A,B){ // apply A then B
  const P = new Array(8), T = new Array(8);
  for(let s=0;s<8;s++){ P[s]=B.P[A.P[s]]; T[s]=(A.T[s]+B.T[A.P[s]])%3; }
  return {P,T};
}
function invertC(A){
  const P = new Array(8), T = new Array(8);
  for(let s=0;s<8;s++){ P[A.P[s]]=s; T[A.P[s]]=(3-A.T[s])%3; }
  return {P,T};
}
function seqCorner(seq){
  let A = IDENT_C;
  for(const m of seq){
    const M = moveCorner[m];
    if(!M) throw new Error('unknown move '+m);
    A = composeC(A,M);
  }
  return A;
}
const invMove = m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq = seq=>seq.slice().reverse().map(invMove);
function cornerCycles(A){
  const seen=new Array(8).fill(false), out=[];
  for(let i=0;i<8;i++){
    if(seen[i]||A.P[i]===i) continue;
    const cyc=[]; let j=i;
    while(!seen[j]){ seen[j]=true; cyc.push(j); j=A.P[j]; }
    if(cyc.length>1) out.push(cyc);
  }
  return out;
}
// read corner state from cube: returns {piece:[8] (home slot of cubie at slot s), ori:[8]}
function readCorners(state){
  const piece = new Array(8), ori = new Array(8);
  for(let s=0;s<8;s++){
    const cols = slotPos[s].map(st=>state[st.f][st.r*5+st.c]);
    const key = cols.slice().sort((a,b)=>a-b).join(',');
    const k = HOME_BY_COLORS.get(key);
    if(k===undefined) throw new Error('unidentifiable corner at slot '+s);
    piece[s]=k;
    const udc = UD_COLOR[k];
    ori[s] = cols.indexOf(udc); // index in s's cyclic order (0 = UD position)
  }
  return {piece, ori};
}
function cornersSolved(state){
  for(let s=0;s<8;s++){
    const cols = slotPos[s].map(st=>state[st.f][st.r*5+st.c]);
    if(cols[0]!==UD_COLOR[s]) return false;
    const key = cols.slice().sort((a,b)=>a-b).join(',');
    if(HOME_BY_COLORS.get(key)!==s) return false;
  }
  return true;
}

module.exports = {slotPos, moveCorner, MOVES63, IDENT_C, composeC, invertC, seqCorner,
  invMove, invSeq, cornerCycles, readCorners, cornersSolved, HOME_BY_COLORS, UD_COLOR};
console.log('corner_model loaded: 8 slots,', Object.keys(moveCorner).length, 'moves');
