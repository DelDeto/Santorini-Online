import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const board=readFileSync('public/board3d.js','utf8');
const premium=readFileSync('public/premium3d.js','utf8');
const ui=readFileSync('public/index.html','utf8');
const app=readFileSync('public/app.js','utf8');
const css=readFileSync('public/style.css','utf8');

test('Premium scene is integrated with the 3D board and has a clean lifecycle',()=>{
  assert.match(board,/createPremiumEnvironment/);
  assert.match(board,/premium\.update\(time\)/);
  assert.match(board,/premium\.render\(\)/);
  assert.match(board,/premium\.resize\(w,h\)/);
  assert.match(board,/premium\.dispose\(\)/);
  assert.match(board,/premium\.setLighting\(mode\)/);
  assert.match(board,/premium\.setQuality\(mode\)/);
});

test('Visual materials, foam, sky and the 3D quality budget are represented',()=>{
  for(const name of ['EffectComposer','UnrealBloomPass','RenderPass','OutputPass','setQuality','setLighting','skyMaterial','rim','mobile','powerSave']){
    assert.ok(premium.includes(name),name+' must appear in 3D environment');
  }
  assert.match(board,/surfaceTexture\('plaster'\)/);
  assert.match(board,/surfaceTexture\('rock'\)/);
  assert.match(board,/caustic/);
  assert.match(board,/glint/);
  assert.match(board,/contact-shadow/);
  assert.match(board,/cameraTransition/);
});

test('User can change graphics and lighting without leaving the game',()=>{
  for(const id of ['qualityBtn','lightingBtn']){
    assert.match(ui,new RegExp('id="'+id+'"'));
    assert.match(app,new RegExp("\\$\\('"+id+"'\\)"));
  }
  assert.match(css,/#qualityBtn/);
  assert.match(css,/max-width:650px/);
  assert.match(app,/santorini-quality/);
  assert.match(app,/santorini-lighting/);
  assert.match(ui,/V0\.9/);
});
