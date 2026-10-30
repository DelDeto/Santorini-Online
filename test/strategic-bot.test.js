import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction} from '../src/game.js';
import {chooseBotAction,chooseMultiplayerBotAction} from '../src/bot.js';

const same=(x,y)=>x.type===y.type&&
 (x.worker===undefined||x.worker===y.worker)&&
 (x.row===undefined||x.row===y.row)&&
 (x.col===undefined||x.col===y.col)&&
 (x.god===undefined||x.god===y.god)&&
 (x.dome===undefined||!!x.dome===!!y.dome);

const ready=(god='classic',count=2)=>{
 const g=newGame(god,count);g.phase='move';g.turn=1;
 g.workers=[[{row:0,col:0},{row:0,col:1}],[{row:2,col:2},{row:4,col:4}]];
 g.gods=god==='god'?['apollo','atlas']:g.gods;
 if(count===3){g.workers.push([{row:4,col:0},{row:3,col:0}]);g.gods[2]='pan';}
 return g;
};

test('Hard BOT always takes an immediate standard height-3 win',()=>{
 const g=ready('classic');
 g.board[2][2]=2;g.board[2][3]=3;
 const action=chooseBotAction(g,'hard');
 assert.equal(action.type,'move');assert.equal(action.row,2);assert.equal(action.col,3);
 applyAction(g,1,action);
 assert.equal(g.winner,1);
});
test('Hard BOT Pan takes immediate two-floor descending win',()=>{
 const g=ready('god');g.gods[1]='pan';
 g.board[2][2]=2;
 const action=chooseBotAction(g,'hard');
 assert.equal(action.type,'move');
 assert.equal(g.board[action.row][action.col],0);
 applyAction(g,1,action);
 assert.equal(g.winner,1);
});
test('Hard BOT Atlas domes enemy winning tower when it can',()=>{
 const g=ready('god');g.gods=['apollo','atlas'];g.phase='build';g.selected=0;
 g.board[0][0]=2;g.board[1][1]=3;
 // Move the worker close enough to dome the only dangerous tower.
 g.workers[1][0]={row:2,col:1};
 const opts=legalActions(g,1);assert.ok(opts.some(a=>a.type==='build'&&a.dome&&a.row===1&&a.col===1));
 const action=chooseBotAction(g,'hard');
 assert.equal(action.type,'build');
 assert.equal(action.row,1);assert.equal(action.col,1);
 assert.equal(action.dome,true);
});
test('Hard BOT does not hand opponent an immediate third-floor win',()=>{
 const g=ready('classic');g.phase='build';g.selected=0;
 g.workers[0][0]={row:2,col:3};g.board[2][3]=2;
 g.workers[1][0]={row:3,col:3};
 g.board[3][2]=2;
 const possible=legalActions(g,1);
 assert.ok(possible.some(a=>a.type==='build'&&a.row===3&&a.col===2));
 assert.ok(possible.length>=2);
 const choice=chooseBotAction(g,'hard');
 // Building level 3 adjacent to enemy on level 2 would give the enemy the game.
 assert.ok(!(choice.row===3&&choice.col===2),'BOT should avoid giving opponent a winning move');
});
test('Three-player FFA BOT sees and prevents the next player winning immediately',()=>{
 const g=ready('god',3);g.gods=['apollo','atlas','pan'];
 g.workers[0][0]={row:0,col:4};g.workers[2][0]={row:2,col:3};
 g.board[2][3]=2;g.board[2][4]=3;
 g.phase='build';g.selected=0;g.workers[1][0]={row:3,col:4};
 const candidates=legalActions(g,1);
 assert.ok(candidates.some(a=>a.type==='build'&&a.dome&&a.row===2&&a.col===4));
 const action=chooseMultiplayerBotAction(g,'hard',1,candidates);
 // Player 2 may act after player 1, so a dome on level 3 is a strong defense.
 assert.equal(action.row,2);assert.equal(action.col,4);assert.equal(action.dome,true);
});
test('Hard BOT handles Hermes late-phase safely without looping',()=>{
 const g=ready('god');g.gods[1]='hermes';
 g.phase='hermesMove';g.ctx={hermesStarted:true,hermesSteps:4};
 const start=Date.now();const action=chooseBotAction(g,'hard');
 assert.ok(action);
 assert.ok(legalActions(g,1).some(a=>same(a,action)));
 assert.equal(action.type,'endMove');
 assert.ok(Date.now()-start<6000);
});
test('Full-turn strategic decisions are server legal across all three difficulties',()=>{
 const g=ready('god');g.gods[1]='artemis';
 for(const level of ['easy','normal','hard']){
  const moves=legalActions(g,1),a=chooseBotAction(g,level);
  assert.ok(a&&moves.some(x=>same(x,a)),level);
  const n=structuredClone(g);applyAction(n,1,a);
  if(n.turn===1){
   const follow=chooseBotAction(n,level);
   assert.ok(follow&&legalActions(n,1).some(x=>same(x,follow)),level+' follow');
  }
 }
});
