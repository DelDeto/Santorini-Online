import test from 'node:test';
import assert from 'node:assert/strict';
import {GODS,SIMPLE_GODS,ADVANCED_GODS,validGodFor,newGame,legalActions,applyAction,beginAdvancedTurn} from '../src/game.js';
import {chooseMultiplayerBotAction} from '../src/bot.js';
function game(power,op='apollo',count=2){
 const g=newGame('god',count);g.phase='move';g.turn=0;
 g.gods=count===3?[power,op,'pan']:[power,op];
 g.workers=count===3?[[{row:2,col:2},{row:0,col:0}],[{row:3,col:3},{row:4,col:4}],[{row:4,col:0},{row:4,col:1}]]:[
 [{row:2,col:2},{row:0,col:0}],[{row:3,col:3},{row:4,col:4}]];
 return g;
}
const act=(g,p,type,fields={})=>applyAction(g,p,{type,...fields});
test('30 gods and player restrictions, banned Circe/Eros matchup',()=>{
 assert.equal(Object.keys(GODS).length,30);
 assert.equal(Object.keys(ADVANCED_GODS).length,20);
 assert.equal(SIMPLE_GODS.length,10);
 assert.equal(validGodFor('aphrodite',3),false);
 assert.equal(validGodFor('aphrodite',4),true);
 assert.equal(validGodFor('chronus',3),false);
 assert.equal(validGodFor('circe',4),false);
 assert.equal(validGodFor('eros',2,['circe']),false);
});
test('Aphrodite restricts moves away from neighboring rival',()=>{
 const g=game('aphrodite','apollo');g.turn=1;
 g.workers[1][0]={row:2,col:3};g.workers[1][1]={row:4,col:4};
 const moves=legalActions(g,1).filter(a=>a.type==='move'&&a.worker===0);
 assert.ok(moves.length);
 assert.ok(moves.every(a=>g.workers[0].some(w=>Math.max(Math.abs(w.row-a.row),Math.abs(w.col-a.col))<=1)));
});
test('Ares can remove a block adjacent to unmoved worker',()=>{
 const g=game('ares');g.board[0][1]=2;
 act(g,0,'move',{worker:0,row:1,col:2});
 act(g,0,'build',{row:2,col:2});
 assert.equal(g.phase,'aresRemove');
 assert.ok(legalActions(g).some(a=>a.type==='removeBlock'&&a.row===0&&a.col===1));
 act(g,0,'removeBlock',{row:0,col:1});assert.equal(g.board[0][1],1);
});
test('Bia removes enemy worker immediately behind destination',()=>{
 const g=game('bia');
 g.workers[0][0]={row:2,col:1};g.workers[1][0]={row:2,col:3};
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.row===2&&a.col===2));
 act(g,0,'move',{worker:0,row:2,col:2});
 assert.equal(g.workers[1].length,1);
});
test('Chaos gets a simple god and rotates after dome completion',()=>{
 const g=game('chaos');beginAdvancedTurn(g,0);
 assert.ok(SIMPLE_GODS.includes(g.advanced.chaos[0].current));
 const first=g.advanced.chaos[0].current;
 g.advanced.chaos[0]={deck:['pan','apollo'],index:0,current:'pan'};
 g.phase='build';g.selected=0;g.board[2][3]=3;
 act(g,0,'build',{row:2,col:3});
 assert.equal(g.advanced.chaos[0].current,'apollo');
 assert.ok(first);
});
test('Charon moves enemy to opposite side before walking',()=>{
 const g=game('charon');g.workers[1][0]={row:2,col:3};
 const ferry=legalActions(g).find(a=>a.type==='ferry'&&a.worker===0&&a.row===2&&a.col===3);
 assert.ok(ferry);
 act(g,0,'ferry',{worker:0,row:2,col:3});
 assert.deepEqual(g.workers[1][0],{row:2,col:1});
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.worker===0));
});
test('Chronus wins at five domed towers even from opponent build',()=>{
 const g=game('apollo','chronus');g.turn=0;g.phase='build';g.selected=0;
 for(const [r,c] of [[0,0],[0,4],[4,0],[4,4]])g.board[r][c]=4;
 g.board[2][3]=3;
 act(g,0,'build',{row:2,col:3});
 assert.equal(g.winner,1);assert.equal(g.phase,'ended');
});
test('Circe borrows ability when opponent workers are separated',()=>{
 const g=game('circe','pan');beginAdvancedTurn(g,0);
 assert.equal(g.advanced.circe.owner,0);
 assert.equal(g.advanced.circe.power,'pan');
});
test('Dionysus grants opponent-controlled turn after completing a dome',()=>{
 const g=game('dionysus');g.phase='build';g.selected=0;g.board[2][3]=3;
 act(g,0,'build',{row:2,col:3});
 assert.equal(g.phase,'dionysusChoice');
 assert.ok(legalActions(g).some(a=>a.type==='commandeer'&&a.target===1));
 act(g,0,'commandeer',{target:1});assert.equal(g.phase,'dionysusMove');
 assert.ok(legalActions(g).some(a=>a.type==='move'));
});
test('Eros can win by reuniting first-level workers',()=>{
 const g=game('eros');g.workers[0]=[{row:2,col:2},{row:2,col:4}];
 g.board[2][2]=1;g.board[2][4]=1;g.board[2][3]=1;
 act(g,0,'move',{worker:1,row:2,col:3});
 assert.equal(g.winner,0);
});
test('Hera negates victory on a perimeter square',()=>{
 const g=game('apollo','hera');g.workers[0][0]={row:1,col:0};g.board[1][0]=2;g.board[0][0]=3;
 assert.ok(!legalActions(g).some(a=>a.type==='move'&&a.row===0&&a.col===0&&a.wins));
});
test('Hestia extra build is not allowed on outer edge',()=>{
 const g=game('hestia');g.phase='build';g.selected=0;
 act(g,0,'build',{row:1,col:1});assert.equal(g.phase,'extraBuild');
 const extra=legalActions(g).filter(a=>a.type==='build');
 assert.ok(extra.length);
 assert.ok(extra.every(a=>a.row>0&&a.row<4&&a.col>0&&a.col<4));
});
test('Hypnus prevents unique highest enemy worker movement',()=>{
 const g=game('hypnus');g.turn=1;g.workers[1][0]={row:3,col:3};
 g.board[3][3]=2;
 const moves=legalActions(g,1).filter(a=>a.type==='move');
 assert.ok(moves.length);
 assert.ok(moves.every(a=>a.worker!==0));
});
test('Limus blocks adjacent opponent construction except completing dome',()=>{
 const g=game('limus');g.turn=1;g.phase='build';g.selected=0;
 g.workers[1][0]={row:3,col:2};
 const opts=legalActions(g,1).filter(a=>a.type==='build');
 assert.ok(!opts.some(a=>a.row===2&&a.col===3));
 g.board[2][3]=3;
 assert.ok(legalActions(g,1).some(a=>a.type==='build'&&a.row===2&&a.col===3));
});
test('Medusa petrifies lower neighboring opponent on end of turn',()=>{
 const g=game('medusa');g.phase='build';g.selected=0;
 g.board[2][2]=2;g.workers[1][0]={row:2,col:3};
 act(g,0,'build',{row:1,col:1});
 assert.equal(g.workers[1].length,1);
 assert.equal(g.board[2][3],1);
});
test('Morpheus earns and spends its build stock',()=>{
 const g=game('morpheus');beginAdvancedTurn(g,0);
 assert.equal(g.advanced.morpheus[0],1);
 act(g,0,'move',{worker:0,row:1,col:2});
 assert.equal(g.phase,'morpheusBuild');
 act(g,0,'build',{row:2,col:2});
 assert.equal(g.advanced.morpheus[0],0);
});
test('Persephone forces up-moves when a legal climb exists',()=>{
 const g=game('persephone');g.turn=1;
 g.workers[1][0]={row:3,col:3};g.board[3][2]=1;
 const moves=legalActions(g,1).filter(a=>a.type==='move');
 assert.ok(moves.length);
 assert.ok(moves.every(a=>g.board[a.row][a.col]>g.board[g.workers[1][a.worker].row][g.workers[1][a.worker].col]));
});
test('Poseidon allows up to three bonus builds by grounded unmoved worker',()=>{
 const g=game('poseidon');g.phase='build';g.selected=0;g.ctx={lastMoved:0};
 act(g,0,'build',{row:2,col:3});assert.equal(g.phase,'poseidonBuild');
 assert.equal(g.ctx.bonusRemaining,3);
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
});
test('Selene female worker may build a dome after male worker moves',()=>{
 const g=game('selene');g.phase='build';g.selected=0;
 const options=legalActions(g).filter(a=>a.dome);
 assert.ok(options.some(a=>a.row===0&&a.col===1));
});
test('Triton can continue moving after entering a perimeter square',()=>{
 const g=game('triton');g.workers[0][0]={row:1,col:0};
 act(g,0,'move',{worker:0,row:0,col:0});
 assert.equal(g.phase,'tritonMove');
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
});
test('Zeus can build directly under moving worker without a dome',()=>{
 const g=game('zeus');g.phase='build';g.selected=0;
 assert.ok(legalActions(g).some(a=>a.type==='build'&&a.under&&a.row===2&&a.col===2));
 act(g,0,'build',{row:2,col:2,under:true});
 assert.equal(g.board[2][2],1);
});
test('BOT picks a server-legal action for each advanced God stage',()=>{
 for(const id of Object.keys(ADVANCED_GODS)){
  if(!validGodFor(id,2,['apollo']))continue;
  const g=game(id),choices=legalActions(g);
  const a=chooseMultiplayerBotAction(g,'normal',0,choices);
  assert.ok(a&&choices.some(x=>JSON.stringify(x)===JSON.stringify(a)),id+' legal action');
 }
});
