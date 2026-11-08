import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction,beginAdvancedTurn} from '../src/game.js';
import {readFileSync} from 'node:fs';

const game=(god='morpheus',other='apollo')=>{
 const g=newGame('god',2,'advanced');g.phase='move';g.turn=0;g.gods=[god,other];
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:4,col:4},{row:4,col:3}]];
 return g;
};
const move=g=>applyAction(g,0,{type:'move',worker:0,row:1,col:2});
const builds=g=>legalActions(g,0).filter(a=>a.type==='build');

test('V2.6.1 Morpheus earns one token and may skip every build to save it',()=>{
 const g=game();beginAdvancedTurn(g,0);
 assert.equal(g.advanced.morpheus[0],1);
 move(g);assert.equal(g.phase,'morpheusBuild');
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
 applyAction(g,0,{type:'skip'});
 assert.equal(g.turn,1);
 assert.equal(g.advanced.morpheus[0],1);
});
test('V2.6.1 Morpheus cannot create an early dome on levels 0/1/2',()=>{
 for(const h of [0,1,2]){
  const g=game();g.advanced.morpheus[0]=3;g.board[2][2]=h;move(g);
  assert.ok(builds(g).some(a=>a.row===2&&a.col===2));
  assert.ok(!builds(g).some(a=>a.dome===true),'no early dome action at '+h);
  assert.throws(()=>applyAction(g,0,{type:'build',row:2,col:2,dome:true}),/không hợp lệ/i);
  assert.equal(g.board[2][2],h);
 }
});
test('V2.6.1 Morpheus can build four times on same cell, ending with normal level-3 dome',()=>{
 const g=game();g.advanced.morpheus[0]=4;move(g);
 for(let i=1;i<=4;i++){
  const target=builds(g).find(a=>a.row===2&&a.col===2);
  assert.ok(target,'can build '+i+'th time');
  applyAction(g,0,target);
  assert.equal(g.board[2][2],i);
  assert.equal(g.advanced.morpheus[0],4-i);
 }
 assert.equal(g.turn,1);assert.equal(g.phase,'move');
});
test('V2.6.1 Morpheus can build a single normal dome atop an existing level 3',()=>{
 const g=game();g.advanced.morpheus[0]=1;g.board[2][2]=3;move(g);
 const action=builds(g).find(a=>a.row===2&&a.col===2);
 assert.ok(action);assert.equal(action.dome,undefined);
 applyAction(g,0,action);
 assert.equal(g.board[2][2],4);
 assert.equal(g.advanced.morpheus[0],0);
});
test('V2.6.1 Morpheus cannot build normally when stored stock is empty',()=>{
 const g=game();move(g);
 assert.equal(g.phase,'morpheusBuild');
 assert.equal(builds(g).length,0);
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
 assert.throws(()=>applyAction(g,0,{type:'build',row:2,col:2}),/không hợp lệ/i);
});
test('V2.6.1 Circe steals Morpheus power together with its stocked currency',()=>{
 const g=game('circe','morpheus');
 g.workers[1]=[{row:4,col:4},{row:4,col:2}]; // not neighboring
 g.advanced.morpheus[1]=3;
 beginAdvancedTurn(g,0);
 assert.deepEqual(g.advanced.circe,{owner:0,target:1,power:'morpheus'});
 assert.equal(g.advanced.morpheus[1],4,'start-of-turn effect added to original card');
 assert.equal(g.advanced.morpheus[0],undefined,'Circe does not invent separate stock');
 move(g);
 assert.equal(g.phase,'morpheusBuild');
 const action=builds(g).find(a=>a.row===2&&a.col===2);
 assert.ok(action,'Circe can spend borrowed stock');
 applyAction(g,0,action);
 assert.equal(g.advanced.morpheus[1],3,'deducts from original card');
 assert.equal(g.advanced.morpheus[0],undefined);
 applyAction(g,0,{type:'skip'});
 assert.equal(g.turn,1);
 assert.equal(g.advanced.morpheus[1],3,'Morpheus cannot independently earn stock while stolen');
});
test('V2.6.1 client explains the currency and never hides Morpheus builds behind dome mode',()=>{
 const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const g=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 assert.match(ui,/Chỉ đặt mái vòm trên tầng 3/);
 assert.match(ui,/if\(phase==='morpheusBuild'\)return getActions\('build'\)/);
 assert.match(g,/const morpheusReserveOwner=/);
 assert.doesNotMatch(g,/if\(g\.phase==='morpheusBuild'\)out\.push\(\.\.\.positions\.map/);
});
