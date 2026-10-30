import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyAction,legalActions,GODS} from '../src/game.js';

function readyThree(){
 const g=newGame('god',3);g.phase='move';g.turn=0;
 g.gods=['apollo','pan','atlas'];
 g.workers=[
  [{row:2,col:2},{row:4,col:0}],
  [{row:0,col:0},{row:0,col:1}],
  [{row:4,col:3},{row:4,col:4}]
 ];
 return g;
}
test('Roxley: 3-player creates 3 distinct gods and 6 worker slots',()=>{
 const g=newGame('god',3);
 assert.equal(g.gods.length,3);
 assert.equal(g.workers.length,3);
 for(let p=0;p<3;p++){
  const god=Object.keys(GODS)[p];
  applyAction(g,p,{type:'selectGod',god});
 }
 assert.equal(g.phase,'place');assert.equal(g.turn,0);
 for(let p=0;p<3;p++)for(let i=0;i<2;i++)applyAction(g,p,{type:'place',row:p*2,col:i});
 assert.equal(g.phase,'move');assert.equal(g.turn,0);
 assert.deepEqual(g.workers.map(a=>a.length),[2,2,2]);
});
test('Roxley: next independent player follows in 3-player turns',()=>{
 const g=readyThree();
 applyAction(g,0,{type:'move',worker:0,row:3,col:2});
 applyAction(g,0,{type:'build',row:2,col:2});
 assert.equal(g.turn,1);assert.equal(g.phase,'move');
});
test('Roxley: immobilized player loses workers and God and third continues',()=>{
 const g=readyThree();
 g.board[0][2]=4;g.board[1][0]=4;g.board[1][1]=4;g.board[1][2]=4;
 applyAction(g,0,{type:'move',worker:0,row:3,col:2});
 applyAction(g,0,{type:'build',row:2,col:2});
 assert.equal(g.eliminated[1],true);
 assert.deepEqual(g.workers[1],[]);
 assert.equal(g.gods[1],null);
 assert.equal(g.turn,2);
 assert.equal(g.winner,null);
});
test('Roxley: moving onto level 3 immediately wins 3-player match',()=>{
 const g=readyThree();
 g.board[2][2]=2;g.board[2][3]=3;
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.row===2&&a.col===3));
 applyAction(g,0,{type:'move',worker:0,row:2,col:3});
 assert.equal(g.phase,'ended');assert.equal(g.winner,0);
});
