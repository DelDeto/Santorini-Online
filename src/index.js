import { DurableObject } from 'cloudflare:workers';
import {newGame,applyAction,resetGame,legalActions,GODS,HEROES,validGodFor,beginAdvancedTurn} from './game.js';
import {chooseBotAction,chooseMultiplayerBotAction} from './bot.js';
import {recordReplay,soloCheckpoint,canUndoSolo,undoSolo} from './replay.js';

const BOT_TOKEN='bot:server-managed';
const botToken=seat=>`${BOT_TOKEN}:${seat}`;
const isBot=p=>p?.token===BOT_TOKEN||String(p?.token||'').startsWith(BOT_TOKEN+':');
const makeBot=(seat,difficulty)=>({name:'BOT '+seat+' · '+({easy:'Tập sự',normal:'Chiến thuật',hard:'Bậc thầy',expert:'Chuyên gia'}[difficulty]||'Chiến thuật'),token:botToken(seat)});
const LEVELS=['easy','normal','hard','expert'];
const BOT_PACES={slow:{setup:1150,turn:1850},normal:{setup:750,turn:1250},fast:{setup:450,turn:730}};
const GAME_MODES={
 classic:{capacity:2,ruleset:'classic',label:'Classic · Không thần'},
 duel:{capacity:2,ruleset:'god',label:'God Powers · Đấu đôi'},
 trio:{capacity:3,ruleset:'god',label:'3 người · Đấu tự do'},
 teams:{capacity:4,ruleset:'god',label:'4 người · Đấu đội'},
 agora:{capacity:2,ruleset:'god',label:'Agora · Xoay thần'},
 fleece:{capacity:2,ruleset:'god',label:'Golden Fleece · Cừu vàng'},
 heroes:{capacity:2,ruleset:'god',label:'Hero Powers · Một lần mỗi trận'}
};
function resolveMode(u){
 const wanted=u.searchParams.get('variant');
 if(Object.hasOwn(GAME_MODES,wanted))return wanted;
 const players=Number(u.searchParams.get('players'))||2;
 if(players===3)return 'trio';
 if(players===4)return 'teams';
 return u.searchParams.get('ruleset')==='god'?'duel':'classic';
}
const cleanName=value=>String(value??'Người chơi').trim().slice(0,24).replace(/[<>]/g,'')||'Người chơi';
const team=seat=>seat%2;
const makeStats=(n=2)=>({wins:Array(n===3?3:2).fill(0),matches:0});
function freshRoom(){return {game:newGame(),players:[null,null],mode:null,modeId:'classic',difficulty:'normal',pace:'normal',ruleset:'classic',capacity:2,activeSeat:0,nextTeam0:0,seatGods:null,draftIndex:0,athenaAura:null,history:[],replay:[],undo:null,stats:makeStats()};}
function capacity(r){return [2,3,4].includes(r.capacity)?r.capacity:2;}
function ready(r){return r.players.length===capacity(r)&&r.players.every((p,i)=>!!p||(capacity(r)===3&&!['godpick','place'].includes(r.game.phase)&&r.game.eliminated?.[i]));}
function seatForTurn(r){
 if(capacity(r)!==4)return r.game.turn;
 if(r.game.phase==='godpick')return r.draftIndex??0;
 if(r.game.phase==='place')return r.game.turn;
 return r.activeSeat??2;
}
function availableActions(r){
 if(!ready(r))return [];
 if(capacity(r)===4&&r.game.phase==='godpick')
  return Object.keys(GODS).filter(id=>validGodFor(id,4,(r.seatGods||[]).filter(Boolean))).map(god=>({type:'selectGod',god}));
 return legalActions(r.game);
}
function view(r,spectators=0){
 const n=capacity(r);
 return {
  game:r.game,legalActions:availableActions(r),gods:{...GODS,...HEROES},seatGods:r.seatGods||null,
  ruleset:r.game.ruleset||'classic',mode:r.mode||'online',modeId:r.modeId||r.game.modeId||'classic',modeLabel:GAME_MODES[r.modeId||r.game.modeId]?.label||'Santorini',difficulty:r.difficulty,
  capacity:n,activeSeat:seatForTurn(r),spectators,
  history:r.history||[],botPace:r.pace||'normal',replayCount:(r.replay||[]).length,canUndo:canUndoSolo(r),stats:r.stats||makeStats(n),
  players:r.players.map((p,i)=>({name:p?.name??('Ghế '+(i+1)+' · Đang chờ'),joined:!!p,seat:i,team:n===3?i:team(i),bot:isBot(p)})),
  ready:ready(r)
 };
}
export class SantoriniRoom extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);
  this.ready=this.ctx.blockConcurrencyWhile(async()=>{
   this.room=await this.ctx.storage.get('room')||freshRoom();
   this.room.capacity=capacity(this.room);
   this.room.modeId??=this.room.game.modeId||(this.room.capacity===3?'trio':this.room.capacity===4?'teams':this.room.ruleset==='god'?'duel':'classic');
   this.room.history??=[];
   this.room.pace??='normal';
   this.room.replay??=[];
   this.room.undo??=null;
   this.room.stats??=makeStats();
   this.room.activeSeat??=0;
   this.room.nextTeam0??=0;
   this.room.draftIndex??=0;
   this.room.seatGods??=null;
   this.room.athenaAura??=null;
   // Backward compatibility: rooms persisted by V1.2 did not have Advanced Gods state.
   this.room.game.capacity??=this.room.capacity;
   this.room.game.heroUsed??=Array(this.room.game.workers.length).fill(false);
   this.room.game.heroMark??=null;
   this.room.game.modeId??=this.room.modeId;
   this.room.game.advanced??={chaos:{},morpheus:{},circe:null,bonus:null,erasures:[]};
   this.room.game.advanced.chaos??={};
   this.room.game.advanced.morpheus??={};
   this.room.game.advanced.erasures??=[];

  });
 }
 async persist(){await this.ctx.storage.put('room',this.room);}
 send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
 spectatorCount(){return this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.seat===-1).length;}
 getView(){return view(this.room,this.spectatorCount());}
 broadcast(){const msg=JSON.stringify({type:'state',view:this.getView()});for(const ws of this.ctx.getWebSockets())this.send(ws,JSON.parse(msg));}
 async scheduleBot(){
  const r=this.room;
  if(!ready(r)||r.game.phase==='ended'||r.game.winner!==null)return;
  const seat=seatForTurn(r);
  if(isBot(r.players[seat])){
   const setup=['godpick','fleecePick','ramPlace','place'].includes(r.game.phase);
   const pace=BOT_PACES[r.pace]||BOT_PACES.normal;
   await this.ctx.storage.setAlarm(Date.now()+(setup?pace.setup:pace.turn));
  }
 }
 resolveBlockedTeam(){
  const r=this.room;
  if(capacity(r)!==4||r.game.phase!=='move'||r.game.winner!==null||!ready(r))return;
  if(availableActions(r).some(a=>a.type==='move'||a.type==='endMove'))return;
  const winner=1-r.game.turn;
  r.game.winner=winner;r.game.phase='ended';
  r.game.lastAction='Ghế '+(seatForTurn(r)+1)+' không thể di chuyển. Đội '+(winner+1)+' chiến thắng!';
  r.game.revision++;
 }
  advanceAfterAction(previousPhase,previousTurn,actionSeat){
 const r=this.room;
 if(capacity(r)!==4||r.game.phase==='ended')return;
 if(previousPhase==='place'&&r.game.phase==='move'){
  r.activeSeat=r.game.turn===1?3:2;r.game.gods[0]=r.seatGods[2];r.game.gods[1]=r.seatGods[3];beginAdvancedTurn(r.game,r.game.turn);return;
 }
 if(r.game.phase==='place'||r.game.phase==='godpick')return;
 if(r.game.turn!==previousTurn){
  r.activeSeat=({2:3,3:0,0:1,1:2})[actionSeat];
  r.game.gods[team(r.activeSeat)]=r.seatGods[r.activeSeat];
  beginAdvancedTurn(r.game,r.game.turn);
  // Athena restricts opponents until the SAME god holder's next turn, not their teammate's.
  if(r.athenaAura!==null){
   if(r.athenaAura===r.activeSeat){r.athenaAura=null;r.game.athenaBlocked=null;}
   else r.game.athenaBlocked=1-team(r.athenaAura);
  }
 }
}
record(action,seat,oldWinner,oldRevision){
  const r=this.room;
  if(r.game.revision===oldRevision)return;
  r.history??=[];
  r.history.push({seat,action:action.type,description:r.game.lastAction,revision:r.game.revision});
  recordReplay(r,action,seat);
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
   r.modeId=resolveMode(u);
   const spec=GAME_MODES[r.modeId];
   r.ruleset=spec.ruleset;
   r.capacity=spec.capacity;
   r.game=newGame(r.ruleset,r.capacity,r.modeId);
   r.athenaAura=null;
   r.seatGods=r.capacity===4?Array(4).fill(null):null;r.draftIndex=0;
   r.players=Array(r.capacity).fill(null);
   r.activeSeat=r.capacity===4?2:0;r.nextTeam0=0;r.history=[];r.replay=[];r.undo=null;r.stats=makeStats(r.capacity);
   if(r.mode==='bot'){
    r.difficulty=LEVELS.includes(u.searchParams.get('difficulty'))?u.searchParams.get('difficulty'):'normal';
    r.pace=Object.hasOwn(BOT_PACES,u.searchParams.get('pace'))?u.searchParams.get('pace'):'normal';
    for(let seat=1;seat<r.capacity;seat++)r.players[seat]=makeBot(seat,r.difficulty);
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
  if(action.type==='requestReplay'){
   this.send(ws,{type:'replay',frames:(r.replay||[]).slice(-96)});return;
  }
  const authorized=Number.isInteger(seat)&&seat>=0&&seat<capacity(r)&&r.players[seat]?.token===token&&!isBot(r.players[seat]);
  if(action.type==='leave'){
   if(authorized){
    r.players[seat]=null;
    if(!['godpick','fleecePick','ramPlace','place','ended'].includes(r.game.phase)&&r.game.winner===null){
      if(capacity(r)===3){
       r.game.eliminated[seat]=true;r.game.workers[seat]=[];r.game.gods[seat]=null;
       const alive=r.game.eliminated.map((out,i)=>out?null:i).filter(i=>i!==null);
       if(alive.length===1){r.game.winner=alive[0];r.game.phase='ended';r.stats.matches++;r.stats.wins[alive[0]]++;}
       else if(r.game.turn===seat){
        r.game.turn=alive.find(i=>i>seat)??alive[0];r.game.phase='move';r.game.selected=null;r.game.ctx={};
       }
       r.game.lastAction='Người chơi '+(seat+1)+' rời trận và bị loại.';
      }else{
       const winner=1-team(seat);r.game.winner=winner;r.game.phase='ended';
       r.game.lastAction='Đối thủ rời trận. Đội '+(winner+1)+' chiến thắng!';
       r.stats.matches++;r.stats.wins[winner]++;
      }
      r.game.revision++;
      r.history.push({seat,action:'leave',description:r.game.lastAction,revision:r.game.revision});
     }else if(['place','godpick','fleecePick','ramPlace'].includes(r.game.phase)){
      r.game=newGame(r.ruleset,capacity(r),r.modeId);r.athenaAura=null;
      r.seatGods=capacity(r)===4?Array(4).fill(null):null;r.draftIndex=0;
      r.activeSeat=capacity(r)===4?2:0;r.history=[];
     }
     await this.persist();
    this.broadcast();
   }
   this.send(ws,{type:'left'});try{ws.close(1000,'Left room');}catch{}
   return;
  }
  // The room creator can fill unoccupied seats with bots before drafting or placement.
  if(action.type==='fillBots'){
   if(!authorized||seat!==0||r.mode!=='online'||!['place','godpick','fleecePick'].includes(r.game.phase)||r.game.revision!==0){
    this.send(ws,{type:'error',message:'Chỉ chủ phòng được thêm BOT trước khi bắt đầu ván.'});return;
   }
   const level=LEVELS.includes(action.difficulty)?action.difficulty:'normal';
   r.difficulty=level;r.pace=Object.hasOwn(BOT_PACES,action.pace)?action.pace:'normal';
   for(let i=0;i<capacity(r);i++)if(!r.players[i])r.players[i]=makeBot(i,level);
   r.mode='hybrid';
   await this.persist();this.broadcast();await this.scheduleBot();return;
  }
  if(!authorized){this.send(ws,{type:'error',message:'Bạn đang xem phòng hoặc đã rời ghế.'});return;}
  if(!ready(r)){this.send(ws,{type:'error',message:'Đợi đủ người vào phòng.'});return;}
  if(action.type==='hint'){
   if(r.mode!=='bot'||seat!==0||seat!==seatForTurn(r)||r.game.phase==='ended'){
    this.send(ws,{type:'error',message:'Gợi ý chiến thuật chỉ hỗ trợ lượt Solo của bạn.'});return;
   }
   const choice=chooseMultiplayerBotAction(r.game,'hard',0,availableActions(r));
   if(choice)this.send(ws,{type:'hint',action:choice});
   return;
  }
  if(action.type==='undo'){
   if(!undoSolo(r,seat)){this.send(ws,{type:'error',message:'Chỉ có thể hoàn tác hành động Solo gần nhất trước khi BOT thực hiện.'});return;}
   await this.persist();this.broadcast();await this.scheduleBot();return;
  }
  if(action.type==='restart'){
   if(r.game.phase!=='ended'){this.send(ws,{type:'error',message:'Chỉ tái đấu sau khi kết thúc ván.'});return;}
   r.game=resetGame(r.game);r.athenaAura=null;r.seatGods=capacity(r)===4?Array(4).fill(null):null;r.draftIndex=0;r.activeSeat=capacity(r)===4?2:0;r.nextTeam0=0;r.history=[];r.replay=[];r.undo=null;
  }else{
   if(seat!==seatForTurn(r)){this.send(ws,{type:'error',message:'Chưa đến lượt ghế của bạn.'});return;}
   const previousTurn=r.game.turn,previousPhase=r.game.phase,oldWinner=r.game.winner,oldRevision=r.game.revision;
   const checkpoint=soloCheckpoint(r,seat);
   if(capacity(r)===4&&r.game.phase==='godpick'){
    if(!availableActions(r).some(a=>a.type==='selectGod'&&a.god===action.god)){
     this.send(ws,{type:'error',message:'Vị thần đã được chọn hoặc không hợp lệ.'});return;
    }
    r.seatGods[seat]=action.god;
    r.game.lastAction='Ghế '+(seat+1)+' chọn '+GODS[action.god].name+'.';
    r.game.revision++;r.draftIndex++;
    if(r.draftIndex===4){
     r.game.phase='place';
     const biaIndex=r.seatGods.indexOf('bia');
     r.game.turn=biaIndex===-1?0:team(biaIndex);
     r.game.ctx={startSeat:r.game.turn};
     r.game.advanced.setupEros=[0,1].filter(teamId=>r.seatGods.some((id,seat)=>team(seat)===teamId&&id==='eros'));
     r.game.advanced.allSelected=r.seatGods.slice();
     r.game.gods=[r.seatGods[0],r.seatGods[1]];
    }
   }else{
    const from=capacity(r)===4&&action.type==='move'?r.game.workers[team(seat)]?.[action.worker]:null;
    const athenaUp=from&&r.seatGods?.[seat]==='athena'&&r.game.board[action.row]?.[action.col]>r.game.board[from.row]?.[from.col];
    try{applyAction(r.game,capacity(r)===4?team(seat):seat,action);}
    catch(e){this.send(ws,{type:'error',message:e.message||'Hành động không hợp lệ.'});return;}
    if(athenaUp)r.athenaAura=seat;
    this.advanceAfterAction(previousPhase,previousTurn,seat);
    this.resolveBlockedTeam();
   }
   this.record(action,seat,oldWinner,oldRevision);
   if(checkpoint&&r.game.revision!==oldRevision){checkpoint.revisionAfter=r.game.revision;r.undo=checkpoint;}
  }
  await this.persist();this.broadcast();await this.scheduleBot();
 }
 async alarm(){
  await this.ready;
  const r=this.room;
  if(!ready(r)||r.game.phase==='ended'||r.game.winner!==null)return;
  const seat=seatForTurn(r);
  if(!isBot(r.players[seat]))return;
  const logical=capacity(r)===4?team(seat):seat;
  const oldTurn=r.game.turn,oldPhase=r.game.phase,oldWinner=r.game.winner,oldRevision=r.game.revision;
  const choices=availableActions(r);
  if(!choices.length){
   console.error('No legal BOT actions',seat,r.game.phase);
   return;
  }
  const action=capacity(r)===2&&logical===1?
   chooseBotAction(r.game,r.difficulty):
   chooseMultiplayerBotAction(r.game,r.difficulty,logical,choices,{capacity:capacity(r),seat,seatGods:r.seatGods});
  if(!action)return;
  if(capacity(r)===4&&r.game.phase==='godpick'){
   if(action.type!=='selectGod'||!choices.some(a=>a.god===action.god))return;
   r.seatGods[seat]=action.god;
   r.game.lastAction='BOT ghế '+(seat+1)+' chọn '+GODS[action.god].name+'.';
   r.game.revision++;r.draftIndex++;
   if(r.draftIndex===4){
    r.game.phase='place';
    const biaIndex=r.seatGods.indexOf('bia');
    r.game.turn=biaIndex===-1?0:team(biaIndex);
    r.game.ctx={startSeat:r.game.turn};
    r.game.advanced.setupEros=[0,1].filter(teamId=>r.seatGods.some((id,seat)=>team(seat)===teamId&&id==='eros'));
     r.game.advanced.allSelected=r.seatGods.slice();
    r.game.gods=[r.seatGods[0],r.seatGods[1]];
   }
  }else{
   const from=capacity(r)===4&&action.type==='move'?r.game.workers[logical]?.[action.worker]:null;
   const athenaUp=from&&r.seatGods?.[seat]==='athena'&&r.game.board[action.row]?.[action.col]>r.game.board[from.row]?.[from.col];
   try{applyAction(r.game,logical,action);}catch(e){console.error('BOT action failed',seat,e);return;}
   if(athenaUp)r.athenaAura=seat;
   this.advanceAfterAction(oldPhase,oldTurn,seat);
   this.resolveBlockedTeam();
  }
  this.record(action,seat,oldWinner,oldRevision);
  r.undo=null; // Once a BOT acts, prior human action is committed.
  await this.persist();this.broadcast();await this.scheduleBot();
 }
 async webSocketClose(ws){try{ws.close();}catch{}this.broadcast();}
 async webSocketError(ws){try{ws.close();}catch{}this.broadcast();}
}
export default{
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/api/health')return Response.json({ok:true,name:'Santorini Online',version:'2.0.0',modes:Object.keys(GAME_MODES)});
  if(u.pathname==='/ws'){
   const room=u.searchParams.get('room')||'';
   if(!/^[A-Z2-9]{6,10}$/.test(room))return new Response('Room code invalid',{status:400});
   const id=env.ROOM.idFromName('santorini-'+room);
   return env.ROOM.get(id).fetch(request);
  }
  return env.ASSETS.fetch(request);
 }
};
