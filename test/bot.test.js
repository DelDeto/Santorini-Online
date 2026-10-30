import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyAction,legalMoves,legalBuilds} from '../src/game.js';
import {chooseBotAction} from '../src/bot.js';

function createBotReady(){
  const g=newGame();
  for(const [player,row,col] of [[0,0,0],[0,0,1]])applyAction(g,player,{type:'place',row,col});
  return g;
}
test('Bot legally places two workers',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const g=createBotReady();
    for(let i=0;i<2;i++){
      const action=chooseBotAction(g,difficulty);
      assert.equal(action.type,'place');applyAction(g,1,action);
    }
    assert.equal(g.workers[1].length,2);assert.equal(g.phase,'move');assert.equal(g.turn,0);
  }
});
test('Bot can move and build without illegal actions',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const g=createBotReady();for(let i=0;i<2;i++)applyAction(g,1,chooseBotAction(g,difficulty));
    const human=legalMoves(g,0,0)[0];
    applyAction(g,0,{type:'move',worker:0,...human});
    const build=legalBuilds(g,g.workers[0][g.selected])[0];
    applyAction(g,0,{type:'build',...build});
    if(g.winner!==null)continue;
    let actions=0;
    while(g.turn===1&&g.winner===null&&actions<2){
      const bot=chooseBotAction(g,difficulty);
      assert.ok(bot);applyAction(g,1,bot);actions++;
    }
    assert.ok(g.winner!==null||g.turn===0);assert.ok(actions>=1);
  }
});
test('Bot prioritizes winning movement',()=>{
  const g=createBotReady();applyAction(g,1,{type:'place',row:4,col:4});applyAction(g,1,{type:'place',row:3,col:3});
  g.turn=1;g.phase='move';g.board[3][3]=2;g.board[2][2]=3;
  for(const difficulty of ['normal','hard']){
    const bot=chooseBotAction(g,difficulty);assert.equal(bot.type,'move');
    const projected=structuredClone(g);applyAction(projected,1,bot);assert.equal(projected.winner,1);
  }
});
