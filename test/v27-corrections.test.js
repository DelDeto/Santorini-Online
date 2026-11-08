import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction,canTakeTurn,legalMoves,beginAdvancedTurn} from '../src/game.js';

const setup=(my,enemy='apollo',mode='duel')=>{
 const g=newGame('god',2,mode);
 g.phase='move';g.turn=0;g.gods=[my,enemy];
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:4,col:4},{row:4,col:3}]];
 return g;
};
const domed=(g,r,c,height)=>{g.board[r][c]=4;g.advanced.domeBase[r+','+c]=height;};

test('Chronus ignores low-level Atlas domes and wins only at five genuinely complete towers',()=>{
 const g=setup('atlas','chronus');g.phase='build';g.selected=0;
 for(const [r,c] of [[0,0],[0,4],[4,0],[4,4]])domed(g,r,c,3);
 const early=legalActions(g).find(x=>x.type==='build'&&x.dome&&x.row===2&&x.col===3);
 assert.ok(early);applyAction(g,0,early);
 assert.equal(g.board[2][3],4);assert.equal(g.advanced.domeBase['2,3'],0);
 assert.equal(g.winner,null,'Atlas low dome must not satisfy Chronus fifth tower');
 const g2=setup('apollo','chronus');g2.phase='build';g2.selected=0;
 for(const [r,c] of [[0,0],[0,4],[4,0],[4,4]])domed(g2,r,c,3);
 g2.board[2][3]=3;
 applyAction(g2,0,{type:'build',row:2,col:3});
 assert.equal(g2.advanced.domeBase['2,3'],3);
 assert.equal(g2.winner,1);
});
test('Old domes with unknown provenance never give Chronus a false win',()=>{
 const g=setup('apollo','chronus');g.phase='build';g.selected=0;
 for(const [r,c] of [[0,0],[0,4],[4,0],[4,4]])g.board[r][c]=4;
 g.board[2][3]=3;applyAction(g,0,{type:'build',row:2,col:3});
 assert.equal(g.winner,null);
});
test('4-player Hera passive is effective even when another teammate is the active God',()=>{
 const g=newGame('god',4,'teams');
 g.phase='move';g.turn=1;
 g.gods=['atlas','apollo'];g.advanced.teamSeatGods=['hera','apollo','atlas','ares'];
 g.workers=[[{row:2,col:2},{row:4,col:0}],[{row:1,col:0},{row:4,col:4}]];
 g.board[1][0]=2;g.board[0][0]=3;
 const action=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===0&&a.col===0);
 assert.ok(action);
 assert.equal(action.wins,undefined,'Hera opponent-turn perimeter win block survives teammate turn');
});
test('4-player Hypnus and Limus passives persist across own teammate turn',()=>{
 const g=newGame('god',4,'teams');
 g.phase='move';g.turn=1;
 g.gods=['atlas','apollo'];g.advanced.teamSeatGods=['hypnus','apollo','atlas','ares'];
 g.workers=[[{row:2,col:2},{row:4,col:0}],[{row:3,col:3},{row:4,col:4}]];
 g.board[3][3]=2;
 assert.ok(!legalActions(g).some(a=>a.type==='move'&&a.worker===0),'Hypnus locks highest');
 g.phase='build';g.selected=0;g.board[3][3]=0;
 g.advanced.teamSeatGods[0]='limus';g.workers[1][0]={row:3,col:2};
 const choices=legalActions(g);
 assert.ok(!choices.some(a=>a.type==='build'&&a.row===2&&a.col===3),'Limus restricts adjacent build');
});
test('Jason hero deployment counts as a legal turn even if two original Workers are trapped',()=>{
 const g=setup('jason','achilles','heroes');
 g.workers=[[{row:1,col:1},{row:3,col:3}],[{row:0,col:4},{row:4,col:0}]];
 for(const w of g.workers[0])for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
  const r=w.row+dr,c=w.col+dc;if((dr||dc)&&r>=0&&r<5&&c>=0&&c<5)g.board[r][c]=4;
 }
 assert.equal(legalActions(g).filter(a=>a.type==='move').length,0);
 assert.ok(legalActions(g).some(a=>a.type==='heroDeploy'));
 assert.equal(canTakeTurn(g,0),true,'Jason cannot be falsely declared defeated');
});
test('Odysseus can unblock a trapped Worker before moving and avoid false loss',()=>{
 const g=setup('odysseus','achilles','heroes');
 g.workers=[[{row:1,col:1},{row:3,col:3}],[{row:1,col:2},{row:4,col:0}]];
 for(const w of g.workers[0])for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
  const r=w.row+dr,c=w.col+dc;
  if((dr||dc)&&r>=0&&r<5&&c>=0&&c<5&&!(r===1&&c===2))g.board[r][c]=4;
 }
 assert.equal(legalActions(g).filter(a=>a.type==='move').length,0);
 assert.ok(legalActions(g).some(a=>a.type==='heroCorner'&&a.worker===0));
 assert.equal(canTakeTurn(g,0),true);
});
test('Dionysus can chain a controlled turn after the opponent completes a dome',()=>{
 const g=setup('dionysus');
 g.phase='dionysusMove';g.turn=0;g.ctx={dionysusTarget:1,dionysusUsed:true,bonusChainCount:1,domeBuilt:false};
 g.workers[1][0]={row:2,col:2};g.workers[1][1]={row:4,col:4};
 g.board[2][3]=3;
 const move=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===1&&a.col===2);
 assert.ok(move);applyAction(g,0,move);
 assert.equal(g.phase,'dionysusBuild');
 applyAction(g,0,{type:'build',row:2,col:3});
 assert.equal(g.phase,'dionysusChoice','second optional controlled turn available');
 assert.equal(g.winner,null);
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
});
test('Chaos reshuffles remaining cards when exhausted',()=>{
 const random=Math.random;Math.random=()=>0;
 try{
  const g=setup('chaos');
  g.advanced.chaos[0]={deck:['pan','apollo','atlas'],index:2,current:'atlas'};
  g.phase='build';g.selected=0;g.board[2][3]=3;
  applyAction(g,0,{type:'build',row:2,col:3});
  assert.equal(g.advanced.chaos[0].index,0);
  assert.notDeepEqual(g.advanced.chaos[0].deck,['pan','apollo','atlas'],'reshuffled before re-draw');
  assert.equal(g.advanced.chaos[0].current,g.advanced.chaos[0].deck[0]);
 }finally{Math.random=random;}
});
test('Bia removal stays visible in user action log',()=>{
 const g=setup('bia');g.workers[0][0]={row:2,col:1};g.workers[1][0]={row:2,col:3};
 applyAction(g,0,{type:'move',worker:0,row:2,col:2});
 assert.equal(g.workers[1].length,1);
 assert.match(g.lastAction,/Bia/i);
});

