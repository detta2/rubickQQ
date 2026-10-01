// edgesolve5.js — full edge solver: middles (wing-preserving) then wings (middle-preserving).
// Centers WILL be broken; that's fine (inverted approach: centers solved last with edge-preserving commutators).
require('/home/hatch/workspace/rubickqq/solver5/solver5.js');
const S5=global.Solve5;
const {edgePerms, moves: MOVES} = require('/tmp/edge_perms.json');
const N=36;
const IDENT=Array.from({length:N},(_,i)=>i);
const compose=(A,B)=>{const C=new Array(A.length);for(let i=0;i<A.length;i++)C[i]=B[A[i]];return C;};
const invertP=P=>{const I=new Array(P.length);for(let i=0;i<P.length;i++)I[P[i]]=i;return I;};
const invMove=m=>m.endsWith('2')?m:(m.endsWith("'")?m.slice(0,-1):m+"'");
const invSeq=seq=>seq.slice().reverse().map(invMove);
const isW=s=>(s%3)!==1, isM=s=>(s%3)===1;
const MIDSLOTS=[], WINGSLOTS=[];
for(let s=0;s<36;s++)(isM(s)?MIDSLOTS:WINGSLOTS).push(s);
const midIdx=new Map(MIDSLOTS.map((s,i)=>[s,i]));
const wingIdx=new Map(WINGSLOTS.map((s,i)=>[s,i]));

// sub-perms for moves
const TMOVES=['U','D','F','B','L','R','Uw','Dw','Fw','Bw','Lw','Rw','M','E','S','u','d','r','l','f','b'];
function subPerm(slots, idxMap){
  const out={};
  for(const m of TMOVES){
    const P=edgePerms[m];
    out[m]=slots.map(s=>idxMap.get(P[s]));
  }
  return out;
}
const midMovePerms=subPerm(MIDSLOTS, midIdx);
const wingMovePerms=subPerm(WINGSLOTS, wingIdx);

// Build ALLCYCLES from found commutators (on sub-slot indices)
function buildCycles(jsonPath, slots, idxMap){
  const raw=require(jsonPath);
  const cycles=[];
  const seen=new Set();
  for(const {seq,cyc} of raw){
    const sub=cyc.map(s=>idxMap.get(s));
    const key=[...sub].sort((a,b)=>a-b).join(',');
    if(seen.has(key))continue;
    seen.add(key);
    // perm on sub-slots for this seq
    let P=Array.from({length:slots.length},(_,i)=>i);
    const full=(()=>{let Q=IDENT.slice();for(const m of seq)Q=compose(Q,edgePerms[m]);return Q;})();
    P=slots.map(s=>idxMap.get(full[s]));
    cycles.push({moves:seq.slice(), cyc:sub, P});
    cycles.push({moves:invSeq(seq), cyc:[sub[0],sub[2],sub[1]], P:invertP(P)});
  }
  return cycles;
}
console.log('building middle cycles...');
const midCycles=buildCycles('/tmp/nocenter_mid.json', MIDSLOTS, midIdx);
console.log('  middle base cycles (w/ inverses):', midCycles.length);
console.log('building wing cycles...');
const wingCycles=buildCycles('/tmp/longcomm_wing.json', WINGSLOTS, wingIdx);
console.log('  wing base cycles (w/ inverses):', wingCycles.length);

