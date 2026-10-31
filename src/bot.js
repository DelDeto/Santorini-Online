import {applyAction,legalActions,GODS} from './game.js';

/**
 * Santorini Strategic BOT V1.5–V2.0.
 * Uses only authoritative game actions, never bypasses God Power rules.
 * Easy: exploratory. Normal: completes its turn and blocks immediate wins.
 * Hard: bounded complete-turn search. Expert: wider tactical search + deeper reply checks.
 * No external API and no player data is transmitted.
 */
const copy=g=>structuredClone(g);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const botAdjacent=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col))===1;
const distance=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col));
const center=a=>4-Math.abs(a.row-2)-Math.abs(a.col-2);
const godPriority=['pan','athena','apollo','artemis','minotaur','atlas','demeter','hephaestus','prometheus','hermes'];
const WIN=1_000_000;
const alive=(g,p)=>!g.eliminated?.[p]&&g.workers[p]?.length>0;
const opponents=(g,p)=>g.workers.map((_,i)=>i).filter(i=>i!==p&&alive(g,i));
const phaseMove=g=>['move','extraMove','hermesMove'].includes(g.phase);
const height=(g,w)=>g.board[w.row][w.col];
const actionKey=a=>[a.type,a.worker??'',a.row??'',a.col??'',a.god??'',a.dome?'d':''].join(':');

function simulate(g,player,action){
 const n=copy(g);
 try{applyAction(n,player,action);return n;}catch{return null;}
}
function winningNow(g,p){
 if(g.winner!==null||g.phase!=='move'||!alive(g,p))return [];
 const trial={...g,turn:p,phase:'move',ctx:{}};
 return legalActions(trial,p).filter(a=>a.type==='move'&&a.wins);
}
function basePosition(g,p){
 if(g.winner!==null)return g.winner===p?WIN:-WIN;
 const enemies=opponents(g,p);
 let total=0;
 for(let player=0;player<g.workers.length;player++){
  if(!alive(g,player))continue;
  const own=player===p,sign=own?1:-1/Math.max(1,enemies.length);
  for(const w of g.workers[player]){
   const h=height(g,w);
   // Ascending toward level 2 is productive, but standing alone on level 2
   // is less important than having a safe neighbouring build opportunity.
   total+=sign*(h*22+center(w)*2.8);
   let exits=0,stepUps=0,winningTowers=0,danger=0;
   for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    const row=w.row+dr,col=w.col+dc;
    if(row<0||col<0||row>4||col>4)continue;
    const hh=g.board[row][col];
    if(hh===4)continue;
    const occupied=g.workers.some(a=>a.some(t=>t.row===row&&t.col===col));
    if(!occupied&&hh<=h+1){exits++;if(hh===h+1)stepUps++;if(h===2&&hh===3)winningTowers++;}
    if(hh===2&&h<=2)danger++;
   }
   total+=sign*(Math.min(exits,6)*2.5+Math.min(stepUps,3)*3.3+Math.min(danger,4)*2.2);
   if(winningTowers)total+=sign*145*winningTowers;
   if(exits===0)total+=sign*(-90);
   if(h===2)total+=sign*22;
  }
 }
 // Prefer control of level 2 squares that can be turned into a safe level 3.
 for(let r=0;r<5;r++)for(let c=0;c<5;c++){
  const h=g.board[r][c];
  if(h!==2&&h!==3)continue;
  const pos={row:r,col:c},ours=g.workers[p]||[];
  const ownNear=ours.some(w=>botAdjacent(w,pos));
  const enemyNear=enemies.some(o=>g.workers[o].some(w=>botAdjacent(w,pos)));
  if(h===2)total+=ownNear?7:0;
  if(h===3){if(ownNear)total+=30;if(enemyNear)total-=45;}
 }
 return total;
}
function leafScore(g,p){
 let score=basePosition(g,p);
 if(g.winner!==null)return score;
 if(g.phase!=='move'||g.turn===p)return score;
 const enemies=opponents(g,p);
 for(const enemy of enemies){
  const wins=winningNow(g,enemy).length;
  if(!wins)continue;
  // A winning move for the very next opponent is essentially fatal.
  score-=wins*(g.turn===enemy?120_000:10_000);
 }
 // A strategy that leaves our own immediate win next turn has value,
 // but it must not take precedence over preventing a forced opponent win.
 if(winningNow(g,p).length)score+=140;
 return score;
}
function chooseGod(g,choices,difficulty){
 if(difficulty==='easy')return pick(choices);
 const enemies=g.gods.filter(Boolean);
 const prefer=choices.map(a=>{
  const idx=godPriority.indexOf(a.god);
  const advancedWeight={charon:21,triton:19,hestia:18,poseidon:17,hera:16,limus:16,medusa:15,hypnus:15,zeus:14,persephone:14,ares:13,eros:13,selene:12,aphrodite:12,morpheus:11,dionysus:10,chronus:9,circe:9,chaos:8,bia:7};
  let score=idx>=0?20-idx:advancedWeight[a.god]??8;
  if(a.god==='athena'&&enemies.includes('pan'))score+=3;
  if(a.god==='apollo'&&enemies.includes('minotaur'))score+=2;
  return {a,score};
 });
 return prefer.sort((x,y)=>y.score-x.score)[0].a;
}
function choosePlacement(g,p,choices,difficulty){
 if(difficulty==='easy')return pick(choices);
 const mates=g.workers[p]||[],enemies=opponents(g,p).flatMap(i=>g.workers[i]);
 return choices.map(a=>{
  const pos={row:a.row,col:a.col};
  let score=center(pos)*2.6;
  if(mates.length){
   const d=distance(pos,mates[0]);
   score+=(d===2?9:d===3?6:d===1?-7:2);
  }else score+=pos.row===2&&pos.col===2?2:0;
  const enemyDist=enemies.length?Math.min(...enemies.map(w=>distance(pos,w))):4;
  score+=(enemyDist===2?4:enemyDist===0?-8:enemyDist===1?-4:0);
  return {a,score:score+Math.random()*(['hard','expert'].includes(difficulty)?.08:2)};
 }).sort((x,y)=>y.score-x.score)[0].a;
}
function optionsFor(g,p){
 let actions=legalActions(g,p);
 // Hermes can otherwise cycle indefinitely on equal-level squares.
 // Ending movement after a small number of steps is strategically sensible.
 if((g.phase==='hermesMove'&&(g.ctx?.hermesSteps||0)>=3)||(g.phase==='tritonMove'&&(g.ctx?.tritonSteps||0)>=4)){
  const ends=actions.filter(a=>a.type=== (g.phase==='tritonMove'?'skip':'endMove'));
  if(ends.length)return ends;
 }
 return actions;
}
function rankByFast(g,p,actions,limit){
 const scored=[];
 for(const action of actions){
  const result=simulate(g,p,action);
  if(!result)continue;
  let score=basePosition(result,p);
  if(result.winner===p)score+=WIN;
  if(action.type==='skip')score-=.8;
  if(action.type==='endMove')score+=1;
  if(action.type==='prebuild')score-=2.5;
  if(action.type==='move'&&action.special)score+=3;
  scored.push({action,result,score});
 }
 scored.sort((a,b)=>b.score-a.score);
 const top=scored.slice(0,limit);
 // Explicitly retain possible tactical wins even when ranking is narrow.
 for(const x of scored)if(x.result.winner===p&&!top.some(y=>actionKey(y.action)===actionKey(x.action)))top.push(x);
 return top;
}
/**
 * Search through the rest of OUR TURN, including mandatory build and
 * extra phases from Artemis, Demeter, Hephaestus, Prometheus and Hermes.
 * Returns a fully completed position to avoid one-action horizon traps.
 */
