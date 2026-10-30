import { applyAction, legalBuilds, legalMoves, legalActions, GODS } from './game.js';

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
function godStrategy(game,difficulty){
 const acts=legalActions(game,1);
 if(!acts.length)return null;
 if(game.phase==='godpick'){
  // In solo matches, player 0 picks first; bot chooses from the remaining gods.
  const priorities=['pan','athena','apollo','artemis','minotaur','demeter','atlas','hephaestus','prometheus','hermes'];
  return difficulty==='easy'?pick(acts):acts.slice().sort((a,b)=>priorities.indexOf(a.god)-priorities.indexOf(b.god))[0];
 }
 if(game.phase==='place')return choosePlace(game,difficulty);
 if(game.phase==='hermesMove'){
  const end=acts.filter(a=>a.type==='endMove');
  if((game.ctx?.hermesSteps??0)>=2&&end.length)return pick(end);
 }
 if(difficulty==='easy')return pick(acts);
 const score=action=>{
  const g=structuredClone(game);
  try{applyAction(g,1,action);}catch{return -Infinity;}
  if(g.winner===1)return 1e8;
  if(g.winner===0)return -1e8;
  const own=g.workers[1],other=g.workers[0];
  let value=0;
  const height=w=>g.board[w.row][w.col];
  for(const w of own){
   value+=height(w)*14+center(w)*1.4;
   for(const e of other)if(dist(w,e)<=1)value+=2;
  }
  for(const w of other)value-=height(w)*12+center(w)*.65;
  if(action.type==='build'){
   const h=g.board[action.row][action.col];
   const nearOwn=own.some(w=>dist(w,action)<=1),nearEnemy=other.some(w=>dist(w,action)<=1);
   if(h===3){value+=(nearOwn?22:0)-(nearEnemy?35:0);}
   else if(h===4)value+=nearEnemy?12:0;
  }
  if(action.type==='skip')value-=2;
  if(action.type==='endMove')value+=5;
  if(action.type==='prebuild')value+=3;
  if(g.turn===0&&g.phase==='move'){
   const opponent=legalActions(g,0);
   const immediate=opponent.filter(a=>a.type==='move'&&a.wins).length;
   value-=immediate*(difficulty==='hard'?2200:280);
  }
  if(g.turn===1&&g.phase==='move'){
   const immediate=legalActions(g,1).filter(a=>a.type==='move'&&a.wins).length;
   value+=immediate*140;
  }
  return value;
 };
 return acts.map(a=>({a,score:score(a)+Math.random()*(difficulty==='hard'?.9:7)}))
  .sort((a,b)=>b.score-a.score)[0]?.a||acts[0];
}

/** Multiplayer BOT: same authoritative action list as a human client, any seat/team. */
export function chooseMultiplayerBotAction(game,difficulty='normal',player=game.turn,available=legalActions(game,player)){
 if(game.winner!==null||!available?.length)return null;
 const choices=available;
 if(choices[0]?.type==='selectGod'){
  const priority=['pan','athena','apollo','artemis','atlas','minotaur','demeter','hephaestus','prometheus','hermes'];
  return difficulty==='easy'?pick(choices):choices.slice().sort((a,b)=>priority.indexOf(a.god)-priority.indexOf(b.god))[0];
 }
 if(difficulty==='easy')return pick(choices);
 if(game.phase==='hermesMove'&&game.ctx?.hermesSteps>=2){
  const end=choices.filter(a=>a.type==='endMove');
  if(end.length)return pick(end);
 }
 const others=Array.from({length:game.workers.length},(_,i)=>i).filter(i=>i!==player&&!game.eliminated?.[i]);
 function evaluateAction(action){
  const before=game,after=copy(game);
  const from=action.worker===undefined?null:before.workers[player]?.[action.worker];
  const oldHeight=from?before.board[from.row][from.col]:0;
  try{applyAction(after,player,action);}catch{return -1e9;}
  if(after.winner===player)return 1e9;
  if(after.winner!==null)return -1e9;
  let value=0;
  // Score all of our pieces, not just worker one, and penalise ALL enemies in three-player FFA.
  for(const w of after.workers[player]||[]){
   const h=after.board[w.row][w.col];
   value+=h*14+center(w)*1.6;
   value+=Math.min(7,legalMoves({...after,phase:'move',turn:player,ctx:{}},player,(after.workers[player]||[]).indexOf(w)).length)*.5;
  }
  for(const opponent of others){
   for(const w of after.workers[opponent]||[]){
    const h=after.board[w.row][w.col];
    value-=h*11+center(w)*.55;
   }
  }
  if(action.type==='place'){
   const placed={row:action.row,col:action.col};
   value+=center(placed)*2;
   value-=others.flatMap(x=>after.workers[x]||[]).some(w=>dist(w,placed)<=1)?4:0;
   const mate=before.workers[player]||[];
   if(mate.length)value+=Math.min(3,dist(mate[0],placed))*2;
  }
  if(action.type==='move'){
   const nextH=after.board[action.row][action.col];
   value+=(nextH-oldHeight)*7;
   // Avoid stepping into an opponent's next-turn winning corridor.
   const danger=others.some(q=>(after.workers[q]||[]).some(w=>dist(w,action)<=1&&after.board[w.row][w.col]===2&&nextH===3));
   if(danger)value-=difficulty==='hard'?220:60;
  }
  if(action.type==='build'){
   const height=after.board[action.row][action.col];
   const ownNear=(after.workers[player]||[]).some(w=>dist(w,action)<=1);
   const enemyNear=others.some(q=>(after.workers[q]||[]).some(w=>dist(w,action)<=1));
   if(height===3)value+=(ownNear?32:0)-(enemyNear?55:0);
   if(height===4)value+=enemyNear?17:-5;
   if(height===2)value+=ownNear?5:0;
  }
  if(action.type==='skip')value-=3;
  if(action.type==='endMove')value+=5;
  if(action.type==='prebuild')value+=2;
  // Critically avoid leaving an immediate floor-3 win to the following opponent(s).
  if(after.phase==='move'){
   for(const q of others){
    const trial={...after,phase:'move',turn:q,ctx:{}};
    const wins=legalActions(trial,q).filter(a=>a.type==='move'&&a.wins).length;
    value-=wins*(difficulty==='hard'?500:100);
   }
  }
  return value;
 }
 return choices.map(a=>({a,score:evaluateAction(a)+(Math.random()*(difficulty==='hard'?1.1:6))}))
  .sort((a,b)=>b.score-a.score)[0]?.a??choices[0];
}

/** Server-side bot. Never trust the browser to produce a BOT action. */

export function chooseBotAction(game,difficulty='normal'){
  if(game.turn!==1||game.winner!==null)return null;
  if(game.ruleset==='god')return godStrategy(game,difficulty);
  if(game.phase==='place')return choosePlace(game,difficulty);
  if(game.phase==='move')return chooseMove(game,difficulty);
  if(game.phase==='build')return chooseBuild(game,difficulty);
  return null;
}