// Triple-map BFS on sub-slots
function buildTripleMap(cycles, movePerms, nSlots, label){
  const map=new Map();
  const queue=[];
  const push=(x,y,z,Bseq,C)=>{
    const key=x+','+y+','+z;
    if(map.has(key))return;
    map.set(key,{Bseq,C});
    queue.push([x,y,z]);
  };
  for(const C of cycles){
    const [a,b,c]=C.cyc;
    push(a,b,c,[],C);
  }
  let head=0;
  while(head<queue.length){
    const [x,y,z]=queue[head++];
    const cur=map.get(x+','+y+','+z);
    for(const m of TMOVES){
      const P=movePerms[m];
      const key=P[x]+','+P[y]+','+P[z];
      if(!map.has(key)){
        map.set(key,{Bseq:cur.Bseq.concat(m),C:cur.C});
        queue.push([P[x],P[y],P[z]]);
      }
    }
    if(queue.length>3000000){console.log('  BFS cap hit for '+label);break;}
  }
  const total=nSlots*(nSlots-1)*(nSlots-2);
  console.log(`  ${label} triple map: ${map.size}/${total} (${(100*map.size/total).toFixed(1)}%)`);
  return map;
}
const midTriple=buildTripleMap(midCycles, midMovePerms, 12, 'middle');
const wingTriple=buildTripleMap(wingCycles, wingMovePerms, 24, 'wing');

function findTriple(map,x,y,z){
  const e=map.get(x+','+y+','+z);
  if(!e)return null;
  return {Bseq:e.Bseq, C:e.C};
}

// --- state tracking ---
// We track pieces via the actual cube state. col[s] for s in slots = home slot of piece at s.
// For middles: piece identity = home middle slot (12 distinct).
// For wings: wings of an edge are indistinguishable; piece identity = home EDGE (0..11).
//   wingSlots s -> edgeOf(s). A wing is "correct" if wingEdgeAt(s) === edgeOf(s).
const EDGE_OF=s=>Math.floor(s/3);

// Build coloring from cube state: for each of 36 edge slots, identify the piece.
// We need S5._edge.EDGES5 and EDGE_COLORS5.
const EDGES5=S5._edge.EDGES5, EDGE_COLORS5=S5._edge.EDGE_COLORS5;
const stickerPos5=S5._edge.stickerPos5;
// SLOT_PAIRS from predecessor: slot s -> [[f,r,c],[f,r,c]] (two stickers)
const SLOT_PAIRS=[];
for(let ei=0;ei<12;ei++){
  const byKey=new Map();
  EDGES5[ei].forEach(([f,r,c])=>{
    const key=stickerPos5(f,r,c).p.join(',');
    if(!byKey.has(key))byKey.set(key,[]);
    byKey.get(key).push([f,r,c]);
  });
  const groups=[...byKey.values()];
  const midIdx2=groups.findIndex(g=>g.some(([f,r,c])=>f===EDGES5[ei][1][0]&&r===EDGES5[ei][1][1]&&c===EDGES5[ei][1][2]));
  const ordered=[groups[(midIdx2+1)%3],groups[midIdx2],groups[(midIdx2+2)%3]];
  for(let k=0;k<3;k++)SLOT_PAIRS[ei*3+k]=ordered[k];
}
function edgeIdAt(state, s){
  // returns home edge index (0..11) of the piece at slot s, by colors
  const [st1]=SLOT_PAIRS[s];
  // actually need both stickers; use first sticker pair
  const pair=SLOT_PAIRS[s];
  const c1=state[pair[0][0]][pair[0][1]*5+pair[0][2]];
  const c2=state[pair[1][0]][pair[1][1]*5+pair[1][2]];
  const key=[Math.min(c1,c2),Math.max(c1,c2)].join(',');
  for(let e=0;e<12;e++){
    const [ec1,ec2]=EDGE_COLORS5[e];
    if([Math.min(ec1,ec2),Math.max(ec1,ec2)].join(',')===key)return e;
  }
  throw new Error('cannot identify edge at slot '+s);
}

