import test from 'node:test';
import assert from 'node:assert/strict';
import {GODS,newGame,applyAction,legalActions,legalMoves,canTakeTurn} from '../src/game.js';
const match=(g,p,type,opts={})=>applyAction(g,p,{type,...opts});
function setup(god,enemy='athena'){
 const g=newGame('god');g.gods=[god,enemy];g.phase='move';g.turn=0;
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:3,col:3},{row:4,col:4}]];
 return g;
}
test('ten god powers registered and uniqueness enforced during draft',()=>{
 assert.equal(Object.keys(GODS).length,10);
 const g=newGame('god');match(g,0,'selectGod',{god:'apollo'});
 assert.equal(g.turn,1);
 assert.throws(()=>match(g,1,'selectGod',{god:'apollo'}));
 match(g,1,'selectGod',{god:'artemis'});assert.equal(g.phase,'place');
});
test('Apollo swaps opposing worker',()=>{
 const g=setup('apollo');g.workers[1][0]={row:2,col:3};
 match(g,0,'move',{worker:0,row:2,col:3});
 assert.deepEqual(g.workers[1][0],{row:2,col:2});
 assert.equal(g.workers[0][0].col,3);
});
test('Minotaur pushes opponent into opposite cell',()=>{
 const g=setup('minotaur');g.workers[1][0]={row:2,col:3};
 match(g,0,'move',{worker:0,row:2,col:3});
 assert.deepEqual(g.workers[1][0],{row:2,col:4});
});
test('Artemis can skip second move and never return to origin',()=>{
 const g=setup('artemis');
 match(g,0,'move',{worker:0,row:1,col:2});assert.equal(g.phase,'extraMove');
 assert.ok(!legalActions(g,0).some(a=>a.type==='move'&&a.row===2&&a.col===2));
 match(g,0,'skip');assert.equal(g.phase,'build');
});
test('Athena blocks opponent from climbing for exactly one turn',()=>{
 const g=setup('athena','apollo');g.board[1][2]=1;
 match(g,0,'move',{worker:0,row:1,col:2});
 assert.equal(g.athenaBlocked,1);
 match(g,0,'build',{row:2,col:2});assert.equal(g.turn,1);
 const from=g.workers[1][0];g.board[2][3]=2;
 assert.ok(!legalMoves(g,1,0).some(a=>a.row===2&&a.col===3));
 match(g,1,'move',{worker:0,row:3,col:2});
 match(g,1,'build',{row:3,col:1});assert.equal(g.athenaBlocked,null);
});
test('Atlas may create early dome',()=>{
 const g=setup('atlas');match(g,0,'move',{worker:0,row:1,col:2});
 assert.ok(legalActions(g).some(a=>a.type==='build'&&a.dome===true));
 match(g,0,'build',{row:2,col:2,dome:true});
 assert.equal(g.board[2][2],4);
});
test('Demeter second build cannot repeat first cell',()=>{
 const g=setup('demeter');match(g,0,'move',{worker:0,row:1,col:2});match(g,0,'build',{row:2,col:2});
 assert.equal(g.phase,'extraBuild');
 assert.ok(!legalActions(g).some(a=>a.type==='build'&&a.row===2&&a.col===2));
 match(g,0,'skip');assert.equal(g.turn,1);
});
test('Hephaestus may build extra block on same cell only',()=>{
 const g=setup('hephaestus');match(g,0,'move',{worker:0,row:1,col:2});match(g,0,'build',{row:2,col:2});
 assert.equal(g.phase,'extraBuild');assert.deepEqual(legalActions(g).filter(a=>a.type==='build').map(a=>[a.row,a.col]),[[2,2]]);
 match(g,0,'build',{row:2,col:2});assert.equal(g.board[2][2],2);assert.equal(g.turn,1);
});
test('Hermes may build without moving, or continue level movement',()=>{
 const g=setup('hermes');assert.ok(legalActions(g).some(a=>a.type==='endMove'));
 match(g,0,'move',{worker:0,row:1,col:2});assert.equal(g.phase,'hermesMove');
 assert.ok(legalActions(g).some(a=>a.type==='endMove'&&a.worker===1));
 match(g,0,'endMove',{worker:1});assert.equal(g.phase,'build');
});
test('Pan wins by dropping two levels',()=>{
 const g=setup('pan');g.board[2][2]=2;match(g,0,'move',{worker:0,row:1,col:2});
 assert.equal(g.winner,0);
});
test('Prometheus prebuild prevents climbing',()=>{
 const g=setup('prometheus');g.board[1][2]=1;
 assert.ok(legalActions(g).some(a=>a.type==='prebuild'));
 match(g,0,'prebuild',{worker:0,row:2,col:1});
 assert.equal(g.ctx.prometheusUsed,true);
 assert.ok(!legalActions(g).some(a=>a.type==='move'&&a.worker===0&&a.row===1&&a.col===2));
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.worker===0));
});
test('God mode reset keeps ruleset and requires drafting again',()=>{
 const g=setup('apollo');g.winner=0;g.phase='ended';
 const {resetGame}=await import('../src/game.js');
 const fresh=resetGame(g);assert.equal(fresh.phase,'godpick');assert.deepEqual(fresh.gods,[null,null]);
});
