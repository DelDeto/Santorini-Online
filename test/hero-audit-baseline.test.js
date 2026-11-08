
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,legalActions,applyAction,canTakeTurn,HEROES} from '../src/game.js';
import {readFileSync} from 'node:fs';

function setup(hero){
 const g=newGame('god',2,'heroes');
 g.phase='move';g.turn=0;g.gods=[hero,'achilles'];
 g.workers=[[{row:1,col:1},{row:3,col:3}],[{row:0,col:4},{row:4,col:0}]];
 g.ctx={};return g;
}
function surround(g,keep=[]){
 const reserved=new Set(keep.map(w=>w.row+','+w.col));
 for(const w of g.workers[0])for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
  const r=w.row+dr,c=w.col+dc;
  if((dr||dc)&&r>=0&&r<5&&c>=0&&c<5&&!reserved.has(r+','+c))g.board[r][c]=4;
 }
}
test('AUDIT baseline: exactly ten 2-player Golden Fleece Hero cards',()=>{
 assert.deepEqual(Object.keys(HEROES).sort(),
 ['achilles','adonis','atalanta','bellerophon','heracles','jason','medea','odysseus','polyphemus','theseus'].sort());
 assert.equal(legalActions(newGame('god',2,'heroes')).filter(a=>a.type==='selectGod').length,10);
});
test('AUDIT-H001: Jason has a legal rescue deployment but engine turn-viability reports false',()=>{
 const g=setup('jason');surround(g);
 const actions=legalActions(g);
 assert.ok(!actions.some(a=>a.type==='move'));
 const deploy=actions.find(a=>a.type==='heroDeploy'&&a.row===0&&a.col===3);
 assert.ok(deploy,'Jason can place a third worker on a ground edge then build');
 assert.equal(canTakeTurn(g,0),false,'existing check skips Jason alternative action');
 applyAction(g,0,deploy);
 assert.equal(g.phase,'build');assert.equal(g.workers[0].length,3);
 assert.ok(legalActions(g).some(a=>a.type==='build'));
});
test('AUDIT-H002: Odysseus can unblock a move but turn-viability ignores the corner force',()=>{
 const g=setup('odysseus');g.workers[1][0]={row:1,col:2};
 surround(g,[{row:1,col:2}]);
 const actions=legalActions(g);
 assert.ok(!actions.some(a=>a.type==='move'));
 const force=actions.find(a=>a.type==='heroCorner'&&a.worker===0&&a.row===0&&a.col===4);
 assert.ok(force,'force the blocking enemy Worker to a corner');
 assert.equal(canTakeTurn(g,0),false,'existing checker skips Hero corner action');
 applyAction(g,0,force);
 applyAction(g,0,{type:'skip'});
 assert.equal(g.phase,'move');
 assert.ok(legalActions(g).some(a=>a.type==='move'&&a.row===1&&a.col===2));
});
test('AUDIT UX: all Hero guides present, no targeted Adonis reminder and active use is marked spent',()=>{
 const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const game=readFileSync(new URL('../src/game.js',import.meta.url),'utf8');
 for(const id of Object.keys(HEROES))assert.ok(ui.includes(' '+id+':{'),'missing Hero guide '+id);
 assert.match(ui,/Hero Power đã sử dụng trong ván này/);
 assert.match(game,/id==='atalanta'/);
 assert.ok(!ui.includes('g.heroMark?.target===S.seat'), 'no targeted-Adonis in-turn status');
});
