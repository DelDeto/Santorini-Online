import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,legalActions,applyAction} from '../src/game.js';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('V2.3: availableTiles selector no longer calls itself recursively',()=>{
 const segment=app.split('function availableTiles(){')[1].split('function tileClick(')[0];
 assert.ok(segment);assert.doesNotMatch(segment,/availableTiles\s*\(/);
 for(const phase of ['heroDomes','heroMedea'])assert.ok(segment.includes("phase==='"+phase+"'"));
});
test('V2.3: Hero target clicks dispatch real actions and allow all three workers',()=>{
 const segment=app.split('function tileClick(row,col){')[1].split('function drawFallback(){')[0];
 assert.match(segment,/heroDomes','heroMedea/);
 assert.match(segment,/if\(a\)send\(a\)/);
 assert.match(segment,/heroDeploy','heroPrebuild/);
 assert.match(segment,/heroPrebuild',worker/);
 assert.match(segment,/heroSprint/);
});
test('V2.3: malformed and overly large WebSocket commands rejected before parsing',()=>{
 assert.match(server,/String\(payload\)\.length>8192/);
 assert.match(server,/JSON\.parse\(String\(payload\)\)/);
});
const check=g=>{
 const spaces=new Set();assert.equal(g.board.length,5);
 for(const row of g.board){assert.equal(row.length,5);for(const h of row)assert.ok(Number.isInteger(h)&&h>=0&&h<=4);}
 for(const team of g.workers)for(const w of team){
  assert.ok(Number.isInteger(w.row)&&w.row>=0&&w.row<5&&Number.isInteger(w.col)&&w.col>=0&&w.col<5);
  assert.ok(g.board[w.row][w.col]<4,'worker on dome');
  const key=w.row+','+w.col;assert.ok(!spaces.has(key),'overlapping workers');spaces.add(key);
 }
 if(g.ram)assert.ok(!spaces.has(g.ram.row+','+g.ram.col),'ram overlaps worker');
};
test('V2.3: seeded legal action walks preserve game state in six modes',()=>{
 const modes=[['classic',2,'classic'],['god',2,'duel'],['god',2,'heroes'],['god',2,'agora'],['god',2,'fleece'],['god',3,'trio']];
 let count=0;
 for(const [rules,n,mode] of modes)for(let seed=1;seed<=4;seed++){
  let rng=(0x9e3779b9^seed^mode.length)>>>0;
  const rand=()=>((rng^=rng<<13,rng^=rng>>>17,rng^=rng<<5),rng>>>0);
  const g=newGame(rules,n,mode);
  for(let i=0;i<145&&g.winner===null;i++){
   check(g);
   const actions=legalActions(g,g.turn);
   assert.ok(actions.length,mode+' '+g.phase+' '+g.turn+' #'+i);
   const a=actions[rand()%actions.length];
   assert.doesNotThrow(()=>applyAction(g,g.turn,a),mode+' '+JSON.stringify(a));count++;
  }
  check(g);
 }
 assert.ok(count>600,'sufficient sampled transitions: '+count);
});
test('V2.3: optional Hero phases always expose skip, preventing soft locks',()=>{
 for(const phase of ['heroPost','heroCorner','heroDomes','heroMedea','heroSprint']){
  const g=newGame('god',2,'heroes');
  g.gods=['heracles','atalanta'];g.phase=phase;g.turn=0;g.selected=0;
  g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:4,col:4},{row:4,col:3}]];
  assert.ok(legalActions(g).some(a=>a.type==='skip'),phase);
 }
});
