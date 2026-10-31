import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GODS,HEROES,newGame,legalActions,applyAction,beginAdvancedTurn} from '../src/game.js';
import {OPTIONAL_PHASES,turnDecision} from '../public/turn-decision.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../public/index.html'),ui=read('../public/app.js'),css=read('../public/style.css');
function prepared(id='poseidon',mode='duel'){
 const g=newGame('god',2,mode);g.turn=0;g.phase='move';
 g.gods=[id,id==='apollo'?'artemis':'apollo'];
 g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:3,col:3},{row:4,col:4}]];
 g.ctx={};return g;
}
function firstBuild(g){
 g.phase='build';g.selected=0;g.ctx={lastMoved:0};
 applyAction(g,0,{type:'build',row:2,col:3});
 return g;
}
test('Poseidon may finish optional builds after zero, one or two additional blocks',()=>{
 for(let count=0;count<=2;count++){
  const g=firstBuild(prepared());
  assert.equal(g.phase,'poseidonBuild');
  for(let i=0;i<count;i++){
   const opts=legalActions(g,0);
   assert.ok(opts.some(a=>a.type==='skip'),'skip remains legal at '+i+' builds');
   const action=opts.find(a=>a.type==='build'&&a.row===0&&a.col===1);
   assert.ok(action,'second Worker may build at 0,1');
   applyAction(g,0,action);
  }
  const opts=legalActions(g,0);
  const d=turnDecision(g,opts);
  assert.ok(d.canSkip,'UI must show finish after '+count+' bonus builds');
  assert.equal(d.bonusUsed,count);
  assert.match(d.skipLabel,/Dừng xây thêm/);
  applyAction(g,0,{type:'skip'});
  assert.equal(g.turn,1);assert.equal(g.phase,'move');
  assert.match(g.lastAction,/Poseidon kết thúc xây thêm/);
 }
});
test('Poseidon automatically ends after the third extra build',()=>{
 const g=firstBuild(prepared());
 for(let i=0;i<3;i++){
  assert.equal(g.ctx.bonusRemaining,3-i);
  applyAction(g,0,{type:'build',row:0,col:1});
 }
 assert.equal(g.board[0][1],3);
 assert.equal(g.turn,1);assert.equal(g.phase,'move');
});
test('All optional-power phases expose a server Skip and a matching UI button',()=>{
 const phases={
  extraMove:'artemis',extraBuild:'demeter',tritonMove:'triton',
  heroSprint:'atalanta',poseidonBuild:'poseidon',morpheusBuild:'morpheus',
  aresRemove:'ares',dionysusChoice:'dionysus',
  heroPost:'heracles',heroCorner:'odysseus',heroDomes:'heracles',heroMedea:'medea'
 };
 assert.deepEqual(Object.keys(OPTIONAL_PHASES).sort(),Object.keys(phases).sort());
 for(const [phase,id] of Object.entries(phases)){
  const hero=phase.startsWith('hero');
  const g=prepared(id,hero?'heroes':'duel');
  g.phase=phase;g.selected=0;g.ctx={lastMoved:0,bonusRemaining:2,firstBuild:{row:2,col:3}};
  g.advanced.morpheus[0]=2;
  const allowed=legalActions(g,0);
  assert.ok(allowed.some(a=>a.type==='skip'),'missing server skip '+phase);
  const decision=turnDecision(g,allowed);
  assert.equal(decision.canSkip,true,'missing UI skip '+phase);
  assert.ok(decision.skipLabel.length>2);
 }
});
test('Morpheus can build a dome using stored blocks, or skip all bonus builds',()=>{
 const g=prepared('morpheus');g.phase='morpheusBuild';g.selected=0;
 g.advanced.morpheus[0]=2;
 const actions=legalActions(g);
 assert.ok(actions.some(a=>a.type==='skip'));
 const dome=actions.find(a=>a.type==='build'&&a.dome&&a.row===2&&a.col===3);
 assert.ok(dome,'dome exchange must be offered to Morpheus');
 applyAction(g,0,dome);
 assert.equal(g.board[2][3],4);
 assert.equal(g.advanced.morpheus[0],1);
 assert.ok(legalActions(g).some(a=>a.type==='skip'));
 applyAction(g,0,{type:'skip'});
 assert.equal(g.turn,1);
});
test('Hermes can end repeated movement to build with either Worker',()=>{
 const g=prepared('hermes');g.phase='hermesMove';
 const ends=legalActions(g).filter(a=>a.type==='endMove');
 assert.ok(ends.some(a=>a.worker===0));
 assert.ok(ends.some(a=>a.worker===1));
 assert.match(ui,/openHeroChoices\('endMove'\)/);
 assert.match(ui,/getActions\('endMove'\)\.length>0/);
});
test('Dionysus sees both an optional Skip and an explicit target action',()=>{
 const g=prepared('dionysus');g.phase='dionysusChoice';
 const options=legalActions(g);
 assert.ok(options.some(a=>a.type==='skip'));
 assert.ok(options.some(a=>a.type==='commandeer'));
 assert.match(html,/id="specialBtn"/);
 assert.match(ui,/openHeroChoices\('commandeer'\)/);
});
test('Critical optional decisions are outside clipped, horizontally scrolling power buttons',()=>{
 const bar=html.split('<div class="action-bar">')[1].split('<div class="game-bottom">')[0];
 assert.ok(bar);
 const strip=bar.split('<div class="power-actions">')[1].split('</div>')[0];
 assert.doesNotMatch(strip,/id="skipBtn"|id="endMoveBtn"|id="specialBtn"/);
 assert.match(bar,/id="turnDecision"/);
 assert.match(bar,/id="skipBtn"/);
 assert.match(css,/\.turn-decision\.hidden\{display:none!important\}/);
 assert.match(css,/\.turn-decision \.decision-skip/);
 assert.match(ui,/turnDecision\(g,turn\?actions\(\):\[\]\)/);
});
test('Every supported God/Hero has a visible guide and legal engine turn',()=>{
 const powers=[...Object.keys(GODS),...Object.keys(HEROES)];
 assert.equal(Object.keys(GODS).length,30);
 assert.equal(Object.keys(HEROES).length,10);
 for(const id of powers){
  assert.ok(ui.includes(id+':{'),'guide missing for '+id);
  const hero=Object.hasOwn(HEROES,id);
  const g=prepared(id,hero?'heroes':'duel');
  if(hero)g.gods[1]=id==='adonis'?'achilles':'adonis';
  beginAdvancedTurn(g,0);
  const allowed=legalActions(g,0);
  assert.ok(allowed.length>0,'no legal start action for '+id);
  assert.doesNotThrow(()=>applyAction(g,0,allowed[0]),'engine action failed '+id);
 }
});
