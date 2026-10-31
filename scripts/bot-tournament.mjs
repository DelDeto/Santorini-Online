import {newGame,legalActions,applyAction} from '../src/game.js';
import {chooseMultiplayerBotAction} from '../src/bot.js';

// Reproducible head-to-head BOT matches. No external service, no auto-play UI.
const args=Object.fromEntries(process.argv.slice(2).filter(s=>s.startsWith('--')).map(s=>{
 const [key,...value]=s.slice(2).split('=');return [key,value.join('=')];
}));
const games=Math.max(1,Math.min(100,Number(args.games)||4));
const maxActions=Math.max(20,Math.min(800,Number(args.maxActions)||130));
const mode=['classic','duel','heroes','trio','agora','fleece'].includes(args.mode)?args.mode:'classic';
const challenger=['easy','normal','hard','expert'].includes(args.challenger)?args.challenger:'expert';
const opponent=['easy','normal','hard','expert'].includes(args.opponent)?args.opponent:'normal';
const players=mode==='trio'?3:2;
const records=[];
let wins=0,losses=0,draws=0,invalid=0;
const originalRandom=Math.random;
const started=performance.now();
try{
 for(let match=0;match<games;match++){
  let seed=(0x9e3779b9^(match+1)*2654435761)>>>0;
  Math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const g=newGame(mode==='classic'?'classic':'god',players,mode);
  const heroSeat=match%players;
  let steps=0,error=null;
  while(g.winner===null&&steps<maxActions){
   const p=g.turn,level=p===heroSeat?challenger:opponent;
   const legal=legalActions(g,p);
   if(!legal.length){error='no legal actions in '+g.phase+' for '+p;break;}
   const act=chooseMultiplayerBotAction(g,level,p,legal,{capacity:players});
   if(!act||!legal.some(x=>JSON.stringify(x)===JSON.stringify(act))){error='illegal bot choice';break;}
   try{applyAction(g,p,act);}catch(e){error=e.message;break;}
   steps++;
  }
  if(error)invalid++;
  else if(g.winner===null)draws++;
  else if(g.winner===heroSeat)wins++;
  else losses++;
  records.push({match:match+1,mode,expertSeat:heroSeat,result:error?'INVALID':g.winner===null?'DRAW':g.winner===heroSeat?'WIN':'LOSS',actions:steps,error});
 }
}finally{Math.random=originalRandom;}
const summary={version:'2.5.0',mode,games,challenger,opponent,maxActions,wins,losses,draws,invalid,
 winRate:games?(wins/games*100).toFixed(1)+'%':'n/a',elapsedMs:Math.round(performance.now()-started),records};
console.log(JSON.stringify(summary,null,2));
if(invalid)process.exitCode=1;
