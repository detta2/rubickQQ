// find_clean_macro.js — cari macro pairing yang hanya menggerakkan sedikit wings.
const { newCube, applyMoves, cloneCube, applyMove } = require("./cube");

const UF_LEFT = [[0,3,1],[2,0,1]];
const UB_LEFT = [[0,0,1],[5,0,2]];

function makeTest() {
  const c = newCube(4);
  for (const p of UF_LEFT) c.f[p[0]][p[1]][p[2]] = 99;
  for (const p of UB_LEFT) c.f[p[0]][p[1]][p[2]] = 98;
  return c;
}

const EDGES = [
  [[0,3,1],[0,3,2],[2,0,1],[2,0,2]],
  [[0,1,3],[0,2,3],[1,0,2],[1,0,1]],
  [[0,0,1],[0,0,2],[5,0,2],[5,0,1]],
  [[0,1,0],[0,2,0],[4,0,1],[4,0,2]],
  [[3,0,1],[3,0,2],[2,3,1],[2,3,2]],
  [[3,1,3],[3,2,3],[1,3,1],[1,3,2]],
  [[3,3,1],[3,3,2],[5,3,2],[5,3,1]],
  [[3,1,0],[3,2,0],[4,3,2],[4,3,1]],
  [[2,1,3],[2,2,3],[1,1,0],[1,2,0]],
  [[2,1,0],[2,2,0],[4,1,3],[4,2,3]],
  [[5,1,0],[5,2,0],[1,1,3],[1,2,3]],
  [[5,1,3],[5,2,3],[4,1,0],[4,2,0]],
];
function edgeOf(positions) {
  const s = new Set(positions.map(p=>p.join(",")));
  for (let i=0;i<EDGES.length;i++){
    const es = new Set(EDGES[i].map(p=>p.join(",")));
    let ok=true; for(const k of s) if(!es.has(k)) ok=false;
    if(ok) return i;
  }
  return -1;
}
function isPaired(cc) {
  const p99=[],p98=[];
  for(let f=0;f<6;f++)for(let r=0;r<4;r++)for(let q=0;q<4;q++){
    if(cc.f[f][r][q]===99) p99.push([f,r,q]);
    if(cc.f[f][r][q]===98) p98.push([f,r,q]);
  }
  const e1=edgeOf(p99), e2=edgeOf(p98);
  return e1!==-1 && e1===e2;
}
function centersSolved(cc) {
  for(let f=0;f<6;f++)for(let r=1;r<=2;r++)for(let q=1;q<=2;q++) if(cc.f[f][r][q]!==f) return false;
  return true;
}
// hitung berapa wing (selain 99,98) yang berpindah
function countMovedWings(before, after) {
  let n=0;
  for(let f=0;f<6;f++)for(let r=0;r<4;r++)for(let q=0;q<4;q++){
    const isWing = !((r===1||r===2)&&(q===1||q===2)) && !((r===0||r===3)&&(q===0||q===3));
    if(!isWing) continue;
    const b=before.f[f][r][q], a=after.f[f][r][q];
    // abaikan 99,98
    if(b===99||b===98||a===99||a===98) continue;
    if(b!==a) n++;
  }
  return n;
}

const SEARCH_MOVES = ["U","U'","U2","Uw","Uw'","Uw2","F","F'","R","R'","L","L'","B","B'","D","D'"];

function search() {
  const start = makeTest();
  const visited = new Set();
  function key(cc){
    let k="";
    for(let f=0;f<6;f++)for(let r=0;r<4;r++)for(let q=0;q<4;q++){
      if(cc.f[f][r][q]===99||cc.f[posKey(f,r,q)]===98) k+=f+","+r+","+q+":"+cc.f[f][r][q]+";";
    }
    for(let f=0;f<6;f++)for(let r=1;r<=2;r++)for(let q=1;q<=2;q++) k+=cc.f[f][r][q];
    return k;
  }
  function posKey(f,r,q){return f+","+r+","+q;}
  // perbaiki key
  function key2(cc){
    let k="";
    for(let f=0;f<6;f++)for(let r=0;r<4;r++)for(let q=0;q<4;q++){
      const v=cc.f[f][r][q];
      if(v===99||v===98) k+=f+","+r+","+q+":"+v+";";
    }
    for(let f=0;f<6;f++)for(let r=1;r<=2;r++)for(let q=1;q<=2;q++) k+=cc.f[f][r][q]+",";
    // juga posisi wings lain? untuk cleanliness kita butuh tahu mereka tidak bergerak.
    // tapi untuk BFS, kita hanya peduli 99,98 dan centers.
    return k;
  }
  visited.add(key2(start));
  const queue=[{c:start,mv:[]}];
  let iter=0, best=null;
  while(queue.length>0 && iter<500000){
    iter++;
    const {c:cur,mv}=queue.shift();
    if(mv.length>=8) continue;
    for(const m of SEARCH_MOVES){
      const nxt=cloneCube(cur);
      applyMove(nxt,m);
      if(isPaired(nxt) && centersSolved(nxt)){
        const moved=countMovedWings(start,nxt);
        console.log("KETEMU:",mv.concat([m]).join(" "),"wings lain bergerak:",moved,"iter",iter);
        if(best===null || moved<best.moved){
          best={seq:mv.concat([m]),moved};
          if(moved<=4) { console.log("SANGAT BERSIH!"); return best; }
        }
        // lanjut cari yang lebih bersih
        continue;
      }
      const k=key2(nxt);
      if(!visited.has(k)){
        visited.add(k);
        queue.push({c:nxt,mv:mv.concat([m])});
      }
    }
  }
  console.log("selesai, iter",iter,"terbaik:",best);
  return best;
}

if(require.main===module) search();
