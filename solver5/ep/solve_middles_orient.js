// solve_middles_orient.js — fix middle orientation via precomputed basis + GF(2).
const WS = '/home/hatch/workspace/rubickqq/solver5';
const MM = require(WS + '/ep/middle_model.js');
const fs=require('fs');
const {seqs: BASIS_SEQS, flips: BASIS_FLIPS} = JSON.parse(fs.readFileSync(WS+'/ep/middle_flip_basis.json','utf8'));

function solveLinear(basis, target){
  const n=basis.length;
  const rows=12, cols=n;
  const aug=[];
  for(let j=0;j<12;j++){
    const row=[];
    for(let i=0;i<n;i++) row.push(basis[i][j]);
    row.push(target[j]);
    aug.push(row);
  }
  let r=0;
  const where=new Array(cols).fill(-1);
  for(let c=0;c<cols && r<rows;c++){
    let sel=-1;
    for(let i=r;i<rows;i++) if(aug[i][c]===1){ sel=i; break; }
    if(sel===-1) continue;
    [aug[sel],aug[r]]=[aug[r],aug[sel]];
    where[c]=r;
    for(let i=0;i<rows;i++) if(i!==r && aug[i][c]===1){
      for(let j=c;j<=cols;j++) aug[i][j]^=aug[r][j];
    }
    r++;
  }
  for(let i=r;i<rows;i++) if(aug[i][cols]===1) return null;
  const ans=new Array(cols).fill(0);
  for(let i=0;i<cols;i++) if(where[i]!==-1) ans[i]=aug[where[i]][cols];
  return ans;
}

function solveMiddlesOrient(targetFlips){
  // targetFlips: 12-bit array, 1 = needs flip (to cancel).
  // Returns sequence (array of moves) or null.
  if(targetFlips.every(x=>x===0)) return [];
  const coef=solveLinear(BASIS_FLIPS, targetFlips);
  if(!coef) return null;
  let combined=[];
  coef.forEach((c,i)=>{ if(c) combined=[...combined, ...BASIS_SEQS[i]]; });
  return combined;
}

module.exports={solveMiddlesOrient};
console.log('solve_middles_orient loaded, basis:', BASIS_SEQS.length);
