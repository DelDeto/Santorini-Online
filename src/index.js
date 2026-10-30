import { DurableObject } from 'cloudflare:workers';
import { newGame, applyAction, resetGame, legalActions, GODS } from './game.js';
import { chooseBotAction } from './bot.js';

const BOT_TOKEN='bot:server-managed';
const LEVELS=['easy','normal','hard'];
function cleanName(value){return String(value??'Người chơi').trim().slice(0,24).replace(/[<>]/g,'')||'Người chơi';}
function freshRoom(){return {game:newGame(),players:[null,null],mode:null,difficulty:'normal',ruleset:'classic'};}
function view(room){
  return {game:room.game,legalActions:room.players.every(Boolean)?legalActions(room.game):[],gods:GODS,ruleset:room.game.ruleset||'classic',mode:room.mode||'online',difficulty:room.difficulty,players:room.players.map((p,i)=>({name:p?.name??('Ghế '+(i+1)+' · Đang chờ'),joined:!!p,seat:i,bot:p?.token===BOT_TOKEN})),ready:room.players.every(Boolean)};
}
export class SantoriniRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.ready=this.ctx.blockConcurrencyWhile(async()=>{
      this.room=await this.ctx.storage.get('room')||freshRoom();
    });
  }
  async persist(){await this.ctx.storage.put('room',this.room);}
  send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
  broadcast(){const msg=JSON.stringify({type:'state',view:view(this.room)});for(const ws of this.ctx.getWebSockets()){try{ws.send(msg);}catch{}}}
  async scheduleBot(){
    const r=this.room;
    if(r.mode==='bot'&&r.game.turn===1&&r.game.winner===null&&r.players[0]){
      // Durable Object alarms survive hibernation and preserve a readable BOT cadence.
      await this.ctx.storage.setAlarm(Date.now()+(r.game.phase==='place'?1050:1250));
    }
  }
  async fetch(request){
    await this.ready;
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
    const u=new URL(request.url),token=u.searchParams.get('token');
    if(!token||!/^[a-f0-9]{32,64}$/.test(token))return new Response('Token invalid',{status:400});
    const name=cleanName(u.searchParams.get('name'));
    if(!this.room.mode){
      this.room.mode=u.searchParams.get('mode')==='bot'?'bot':'online';
      this.room.ruleset=this.room.mode==='online'&&u.searchParams.get('ruleset')==='god'?'god':'classic';
      this.room.game=newGame(this.room.ruleset);
      if(this.room.mode==='bot'){
        this.room.difficulty=LEVELS.includes(u.searchParams.get('difficulty'))?u.searchParams.get('difficulty'):'normal';
        this.room.players[1]={name:'BOT · '+({easy:'Tập sự',normal:'Chiến thuật',hard:'Bậc thầy'}[this.room.difficulty]),token:BOT_TOKEN};
      }
    }
    let seat=this.room.players.findIndex(p=>p?.token===token);
    if(seat===-1){
      seat=this.room.players.findIndex(p=>p===null);
      if(seat!==-1)this.room.players[seat]={token,name};
    }else this.room.players[seat].name=name;
    await this.persist();
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({seat,token});
    this.send(server,{type:'hello',seat,view:view(this.room)});
    this.broadcast();
    await this.scheduleBot();
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,payload){
    await this.ready;
    let a;try{a=JSON.parse(String(payload));}catch{this.send(ws,{type:'error',message:'Dữ liệu không hợp lệ.'});return;}
    const {seat,token}=ws.deserializeAttachment()||{};
    if(![0,1].includes(seat)||this.room.players[seat]?.token!==token||token===BOT_TOKEN){
      this.send(ws,{type:'error',message:'Bạn đang xem phòng.'});return;
    }
    if(!a||typeof a!=='object')return;
    if(!this.room.players.every(Boolean)){this.send(ws,{type:'error',message:'Đợi người thứ hai vào phòng.'});return;}
    if(a.type==='restart'){
      if(this.room.game.phase!=='ended'){this.send(ws,{type:'error',message:'Chỉ có thể tái đấu khi ván kết thúc.'});return;}
      this.room.game=resetGame(this.room.game);
    }else{
      try{applyAction(this.room.game,seat,a);}catch(e){this.send(ws,{type:'error',message:e.message||'Hành động không hợp lệ.'});return;}
    }
    await this.persist();this.broadcast();
    await this.scheduleBot();
  }
  async alarm(){
    await this.ready;
    const r=this.room;
    if(r.mode!=='bot'||r.game.turn!==1||r.game.winner!==null)return;
    const action=chooseBotAction(r.game,r.difficulty);
    if(!action)return;
    try{applyAction(r.game,1,action);}catch(e){console.error('BOT action failed',e);return;}
    await this.persist();this.broadcast();await this.scheduleBot();
  }
  async webSocketClose(ws){try{ws.close();}catch{}}
  async webSocketError(ws){try{ws.close();}catch{}}
}
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    if(u.pathname==='/api/health')return Response.json({ok:true,name:'Santorini Online',version:'0.4.0'});
    if(u.pathname==='/ws'){
      const room=u.searchParams.get('room')||'';
      if(!/^[A-Z2-9]{6,10}$/.test(room))return new Response('Room code invalid',{status:400});
      const id=env.ROOM.idFromName('santorini-'+room);
      return env.ROOM.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
