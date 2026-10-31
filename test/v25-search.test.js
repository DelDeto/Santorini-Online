import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,legalActions,applyAction,HEROES} from '../src/game.js';
import {chooseMultiplayerBotAction} from '../src/bot.js';
const bot=readFileSync(new URL('../src/bot.js',import.meta.url),'utf8');
const prepared=(mode,players=2)=>{
 const g=newGame(mode==='classic'?'classic':'god',players,mode);
 g.phase='move';g.turn=players===3?2:1;
 g.workers=[[{row:0,col:0},{row:0,col:1}],[{row:2,col:2},{row:4,col:4}]];
 if(players===3)g.workers.push([{row:4,col:0},{row:3,col:0}]);
 g.gods=mode==='heroes'?['bellerophon','atalanta']:players===3?['apollo','atlas','pan']:['apollo','artemis'];
 return g;
};
test('V2.5: transposition tables are bounded, per-strategic-decision only',()=>{
 assert.match(bot,/const CACHE_LIMIT=3800/);
 assert.match(bot,/function positionKey\(g\)/);
 assert.match(bot,/const table=new Map\(\)/);
 assert.match(bot,/table\.size<CACHE_LIMIT/);
 assert.match(bot,/turnDelta|special\?\?/);
});
test('V2.5: Expert finds an immediate height-3 winning move',()=>{
 const g=prepared('classic');g.board[2][2]=2;g.board[2][3]=3;
 const a=chooseMultiplayerBotAction(g,'expert',1,legalActions(g));
 assert.equal(a.type,'move');assert.equal(a.row,2);assert.equal(a.col,3);
 applyAction(g,1,a);assert.equal(g.winner,1);
});
test('V2.5: Expert still returns only authoritative legal actions in 2/3P and Hero modes',()=>{
 for(const [mode,count] of [['classic',2],['duel',2],['heroes',2],['trio',3]]){
  const g=prepared(mode,count);const legal=legalActions(g,g.turn);
  const start=Date.now(),a=chooseMultiplayerBotAction(g,'expert',g.turn,legal,{capacity:count});
  assert.ok(a&&legal.some(x=>JSON.stringify(a)===JSON.stringify(x)),mode);
  assert.ok(Date.now()-start<20000,'search budget '+mode);
  assert.doesNotThrow(()=>applyAction(g,g.turn,a));
 }
});
test('V2.5: Hero draft picks a legal Hero distinct from opponent, not old God Power',()=>{
 const g=newGame('god',2,'heroes');
 const a=chooseMultiplayerBotAction(g,'expert',0,legalActions(g));
 assert.ok(Object.hasOwn(HEROES,a.god));applyAction(g,0,a);
 const b=chooseMultiplayerBotAction(g,'expert',1,legalActions(g));
 assert.ok(Object.hasOwn(HEROES,b.god));assert.notEqual(a.god,b.god);
});
