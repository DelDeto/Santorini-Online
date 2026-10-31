import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GODS,SIMPLE_GODS,ADVANCED_GODS,HEROES,newGame,legalActions,applyAction,resetGame} from '../src/game.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const page=read('../public/index.html'),ui=read('../public/app.js'),
 css=read('../public/style.css'),server=read('../src/index.js');

test('V2.6: separate mode-specific God pools with exact 10/20 selection',()=>{
 assert.equal(SIMPLE_GODS.length,10);
 assert.equal(Object.keys(ADVANCED_GODS).length,20);
 for(const [mode,expected,pool] of [
  ['basic',10,new Set(SIMPLE_GODS)],
  ['advanced',20,new Set(Object.keys(ADVANCED_GODS))]
 ]){
  const g=newGame('god',2,mode);
  assert.equal(g.modeId,mode);assert.equal(g.phase,'godpick');
  const actions=legalActions(g);
  assert.equal(actions.length,expected,mode);
  assert.ok(actions.every(a=>a.type==='selectGod'&&pool.has(a.god)),mode);
  const forbidden=mode==='basic'?'poseidon':'apollo';
  assert.ok(!actions.some(a=>a.god===forbidden));
  assert.throws(()=>applyAction(g,0,{type:'selectGod',god:forbidden}),/không hợp lệ/i);
  applyAction(g,0,actions[0]);
  assert.equal(g.turn,1);
  assert.equal(legalActions(g).length,expected-1,'unique selection '+mode);
  const second=legalActions(g)[0];applyAction(g,1,second);
  assert.equal(g.phase,'place');
  assert.equal(new Set(g.gods).size,2);
  const reset=resetGame(g);
  assert.equal(reset.modeId,mode);assert.equal(reset.phase,'godpick');
  assert.equal(legalActions(reset).length,expected);
 }
});
test('V2.6: the old 30-God duel, Agora, Fleece, and Hero variants remain compatible',()=>{
 assert.equal(legalActions(newGame('god',2,'duel')).length,30);
 assert.equal(legalActions(newGame('god',2,'agora')).length,10);
 assert.equal(legalActions(newGame('god',2,'fleece')).length,10);
 assert.equal(legalActions(newGame('god',2,'heroes')).length,Object.keys(HEROES).length);
 assert.equal(Object.keys(GODS).length,30);
});
test('V2.6: starter explicitly displays new modes before BOT and multiplayer buttons',()=>{
 for(const id of ['basic','advanced']){
  const i=page.indexOf('data-mode="'+id+'"');
  assert.ok(i>=0&&i<page.indexOf('id="demoBtn"'));
  assert.ok(i<page.indexOf('id="createBtn"'));
  assert.ok(server.includes(' '+id+':{capacity:2,ruleset:'));
  assert.ok(ui.includes(' '+id+':{n:2,god:true'));
 }
 assert.ok(!page.includes('data-mode="duel"'),'legacy all-30 mode should not replace new choices');
 assert.match(ui,/selectMode\('basic'\)/);
});
test('V2.6: card descriptions are full-length with separate details and Choose buttons',()=>{
 for(const id of ['godDetailOverlay','godDetailName','godDetailDescription','godDetailHow','godDetailTip','godDetailPick','godDetailClose','godPickLead','godFilter']){
  assert.ok(page.includes('id="'+id+'"'),id);
 }
 assert.match(ui,/info\.description/);
 assert.match(ui,/guide\?\.how/);
 assert.match(ui,/class="god-card-desc"/);
 assert.match(ui,/data-god-info=/);
 assert.match(ui,/data-god=/);
 assert.match(ui,/function openGodDetail\(id\)/);
 assert.match(ui,/getActions\('selectGod'\)\.some/);
 assert.match(css,/grid-auto-rows:max-content/);
 assert.match(css,/\.god-cards \.god-card-desc\{display:block;white-space:normal;overflow:visible/);
 assert.match(css,/\.god-detail-scroll\{overflow-y:auto/);
 assert.match(css,/\.god-detail-overlay\.hidden\{display:none!important\}/);
});
test('V2.6: mode picker only offers cards belonging to its mode, not other disabled groups',()=>{
 assert.match(ui,/const mode=g\.modeId,hero=mode==='heroes',simple=mode==='basic'/);
 assert.match(ui,/advancedOnly=mode==='advanced'/);
 assert.match(ui,/simple\?!info\.players/);
 assert.match(ui,/advancedOnly\?!!info\.players/);
 assert.match(ui,/\$\('godFilter'\)\.classList\.toggle\('hidden',!mixed\)/);
});
