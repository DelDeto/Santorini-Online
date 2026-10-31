import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/index.html','utf8'),app=readFileSync('public/app.js','utf8'),css=readFileSync('public/style.css','utf8');
test('V2.6: eight distinct selectable modes appear before online and bot actions',()=>{
 const indices=['classic','basic','advanced','trio','teams','agora','fleece','heroes'].map(name=>html.indexOf('data-mode="'+name+'"'));
 assert.ok(indices.every(i=>i>0));
 assert.ok(Math.max(...indices)<html.indexOf('id="botCountSelect"'));
 assert.ok(Math.max(...indices)<html.indexOf('id="createBtn"'));
 assert.match(html,/id="modeGrid"/);
 assert.match(html,/id="modeDescription"/);
});
test('V1.4: variant follows WebSocket and share URL, reconnect preserves room mode',()=>{
 for(const token of ["url.searchParams.set('variant',S.variant)","variant=+","encodeURIComponent(S.variant)","S.view.modeId||S.variant","function selectMode(id)"]){
  assert.ok(app.includes(token)||token==='variant=+'&&app.includes("'&variant='"),token);
 }
 assert.match(app,/MODE_UI\[chosenMode\]/);
});
test('V1.4: Golden Fleece shared power and ram placement are visible in gameplay',()=>{
 for(const fragment of ["fleecePick","ramPlace","placeRam","ramMarker2d","ram-token","g.ram"]){
  assert.ok(app.includes(fragment)||html.includes(fragment),fragment);
 }
 assert.ok(html.includes('id="modeLive"'));
});
test('V1.4: responsive gameplay uses viewport height, expanded board and compact HUD',()=>{
 for(const key of ['100dvh','max-width:1800px','min-height:0','mode-grid','game .action-bar','game .game-bottom','board-stage']){
  assert.ok(css.includes(key),key);
 }
 assert.ok(css.includes('body:has(#game:not(.hidden))'));
 assert.ok(css.includes('overflow-x:auto'));
 assert.match(html,/V2\.6/);
});
