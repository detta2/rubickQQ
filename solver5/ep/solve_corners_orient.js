// solve_corners_orient.js — fix corner orientation using pure double-twists.
// Buffer 0 for a=1..6; (1,7) for a=7 (do 7 first).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const CM = require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const fs = require('fs');

const arr=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twists.json','utf8'));
const tmap=new Map(arr.map(h=>[h.key,h.seq]));
// get twist seq for pair (x,y) adding (tx,ty). Try (x,y) then (y,x).
function getTwist(x,y,tx,ty){
  let k=[x,y,tx,ty].join(',');
  if(tmap.has(k)) return tmap.get(k);
  k=[y,x,ty,tx].join(',');
  if(tmap.has(k)) return tmap.get(k);
  return null;
}
// For a in 1..6, partner 0. For 7, partner 1.
function solveCornerOrient(st){
  let cur={P:st.P.slice(), T:st.T.slice()};
  const seq=[];
  const apply=s=>{ for(const m of s) cur=CM.composeC(cur, CM.moveCorner[m]); seq.push(...s); };
  // 7 first (partner 1)
  for(const a of [7,1,2,3,4,5,6]){
    const b = a===7 ? 1 : 0;
    while(cur.T[a]%3!==0){
      const need=(3-cur.T[a])%3; // add `need` to a to zero it
      // add need to a, and (3-need) to b (sum 0)
      const s=getTwist(a,b,need,(3-need)%3);
      if(!s) return {seq:null, cur, err:'no twist for '+a};
      apply(s);
    }
  }
  return {seq, cur};
}

if(require.main===module){
  let pass=0,fail=0;
  for(let t=0;t<200;t++){
    // random twist with sum 0
    const T=Array.from({length:8},()=> (Math.random()*3)|0);
    const sum=T.reduce((a,b)=>a+b,0)%3;
    T[0]=(T[0]-sum+9)%3; // adjust to sum 0... actually (T[0]-sum)%3
    // ensure sum 0: T[0] = (T[0] - sum) mod 3
    const r=solveCornerOrient({P:[0,1,2,3,4,5,6,7],T});
    if(r.seq&&r.cur.T.every(x=>x===0)&&r.cur.P.every((x,i)=>x===i)) pass++;
    else { fail++; if(fail<3) console.log('FAIL',r.err,T.join('')); }
  }
  console.log(`orient solver self-test: ${pass}/200`);
}
module.exports={solveCornerOrient};
