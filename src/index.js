import { DurableObject } from 'cloudflare:workers';
import {newGame,applyAction,resetGame,legalActions,GODS} from './game.js';
import {chooseBotAction} from './bot.js';

const BOT_TOKEN='bot:server-managed';
const LEVELS=['easy','normal','hard'];
const cleanName=value=>String(value??'Người chơi').trim().slice(0,24).replace(/[<>]/g,'')||'Người chơi';
const team=seat=>seat%2;
const makeStats=()=>({wins:[0,0],matches:0});
function freshRoom(){return {game:newGame(),players:[null,null],mode:null,difficulty:'normal',ruleset:'classic',capacity:2,activeSeat:0,nextTeam0:0,history:[],stats:makeStats()};}
function capacity(r){return [2,3,4].includes(r.capacity)?r.capacity:2;}
function ready(r){return r.players.length===capacity(r)&&r.players.every(Boolean);}
function seatForTurn(r){
 if(capacity(r)===2)return r.game.turn;
 if(r.game.phase==='place'){
  if(r.game.turn===0)return r.game.workers[0].length===0?0:2;
  if(capacity(r)===4)return r.game.workers[1].length===0?1:3;
  return 1;
 }
 return [0,1,2,3].includes(r.activeSeat)?r.activeSeat:0;
}
function ownedWorker(r,seat){
 if(capacity(r)===2||seat===1)return null;
 if(seat===0)return 0;
 if(seat===2)return 1;
 if(seat===3)return 1;
 return null;
}
function availableActions(r){
 if(!ready(r))return [];
 const allowed=legalActions(r.game);
 const worker=ownedWorker(r,seatForTurn(r));
 return worker===null?allowed:allowed.filter(a=>a.worker===undefined||a.worker===worker);
}
function view(r,spectators=0){
 const n=capacity(r);
 return {
  game:r.game,legalActions:availableActions(r),gods:GODS,
  ruleset:r.game.ruleset||'classic',mode:r.mode||'online',difficulty:r.difficulty,
  capacity:n,activeSeat:seatForTurn(r),spectators,
  history:r.history||[],stats:r.stats||makeStats(),
  players:r.players.map((p,i)=>({name:p?.name??('Ghế '+(i+1)+' · Đang chờ'),joined:!!p,seat:i,team:team(i),bot:p?.token===BOT_TOKEN})),
  ready:ready(r)
 };
}
export class SantoriniRoom extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.ready=this.ctx.blockConcurrencyWhile(async()=>{
   this.room=await this.ctx.storage.get('room')||freshRoom();
   this.room.capacity=capacity(this.room);
   this.room.history??=[];
   this.room.stats??=makeStats();
   this.room.activeSeat??=0;
   this.room.nextTeam0??=0;
  });
 }
 async persist(){await this.ctx.storage.put('room',this.room);}
 send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
 spectatorCount(){return this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.seat===-1).length;}
 getView(){return view(this.room,this.spectatorCount());}
 broadcast(){const msg=JSON.stringify({type:'state',view:this.getView()});for(const ws of this.ctx.getWebSockets())this.send(ws,JSON.parse(msg));}
 async scheduleBot(){
  const r=this.room;
  if(r.mode==='bot'&&r.game.turn===1&&r.game.winner===null&&r.players[0])
   await this.ctx.storage.setAlarm(Date.now()+(r.game.phase==='place'||r.game.phase==='godpick'?950:1100));
 }
 advanceAfterAction(previousPhase,previousTurn,actionSeat){
  const r=this.room;
  if(capacity(r)===2)return;
  if(r.game.phase==='ended')return;
  if(r.game.phase==='place'||r.game.phase==='godpick')return;
  if(previousPhase==='place'&&r.game.phase==='move'){
   r.activeSeat=0;r.nextTeam0=0;return;
  }
  if(r.game.turn!==previousTurn){
   if(team(actionSeat)===0){
    r.activeSeat=capacity(r)===4&&actionSeat===2?3:1;
   }else{
    r.nextTeam0=r.nextTeam0===0?2:0;
    r.activeSeat=r.nextTeam0;
   }
  }
 }
 record(action,seat,oldWinner,oldRevision){
  const r=this.room;
  if(r.game.revision===oldRevision)return;
  r.history??=[];
  r.history.push({seat,action:action.type,description:r.game.lastAction,revision:r.game.revision});
  if(r.history.length>12)r.history.shift();
  if(oldWinner===null&&r.game.winner!==null){
   r.stats??=makeStats();
   r.stats.matches++;
   r.stats.wins[r.game.winner]++;
  }
 }
 async fetch(request){
  await this.ready;
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
  const u=new URL(request.url),token=u.searchParams.get('token');
  if(!token||!/^[a-f0-9]{32,64}$/.test(token))return new Response('Token invalid',{status:400});
  const name=cleanName(u.searchParams.get('name'));
  const r=this.room;
  if(!r.mode){
   r.mode=u.searchParams.get('mode')==='bot'?'bot':'online';
   r.ruleset=u.searchParams.get('ruleset')==='god'?'god':'classic';
   r.capacity=r.mode==='bot'?2:([3,4].includes(Number(u.searchParams.get('players')))?Number(u.searchParams.get('players')):2);
   // Team matches with 3 or 4 participants use official two-team mechanics without God Powers.
   if(r.capacity>2)r.ruleset='classic';
   r.game=newGame(r.ruleset);
   r.players=Array(r.capacity).fill(null);
   r.activeSeat=0;r.nextTeam0=0;r.history=[];r.stats=makeStats();
   if(r.mode==='bot'){
    r.difficulty=LEVELS.includes(u.searchParams.get('difficulty'))?u.searchParams.get('difficulty'):'normal';
    r.players[1]={name:'BOT · '+({easy:'Tập sự',normal:'Chiến thuật',hard:'Bậc thầy'}[r.difficulty]),token:BOT_TOKEN};
   }
  }
  let seat=r.players.findIndex(p=>p?.token===token);
  if(u.searchParams.get('spectate')==='1')seat=-1;
  else if(seat===-1){
   seat=r.players.findIndex(p=>p===null);
   if(seat!==-1)r.players[seat]={token,name};
  }else r.players[seat].name=name;
  await this.persist();
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({seat,token});
  this.send(server,{type:'hello',seat,view:this.getView()});
  this.broadcast();
  await this.scheduleBot();
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,payload){
  await this.ready;
  let action;try{action=JSON.parse(String(payload));}catch{this.send(ws,{type:'error',message:'Dữ liệu không hợp lệ.'});return;}
  if(!action||typeof action!=='object')return;
  const {seat,token}=ws.deserializeAttachment()||{},r=this.room;
  if(action.type==='ping'){this.send(ws,{type:'pong'});return;}
  const authorized=Number.isInteger(seat)&&seat>=0&&seat<capacity(r)&&r.players[seat]?.token===token&&token!==BOT_TOKEN;
  if(action.type==='leave'){
   if(authorized){
    r.players[seat]=null;
    if(!['godpick','place','ended'].includes(r.game.phase)&&r.game.winner===null){
     const winner=1-team(seat);r.game.winner=winner;r.game.phase='ended';r.game.lastAction='Đối thủ rời trận. Đội '+(winner+1)+' chiến thắng!';
     r.game.revision++;r.stats.matches++;r.stats.wins[winner]++;
     r.history.push({seat,action:'leave',description:r.game.lastAction,revision:r.game.revision});
    }else if(r.game.phase==='place'||r.game.phase==='godpick'){
     r.game=newGame(r.ruleset);r.activeSeat=0;r.nextTeam0=0;r.history=[];
    }
    await this.persist();
    this.broadcast();
   }
   this.send(ws,{type:'left'});try{ws.close(1000,'Left room');}catch{}
   return;
  }
  if(!authorized){this.send(ws,{type:'error',message:'Bạn đang xem phòng hoặc đã rời ghế.'});return;}
  if(!ready(r)){this.send(ws,{type:'error',message:'Đợi đủ người vào phòng.'});return;}
  if(action.type==='restart'){
   if(r.game.phase!=='ended'){this.send(ws,{type:'error',message:'Chỉ tái đấu sau khi kết thúc ván.'});return;}
   r.game=resetGame(r.game);r.activeSeat=0;r.nextTeam0=0;r.history=[];
  }else{
   if(seat!==seatForTurn(r)){this.send(ws,{type:'error',message:'Chưa đến lượt ghế của bạn.'});return;}
   const legal=availableActions(r);
   if(action.worker!==undefined&&ownedWorker(r,seat)!==null&&action.worker!==ownedWorker(r,seat)){
    this.send(ws,{type:'error',message:'Bạn chỉ được điều khiển quân của mình.'});return;
   }
   // Even when the team has two workers, the current seat can only submit its own legal action.
   const previousTurn=r.game.turn,previousPhase=r.game.phase,oldWinner=r.game.winner,oldRevision=r.game.revision;
   try{applyAction(r.game,team(seat),action);}catch(e){this.send(ws,{type:'error',message:e.message||'Hành động không hợp lệ.'});return;}
   this.advanceAfterAction(previousPhase,previousTurn,seat);
   this.record(action,seat,oldWinner,oldRevision);
  }
  await this.persist();this.broadcast();await this.scheduleBot();
 }
 async alarm(){
  await this.ready;
  const r=this.room;
  if(r.mode!=='bot'||r.game.turn!==1||r.game.winner!==null)return;
  const action=chooseBotAction(r.game,r.difficulty);
  if(!action)return;
  const oldWinner=r.game.winner,oldRevision=r.game.revision;
  try{applyAction(r.game,1,action);}catch(e){console.error('BOT action failed',e);return;}
  this.record(action,1,oldWinner,oldRevision);
  await this.persist();this.broadcast();await this.scheduleBot();
 }
 async webSocketClose(ws){try{ws.close();}catch{}this.broadcast();}
 async webSocketError(ws){try{ws.close();}catch{}this.broadcast();}
}
export default{
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/api/health')return Response.json({ok:true,name:'Santorini Online',version:'0.8.0'});
  if(u.pathname==='/ws'){
   const room=u.searchParams.get('room')||'';
   if(!/^[A-Z2-9]{6,10}$/.test(room))return new Response('Room code invalid',{status:400});
   const id=env.ROOM.idFromName('santorini-'+room);
   return env.ROOM.get(id).fetch(request);
  }
  return env.ASSETS.fetch(request);
 }
};
