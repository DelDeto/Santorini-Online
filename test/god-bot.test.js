import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,GODS,legalActions,applyAction} from '../src/game.js';
import {chooseBotAction} from '../src/bot.js';
function godTrial(power,difficulty){
 const g=newGame('god');
 g.gods=[power==='atlas'?'apollo':'atlas',power];
 g.phase='move';g.turn=1;
 g.workers=[[{row:0,col:0},{row:0,col:1}],[{row:2,col:2},{row:4,col:4}]];
 let botActions=0;
 for(let tick=0;tick<35&&g.phase!=='ended';tick++){
  const p=g.turn;
  const act=p===1?chooseBotAction(g,difficulty):legalActions(g,p)[0];
  assert.ok(act,power+': '+difficulty+', player '+p+', phase '+g.phase+' has no action');
  const valid=legalActions(g,p);
  assert.ok(valid.some(x=>x.type===act.type&&(!('worker'in x)||x.worker===act.worker)&&(!('row'in x)||x.row===act.row)&&(!('col'in x)||x.col===act.col)&&(!('god'in x)||x.god===act.god)&&(!('dome'in x)||!!x.dome===!!act.dome)),power+': bot must select a server-authorized action');
  assert.doesNotThrow(()=>applyAction(g,p,act),power+': legal action must execute');
  if(p===1)botActions++;
 }
 assert.ok(botActions>0);
}
for(const power of Object.keys(GODS)){
 test('God BOT '+power+' can execute multi-phase actions',()=>godTrial(power,'normal'));
}
test('God BOT can draft a unique God Power',()=>{
 const g=newGame('god');g.gods[0]='apollo';g.turn=1;
 const act=chooseBotAction(g,'hard');
 assert.equal(act.type,'selectGod');
 assert.notEqual(act.god,'apollo');
 applyAction(g,1,act);
 assert.equal(g.phase,'place');
});
