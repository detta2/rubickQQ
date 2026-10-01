// test_centers.js — verify solveCenters5 on random scrambles.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, C = S5._c;

console.log('base cycles loaded:', C.ALLCYCLES.length/2, '(x2 with inverses)');

// scramble move set (realistic 5x5: outer + wide, quarter/half/prime)
const SM=[];
for(const f of ['U','D','F','B','L','R']) for(const s of ['',"2","'"]) SM.push(f+s);
for(const f of ['U','D','F','B','L','R']) for(const s of ['',"2","'"]) SM.push(f+'w'+s);

function scramble(n){
  const s=S5.newSolved5();
  for(let i=0;i<n;i++) S5.applyMove5(s, SM[Math.floor(Math.random()*SM.length)]);
  return s;
}

const N=200;
let fails=0, totalMoves=0, maxMoves=0, totalMs=0;
for(let t=0;t<N;t++){
  const s=scramble(40);
  const before=S5.centersSolved5(s);
  const t0=Date.now();
  const mv=S5.solveCenters5(s);
  const ms=Date.now()-t0;
  totalMs+=ms;
  if(!mv){ fails++; console.log('FAIL: null at trial',t); continue; }
  if(!S5.centersSolved5(s)){ fails++; console.log('FAIL: centers not solved at trial',t); continue; }
  totalMoves+=mv.length; maxMoves=Math.max(maxMoves,mv.length);
}
console.log('\n== results ==');
console.log('trials:',N,' fails:',fails);
console.log('avg moves:',(totalMoves/Math.max(1,N-fails)).toFixed(1),' max moves:',maxMoves);
console.log('avg time:',(totalMs/N).toFixed(0)+'ms');

// edge cases
(function(){
  const s=S5.newSolved5();
  const mv=S5.solveCenters5(s);
  console.log('solved cube -> moves:', mv&&mv.length, '(expect 0)');
  const s2=S5.newSolved5(); S5.applyMove5(s2,'Uw');
  const mv2=S5.solveCenters5(s2);
  console.log('single Uw -> moves:', mv2&&mv2.length, 'solved:', S5.centersSolved5(s2));
  // verify all returned moves parse
  const s3=scramble(40); const mv3=S5.solveCenters5(s3);
  const bad=mv3.filter(m=>!/^([UDFBLRMES])(w?)(['2]?)$/.test(m)||(m[0]==='M'||m[0]==='E'||m[0]==='S')&&m.includes('w'));
  console.log('unparseable moves:', bad.length);
})();
process.exit(fails?1:0);
