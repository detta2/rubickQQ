// research_x.js — hunt for X-center 3-cycles (or 4/5-cycles) via random commutators.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, C = S5._c;
const Q = ['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];
const rnd = n => { const s=[]; for(let i=0;i<n;i++) s.push(Q[Math.floor(Math.random()*Q.length)]); return s; };

const X0 = 0; // U[1,1], an X slot
function xPart(P){
  // cycle structure restricted to X orbit, as sorted signature + cycles
  const seen=new Set(), cyc=[];
  for(let i=0;i<48;i++){
    if(C.SLOT_TYPE[i]!==1||seen.has(i)||P[i]===i) continue;
    const c=[]; let j=i;
    while(!seen.has(j)){ seen.add(j); c.push(j); j=P[j]; }
    if(c.length>1) cyc.push(c);
  }
  return cyc;
}
const sig = cyc => cyc.map(c=>c.length).sort((a,b)=>a-b).join('+')||'id';

const found = {}; // sig -> {seq, cyc}
let n=0;
const T0=Date.now();
// fixed 5-cycle base: ([Rw,U])^3 is pure X 5-cycle; verify:
const Fseq=['Rw','U',"Rw'","U'"];
const F3=Fseq.concat(Fseq,Fseq);
const PF3=C.seqPerm(F3);
console.log('([Rw,U])^3 on X:', sig(xPart(PF3)), '(want 5)');
const F5 = xPart(PF3)[0]; // the 5-cycle

function consider(seq){
  const P=C.seqPerm(seq);
  const xc=xPart(P);
  const s=sig(xc);
  if(s==='3'||s==='4'||s==='5'||s==='3+3'){
    if(!found[s]){ found[s]={seq:seq.join(' '), cyc:xc.map(c=>c.map(C.slotName))}; }
  }
}

// batch 1: random commutators [X,Y], X len 4-8, Y len 2-4
for(let t=0;t<300000;t++){
  const X=rnd(4+Math.floor(Math.random()*5));
  const Y=rnd(2+Math.floor(Math.random()*3));
  consider(X.concat(Y, C.invSeq(X), C.invSeq(Y)));
  n++;
}
// batch 2: [F, Y] with F fixed 5-cycle, Y random short
for(let t=0;t<100000;t++){
  const Y=rnd(1+Math.floor(Math.random()*4));
  consider(F3.concat(Y, C.invSeq(F3), C.invSeq(Y)));
  n++;
}
// batch 3: products of two X 5-cycles (conjugates of F)
const fiveCycBases=[];
for(let t=0;t<200;t++){ const T=rnd(Math.floor(Math.random()*4)); fiveCycBases.push(T); }
for(let t=0;t<100000;t++){
  const T1=fiveCycBases[Math.floor(Math.random()*fiveCycBases.length)];
  const T2=fiveCycBases[Math.floor(Math.random()*fiveCycBases.length)];
  const G1=T1.concat(F3,C.invSeq(T1)), G2=T2.concat(F3,C.invSeq(T2));
  consider(G1.concat(G2));
  n++;
}
console.log('tried',n,'in',((Date.now()-T0)/1000).toFixed(1)+'s');
for(const s of Object.keys(found).sort()){
  console.log('X '+s+': '+found[s].seq+'   '+JSON.stringify(found[s].cyc));
}
if(!found['3']) console.log('NO X 3-cycle found');
