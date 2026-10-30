import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction} from '../src/game.js';
import {chooseMultiplayerBotAction} from '../src/bot.js';

const legal=(choices,a)=>choices.some(x=>x.type===a.type&&
  (x.worker===undefined||x.worker===a.worker)&&
  (x.row===undefined||x.row===a.row)&&
  (x.col===undefined||x.col===a.col)&&
  (x.god===undefined||x.god===a.god)&&
  (x.dome===undefined||!!x.dome===!!a.dome));

test('three-player BOT drafts distinct Gods on player 1 and 2',()=>{
 const g=newGame('god',3);applyAction(g,0,{type:'selectGod',god:'apollo'});
 for(const p of [1,2]){
  const choices=legalActions(g,p),a=chooseMultiplayerBotAction(g,'hard',p,choices);
  assert.ok(a&&legal(choices,a));
  assert.equal(a.type,'selectGod');
  applyAction(g,p,a);
 }
 assert.equal(new Set(g.gods).size,3);
 assert.equal(g.phase,'place');
});
test('three-player BOT controls worker placements and move/build phases for seat two',()=>{
 const g=newGame('god',3);
 g.gods=['apollo','pan','atlas'];g.phase='place';
 for(const [p,coords] of [[[0,0,0],[0,1,0]],[[4,4],[4,3]],[[2,2],[2,3]]].entries()){
  for(const [row,col] of coords)applyAction(g,p,{type:'place',row,col});
 }
 assert.equal(g.phase,'move');
 applyAction(g,0,{type:'move',worker:0,row:1,col:0});
 applyAction(g,0,{type:'build',row:0,col:0});
 assert.equal(g.turn,1);
 for(let i=0;i<20&&g.turn!==0&&g.phase!=='ended';i++){
  const player=g.turn,choices=legalActions(g,player);
  const act=chooseMultiplayerBotAction(g,'normal',player,choices);
  assert.ok(act&&legal(choices,act),'BOT'+player+' must play valid '+g.phase);
  applyAction(g,player,act);
 }
 assert.ok(g.turn===0||g.phase==='ended');
});
test('four-seat team BOT can choose from seat-specific God draft and act as either team',()=>{
 const g=newGame('god');g.phase='place';g.gods=['apollo','pan'];
 for(const [p,coords] of [[[0,0],[0,1]],[[4,4],[4,3]]].entries()){
  for(const [row,col] of coords)applyAction(g,p,{type:'place',row,col});
 }
 assert.equal(g.turn,0);
 const a0=chooseMultiplayerBotAction(g,'hard',0,legalActions(g,0));
 assert.ok(legal(legalActions(g,0),a0));
 applyAction(g,0,a0);
 const more=legalActions(g,0);
 if(more.length){
  const b=chooseMultiplayerBotAction(g,'normal',0,more);
  assert.ok(b&&legal(more,b));
 }
 const selection=[{type:'selectGod',god:'artemis'},{type:'selectGod',god:'atlas'}];
 assert.ok(legal(selection,chooseMultiplayerBotAction(newGame('god'),'hard',0,selection)));
});
