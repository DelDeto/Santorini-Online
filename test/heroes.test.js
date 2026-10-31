import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction,HEROES,GODS} from '../src/game.js';
const ready=id=>{
 const g=newGame('god',2,'heroes');
 g.phase='move';g.turn=0;g.gods=[id,'achilles'];g.heroUsed=[false,false];
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:4,col:4},{row:4,col:3}]];
 g.ctx={};return g;
};
const act=(g,type,match=()=>true)=>{
 const a=legalActions(g,g.turn).find(x=>x.type===type&&match(x));
 assert.ok(a,'expected '+type+' in '+g.phase);
 applyAction(g,g.turn,a);return a;
};
test('Hero Powers are 10 separate official classic abilities, not added to 30 existing Gods',()=>{
 assert.equal(Object.keys(HEROES).length,10);assert.equal(Object.keys(GODS).length,30);
 const g=newGame('god',2,'heroes');
 assert.equal(g.phase,'godpick');
 assert.equal(legalActions(g).filter(a=>a.type==='selectGod').length,10);
 const duel=newGame('god',2,'duel');
 assert.ok(legalActions(duel).every(x=>!Object.hasOwn(HEROES,x.god)));
});
test('Achilles once builds before and after the move',()=>{
 const g=ready('achilles');
 const a=act(g,'heroPrebuild');
 assert.equal(g.heroUsed[0],true);assert.equal(g.board[a.row][a.col],1);
 assert.equal(legalActions(g).filter(x=>x.type==='heroPrebuild').length,0);
 act(g,'move');assert.equal(g.phase,'build');act(g,'build');
});
test('Bellerophon climbs two levels exactly once',()=>{
 const g=ready('bellerophon');g.board[2][3]=2;
 act(g,'move',a=>a.row===2&&a.col===3&&a.worker===0);
 assert.equal(g.heroUsed[0],true);assert.equal(g.phase,'build');
});
test('Jason deploys a third pawn at ground-level perimeter and builds',()=>{
 const g=ready('jason');
 const a=act(g,'heroDeploy',a=>a.row===0&&a.col===2);
 assert.equal(g.workers[0].length,3);assert.deepEqual(g.workers[0][2],{row:0,col:2});
 assert.equal(g.selected,2);assert.equal(g.phase,'build');
 assert.equal(g.heroUsed[0],true);act(g,'build');
});
test('Atalanta can sprint with the same worker and stop to build',()=>{
 const g=ready('atalanta');
 act(g,'move',a=>a.worker===0);
 assert.equal(g.phase,'build');
 act(g,'activateHero');assert.equal(g.phase,'heroSprint');
 const move=act(g,'move');
 assert.equal(g.phase,'heroSprint');assert.equal(g.selected,move.worker);
 act(g,'skip');assert.equal(g.phase,'build');assert.equal(g.heroUsed[0],true);
});
test('Odysseus moves a nearby opponent Worker to a free corner before normal move',()=>{
 const g=ready('odysseus');g.workers[1][0]={row:2,col:3};
 act(g,'heroCorner',a=>a.worker===0&&a.row===0&&a.col===4);
 assert.deepEqual(g.workers[1][0],{row:0,col:4});
 assert.equal(g.phase,'heroCorner');act(g,'skip');
 assert.equal(g.phase,'move');assert.equal(g.heroUsed[0],true);
});
const afterBuilding=id=>{
 const g=ready(id);g.phase='build';g.selected=0;g.ctx={lastMoved:0};
 act(g,'build',a=>a.row===1&&a.col===1);
 return g;
};
test('Heracles may erect multiple adjacent domes one time',()=>{
 const g=afterBuilding('heracles');assert.equal(g.phase,'heroPost');
 act(g,'activateHero');assert.equal(g.phase,'heroDomes');
 const a=act(g,'heroDome');assert.equal(g.board[a.row][a.col],4);
 act(g,'skip');assert.equal(g.heroUsed[0],true);
});
test('Polyphemus may erect at most two unrestricted domes',()=>{
 const g=afterBuilding('polyphemus');
 act(g,'activateHero');const a=act(g,'heroDome',x=>x.row===4&&x.col===0);
 const b=act(g,'heroDome',x=>x.row===0&&x.col===4);
 assert.equal(g.board[a.row][a.col],4);assert.equal(g.board[b.row][b.col],4);
 assert.equal(g.heroUsed[0],true);assert.notEqual(g.phase,'heroDomes');
});
test('Medea removes one block under adjacent worker',()=>{
 const g=ready('medea');g.workers[1][0]={row:1,col:0};g.board[1][0]=2;
 g.phase='build';g.selected=0;g.ctx={lastMoved:0};
 act(g,'build',a=>a.row===1&&a.col===1);
 assert.equal(g.phase,'heroPost');act(g,'activateHero');
 act(g,'heroUnbuild',a=>a.row===1&&a.col===0);
 assert.equal(g.board[1][0],1);assert.equal(g.heroUsed[0],true);
});
test('Theseus removes enemy pawn two levels above adjacent own pawn',()=>{
 const g=ready('theseus');g.workers[1][0]={row:2,col:3};g.board[2][3]=2;
 g.phase='build';g.selected=0;g.ctx={lastMoved:0};
 act(g,'build',a=>a.row===1&&a.col===1);
 assert.equal(g.phase,'heroPost');
 act(g,'heroRemove',a=>a.worker===0);
 assert.equal(g.workers[1].length,1);assert.equal(g.heroUsed[0],true);
});
test('Adonis marks a victim and applies next-turn adjacency requirement if feasible',()=>{
 const g=ready('adonis');g.workers[1][0]={row:3,col:2};
 g.phase='heroPost';g.ctx={lastMoved:0};
 act(g,'heroMark',a=>a.worker===0);
 assert.equal(g.turn,1);assert.equal(g.heroUsed[0],true);
 assert.deepEqual(g.heroMark,{owner:0,target:1,worker:0});
 const moves=legalActions(g,1).filter(a=>a.type==='move');
 assert.ok(moves.length>0);
 assert.ok(moves.every(a=>{
  const victim=a.worker===0?{row:a.row,col:a.col}:g.workers[1][0];
  return g.workers[0].some(w=>Math.max(Math.abs(w.row-victim.row),Math.abs(w.col-victim.col))===1);
 }));
});