// Solve one orbit via insertion. 
// slots: array of sub-slot indices (0..nSlots-1). 
// pieceAt(i): home sub-slot (for middles) or home edge (for wings) of piece at slots[i].
// isCorrect(i): whether slot i is solved.
// applyMacro(seq): apply move seq to real cube state AND update tracking.
function solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrectSlot, label){
  const nSlots=slots.length;
  const moves=[];
  // tracking: cur[i] = identifier of piece currently at slots[i]
  const cur=new Array(nSlots);
  const refresh=()=>{for(let i=0;i<nSlots;i++)cur[i]=pieceHome(state, slots[i]);};
  refresh();
  const solved=new Array(nSlots).fill(false);
  const updateSolved=()=>{for(let i=0;i<nSlots;i++)solved[i]=isCorrectSlot(state,slots[i],cur[i],i);};
  updateSolved();
  const applyMacro=(Bseq,Cmoves)=>{
    const Aseq=invSeq(Bseq);
    const seq=Aseq.concat(Cmoves,Bseq);
    for(const m of seq){S5.applyMove5(state,m);moves.push(m);}
    refresh();updateSolved();
  };
  let guard=0;
  while(true){
    if(solved.every(Boolean))break;
    if(++guard>2000){console.log(`  ${label}: guard hit`);return null;}
    const uns=[];
    for(let i=0;i<nSlots;i++)if(!solved[i])uns.push(i);
    if(uns.length===2){
      // endgame: use two 3-cycles with a solved slot
      const [p,q]=uns;
      let r=-1;for(let i=0;i<nSlots;i++)if(solved[i]){r=i;break;}
      if(r<0){console.log(`  ${label}: no solved slot for endgame`);return null;}
      // To fix swap (p q): apply (p q r) then (p r q).
      const m1=findTriple(tripleMap,p,q,r);
      if(!m1){console.log(`  ${label}: endgame triple1 missing (${p},${q},${r})`);return null;}
      applyMacro(m1.Bseq, m1.C.moves);
      const m2=findTriple(tripleMap,p,r,q);
      if(!m2){console.log(`  ${label}: endgame triple2 missing`);return null;}
      applyMacro(m2.Bseq, m2.C.moves);
      continue;
    }
    const p=uns[0];
    // find q: slot holding the piece that belongs at p
    // pieceHome gives identifier; we need identifier == homeOf(p)
    const homeP = label==='middle' ? p : Math.floor(slots[p]/3); // for wings, home edge
    let q=-1;
    for(const i of uns){if(i!==p&&cur[i]===homeP){q=i;break;}}
    if(q<0){
      // piece for p is at a solved slot? shouldn't happen if tracking right; try any uns
      console.log(`  ${label}: cannot find piece for slot ${p} (cur: ${uns.map(i=>i+':'+cur[i]).join(' ')})`);
      return null;
    }
    let hit=null;
    for(const z of uns){
      if(z===p||z===q)continue;
      const e=findTriple(tripleMap,q,p,z);
      if(e){hit=e;break;}
    }
    if(!hit){console.log(`  ${label}: no triple for (${q},${p},z)`);return null;}
    applyMacro(hit.Bseq, hit.C.moves);
  }
  return moves;
}

// --- parity fix (odd generators) ---
// Middle parity: 'M' is a 4-cycle (odd) on middles, preserves wings.
// Wing parity: 'r' is a 4-cycle (odd) on wings, preserves middles.
// Like 4x4 OLL/PLL parity: if solveOrbit fails (odd permutation), apply the
// odd generator once and retry. The composition (odd o odd = even) becomes
// solvable by 3-cycles.
const PARITY_MOVE={middle:['M'], wing:['r']};
function solveOrbitWithParity(state, slots, idxMap, tripleMap, pieceHome, isCorrectSlot, label){
  const moves=[];
  let m=solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrectSlot, label);
  if(m){ moves.push(...m); return moves; }
  const pseq=PARITY_MOVE[label]||[];
  for(const mv of pseq){ S5.applyMove5(state,mv); moves.push(mv); }
  m=solveOrbit(state, slots, idxMap, tripleMap, pieceHome, isCorrectSlot, label);
  if(m){ moves.push(...m); return moves; }
  return null;
}

module.exports={solveOrbit, solveOrbitWithParity, PARITY_MOVE, midTriple, wingTriple, MIDSLOTS, WINGSLOTS, midIdx, wingIdx, SLOT_PAIRS, edgeIdAt, EDGE_OF, findTriple, invSeq};
console.log('edgesolve5 module loaded');
