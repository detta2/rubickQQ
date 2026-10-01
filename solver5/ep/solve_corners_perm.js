// solve_corners_perm.js — insertion solver for corner PERMUTATION using clean336.
// Convention (corner_model): P[s] = destination slot of piece currently at s (pos->dest).
// Solved iff P[s]==s for all s. Clean cycles are twist-free (T preserved).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const fs = require('fs');

const clean336 = JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json','utf8'));
// normalized map: "a,b,c" (ordered triple) -> seq realizing a->b->c->a (in P convention).
// Store all 3 rotations, plus inverses for the reverse direction.
const cmap = new Map();
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=s=>s.slice().reverse().map(invMove);
const rots=([a,b,c])=>[[a,b,c],[b,c,a],[c,a,b]];
for(const h of clean336){
  const Mc=CM.seqCorner(h.seq);
  const cy=CM.cornerCycles(Mc);
  if(cy.length!==1||cy[0].length!==3) continue;
  const [a,b,c]=cy[0];
  let fwd;
  if(Mc.P[a]===b && Mc.P[b]===c && Mc.P[c]===a) fwd=[a,b,c];
  else if(Mc.P[a]===c && Mc.P[c]===b && Mc.P[b]===a) fwd=[a,c,b];
  else { console.log('weird', cy[0]); continue; }
  const rev=[fwd[0],fwd[2],fwd[1]];
  const iseq=invSeq(h.seq);
  for(const r of rots(fwd)) if(!cmap.has(r.join(','))) cmap.set(r.join(','), h.seq);
  for(const r of rots(rev)) if(!cmap.has(r.join(','))) cmap.set(r.join(','), iseq);
}
console.log('normalized cmap:', cmap.size);

// apply seq to CM-state {P,T}
function applySeq(st, seq){
  let cur={P:st.P.slice(), T:st.T.slice()};
  for(const m of seq) cur=CM.composeC(cur, CM.moveCorner[m]);
  return cur;
}

// Solve perm of st={P,T}. Returns {seq, st}.
function solveCornerPerm(st){
  let cur={P:st.P.slice(), T:st.T.slice()};
  const seq=[];
  const solved=()=>{for(let i=0;i<8;i++)if(cur.P[i]!==i)return false;return true;};
  let guard=0;
  while(!solved()){
    if(++guard>60) return {seq:null, cur, err:'guard'};
    // piece p not home: cur.P[p]!==p. It's at slot cur.P[p]. Want it at p.
    let p=-1;
    for(let i=0;i<8;i++) if(cur.P[i]!==i){p=i;break;}
    const s=cur.P[p]; // current slot of piece p; need cycle s -> p
    // z must be an UNSOLVED slot (P[z]!=z) to not disturb solved pieces
    let done=false;
    for(let z=0;z<8 && !done;z++){
      if(z===s||z===p||cur.P[z]===z) continue;
      const key=[s,p,z].join(',');
      if(!cmap.has(key)) continue;
      const cs=cmap.get(key);
      cur=applySeq(cur,cs);
      seq.push(...cs);
      done=true;
    }
    if(!done) return {seq:null, cur, err:'no triple for s='+s+' p='+p};
  }
  return {seq, cur};
}

if(require.main===module){
  let pass=0,fail=0;
  for(let t=0;t<200;t++){
    // random even perm: compose random 3-cycles in P convention
    let P=[0,1,2,3,4,5,6,7];
    for(let k=0;k<6;k++){
      const a=(Math.random()*8)|0,b=(Math.random()*8)|0,c=(Math.random()*8)|0;
      if(a===b||b===c||a===c){k--;continue;}
      // (a b c): a->b,b->c,c->a. Compose: newP = cyc after P? We want to APPLY (a b c) to state P.
      // newP[s] = cyc[P[s]].
      const nP=P.map(x=> x===a?b : x===b?c : x===c?a : x);
      P=nP;
    }
    const r=solveCornerPerm({P,T:[0,0,0,0,0,0,0,0]});
    if(r.seq&&r.cur.P.every((x,i)=>x===i)) pass++; else { fail++; if(fail<3) console.log('FAIL', r.err); }
  }
  console.log(`perm solver self-test: ${pass}/200`);
}
module.exports={solveCornerPerm, cmap, applySeq};
