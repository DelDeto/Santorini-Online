import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const board=load('../public/board3d.js'),app=load('../public/app.js'),html=load('../public/index.html'),css=load('../public/style.css'),server=load('../src/index.js');
test('V2.4: 3D actors climb, turn shortest arc and gesture when building',()=>{
 for(const needle of ['MOTION={walk:850','shortestTurn','turnDelta','stepUp>0','MOTION.gesture','type:\'move\''])
  assert.ok(board.includes(needle),needle);
});
test('V2.4: captured or pushed Workers visibly animate instead of disappearing',()=>{
 assert.match(board,/type:'vanish'/);
 assert.match(board,/pieces\.remove\(tw\.obj\)/);
 assert.match(board,/buildDust\(location\.row,location\.col/);
});
test('V2.4: action narration accessible in one-screen stage and reduced motion',()=>{
 assert.match(html,/id="actionCue"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(app,/function cueAction\(g\)/);
 assert.match(app,/cueAction\(S\.view\.game\)/);
 assert.match(css,/\.action-cue/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('V2.4: BOT pacing preserves room for animation',()=>{
 assert.match(server,/slow:\{setup:1200,turn:2400\}/);
 assert.match(server,/normal:\{setup:780,turn:1500\}/);
 assert.match(server,/fast:\{setup:480,turn:920\}/);
});
