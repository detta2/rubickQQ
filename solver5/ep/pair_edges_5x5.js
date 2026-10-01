// 5x5 edge pairing via two-stage method using proven 4x4 algorithm.
// Stage 1: Pair 2 wings per edge (12 wing pairs)
// Stage 2: Pair wing-pair + middle per edge (12 complete edges)
// Uses: Uw' R U R' F R' F' R Uw (from working 4x4 solver)

const WS = '/home/hatch/workspace/rubickqq/solver5';

// Load 5x5 engine
let S5;
try {
  S5 = require(WS + '/solver5.js');
} catch(e) {
  console.error('Failed to load solver5.js:', e.message);
  process.exit(1);
}

// 5x5 edge slots: 12 edges, each with 3 pieces (2 wings + 1 middle)
// Each piece has 2 stickers: [face, row, col]
// Format: [ [wing1_u, wing1_f], [mid_u, mid_f], [wing2_u, wing2_f] ]
// Faces: U=0, R=1, F=2, D=3, L=4, B=5

const EDGE_SLOTS_5x5 = [
  // UF edge (U=0, F=2)
  { faces: [0,2], pieces: [
    [[0,4,1],[2,0,1]],  // wing1
    [[0,4,2],[2,0,2]],  // middle
    [[0,4,3],[2,0,3]],  // wing2
  ]},
  // UR edge (U=0, R=1)
  { faces: [0,1], pieces: [
    [[0,3,4],[1,0,3]],
    [[0,2,4],[1,0,2]],
    [[0,1,4],[1,0,1]],
  ]},
  // UB edge (U=0, B=5)
  { faces: [0,5], pieces: [
    [[0,0,3],[5,0,3]],
    [[0,0,2],[5,0,2]],
    [[0,0,1],[5,0,1]],
  ]},
  // UL edge (U=0, L=4)
  { faces: [0,4], pieces: [
    [[0,1,0],[4,0,1]],
    [[0,2,0],[4,0,2]],
    [[0,3,0],[4,0,3]],
  ]},
  // DF edge (D=3, F=2)
  { faces: [3,2], pieces: [
    [[3,0,1],[2,4,1]],
    [[3,0,2],[2,4,2]],
    [[3,0,3],[2,4,3]],
  ]},
  // DR edge (D=3, R=1)
  { faces: [3,1], pieces: [
    [[3,1,4],[1,4,3]],
    [[3,2,4],[1,4,2]],
    [[3,3,4],[1,4,1]],
  ]},
  // DB edge (D=3, B=5)
  { faces: [3,5], pieces: [
    [[3,4,3],[5,4,3]],
    [[3,4,2],[5,4,2]],
    [[3,4,1],[5,4,1]],
  ]},
  // DL edge (D=3, L=4)
  { faces: [3,4], pieces: [
    [[3,3,0],[4,4,1]],
    [[3,2,0],[4,4,2]],
    [[3,1,0],[4,4,3]],
  ]},
  // FR edge (F=2, R=1)
  { faces: [2,1], pieces: [
    [[2,1,4],[1,1,0]],
    [[2,2,4],[1,2,0]],
    [[2,3,4],[1,3,0]],
  ]},
  // FL edge (F=2, L=4)
  { faces: [2,4], pieces: [
    [[2,3,0],[4,3,4]],
    [[2,2,0],[4,2,4]],
    [[2,1,0],[4,1,4]],
  ]},
  // BR edge (B=5, R=1)
  { faces: [5,1], pieces: [
    [[5,3,0],[1,3,4]],
    [[5,2,0],[1,2,4]],
    [[5,1,0],[1,1,4]],
  ]},
  // BL edge (B=5, L=4)
  { faces: [5,4], pieces: [
    [[5,1,4],[4,1,0]],
    [[5,2,4],[4,2,0]],
    [[5,3,4],[4,3,0]],
  ]},
];

const PAIR_ALG = ["Uw'", "R", "U", "R'", "F", "R'", "F'", "R", "Uw"];

// Helper: get colors of a piece (2 stickers)
function getPieceColors(state, piece) {
  return piece.map(([f,r,c]) => state[f][r*5+c]);
}

// Helper: check if two pieces have the same colors (as a set)
function sameColors(c1, c2) {
  const s1 = [...c1].sort().join(',');
  const s2 = [...c2].sort().join(',');
  return s1 === s2;
}

console.log('5x5 edge pairing module loaded.');
console.log('Edge slots defined:', EDGE_SLOTS_5x5.length);
console.log('Pairing algorithm:', PAIR_ALG.join(' '));
console.log('');
console.log('TODO: Implement findPieces, bfsSetup, pairEdges functions.');
console.log('This adapts the proven 4x4 pairing method for 5x5 three-piece edges.');
