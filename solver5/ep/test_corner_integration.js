// test_corner_integration.js — verify corner solver preserves edges+centers.
// Scramble corners using clean 3-cycles (preserve edges+centers by construction),
// then solve and verify full 5x5 solved.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5=global.Solve5;
const CM=require('/home/hatch/workspace/rubickqq/solver5/ep/corner_model.js');
const {solveCornerPerm}=require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_perm.js');
const {solveCornerOrient}=require('/home/hatch/workspace/rubickqq/solver5/ep/solve_corners_orient.js');
const fs=require('fs');
const clean336=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/clean336.json','utf8'));

let pass=0;
for(let t=0;t<20;t++){
  const s=S5.newSolved5();
  // scramble corners with 8 random clean 3-cycles (preserve edges+centers)
  let corner={P:[0,1,2,3,4,5,6,7],T:[0,0,0,0,0,0,0,0]};
  for(let k=0;k<8;k++){
    const h=clean336[(Math.random()*clean336.length)|0];
    for(const m of h.seq){ S5.applyMove5(s,m); corner=CM.composeC(corner,CM.moveCorner[m]); }
  }
  // also twist some corners using pure twists (preserve edges+centers)
  const twists=JSON.parse(fs.readFileSync('/home/hatch/workspace/rubickqq/solver5/ep/pure_twists.json','utf8'));
  for(let k=0;k<4;k++){
    const h=twists[(Math.random()*twists.length)|0];
    for(const m of h.seq){ S5.applyMove5(s,m); corner=CM.composeC(corner,CM.moveCorner[m]); }
  }
  // solve
  let r=solveCornerPerm(corner);
  if(!r.seq){ console.log(`t${t}: FAIL perm`); continue; }
  for(const m of r.seq){ S5.applyMove5(s,m); corner=CM.composeC(corner,CM.moveCorner[m]); }
  corner=r.cur;
  r=solveCornerOrient(corner);
  if(!r.seq){ console.log(`t${t}: FAIL orient`); continue; }
  for(const m of r.seq){ S5.applyMove5(s,m); }
  // verify fully solved
  const sv=S5.newSolved5();
  let ok=true;
  for(let f=0;f<6&&ok;f++) for(let i=0;i<25;i++) if(s[f][i]!==sv[f][i]) ok=false;
  if(ok) pass++; else console.log(`t${t}: FAIL verify`);
}
console.log(`CORNER INTEGRATION: ${pass}/20 PASS`);
