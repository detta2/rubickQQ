// research_centers.js — discover single 3-cycles on 5x5 centers.
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5 = global.Solve5, C = S5._c;

const Q = ['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S'];

// 0. orbit check: every move must preserve SLOT_TYPE
for(const m of Q){
  const P=C.slotPerm(m);
  for(let i=0;i<48;i++) if(C.SLOT_TYPE[P[i]]!==C.SLOT_TYPE[i]){
    console.log('ORBIT MIXING by',m); process.exit(1);
  }
}
console.log('0. orbits preserved by all moves: OK (2 orbits of 24)');

// helper: all sequences of given length over Q (cap count)
function seqs(len, cap){
  let out=[[]];
  for(let d=0;d<len;d++){
    const nx=[];
    for(const s of out) for(const m of Q){ nx.push(s.concat(m)); if(nx.length>=cap) return nx; }
    out=nx;
  }
  return out;
}

const pool=[]; // {seq:[moves], P, kind:'single'|'double', cyc}
const seenKind=new Set();
function consider(seq){
  let P; try{ P=C.seqPerm(seq); }catch(e){ return; }
  const cyc=C.permCycles(P);
  let kind=null;
  if(cyc.length===1&&cyc[0].length===3) kind='single';
  else if(cyc.length===2&&cyc[0].length===3&&cyc[1].length===3) kind='double';
  if(!kind) return;
  const orb=C.SLOT_TYPE[cyc[0][0]];
  const key=kind+orb+':'+cyc.map(x=>x.slice().sort((a,b)=>a-b).join(',')).join('|');
  if(seenKind.has(key)) return;
  seenKind.add(key);
  pool.push({seq, P, kind, cyc, orb});
}

// 1. commutators [A,B], A len 1..2, B len 1
console.log('1. enumerating [A,B] commutators...');
for(const A of seqs(1)){ for(const B of seqs(1)){ if(A[0]===B[0])continue;
  consider(A.concat(B, C.invSeq(A), C.invSeq(B))); } }
const A2=seqs(2, 400);
for(const A of A2){ for(const B of seqs(1)){ consider(A.concat(B, C.invSeq(A), C.invSeq(B))); } }
console.log('   pool:', pool.length,
  '| single:', pool.filter(p=>p.kind==='single').length,
  '| double:', pool.filter(p=>p.kind==='double').length);
for(const orb of [0,1]){
  const s=pool.filter(p=>p.kind==='single'&&p.orb===orb);
  console.log('   orbit '+(orb?'X':'cross')+' singles: '+s.length);
  for(const e of s.slice(0,6)) console.log('     '+e.seq.join(' ')+'   '+e.cyc[0].map(C.slotName).join('->'));
}

// 2. product search: C1*C2 over pool (conjugated for variety) -> single 3-cycles
console.log('2. product search...');
const rnd=()=>Q[Math.floor(Math.random()*Q.length)];
const Tshort=()=>{ const n=Math.floor(Math.random()*3); const s=[]; for(let i=0;i<n;i++)s.push(rnd()); return s; };
const pool2=[];
for(const e of pool){
  pool2.push(e);
  for(let k=0;k<6;k++){
    const T=Tshort();
    const seq=T.concat(e.seq, C.invSeq(T));
    const P=C.compose(C.compose(C.seqPerm(T), e.P), C.invertP(C.seqPerm(T)));
    pool2.push({seq, P, kind:e.kind, cyc:C.permCycles(P), orb:e.orb});
  }
}
const singles={0:[],1:[]};
const seenS=new Set();
for(const a of pool2) for(const b of pool2){
  const P=C.compose(a.P,b.P);
  const cyc=C.permCycles(P);
  if(cyc.length===1&&cyc[0].length===3){
    const orb=C.SLOT_TYPE[cyc[0][0]];
    const key=cyc[0].slice().sort((x,y)=>x-y).join(',');
    if(seenS.has(orb+key)) continue;
    seenS.add(orb+key);
    singles[orb].push({seq:a.seq.concat(b.seq), triple:cyc[0].map(C.slotName)});
  }
}
for(const orb of [0,1]) console.log('   orbit '+(orb?'X':'cross')+' singles from products: '+singles[orb].length);

// 3. pick a compact diverse set per orbit -> BASE_CYCLES table
console.log('\n== chosen BASE_CYCLES ==');
const chosen=[];
for(const orb of [0,1]){
  const cands=singles[orb].slice().sort((a,b)=>a.seq.length-b.seq.length).slice(0,8);
  // also include direct singles from pool
  for(const e of pool.filter(p=>p.kind==='single'&&p.orb===orb).slice(0,4))
    cands.push({seq:e.seq, triple:e.cyc[0].map(C.slotName)});
  cands.sort((a,b)=>a.seq.length-b.seq.length);
  const picked=cands.slice(0,3);
  for(const p of picked){
    chosen.push(p.seq);
    console.log('  ['+p.seq.map(s=>'"'+s+'"').join(',')+'], // len '+p.seq.length+' orb '+(orb?'X':'cross')+' '+p.triple.join('->'));
  }
}
console.log('\nBASE_CYCLES_JS='+JSON.stringify(chosen));