test('Aphrodite constrains Hermes at the last move, allowing a reversible intermediate detour',()=>{
 const g=setup('hermes','aphrodite');
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:3,col:2},{row:4,col:4}]];
 beginAdvancedTurn(g,0);
 const detour=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===1&&a.col===2);
 assert.ok(detour,'valid first same-level detour remains playable');
 applyAction(g,0,detour);assert.equal(g.phase,'hermesMove');
 assert.ok(!legalActions(g).some(a=>a.type==='endMove'),'cannot finish while last move is away from Aphrodite');
 const returnNear=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===2&&a.col===1);
 assert.ok(returnNear,'can come back alongside Aphrodite');
 applyAction(g,0,returnNear);
 assert.ok(legalActions(g).some(a=>a.type==='endMove'),'finishing beside Aphrodite is legal');
});
test('Persephone allows a Triton perimeter detour that climbs later in the same turn',()=>{
 const g=setup('triton','persephone');
 g.workers=[[{row:1,col:2},{row:4,col:0}],[{row:4,col:4},{row:3,col:4}]];
 g.board[1][3]=1;
 const first=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===0&&a.col===2);
 assert.ok(first,'entering the perimeter is allowed if it makes a later ascent possible');
 applyAction(g,0,first);
 assert.equal(g.phase,'tritonMove');assert.equal(g.ctx.persephoneRequired,true);
 assert.ok(!legalActions(g).some(a=>a.type==='skip'),'cannot skip without climbing');
 const up=legalActions(g).find(a=>a.type==='move'&&a.row===1&&a.col===3&&a.worker===0);
 assert.ok(up,'legal upward move preserved');
 applyAction(g,0,up);
 assert.equal(g.ctx.upThisTurn,true);
 assert.equal(g.phase,'build');
});
test('V2.7 power HUD exposes state, danger, special 2D and 3D destinations',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
 const ui=read('../public/app.js'),html=read('../public/index.html'),board=read('../public/board3d.js'),style=read('../public/style.css');
 assert.match(ui,/function effectNotices\(g,v\)/);
 for(const warning of ['Athena: không được leo','Persephone: phải leo','Morpheus: ','Chronus: ','Dionysus: lượt phụ']){
  assert.ok(ui.includes(warning),warning);
 }
 assert.match(html,/id="effectStatus"/);
 assert.match(ui,/cue\.toLowerCase\(\)/);
 assert.match(style,/\.game \.tile\.power-win/);
 assert.match(style,/\.game \.tile\.power-swap/);
 assert.match(style,/\.game \.tile\.power-push/);
 assert.match(board,/glowWin/);
 assert.match(board,/glowForced/);
 assert.match(style,/\.game \.effect-status/);
});
