import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GODS,SIMPLE_GODS,ADVANCED_GODS,newGame,legalActions,applyAction,validGodFor} from '../src/game.js';
const src=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
function prepared(a,b,phase='move'){
 const g=newGame('god',2,'duel');
 g.gods=[a,b];g.phase=phase;g.turn=0;
 g.workers=[[{row:2,col:2},{row:0,col:1}],[{row:4,col:3},{row:3,col:4}]];
 return g;
}
test('AUDIT inventory: all 10 base and 20 advanced Gods are registered and have a guide',()=>{
 assert.equal(SIMPLE_GODS.length,10);
 assert.equal(Object.keys(ADVANCED_GODS).length,20);
 assert.equal(Object.keys(GODS).length,30);
 assert.equal(new Set(Object.keys(GODS)).size,30);
 for(const god of Object.keys(GODS)){
  assert.ok(ui.includes(' '+god+':{'),'no Vietnamese guide '+god);
  assert.equal(validGodFor(god,2),true);
 }
 const a=newGame('god',2,'basic'),b=newGame('god',2,'advanced');
 assert.equal(legalActions(a).length,10);
 assert.equal(legalActions(b).length,20);
});
test('AUDIT-001 confirmed current bug: Chronus counts Atlas early domes as complete towers',()=>{
 const g=prepared('atlas','chronus','build');g.selected=0;
 for(const [r,c] of [[0,0],[0,4],[4,0],[4,4]])g.board[r][c]=4;
 assert.equal(g.board[2][3],0,'the prospective Atlas dome is on level 0');
 const a=legalActions(g).find(x=>x.type==='build'&&x.dome&&x.row===2&&x.col===3);
 assert.ok(a,'Atlas can legally put an early dome at ground level');
 applyAction(g,0,a);
 assert.equal(g.board[2][3],4);
 assert.equal(g.winner,1,'incorrect early Chronus victory in current engine');
 assert.equal(g.phase,'ended');
 assert.match(src,/function completedTowers\(g\)\{return g.board.flat\(\).filter\(h=>h===4\).length;\}/);
});
test('AUDIT-002 confirmed current limitation: Dionysus bonus dome does not offer next chained bonus',()=>{
 const g=prepared('dionysus','apollo','dionysusMove');
 g.ctx={dionysusTarget:1,dionysusUsed:true};
 g.workers[1][0]={row:2,col:2};g.workers[1][1]={row:4,col:4};
 g.board[2][3]=3;
 const step=legalActions(g).find(a=>a.type==='move'&&a.worker===0&&a.row===1&&a.col===2);
 assert.ok(step,'opponent Worker may move under Dionysus control');
 applyAction(g,0,step);
 assert.equal(g.phase,'dionysusBuild');
 const dome=legalActions(g).find(a=>a.type==='build'&&a.row===2&&a.col===3);
 assert.ok(dome,'controlled Worker may complete a tower');
 applyAction(g,0,dome);
 assert.equal(g.board[2][3],4);
 assert.notEqual(g.phase,'dionysusChoice','no additional bonus choice after this dome');
 assert.equal(g.turn,1,'bonus closes and passes turn despite another completed tower');
});
test('AUDIT-003 current behavior: Chaos cycles fixed same deck without reshuffling after depletion',()=>{
 const g=prepared('chaos','apollo','build');g.selected=0;
 g.advanced.chaos[0]={deck:['pan','atlas'],index:1,current:'atlas'};
 g.board[2][3]=3;
 const dome=legalActions(g).find(a=>a.type==='build'&&a.row===2&&a.col===3);
 assert.ok(dome);
 applyAction(g,0,dome);
 assert.equal(g.advanced.chaos[0].index,0);
 assert.equal(g.advanced.chaos[0].current,'pan');
 assert.match(src,/entry.index=\(entry.index\+1\)%entry.deck.length/);
});
test('AUDIT-004 current behavior: Bia removal has no Bia-specific action narration',()=>{
 const g=prepared('bia','apollo');
 g.workers[0][0]={row:2,col:1};
 g.workers[1][0]={row:2,col:3};
 const a=legalActions(g).find(x=>x.type==='move'&&x.worker===0&&x.row===2&&x.col===2);
 assert.ok(a);applyAction(g,0,a);
 assert.equal(g.workers[1].length,1,'Bia removes victim correctly');
 assert.doesNotMatch(g.lastAction,/Bia/i,'generic move narration overwrites the knockout');
});
test('AUDIT-005 4P team seat swaps overwrite team God, dropping off-turn passive holder',()=>{
 assert.match(server,/r.game.gods\[team\(r.activeSeat\)\]=r.seatGods\[r.activeSeat\]/);
 assert.match(src,/const hasEnemyGod=\(g,p,id\)=>opponentsOf\(g,p\).some\(i=>g.gods\[i\]===id\)/);
 const g=newGame('god',4,'teams');g.gods=['hera','apollo'];
 assert.ok(g.gods.includes('hera'));
 g.gods[0]='athena'; // when Hera's teammate begins a turn, the server applies this
 assert.ok(!g.gods.includes('hera'),'off-turn Hera passive is now lost');
});
test('AUDIT UI: passive effects, Chaos draw and Circe borrowed power not in live HUD',()=>{
 assert.ok(!ui.includes('athenaBlocked'),'no Athena no-climb turn marker');
 assert.ok(!ui.includes('advanced.chaos'),'Chaos current Simple God is invisible');
 assert.match(ui,/id==='hermes'/);
 assert.match(css,/-webkit-line-clamp:1/);
 assert.match(css,/\.game \.action-bar\{min-height:37px;max-height:39px;height:39px/);
 for(const key of ['powerUseHint','godRoster','powersHelpBtn'])assert.ok(ui.includes(key));
});

test('AUDIT-006 Aphrodite + Hermes: a valid detour returning adjacent is blocked on first step',()=>{
 const g=prepared('hermes','aphrodite');
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:3,col:2},{row:4,col:4}]];
 const moves=legalActions(g).filter(a=>a.type==='move'&&a.worker===0);
 assert.ok(moves.some(a=>a.row===2&&a.col===1),'another adjacent finish is legal');
 assert.ok(!moves.some(a=>a.row===1&&a.col===2),'first horizontal detour is disallowed');
 // A Hermes sequence 2,2 → 1,2 → 2,1 stays level 0 and ends beside Aphrodite at 3,2.
 assert.match(src,/!\['artemis','triton'\]\.includes\(power\)/);
});
test('AUDIT-007 Persephone + Triton: first edge step before an available climb is not offered',()=>{
 const g=prepared('triton','persephone');
 g.workers=[[{row:1,col:2},{row:4,col:0}],[{row:4,col:4},{row:3,col:4}]];
 g.board[1][3]=1;
 const moves=legalActions(g).filter(a=>a.type==='move'&&a.worker===0);
 assert.ok(moves.some(a=>a.row===1&&a.col===3),'direct legal ascent is offered');
 assert.ok(!moves.some(a=>a.row===0&&a.col===2),'perimeter intermediate step missing');
 // Triton may first enter perimeter 0,2, then climb to 1,3 in the same turn.
 assert.match(src,/if\(ascents\.length\)return ascents/);
});
