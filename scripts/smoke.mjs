import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {legalMoves,legalBuilds} from '../src/game.js';

const PORT=8798;
const base='http://127.0.0.1:'+PORT;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function room(){return Array.from({length:8},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');}
function token(){return Array.from({length:48},()=>Math.floor(Math.random()*16).toString(16)).join('');}
const worker=spawn('./node_modules/.bin/wrangler',['dev','--port',String(PORT),'--local','--log-level','error'],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});
let output='';
worker.stdout.on('data',c=>output+=String(c).slice(0,1000));
worker.stderr.on('data',c=>output+=String(c).slice(0,1000));
const sockets=[];
async function until(fn,timeout=16000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const result=fn();if(result)return result;await delay(80);}
  throw Error('Timed out: '+output.slice(-2200));
}
async function connect(code,name,mode){
  const path='/ws?room='+code+'&token='+token()+'&name='+encodeURIComponent(name)+(mode==='bot'?'&mode=bot&difficulty=normal':mode==='god'?'&ruleset=god':'');
  const ws=new WebSocket('ws://127.0.0.1:'+PORT+path);sockets.push(ws);
  const inbox=[];
  ws.addEventListener('message',e=>{try{inbox.push(JSON.parse(e.data));}catch{}});
  await until(()=>inbox.some(m=>m.type==='hello'));
  const hello=inbox.find(m=>m.type==='hello');
  const state=()=>[...inbox].reverse().find(m=>m.type==='state')?.view;
  return {ws,hello,state,until:(fn,timeout)=>until(()=>{const v=state();return v&&fn(v)?v:null;},timeout)};
}
try{
  await until(async()=>false,1).catch(()=>{});
  await until(()=>{if(worker.exitCode!==null)throw Error('Wrangler exited '+worker.exitCode+': '+output);return false;},100).catch(()=>{});
  const start=Date.now();
  let health;
  while(Date.now()-start<40000){
    try{const res=await fetch(base+'/api/health');if(res.ok){health=await res.json();break;}}catch{}
    await delay(300);
  }
  assert.equal(health?.version,'0.5.0','server should boot with V0.5');
  const html=await (await fetch(base)).text();
  assert.match(html,/id="demoBtn"/);
  const og=await fetch(base+'/og.png');
  assert.equal(og.status,200);assert.match(og.headers.get('content-type'),/image\/png/);
  const demo=await connect(room(),'Demo Tester','bot');
  assert.equal(demo.hello.seat,0);
  assert.equal(demo.hello.view.mode,'bot');
  assert.equal(demo.hello.view.players[1].bot,true);
  demo.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await demo.until(v=>v.game.workers[0].length===1);
  demo.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  const after=await demo.until(v=>v.game.workers[1].length===2 && v.game.phase==='move' && v.game.turn===0,20000);
  assert.equal(after.players[1].bot,true,'bot should autonomously complete both placement actions');
  const move=legalMoves(after.game,0,0)[0]||legalMoves(after.game,0,1)[0];
  assert.ok(move,'human should have a legal move');
  const wi=legalMoves(after.game,0,0).length?0:1;
  demo.ws.send(JSON.stringify({type:'move',worker:wi,...move}));
  const moved=await demo.until(v=>v.game.phase==='build' && v.game.turn===0);
  const build=legalBuilds(moved.game,moved.game.workers[0][moved.game.selected])[0];
  demo.ws.send(JSON.stringify({type:'build',...build}));
  const building=await demo.until(v=>v.game.phase==='move' && v.game.turn===1);
  assert.equal(building.mode,'bot');
  const auto=await demo.until(v=>v.game.revision>building.game.revision,12000);
  assert.equal(auto.players[1].bot,true);
  const code=room();
  const host=await connect(code,'Olympus Host','god');
  const guest=await connect(code,'Olympus Guest','online');
  const roomReady=await host.until(v=>v.ready&&v.ruleset==='god');
  assert.equal(roomReady.game.phase,'godpick');
  assert.ok(roomReady.legalActions.some(a=>a.type==='selectGod'&&a.god==='apollo'));
  host.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  await guest.until(v=>v.game.turn===1&&v.game.gods[0]==='apollo');
  guest.ws.send(JSON.stringify({type:'selectGod',god:'artemis'}));
  await host.until(v=>v.game.phase==='place');
  host.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await guest.until(v=>v.game.workers[0].length===1);
  host.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  await guest.until(v=>v.game.turn===1);
  guest.ws.send(JSON.stringify({type:'place',row:4,col:4}));
  await host.until(v=>v.game.workers[1].length===1);
  guest.ws.send(JSON.stringify({type:'place',row:4,col:3}));
  const battle=await host.until(v=>v.game.phase==='move'&&v.game.turn===0);
  assert.equal(battle.game.gods[0],'apollo');
  assert.equal(battle.game.gods[1],'artemis');
  host.ws.send(JSON.stringify({type:'move',worker:0,row:1,col:0}));
  await guest.until(v=>v.game.phase==='build');
  host.ws.send(JSON.stringify({type:'build',row:0,col:0}));
  const done=await host.until(v=>v.game.turn===1&&v.game.phase==='move');
  assert.ok(done.legalActions.some(a=>a.type==='move'));
  console.log('PASS: bot demo + multiplayer God Powers draft, move, and build via WebSocket.');
}finally{
  sockets.forEach(s=>{try{s.close();}catch{}});
  worker.kill('SIGTERM');
}