function completeTurn(g,p,config,budget,depth=0){
 if(g.winner!==null||g.turn!==p||g.phase==='ended'){
  return {score:leafScore(g,p),state:g,complete:true};
 }
 if(depth>=config.maxDepth||budget.nodes>=config.maxNodes){
  return {score:basePosition(g,p)-80,state:g,complete:false};
 }
 const opts=optionsFor(g,p);
 if(!opts.length)return {score:-WIN/2,state:g,complete:false};
 const width=['build','extraBuild'].includes(g.phase)?config.buildWidth:
  ['extraMove','hermesMove'].includes(g.phase)?config.extraWidth:config.branchWidth;
 const ranked=rankByFast(g,p,opts,width);
 let best=null;
 for(const candidate of ranked){
  budget.nodes++;
  let reply=completeTurn(candidate.result,p,config,budget,depth+1);
  if(!best||reply.score>best.score)best=reply;
  if(best?.score>=WIN)break;
  if(budget.nodes>=config.maxNodes)break;
 }
 return best||{score:basePosition(g,p)-120,state:g,complete:false};
}
function projectedEnemyState(g,op,context={}){
 if(!context||context.capacity!==4||!Array.isArray(context.seatGods))return g;
 const order=[2,3,0,1],index=order.indexOf(context.seat??2);
 const nextSeat=order[(index+1)%4];
 if(nextSeat%2!==op)return g;
 const power=context.seatGods[nextSeat];
 if(!power||g.gods[op]===power)return g;
 const trial=copy(g);
 trial.gods[op]=power;
 return trial;
}
/** Hard mode: exact next opponent winning move + bounded MOVE->BUILD counterplay. */
function opponentResponse(g,p,context,config){
 if(g.winner!==null||g.phase!=='move'||g.turn===p)return 0;
 const enemy=g.turn,trial=projectedEnemyState(g,enemy,context);
 if(winningNow(trial,enemy).length)return -200_000;
 const candidates=rankByFast(trial,enemy,legalActions(trial,enemy),config.replyWidth);
 let worst=basePosition(g,p),shown=false;
 for(const first of candidates){
  let value=basePosition(first.result,p);
  if(first.result.winner===enemy)return -200_000;
  if(first.result.turn===enemy){
   const follow=optionsFor(first.result,enemy);
   if(follow.length){
    const branches=rankByFast(first.result,enemy,follow,config.replyBuildWidth);
    for(const second of branches){
     if(second.result.winner===enemy)return -200_000;
     const z=basePosition(second.result,p);
     value=Math.min(value,z);
    }
   }
  }
  worst=Math.min(worst,value);shown=true;
 }
 return shown?Math.max(-1000,Math.min(0,(worst-basePosition(g,p))*.6)):0;
}
/**
 * Bounded adversarial full-turn reply search.
 * We compare complete move+build sequences, not only the opponent's first
 * movement. This handles dome denial, immediate winning moves and multi-player
 * turn order without making every BOT step an unbounded minimax search.
 */
