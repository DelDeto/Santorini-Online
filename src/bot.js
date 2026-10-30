import { applyAction, legalBuilds, legalMoves } from './game.js';

const copy = g => structuredClone(g);
const pick = items => items[Math.floor(Math.random() * items.length)];
const dist = (a,b) => Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col));
const center = ({row,col}) => 4-Math.abs(row-2)-Math.abs(col-2);
function enemyWinCount(g) {
  if (g.winner !== null || g.phase !== 'move') return 0;
  let n=0;
  for (let i=0;i<g.workers[g.turn].length;i++) {
    const w=g.workers[g.turn][i];
    for (const d of legalMoves(g,g.turn,i)) if (g.board[w.row][w.col] === 2 && g.board[d.row][d.col] === 3) n++;
  }
  return n;
}
function evaluate(g, difficulty) {
  if(g.winner===1) return 1e6;
  if(g.winner===0) return -1e6;
  const own=g.workers[1], enemy=g.workers[0];
  let score=0;
  for (const w of own) {
    const h=g.board[w.row][w.col];
    score+=h*13 + center(w)*1.2;
    const mobility=legalMoves({...g,phase:'move'},1,own.indexOf(w)).length;
    score+=Math.min(6,mobility)*.7;
    for(const e of enemy) if(dist(w,e)<=1)score+=1.2;
  }
  for(const w of enemy)score-=g.board[w.row][w.col]*9;
  if(difficulty==='hard' && g.turn===0)score-=enemyWinCount(g)*400;
  else if(g.turn===0)score-=enemyWinCount(g)*110;
  return score;
}
function choosePlace(g, difficulty) {
  const empty=[];
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    if(!g.workers.some(a=>a.some(w=>w.row===row&&w.col===col))){
      const pos={row,col};
      const spread=g.workers[1].reduce((sum,w)=>sum+dist(w,pos),0);
      const enemyClose=g.workers[0].some(w=>dist(w,pos)<=1);
      const value=difficulty==='easy'?Math.random()*10:center(pos)*2+spread*1.3+(enemyClose?-2:0)+Math.random()*4;
      empty.push({type:'place',row,col,value});
    }
  }
  empty.sort((a,b)=>b.value-a.value);
  return empty[0]&&{type:'place',row:empty[0].row,col:empty[0].col};
}
function chooseMove(g,difficulty){
  const candidates=[];
  for(let worker=0;worker<g.workers[1].length;worker++){
    for(const move of legalMoves(g,1,worker)){
      const action={type:'move',worker,...move};
      if(difficulty==='easy'){candidates.push({action,score:Math.random()});continue;}
      const next=copy(g);
      applyAction(next,1,action);
      if(next.winner===1)return action;
      const targets=legalBuilds(next,next.workers[1][worker]);
      let best=-Infinity;
      for(const dest of targets){
        const after=copy(next);
        applyAction(after,1,{type:'build',...dest});
        const score=evaluate(after,difficulty)
          +(difficulty==='hard'&&after.board[dest.row][dest.col]===3?4:0);
        best=Math.max(best,score);
      }
      candidates.push({action,score:best+Math.random()*(difficulty==='hard'?1.5:9)});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]?.action??null;
}
function chooseBuild(g,difficulty){
  const pos=g.workers[1][g.selected];
  const all=legalBuilds(g,pos);
  if(!all.length) return null;
  if(difficulty==='easy')return {type:'build',...pick(all)};
  const choices=all.map(dest=>{
    const next=copy(g);
    applyAction(next,1,{type:'build',...dest});
    const height=next.board[dest.row][dest.col];
    const enemyNear=g.workers[0].some(e=>dist(e,dest)<=1);
    const ownNear=g.workers[1].some(w=>dist(w,dest)<=1);
    const score=evaluate(next,difficulty)
      + (height===4 && enemyNear?16:0)
      + (height===3 && ownNear?8:0)
      - (height===3 && enemyNear?15:0)
      + Math.random()*(difficulty==='hard'?2:12);
    return {dest,score};
  });
  choices.sort((a,b)=>b.score-a.score);
  return {type:'build',...choices[0].dest};
}
/** Server-side bot. Never trust the browser to produce a BOT action. */
export function chooseBotAction(game,difficulty='normal'){
  if(game.turn!==1||game.winner!==null)return null;
  if(game.phase==='place')return choosePlace(game,difficulty);
  if(game.phase==='move')return chooseMove(game,difficulty);
  if(game.phase==='build')return chooseBuild(game,difficulty);
  return null;
}
