import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction,resetGame} from '../src/game.js';
const act=(g,p,type,fields={})=>applyAction(g,p,{type,...fields});
const setup=(g)=>{
 for(const [p,coords] of [[[0,0],[0,1]],[[4,4],[4,3]]].entries()){
  for(const [row,col] of coords)act(g,p,'place',{row,col});
 }
};
function takeTurn(g,p){
 const moves=legalActions(g,p).filter(a=>a.type==='move');
 assert.ok(moves.length,'must have move');
 act(g,p,'move',moves[0]);
 const builds=legalActions(g,p).filter(a=>a.type==='build');
 assert.ok(builds.length,'must have build');
 act(g,p,'build',builds[0]);
}
test('V1.4: Classic starts without god powers and reset keeps the mode',()=>{
 const g=newGame('classic',2,'classic');
 assert.equal(g.phase,'place');assert.equal(g.modeId,'classic');
 assert.equal(g.ruleset,'classic');assert.equal(g.gods.length,2);
 const reset=resetGame(g);assert.equal(reset.modeId,'classic');
});
test('V1.4: duel/3-player/4-player mode identities retain core rules',()=>{
 for(const [name,num] of [['duel',2],['trio',3],['teams',4]]){
  const g=newGame('god',num,name);
  assert.equal(g.modeId,name);assert.equal(g.capacity,num);
  assert.equal(g.phase,'godpick');
  assert.equal(g.workers.length,num===3?3:2);
  assert.equal(resetGame(g).modeId,name);
 }
});
test('V1.4: Agora Online exchanges two owned gods after a full round',()=>{
 const g=newGame('god',2,'agora');
 act(g,0,'selectGod',{god:'apollo'});
 act(g,1,'selectGod',{god:'athena'});
 setup(g);
 assert.equal(g.phase,'move');
 takeTurn(g,0);
 assert.deepEqual(g.gods,['apollo','athena']);
 assert.equal(g.agoraTurns,1);
 takeTurn(g,1);
 assert.equal(g.agoraTurns,2);
 assert.deepEqual(g.gods,['athena','apollo']);
 assert.equal(g.turn,0);
});
test('V1.4: Golden Fleece requires one shared god and a ram placement',()=>{
 const g=newGame('god',2,'fleece');
 assert.equal(g.phase,'fleecePick');
 const cards=legalActions(g).filter(a=>a.type==='selectGod');
 assert.equal(cards.length,10);
 act(g,0,'selectGod',{god:'pan'});
 assert.equal(g.fleeceGod,'pan');assert.deepEqual(g.gods,[null,null]);
 assert.equal(g.phase,'place');
 setup(g);
 assert.equal(g.phase,'ramPlace');
 assert.equal(g.turn,0);
 const options=legalActions(g);
 assert.equal(options.filter(a=>a.type==='placeRam').length,21);
 act(g,0,'placeRam',{row:3,col:4});
 assert.equal(g.phase,'move');assert.equal(g.turn,1);
 assert.deepEqual(g.ram,{row:3,col:4});
 assert.equal(g.ctx.fleeceActive,1);
 assert.ok(!legalActions(g).some(a=>a.type==='move'&&a.row===3&&a.col===4),'Ram occupies the cell');
});
test('V1.4: Golden Fleece grants Pan win only when adjacent at start of turn',()=>{
 const nearRam=newGame('god',2,'fleece');
 act(nearRam,0,'selectGod',{god:'pan'});setup(nearRam);
 nearRam.board[4][4]=2;
 act(nearRam,0,'placeRam',{row:3,col:4});
 const wins=legalActions(nearRam,1).filter(a=>a.type==='move'&&a.wins);
 assert.ok(wins.some(a=>a.worker===0&&a.row===3&&a.col===3),'Pan drop win when Ram is adjacent');
 const farRam=newGame('god',2,'fleece');
 act(farRam,0,'selectGod',{god:'pan'});setup(farRam);
 farRam.board[4][4]=2;
 act(farRam,0,'placeRam',{row:2,col:2});
 assert.equal(farRam.ctx.fleeceActive,null);
 assert.ok(!legalActions(farRam,1).some(a=>a.type==='move'&&a.wins&&a.row===3&&a.col===3));
});
test('V1.4: Golden Fleece state survives rematch without carrying power over',()=>{
 const g=newGame('god',2,'fleece');
 act(g,0,'selectGod',{god:'apollo'});setup(g);act(g,0,'placeRam',{row:2,col:2});
 const next=resetGame(g);
 assert.equal(next.modeId,'fleece');assert.equal(next.phase,'fleecePick');assert.equal(next.ram,null);
 assert.equal(next.fleeceGod,null);assert.deepEqual(next.gods,[null,null]);
});