function opponentTwoPly(g,p,context={}){
 if(g.winner!==null||g.phase!=='move'||g.turn===p)return 0;
 const enemy=g.turn,trial=projectedEnemyState(g,enemy,context);
 const first=rankByFast(trial,enemy,optionsFor(trial,enemy),5);
 let worst=Infinity;
 const config={branchWidth:3,buildWidth:4,extraWidth:3,maxDepth:7,maxNodes:55};
 for(const a of first){
  const next=completeTurn(a.result,enemy,config,{nodes:0},1);
  const state=next.state;
  if(state.winner===enemy)return -360000;
  let score=basePosition(state,p);
  if(next.complete&&state.turn===p&&winningNow(state,p).length)score+=900;
  if(!next.complete)score-=65;
  worst=Math.min(worst,score);
 }
 return worst===Infinity?0:Math.max(-30000,Math.min(5000,(worst-basePosition(g,p))*1.2));
}

function strategic(g,p,choices,difficulty,context={}){
 const config=difficulty==='expert'?{
  rootWidth:27,branchWidth:7,buildWidth:9,extraWidth:6,
  maxDepth:8,maxNodes:1350,replyWidth:10,replyBuildWidth:7,noise:0
 }:difficulty==='hard'?{
  rootWidth:25,branchWidth:5,buildWidth:7,extraWidth:5,
  maxDepth:6,maxNodes:530,replyWidth:6,replyBuildWidth:4,noise:.05
 }:{
  rootWidth:17,branchWidth:3,buildWidth:5,extraWidth:3,
  maxDepth:5,maxNodes:230,replyWidth:0,replyBuildWidth:0,noise:1.1
 };
 const candidates=g.phase==='hermesMove'&&(g.ctx?.hermesSteps||0)>=3
  ?(choices.filter(a=>a.type==='endMove').length?choices.filter(a=>a.type==='endMove'):choices):choices;
 const immediate=candidates.filter(a=>a.type==='move'&&a.wins);
 if(immediate.length)return immediate[0];
 const root=rankByFast(g,p,candidates,config.rootWidth);
 if(!root.length)return choices[0];
 const results=[];
 // Allocate search fairly across candidates; a shared node budget used to
 // starve later candidates and make BOT play depend on root ordering.
 const perRootBudget=Math.max(12,Math.floor(config.maxNodes/root.length));
 for(const x of root){
  const res=completeTurn(x.result,p,{...config,maxNodes:perRootBudget},{nodes:0},1);
  results.push({action:x.action,score:res.score,completed:res.complete,state:res.state});
 }
 if(!results.length)return choices[0];
 results.sort((a,b)=>b.score-a.score);
 if(difficulty==='hard'||difficulty==='expert'){
  // Apply the opponent response only to the strongest candidates, keeping
  // resource consumption predictable on Cloudflare Workers Free.
  for(const x of results.slice(0,difficulty==='expert'?10:6)){
   if(x.completed&&x.state.winner===null)x.score+=opponentResponse(x.state,p,context,config);
   if(difficulty==='expert'&&x.completed&&x.state.winner===null)x.score+=opponentTwoPly(x.state,p,context);
  }
 }
 results.sort((a,b)=>b.score-a.score);
 const chosen=results[0];
 if(difficulty==='normal'&&results.length>1&&Math.random()<.07){
  const alternative=results.find(x=>x.score>=chosen.score-3);
  if(alternative)return alternative.action;
 }
 return chosen.action;
}
export function chooseMultiplayerBotAction(game,difficulty='normal',player=game.turn,available=legalActions(game,player),context={}){
 if(game.winner!==null||!Array.isArray(available)||!available.length)return null;
 if(available[0]?.type==='selectGod')return chooseGod(game,available,difficulty);
 if(game.phase==='place')return choosePlacement(game,player,available,difficulty);
 const won=available.filter(a=>a.type==='move'&&a.wins);
 if(won.length&&difficulty!=='easy')return won[0];
 if(difficulty==='easy')return pick(available);
 return strategic(game,player,available,difficulty,context);
}
export function chooseBotAction(game,difficulty='normal'){
 if(game.turn!==1||game.winner!==null)return null;
 return chooseMultiplayerBotAction(game,difficulty,1,legalActions(game,1));
}
