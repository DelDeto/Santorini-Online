import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/game.js';
import {recordReplay,soloCheckpoint,canUndoSolo,undoSolo} from '../src/replay.js';
function room(){
 return {mode:'bot',modeId:'classic',game:newGame(),activeSeat:0,athenaAura:null,
 draftIndex:0,seatGods:null,stats:{wins:[0,0],matches:0},history:[],replay:[],undo:null};
}
test('Replay captures a safe independent board snapshot',()=>{
 const r=room();
 recordReplay(r,{type:'place'},0);
 assert.equal(r.replay.length,1);
 assert.equal(r.replay[0].board.length,5);
 assert.equal('token' in r.replay[0],false);
 r.game.board[1][2]=3;
 assert.equal(r.replay[0].board[1][2],0);
});
test('Replay keeps only latest 96 frames',()=>{
 const r=room();
 for(let i=0;i<110;i++){r.game.revision=i;recordReplay(r,{type:'test'},i%2);}
 assert.equal(r.replay.length,96);
 assert.equal(r.replay[0].revision,14);
});
test('Solo undo restores server game, history and snapshots',()=>{
 const r=room();
 const checkpoint=soloCheckpoint(r,0);
 r.game.board[2][2]=2;r.game.revision=1;
 r.history.push({seat:0,description:'testing'});
 recordReplay(r,{type:'build'},0);
 checkpoint.revisionAfter=1;r.undo=checkpoint;
 assert.equal(canUndoSolo(r,0),true);
 assert.equal(undoSolo(r,0),true);
 assert.equal(r.game.board[2][2],0);
 assert.equal(r.history.length,0);assert.equal(r.replay.length,0);
 assert.equal(canUndoSolo(r,0),false);
});
test('Online rooms and obsolete revisions cannot undo',()=>{
 const r=room(),s=soloCheckpoint(r,0);
 s.revisionAfter=1;r.undo=s;
 assert.equal(canUndoSolo(r,0),false);
 r.game.revision=1;r.mode='online';
 assert.equal(canUndoSolo(r,0),false);
});
