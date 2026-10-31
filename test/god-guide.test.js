import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GODS,legalActions,newGame,applyAction} from '../src/game.js';

const app=readFileSync('public/app.js','utf8'),html=readFileSync('public/index.html','utf8'),style=readFileSync('public/style.css','utf8');
test('V1.1: all thirty God Powers have actionable Vietnamese gameplay instructions',()=>{
 for(const [id,info] of Object.entries(GODS)){
  assert.ok(app.includes(' '+id+':{'),'The '+info.name+' guide must exist');
  assert.ok(app.includes('Cách thực hiện:'));
 }
});
test('V1.1: power HUD and help modal retain responsive one-screen layout',()=>{
 for(const id of ['godRoster','powerOwner','powerActiveName','powerUseHint','powersHelpBtn','powersOverlay','powersCards','powersCloseBtn']){
  assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(app,/seatGod\(v,seat\)/);
 assert.match(app,/v\.capacity===4\?v\.seatGods/);
 assert.match(style,/powers-cards/);
 assert.match(style,/power-center/);
});
test('V1.1: Prometheus prebuild returns to move selection without requiring a reload',()=>{
 assert.match(app,/if\(\['prebuild','heroPrebuild'\]\.includes\(action\.type\)\)\{S\.selected=action\.worker;S\.powerMode='move';\}/);
 assert.match(app,/if\(S\.view\.game\.ctx\?\.prometheusUsed\|\|S\.view\.game\.ctx\?\.heroActivated\)S\.powerMode='move'/);
 const g=newGame('god');
 g.phase='move';g.gods=['prometheus','apollo'];g.workers=[[{row:2,col:2},{row:0,col:0}],[{row:4,col:4},{row:4,col:3}]];
 const pre=legalActions(g).find(a=>a.type==='prebuild'&&a.worker===0);
 assert.ok(pre);
 applyAction(g,0,pre);
 assert.equal(g.phase,'move');
 assert.equal(g.ctx.prometheusUsed,true);
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.worker===0));
});
test('V1.1: explicit God action buttons and automatic passive skills are explained',()=>{
 for(const text of ['Xây trước','Đặt mái vòm','Bỏ qua','Xây ngay','Tự động','Chủ động']){
  assert.ok(app.includes(text));
 }
 assert.match(app,/powersOverlay/);
 assert.match(html,/V2\.2/);
});