import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,legalActions,applyAction} from '../src/game.js';
import {chooseMultiplayerBotAction} from '../src/bot.js';
const html=readFileSync('public/index.html','utf8');
const app=readFileSync('public/app.js','utf8');
const worker=readFileSync('src/index.js','utf8');

test('V2.0 exposes Expert difficulty on client and server',()=>{
 assert.match(html,/value="expert"/);
 assert.match(worker,/LEVELS=\['easy','normal','hard','expert'\]/);
 assert.match(html,/V2\.6/);
});
test('Expert BOT chooses a legal move in 2, 3 and 4 person simulations',()=>{
 for(const capacity of [2,3,4]){
  const g=newGame('god',capacity,capacity===4?'teams':capacity===3?'trio':'duel');
  g.phase='move';g.turn=1;
  g.workers=[[{row:0,col:0},{row:0,col:1}],[{row:2,col:2},{row:4,col:4}]];
  g.gods=['apollo','atlas'];
  if(capacity===3){g.workers.push([{row:4,col:0},{row:3,col:0}]);g.gods.push('pan');}
  const legal=legalActions(g,1);
  const context=capacity===4?{capacity:4,seat:3,seatGods:['apollo','atlas','athena','atlas']}:{capacity};
  const move=chooseMultiplayerBotAction(g,'expert',1,legal,context);
  assert.ok(move&&legal.some(x=>JSON.stringify(x)===JSON.stringify(move)),String(capacity));
  applyAction(g,1,move);
 }
});
test('Replays, undo and help overlay are wired to the interface',()=>{
 for(const id of ['replayBoard','replaySlider','undoBtn','tutorialBtn','tutorialOverlay'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const action of ["type:'requestReplay'","type:'undo'","function renderReplay()","function renderHistory()"])
  assert.ok(app.includes(action),action);
 assert.match(worker,/recordReplay\(/);
 assert.match(worker,/undoSolo\(r,seat\)/);
});
test('Triton and Dionysus actions can be tapped on the board',()=>{
 assert.match(app,/hermesMove','tritonMove','dionysusMove','heroSprint'\]\.includes\(phase\)/);
});
