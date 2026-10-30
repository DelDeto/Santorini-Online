import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page=readFileSync('public/index.html','utf8');
const app=readFileSync('public/app.js','utf8');
const css=readFileSync('public/style.css','utf8');

test('Solo bot and multiplayer modes have live UI controls',()=>{
  for(const id of ['demoBtn','difficultySelect','createBtn','joinBtn','board','phaseLabel','gameMode','phaseChip','restartBtn','winOverlay','copyBtn']){
    assert.match(page,new RegExp('id="'+id+'"'));
    assert.match(app,new RegExp("\\$\\('"+id+"'\\)"));
  }
});
test('Favicon, share metadata and PNG assets are present',()=>{
  assert.match(page,/rel="icon"/);
  assert.match(page,/property="og:image"/);
  assert.match(page,/name="twitter:card"/);
  assert.match(page,/width.*1200/);
  const img=readFileSync('public/og.png');
  assert.equal(img.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(img.readUInt32BE(16),1200);
  assert.equal(img.readUInt32BE(20),630);
  const icon=readFileSync('public/icon-192.png');
  assert.equal(icon.readUInt32BE(16),192);
  assert.equal(icon.readUInt32BE(20),192);
});
test('Game board has one-screen adaptive layout and reduced-motion fallback',()=>{
  assert.match(css,/100cqh/);
  assert.match(css,/max-height:calc\(100dvh/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/new-arrival/);
  assert.match(css,/new-build/);
});
