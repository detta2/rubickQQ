const E=require('/tmp/edgesolve5.js');
const S5=global.Solve5;
function scramble(state, seed, n=25){
  let rng=seed; const rand=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const faces=['U','D','R','L','F','B','u','d','r','l','f','b','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
  const mods=['',"'",'2'];
  for(let i=0;i<n;i++){ const m=faces[Math.floor(rand()*faces.length)]+mods[Math.floor(rand()*3)]; S5.applyMove5(state,m); }
}
function solveWP(state, slots, idxMap, tripleMap, pieceHome, isCorrect, label, paritySeq){
  let m=E.solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrect, label);
  if(m) return m;
  const moves=[];
  for(const mv of paritySeq){ S5.applyMove5(state, mv); moves.push(mv); }
  m=E.solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrect, label);
  if(m){ moves.push(...m); return moves; }
  return null;
}
let pass=0;
for(let t=0;t<20;t++){
  const seed=1000+t*137;
  const s=S5.newSolved5(); scramble(s, seed); S5.solveCenters5(s);
  const midPH=(st,sl)=>E.midIdx.get(E.edgeIdAt(st,sl)*3+1);
  const midC=(st,sl)=>E.edgeIdAt(st,sl)===Math.floor(sl/3);
  const m1=solveWP(s, E.MIDSLOTS, E.midIdx, E.midTriple, midPH, midC, 'middle', ['M']);
  if(!m1){ console.log(`seed ${seed}: FAIL@middles`); continue; }
  const wingPH=(st,sl)=>E.edgeIdAt(st,sl);
  const wingC=(st,sl)=>E.edgeIdAt(st,sl)===Math.floor(sl/3);
  const m2=solveWP(s, E.WINGSLOTS, E.wingIdx, E.wingTriple, wingPH, wingC, 'wing', ['r']);
  if(!m2){ console.log(`seed ${seed}: FAIL@wings`); continue; }
  let ok=true;
  for(let e=0;e<12 && ok;e++) for(let k=0;k<3;k++){ if(E.edgeIdAt(s,e*3+k)!==e){ ok=false; break; } }
  if(ok){ pass++; } else { console.log(`seed ${seed}: FAIL@verify`); }
}
console.log(`${pass}/20 PASS`);
