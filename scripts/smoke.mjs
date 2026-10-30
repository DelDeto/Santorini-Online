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
  const path='/ws?room='+code+'&token='+token()+'&name='+encodeURIComponent(name)+(mode==='bot'?'&mode=bot&difficulty=normal':mode==='bot3'?'&mode=bot&difficulty=normal&players=3&ruleset=god':mode==='bot4'?'&mode=bot&difficulty=normal&players=4&ruleset=god':mode==='god'?'&ruleset=god':mode==='botgod'?'&mode=bot&difficulty=normal&ruleset=god':mode==='3'?'&players=3':mode==='4'?'&players=4':mode==='watch'?'&spectate=1':'');
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
  assert.equal(health?.version,'1.1.0','server should boot with V1.1');
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

  // V0.7: solo bot picks a God and responds through setup turns.
  const olympus=await connect(room(),'Solo Gods','botgod');
  assert.equal(olympus.hello.view.ruleset,'god');
  olympus.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  const botGod=await olympus.until(v=>v.game.gods[1]!==null&&v.game.phase==='place',15000);
  assert.notEqual(botGod.game.gods[1],'apollo');
  olympus.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await olympus.until(v=>v.game.workers[0].length===1);
  olympus.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  const godReady=await olympus.until(v=>v.game.workers[1].length===2&&v.game.phase==='move',20000);
  assert.equal(godReady.game.turn,0);
  // V0.9: Official 4-player team game: individual God Powers, shared workers, second teammates take first turns.
  const teamRoom=room();
  const p0=await connect(teamRoom,'Blue A1','4');
  const p1=await connect(teamRoom,'Orange B1','online');
  const p2=await connect(teamRoom,'Blue A2','online');
  const p3=await connect(teamRoom,'Orange B2','online');
  const watchers=await connect(teamRoom,'Spectator','watch');
  const teamReady=await p0.until(v=>v.ready&&v.capacity===4&&v.spectators>=1);
  assert.equal(teamReady.game.phase,'godpick');
  assert.equal(teamReady.activeSeat,0);
  assert.equal(watchers.hello.seat,-1);
  p0.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  await p1.until(v=>v.seatGods?.[0]==='apollo'&&v.activeSeat===1);
  p1.ws.send(JSON.stringify({type:'selectGod',god:'artemis'}));
  await p2.until(v=>v.activeSeat===2&&v.seatGods?.[1]==='artemis');
  p2.ws.send(JSON.stringify({type:'selectGod',god:'atlas'}));
  await p3.until(v=>v.activeSeat===3&&v.seatGods?.[2]==='atlas');
  p3.ws.send(JSON.stringify({type:'selectGod',god:'pan'}));
  const picked4=await p0.until(v=>v.game.phase==='place'&&v.seatGods.every(Boolean));
  assert.equal(new Set(picked4.seatGods).size,4);
  p0.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await p0.until(v=>v.game.workers[0].length===1);
  p0.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  await p1.until(v=>v.game.turn===1&&v.game.workers[0].length===2);
  p1.ws.send(JSON.stringify({type:'place',row:4,col:4}));
  await p1.until(v=>v.game.workers[1].length===1);
  p1.ws.send(JSON.stringify({type:'place',row:4,col:3}));
  const turnStart=await p2.until(v=>v.game.phase==='move'&&v.activeSeat===2);
  assert.equal(turnStart.game.gods[0],'atlas');
  assert.equal(turnStart.game.workers[0].length,2);
  const m=turnStart.legalActions.find(a=>a.type==='move');
  p2.ws.send(JSON.stringify({type:'move',worker:m.worker,row:m.row,col:m.col}));
  const afterMove=await p2.until(v=>v.game.phase==='build');
  const bld=afterMove.legalActions.find(a=>a.type==='build'&&!a.dome);
  p2.ws.send(JSON.stringify({type:'build',row:bld.row,col:bld.col}));
  const bTurn=await p3.until(v=>v.activeSeat===3&&v.game.phase==='move');
  assert.equal(bTurn.game.turn,1);
  assert.equal(bTurn.game.gods[1],'pan');
  assert.ok(bTurn.history.length>=8);
  // V0.9: Official 3-player independent match: 3 gods, 6 total workers, each controls two.
  const trioRoom=room();
  const t0=await connect(trioRoom,'Player Blue','3');
  const t1=await connect(trioRoom,'Player Orange','online');
  const t2=await connect(trioRoom,'Player Purple','online');
  const ready3=await t0.until(v=>v.ready&&v.capacity===3);
  assert.equal(ready3.ruleset,'god');
  assert.equal(ready3.game.workers.length,3);
  t0.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  await t1.until(v=>v.activeSeat===1&&v.game.gods[0]==='apollo');
  t1.ws.send(JSON.stringify({type:'selectGod',god:'pan'}));
  await t2.until(v=>v.activeSeat===2&&v.game.gods[1]==='pan');
  t2.ws.send(JSON.stringify({type:'selectGod',god:'atlas'}));
  await t0.until(v=>v.game.phase==='place');
  t0.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await t0.until(v=>v.game.workers[0].length===1);
  t0.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  await t1.until(v=>v.activeSeat===1);
  t1.ws.send(JSON.stringify({type:'place',row:4,col:4}));
  await t1.until(v=>v.game.workers[1].length===1);
  t1.ws.send(JSON.stringify({type:'place',row:4,col:3}));
  await t2.until(v=>v.activeSeat===2);
  t2.ws.send(JSON.stringify({type:'place',row:2,col:4}));
  await t2.until(v=>v.game.workers[2].length===1);
  t2.ws.send(JSON.stringify({type:'place',row:2,col:3}));
  const threeReady=await t0.until(v=>v.game.phase==='move'&&v.activeSeat===0);
  assert.deepEqual(threeReady.game.workers.map(a=>a.length),[2,2,2]);
  assert.deepEqual(threeReady.game.gods,['apollo','pan','atlas']);
  assert.deepEqual(threeReady.players.map(x=>x.team),[0,1,2]);

  // V1.1: one human + two BOTs, all three individually choose God Powers.
  const solo3=await connect(room(),'Solo 3P Tester','bot3');
  assert.equal(solo3.hello.view.capacity,3);
  assert.deepEqual(solo3.hello.view.players.map(p=>p.bot),[false,true,true]);
  solo3.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  const gods3=await solo3.until(v=>v.game.phase==='place'&&v.game.gods.every(Boolean),20000);
  assert.equal(new Set(gods3.game.gods).size,3);
  solo3.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await solo3.until(v=>v.game.workers[0].length===1);
  solo3.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  const start3=await solo3.until(v=>v.game.phase==='move'&&v.game.workers.every(a=>a.length===2),25000);
  assert.equal(start3.activeSeat,0);
  assert.equal(start3.game.workers.length,3);
  // One human turn then both independent bots take their actions.
  const firstMove=start3.legalActions.find(a=>a.type==='move');
  assert.ok(firstMove);
  solo3.ws.send(JSON.stringify({type:'move',worker:firstMove.worker,row:firstMove.row,col:firstMove.col}));
  const building3=await solo3.until(v=>v.game.phase==='build');
  const firstBuild=building3.legalActions.find(a=>a.type==='build');
  assert.ok(firstBuild);
  solo3.ws.send(JSON.stringify({type:'build',row:firstBuild.row,col:firstBuild.col}));
  const next3=await solo3.until(v=>v.game.turn===1&&v.game.phase==='move');
  const botRound3=await solo3.until(v=>v.game.turn===0&&v.game.revision>next3.game.revision+1||v.game.phase==='ended',25000);
  assert.ok(botRound3.game.turn===0||botRound3.game.phase==='ended');

  // V1.1: one human + three BOTs, individual God selection and 2v2 turn order.
  const solo4=await connect(room(),'Solo 4P Tester','bot4');
  assert.equal(solo4.hello.view.capacity,4);
  assert.deepEqual(solo4.hello.view.players.map(p=>p.bot),[false,true,true,true]);
  solo4.ws.send(JSON.stringify({type:'selectGod',god:'apollo'}));
  const gods4=await solo4.until(v=>v.game.phase==='place'&&v.seatGods?.every(Boolean),25000);
  assert.equal(new Set(gods4.seatGods).size,4);
  solo4.ws.send(JSON.stringify({type:'place',row:0,col:0}));
  await solo4.until(v=>v.game.workers[0].length===1);
  solo4.ws.send(JSON.stringify({type:'place',row:0,col:1}));
  const mid4=await solo4.until(v=>v.game.phase==='move'&&v.game.workers[1].length===2&&v.activeSeat===2,18000);
  assert.equal(mid4.game.gods[0],mid4.seatGods[2]);
  const reachedHuman=await solo4.until(v=>v.activeSeat===0&&v.game.phase==='move'||v.game.phase==='ended',30000);
  assert.ok(reachedHuman.game.phase==='ended'||reachedHuman.activeSeat===0);
  assert.ok(reachedHuman.history.some(e=>e.seat===2));
  assert.ok(reachedHuman.history.some(e=>e.seat===3));

  // Hybrid match: two humans can fill the third seat with one bot.
  const hybridRoom=room();
  const hostHybrid=await connect(hybridRoom,'Hybrid host','3');
  const guestHybrid=await connect(hybridRoom,'Hybrid guest','online');
  assert.equal(hostHybrid.hello.seat,0);
  hostHybrid.ws.send(JSON.stringify({type:'fillBots',difficulty:'normal'}));
  const hybridReady=await guestHybrid.until(v=>v.ready&&v.players[2].bot);
  assert.equal(hybridReady.mode,'hybrid');

  // Leaving a room before game setup releases the seat.
  const exitRoom=room();
  const leaver=await connect(exitRoom,'First guest','online');
  assert.equal(leaver.hello.seat,0);
  leaver.ws.send(JSON.stringify({type:'leave'}));
  await until(()=>leaver.state()?.players[0]?.joined===false);
  const replacement=await connect(exitRoom,'Replacement','online');
  assert.equal(replacement.hello.seat,0);
  console.log('PASS: Classic BOT, God Powers BOT, online God Powers, official 3-player free-for-all and 4-player God Power teams, spectator and leave/replace.');

}finally{
  sockets.forEach(s=>{try{s.close();}catch{}});
  worker.kill('SIGTERM');
}
