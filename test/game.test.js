import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyAction,legalMoves,canTakeTurn,resetGame} from '../src/game.js';
const place=(g,p,row,col)=>applyAction(g,p,{type:'place',row,col});
function ready(){const g=newGame();place(g,0,0,0);place(g,0,0,1);place(g,1,4,4);place(g,1,4,3);return g;}
test('place two each',()=>{const g=ready();assert.equal(g.phase,'move');assert.equal(g.turn,0);});
test('cannot overlap',()=>{const g=newGame();place(g,0,0,0);assert.throws(()=>place(g,0,0,0));});
test('cannot jump two levels',()=>{const g=ready();g.board[1][0]=2;assert.ok(!legalMoves(g,0,0).some(x=>x.row===1&&x.col===0));});
test('move and build rotate turns',()=>{const g=ready();applyAction(g,0,{type:'move',worker:0,row:1,col:0});applyAction(g,0,{type:'build',row:0,col:0});assert.equal(g.board[0][0],1);assert.equal(g.turn,1);});
test('win at level three',()=>{const g=ready();g.board[0][0]=2;g.board[1][0]=3;applyAction(g,0,{type:'move',worker:0,row:1,col:0});assert.equal(g.winner,0);});
test('dome blocks movement',()=>{const g=ready();g.board[1][0]=4;assert.ok(!legalMoves(g,0,0).some(x=>x.row===1&&x.col===0));});
test('cannot build under worker',()=>{const g=ready();applyAction(g,0,{type:'move',worker:0,row:1,col:0});assert.throws(()=>applyAction(g,0,{type:'build',row:0,col:1}));});
test('immobile opponent loses',()=>{const g=ready();for(const [r,c] of [[3,3],[3,4],[3,2],[4,2]])g.board[r][c]=4;assert.equal(canTakeTurn(g,1),false);applyAction(g,0,{type:'move',worker:0,row:1,col:0});applyAction(g,0,{type:'build',row:0,col:0});assert.equal(g.winner,0);});
test('reset changes revision',()=>{const g=ready(),h=resetGame(g);assert.equal(h.workers[0].length,0);assert.equal(h.revision,g.revision+1);});
test('cannot move where no follow-up build',()=>{const g=ready();for(const [r,c] of [[1,0],[1,1],[1,2],[0,2]])g.board[r][c]=4;assert.equal(legalMoves(g,0,1).length,0);});
