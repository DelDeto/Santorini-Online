// Santorini Online 0.3: authoritative, deterministic two-player turn engine.
export const GODS={
 apollo:{name:'Apollo',description:'Đổi vị trí với quân đối thủ khi di chuyển.'},
 artemis:{name:'Artemis',description:'Có thể di chuyển lần thứ hai, không quay lại ô ban đầu.'},
 athena:{name:'Athena',description:'Khi bạn đi lên tầng, lượt sau đối thủ không được đi lên.'},
 atlas:{name:'Atlas',description:'Có thể xây mái vòm trên bất kỳ tầng nào.'},
 demeter:{name:'Demeter',description:'Có thể xây thêm một lần ở ô khác.'},
 hephaestus:{name:'Hephaestus',description:'Có thể xây thêm một khối trên cùng ô, nhưng không phải mái vòm.'},
 hermes:{name:'Hermes',description:'Có thể di chuyển nhiều lần trên cùng độ cao, hoặc không đi, rồi chọn một quân để xây.'},
 minotaur:{name:'Minotaur',description:'Đẩy quân đối thủ lùi một ô khi di chuyển vào ô đó.'},
 pan:{name:'Pan',description:'Thắng khi di chuyển xuống ít nhất hai tầng.'},
 prometheus:{name:'Prometheus',description:'Có thể xây trước rồi đi, nhưng sau đó không được đi lên.'}
};
export const SIMPLE_GODS=['apollo','artemis','athena','atlas','demeter','hephaestus','hermes','minotaur','pan','prometheus'];
export const ADVANCED_GODS={
 aphrodite:{name:'Aphrodite',players:[2,4],description:'Nếu quân đối thủ bắt đầu lượt cạnh quân của bạn, nước di chuyển cuối phải kết thúc cạnh quân của bạn.'},
 ares:{name:'Ares',players:[2,3,4],description:'Cuối lượt, có thể gỡ một khối (không phải mái vòm) cạnh quân không di chuyển.'},
 bia:{name:'Bia',players:[2,3,4],description:'Khi di chuyển, loại quân đối thủ đứng ngay sau ô bạn đến theo hướng đi.'},
 chaos:{name:'Chaos',players:[2,3,4],description:'Nhận một thần cơ bản ngẫu nhiên chưa được chọn; đổi thần sau lượt có xây mái vòm.'},
 charon:{name:'Charon',players:[2,3,4],description:'Trước khi di chuyển, có thể đẩy một quân đối thủ đứng cạnh sang ô đối diện qua quân bạn.'},
 chronus:{name:'Chronus',players:[2],description:'Thắng ngay khi trên bàn có ít nhất năm tòa tháp hoàn chỉnh.'},
 circe:{name:'Circe',players:[2],banned:['eros'],description:'Đầu lượt, nếu hai quân đối phương không đứng cạnh nhau, mượn năng lực của họ và vô hiệu hóa năng lực của họ.'},
 dionysus:{name:'Dionysus',players:[2,3,4],description:'Khi hoàn thành tòa tháp bằng mái vòm, có thể chơi thêm một lượt bằng quân đối thủ; không thắng trong lượt phụ.'},
 eros:{name:'Eros',players:[2,3,4],banned:['circe'],description:'Đặt quân ở hai cạnh đối diện; thắng thêm khi di chuyển hai quân đứng kề nhau cùng tầng hợp lệ.'},
 hera:{name:'Hera',players:[2,3,4],description:'Đối thủ không thể giành chiến thắng khi di chuyển đến ô viền ngoài bàn.'},
 hestia:{name:'Hestia',players:[2,3,4],description:'Có thể xây thêm một lần, nhưng không được xây ở ô viền ngoài.'},
 hypnus:{name:'Hypnus',players:[2,3,4],description:'Quân đối thủ cao hơn tất cả quân khác của họ không được di chuyển.'},
 limus:{name:'Limus',players:[2,3,4],description:'Đối thủ không thể xây sát quân của bạn, trừ khi xây mái vòm hoàn chỉnh.'},
 medusa:{name:'Medusa',players:[2,3,4],description:'Cuối lượt, quân đối thủ đứng cạnh quân bạn và ở tầng thấp hơn sẽ bị hóa đá thành công trình.'},
 morpheus:{name:'Morpheus',players:[2,3,4],description:'Đầu lượt nhận một khối xây dự trữ; sau khi đi có thể dùng dự trữ để xây nhiều lần hoặc không xây.'},
 persephone:{name:'Persephone',players:[2,3,4],description:'Nếu có nước leo tầng hợp lệ, đối thủ bắt buộc phải di chuyển ít nhất một quân lên tầng.'},
 poseidon:{name:'Poseidon',players:[2,3,4],description:'Cuối lượt, quân không di chuyển còn ở tầng 0 có thể xây thêm tối đa ba lần.'},
 selene:{name:'Selene',players:[2,3,4],description:'Quân nữ có thể xây mái vòm ở bất kỳ tầng nào, ngay cả khi quân nam vừa di chuyển.'},
 triton:{name:'Triton',players:[2,3,4],description:'Khi quân di chuyển tới ô viền ngoài, có thể tiếp tục di chuyển.'},
 zeus:{name:'Zeus',players:[2,3,4],description:'Có thể xây một khối ngay bên dưới quân vừa di chuyển (không làm thắng do xây).'}
};
Object.assign(GODS,ADVANCED_GODS);
const isEdge=(r,c)=>r===0||r===4||c===0||c===4;
const isOppositeEdge=(a,b)=>(a.row===0&&b.row===4)||(a.row===4&&b.row===0)||(a.col===0&&b.col===4)||(a.col===4&&b.col===0);
const opponentsOf=(g,p)=>g.workers.map((_,i)=>i).filter(i=>i!==p&&!g.eliminated?.[i]);
const hasEnemyGod=(g,p,id)=>opponentsOf(g,p).some(i=>g.gods[i]===id);
const adjacentGodWorkers=(g,p,id,at)=>opponentsOf(g,p).some(i=>g.gods[i]===id&&g.workers[i].some(w=>near(w,at)));
function activePower(g,p){
 if(g.modeId==='fleece')return g.ctx?.fleeceActive===p?g.fleeceGod:null;
 if(g.advanced?.circe?.target===p)return null;
 if(g.advanced?.circe?.owner===p)return g.advanced.circe.power;
 if(g.gods[p]==='chaos')return g.advanced?.chaos?.[p]?.current??null;
 return g.ruleset==='god'?g.gods[p]:null;
}
function restrictedByAphrodite(g,p){
 return opponentsOf(g,p).flatMap(i=>g.gods[i]==='aphrodite'?g.workers[i]:[]).some(w=>(g.ctx?.turnStart||g.workers[p]).some(x=>near(x,w)));
}
function nearAphrodite(g,p,dest){
 return opponentsOf(g,p).some(i=>g.gods[i]==='aphrodite'&&g.workers[i].some(w=>near(w,dest)));
}
export const validGodFor=(id,players,selected=[])=>{
 const info=GODS[id];if(!info||info.players&&!info.players.includes(players))return false;
 if(selected.some(other=>other===id||info.banned?.includes(other)||GODS[other]?.banned?.includes(id)))return false;
 return true;
};
export function newGame(ruleset='classic',players=2,modeId=null){
 const count=players===3?3:2;
 return {modeId:modeId||(players===3?'trio':players===4?'teams':ruleset==='god'?'gods':'classic'),fleeceGod:null,ram:null,agoraTurns:0,capacity:players,board:Array.from({length:5},()=>Array(5).fill(0)),workers:Array.from({length:count},()=>[]),phase:modeId==='fleece'?'fleecePick':ruleset==='god'?'godpick':'place',ruleset:ruleset==='god'?'god':'classic',gods:Array(count).fill(null),turn:0,selected:null,winner:null,eliminated:Array(count).fill(false),revision:0,lastAction:'Bắt đầu trận đấu.',ctx:{},athenaBlocked:null,advanced:{chaos:{},morpheus:{},circe:null,bonus:null,erasures:[]}};
}
const cell=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<5&&c>=0&&c<5;
const near=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col))===1;
const eq=(a,b)=>!!a&&!!b&&a.row===b.row&&a.col===b.col;
const pawnAt=(g,r,c)=>{for(let p=0;p<g.workers.length;p++)for(let i=0;i<g.workers[p].length;i++)if(eq(g.workers[p][i],{row:r,col:c}))return {p,i};return null;};
const free=(g,r,c)=>cell(r,c)&&g.board[r][c]!==4&&!pawnAt(g,r,c)&&!(g.ram&&g.ram.row===r&&g.ram.col===c);
const god=(g,p)=>activePower(g,p);
export function legalBuilds(g,from,p=null){if(!from)return [];const out=[];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(near(from,{row,col})&&free(g,row,col)){
  if(p!==null&&adjacentGodWorkers(g,p,'limus',{row,col})&&g.board[row][col]!==3)continue;
  out.push({row,col});
 }return out;}
function movedCopy(g,p,i,to,occupant=null){
 const workers=g.workers.map(t=>t.map(w=>({...w})));
 const from=workers[p][i];workers[p][i]={row:to.row,col:to.col};
 if(occupant)workers[occupant.p][occupant.i]=occupant.forced?{...occupant.forced}:{...from};
 return {...g,workers};
}
function legalMoveDetails(g,p,i){
 const from=g.workers[p]?.[i];if(!from||!['move','extraMove','hermesMove','tritonMove','dionysusMove'].includes(g.phase))return [];
 if(g.ctx?.fixedWorker!==undefined&&g.ctx.fixedWorker!==i)return [];
 if(['extraMove','tritonMove'].includes(g.phase)&&g.selected!==i)return [];
 if(opponentsOf(g,p).some(other=>god(g,other)==='hypnus')&&g.workers[p].length>1&&g.workers[p].every((w,j)=>j===i||g.board[w.row][w.col]<g.board[from.row][from.col]))return [];
 const power=g.phase==='dionysusMove'?null:god(g,p),before=g.board[from.row][from.col],out=[];
 for(let row=Math.max(0,from.row-1);row<=Math.min(4,from.row+1);row++)
 for(let col=Math.max(0,from.col-1);col<=Math.min(4,from.col+1);col++){
  const dest={row,col};if(!near(from,dest))continue;
  // Golden Fleece Ram is a stationary obstacle: no Worker may occupy its square.
  if(g.ram&&eq(dest,g.ram))continue;
  const h=g.board[row][col];if(h===4||h>before+1)continue;
  if(((g.workers.length===2?g.athenaBlocked===p:(g.athenaBlocked!==null&&g.athenaBlocked!==p))||g.ctx?.prometheusUsed)&&h>before)continue;
  if(g.phase==='hermesMove'&&h!==before)continue;
  if(g.phase==='extraMove'&&eq(dest,g.ctx?.origin))continue;
  if(restrictedByAphrodite(g,p)&&!nearAphrodite(g,p,dest)&&!['move'].includes(g.phase))continue;
  if(restrictedByAphrodite(g,p)&&!nearAphrodite(g,p,dest)&&g.phase==='move'&&!['artemis','triton'].includes(power))continue;
  const blocker=pawnAt(g,row,col);let special=null,forced=null;
  if(blocker){
   if(blocker.p===p)continue;
   if(power==='apollo')special='swap';
   else if(power==='minotaur'){
    const back={row:row+(row-from.row),col:col+(col-from.col)};
    if(!free(g,back.row,back.col))continue;
    special='push';forced=back;
   }else continue;
  }
  const projected=movedCopy(g,p,i,dest,blocker?{...blocker,forced}:null);
  if(power==='bia'&&!blocker){
   const forward={row:row+(row-from.row),col:col+(col-from.col)};
   const victim=cell(forward.row,forward.col)?pawnAt(projected,forward.row,forward.col):null;
   if(victim&&victim.p!==p)projected.workers[victim.p].splice(victim.i,1);
  }
  const erosWin=power==='eros'&&g.workers[p].some((w,j)=>j!==i&&near(w,dest)&&(g.workers.length===3?h===g.board[w.row][w.col]:h===1&&g.board[w.row][w.col]===1));
  const rawWins=(h===3&&before<3)||(power==='pan'&&before-h>=2)||erosWin;
  const wins=rawWins&&g.phase!=='dionysusMove'&&!(isEdge(row,col)&&hasEnemyGod(g,p,'hera'));
  // Hermes may traverse an intermediate same-level square even when it is not a final build position.
  if(!wins&&!legalBuilds(projected,dest,p).length&&!(power==='hermes'&&h===before)&&!(power==='triton'&&isEdge(row,col))&&power!=='morpheus'&&!(power==='zeus'&&h<3))continue;
  out.push({row,col,worker:i,...(special?{special}:{}),...(wins?{wins:true}:{})});
 }
 return out;
}
export function legalMoves(g,p,i){return legalMoveDetails(g,p,i).map(({row,col})=>({row,col}));}
function rawFerryActions(g,p){
 if(g.phase!=='move'||god(g,p)!=='charon'||g.ctx?.charonUsed)return [];
 const choices=[];
 for(let worker=0;worker<g.workers[p].length;worker++){
  const w=g.workers[p][worker];
  for(const enemy of opponentsOf(g,p))for(const e of g.workers[enemy]){
   if(!near(w,e))continue;
   const landing={row:w.row+(w.row-e.row),col:w.col+(w.col-e.col)};
   if(!free(g,landing.row,landing.col))continue;
   const proj=structuredClone(g),victim=pawnAt(proj,e.row,e.col);
   proj.workers[victim.p][victim.i]=landing;
   proj.ctx={charonUsed:true,fixedWorker:worker};
   if(legalMoveDetails(proj,p,worker).length)choices.push({type:'ferry',worker,row:e.row,col:e.col});
  }
 }
 return choices;
}
export function canTakeTurn(g,p){
 if(g.phase==='godpick'||g.phase==='place')return true;
 if(god(g,p)==='hermes'&&g.workers[p].some(w=>legalBuilds(g,w).length))return true;
 // Ignore temporary phase from the previous turn when evaluating the next player's mobility.
 const trial={...g,phase:'move',ctx:{}};
 return g.workers[p].some((_,i)=>legalMoves(trial,p,i).length>0);
}
function legalPrebuilds(g,p,i){
 if(god(g,p)!=='prometheus'||g.phase!=='move'||g.ctx?.prometheusUsed)return [];
 const from=g.workers[p][i];if(!from)return [];
 return legalBuilds(g,from).filter(pos=>{
   const trial={...g,board:g.board.map(row=>row.slice()),ctx:{prometheusUsed:true,fixedWorker:i}};
   trial.board[pos.row][pos.col]++;
   return legalMoves(trial,p,i).length>0;
 }).map(x=>({type:'prebuild',worker:i,...x}));
}
export function legalActions(g,p=g.turn){
 if(g.winner!==null||p!==g.turn)return [];
 if(g.phase==='fleecePick')return SIMPLE_GODS.filter(id=>validGodFor(id,2)).map(god=>({type:'selectGod',god}));
 if(g.phase==='ramPlace')return Array.from({length:5},(_,row)=>Array.from({length:5},(_,col)=>free(g,row,col)?{type:'placeRam',row,col}:null)).flat().filter(Boolean);
 if(g.phase==='godpick')return Object.keys(GODS).filter(id=>(g.modeId!=='agora'||SIMPLE_GODS.includes(id))&&validGodFor(id,g.capacity||g.workers.length,g.gods.filter(Boolean))).map(id=>({type:'selectGod',god:id}));
 if(g.phase==='place'){const out=[];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(free(g,row,col)){
  if((g.gods[p]==='eros'||g.advanced?.setupEros?.includes(p))&&(!isEdge(row,col)||(g.workers[p].length===1&&!isOppositeEdge(g.workers[p][0],{row,col}))))continue;
  out.push({type:'place',row,col});
 }
 return out;}
 if(['move','extraMove','hermesMove','tritonMove','dionysusMove'].includes(g.phase)){
   const controlled=g.phase==='dionysusMove'?g.ctx?.dionysusTarget:p;
   if(controlled===undefined)return [];
   const out=[];for(let i=0;i<g.workers[controlled].length;i++){
    out.push(...legalMoveDetails(g,controlled,i).map(x=>({type:'move',...x})));
    if(g.phase==='move')out.push(...legalPrebuilds(g,p,i));
   }
   if(g.phase==='extraMove'||g.phase==='tritonMove'){
    if(!restrictedByAphrodite(g,p)||nearAphrodite(g,p,g.workers[p][g.selected]))out.push({type:'skip'});
   }
   if(g.phase==='move')out.push(...rawFerryActions(g,p));
   if(g.phase==='move'&&hasEnemyGod(g,p,'persephone')&&!g.ctx?.upThisTurn){
    const ascents=out.filter(a=>a.type==='move'&&g.board[a.row][a.col]>g.board[g.workers[p][a.worker].row][g.workers[p][a.worker].col]);
    if(ascents.length)return ascents;
   }
   if(god(g,p)==='hermes'&&(g.phase==='hermesMove'||g.phase==='move'))
    g.workers[p].forEach((w,worker)=>{if(legalBuilds(g,w).length)out.push({type:'endMove',worker});});
   return out;
 }
 if(g.phase==='aresRemove'){
  const idx=g.ctx?.lastMoved===0?1:0,unmoved=g.workers[p][idx];
  const choices=unmoved?legalBuilds(g,unmoved).filter(pos=>g.board[pos.row][pos.col]>0&&g.board[pos.row][pos.col]<4).map(pos=>({type:'removeBlock',...pos})):[];
  return [...choices,{type:'skip'}];
 }
 if(g.phase==='dionysusChoice'){
  return [{type:'skip'},...opponentsOf(g,p).flatMap(q=>{
   const probe={...g,turn:q,phase:'move',ctx:{}};
   return g.workers[q].some((_,i)=>legalMoveDetails(probe,q,i).length)?[{type:'commandeer',target:q}]:[];
  })];
 }
 if(g.phase==='poseidonBuild'){
  const other=g.workers[p][g.ctx?.lastMoved===0?1:0];
  return other?[...legalBuilds(g,other,p).map(x=>({type:'build',...x})),{type:'skip'}]:[{type:'skip'}];
 }
 if(g.phase==='build'||g.phase==='extraBuild'||g.phase==='morpheusBuild'||g.phase==='dionysusBuild'){
  const building=g.phase==='dionysusBuild'?g.ctx.dionysusTarget:p;
  const from=g.workers[building]?.[g.selected];if(!from)return [];
  let positions=legalBuilds(g,from,building);
  if(g.phase==='extraBuild'){
   if(god(g,p)==='demeter')positions=positions.filter(x=>!eq(x,g.ctx?.firstBuild));
   else if(god(g,p)==='hephaestus')positions=positions.filter(x=>eq(x,g.ctx?.firstBuild)&&g.board[x.row][x.col]<3);
   else if(god(g,p)==='hestia')positions=positions.filter(x=>!isEdge(x.row,x.col));
   else positions=[];
  }
  if(g.phase==='morpheusBuild'&&(g.advanced?.morpheus?.[p]||0)<=0)positions=[];
  const out=positions.map(pos=>({type:'build',...pos}));
  if(g.phase==='build'&&god(g,p)==='selene'){
   const female=g.workers[p][1];
   if(female)out.push(...legalBuilds(g,female,p).map(pos=>({type:'build',...pos,dome:true})));
  }
  if(g.phase==='build'&&god(g,p)==='zeus'&&g.board[from.row][from.col]<3&&!adjacentGodWorkers(g,p,'limus',from))out.push({type:'build',row:from.row,col:from.col,under:true});
  if(g.phase==='build'&&god(g,p)==='atlas')
   out.push(...positions.filter(pos=>g.board[pos.row][pos.col]<4).map(pos=>({type:'build',...pos,dome:true})));
  if(['extraBuild','poseidonBuild','morpheusBuild','dionysusBuild'].includes(g.phase))out.push({type:'skip'});
  return out;
 }
 return [];
}
function matches(expected,a){
 return expected.type===a.type&&
 (expected.god===undefined||expected.god===a.god)&&
 (expected.row===undefined||expected.row===a.row)&&
 (expected.col===undefined||expected.col===a.col)&&
 (expected.worker===undefined||expected.worker===a.worker)&&
 (expected.dome===undefined? a.dome!==true : expected.dome===a.dome)&&
 (expected.under===undefined? a.under!==true:expected.under===a.under)&&
 (expected.target===undefined||expected.target===a.target);
}
function completedTowers(g){return g.board.flat().filter(h=>h===4).length;}
function winnerChronus(g){
 if(completedTowers(g)<5)return false;
 const p=g.gods.findIndex((id,i)=>id==='chronus'&&!g.eliminated?.[i]);
 if(p===-1)return false;
 g.winner=p;g.phase='ended';g.selected=null;g.lastAction='Chronus chiến thắng: có 5 công trình hoàn chỉnh!';return true;
}
function setupChaos(g){
 for(let p=0;p<g.gods.length;p++)if(g.gods[p]==='chaos'&&!g.advanced.chaos[p]){
  const deck=SIMPLE_GODS.filter(id=>!(g.advanced?.allSelected||g.gods).includes(id));
  for(let i=deck.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[deck[i],deck[k]]=[deck[k],deck[i]];}
  g.advanced.chaos[p]={deck,index:0,current:deck[0]??'apollo'};
 }
}
function refreshChaos(g){
 if(!g.ctx?.domeBuilt)return;
 setupChaos(g);
 for(const entry of Object.values(g.advanced.chaos)){
  if(!entry.deck?.length)continue;
  entry.index=(entry.index+1)%entry.deck.length;
  entry.current=entry.deck[entry.index];
 }
}
export function beginAdvancedTurn(g,p){
 const fleeceActive=g.modeId==='fleece'&&g.ram&&g.workers[p].some(w=>near(w,g.ram))?p:null;
 g.ctx={turnStart:g.workers[p].map(w=>({...w})),fleeceActive};
 setupChaos(g);
 if(g.advanced?.circe?.owner===p)g.advanced.circe=null;
 if(g.gods[p]==='circe'&&g.workers.length===2){
  const target=1-p,ws=g.workers[target];
  if(ws.length>=2&&!near(ws[0],ws[1])&&g.gods[target]!=='circe')
   g.advanced.circe={owner:p,target,power:g.gods[target]};
 }
 if(g.gods[p]==='morpheus')
  g.advanced.morpheus[p]=(g.advanced.morpheus[p]||0)+1;
}
function advance(g,p){
 const count=g.workers.length;let next=(p+1)%count;
 for(let k=0;k<count;k++){
  if(g.eliminated?.[next]){next=(next+1)%count;continue;}
  if(count===3&&g.athenaBlocked===next)g.athenaBlocked=null;
  const fleeceEligible=g.modeId==='fleece'&&g.ram&&g.workers[next].some(w=>near(w,g.ram));
  const trial={...g,phase:'move',turn:next,ctx:g.modeId==='fleece'?{fleeceActive:fleeceEligible?next:null}:{}};
  if(canTakeTurn(trial,next)){g.turn=next;g.phase='move';g.selected=null;if(g.capacity!==4)beginAdvancedTurn(g,next);return;}
  if(count===2){
   g.winner=p;g.phase='ended';g.lastAction='Đối thủ không thể di chuyển. Người chơi '+(p+1)+' chiến thắng!';return;
  }
  g.eliminated[next]=true;g.workers[next]=[];g.gods[next]=null;
  g.lastAction='Người chơi '+(next+1)+' bị loại vì không còn lượt hợp lệ.';
  const remaining=g.eliminated.map((lost,i)=>lost?null:i).filter(i=>i!==null);
  if(remaining.length===1){
   g.winner=remaining[0];g.turn=remaining[0];g.phase='ended';
   g.lastAction='Chỉ còn một người chơi. Người chơi '+(g.winner+1)+' chiến thắng!';return;
  }
  next=(next+1)%count;
 }
}
function endTurn(g,p,force=false){
 const power=god(g,p);
 if(!force&&!g.ctx?.postDone){
  if(power==='ares'){
   const idx=g.ctx?.lastMoved===0?1:0,unmoved=g.workers[p]?.[idx];
   if(unmoved&&legalBuilds(g,unmoved).some(pos=>g.board[pos.row][pos.col]>0&&g.board[pos.row][pos.col]<4)){
    g.phase='aresRemove';g.lastAction='Ares có thể phá một khối cạnh quân không di chuyển hoặc bỏ qua.';return;
   }
  }
  if(power==='poseidon'){
   const idx=g.ctx?.lastMoved===0?1:0,unmoved=g.workers[p]?.[idx];
   if(unmoved&&g.board[unmoved.row][unmoved.col]===0&&legalBuilds(g,unmoved,p).length){
    g.phase='poseidonBuild';g.ctx.bonusRemaining=3;
    g.lastAction='Poseidon có thể xây thêm tối đa 3 lần với quân đứng tầng 0.';return;
   }
  }
  if(power==='dionysus'&&g.ctx?.domeBuilt&&!g.ctx?.dionysusUsed){
   g.phase='dionysusChoice';g.lastAction='Dionysus có thể điều khiển quân đối thủ để đi thêm một lượt.';return;
  }
 }
 if(power==='medusa'){
  const petrified=new Set();
  for(const w of g.workers[p]){
   for(const q of opponentsOf(g,p))for(const v of g.workers[q])
    if(near(w,v)&&g.board[w.row][w.col]>g.board[v.row][v.col])petrified.add(v.row+','+v.col);
  }
  for(const key of petrified){
   const [row,col]=key.split(',').map(Number),target=pawnAt(g,row,col);
   if(!target||target.p===p)continue;
   g.workers[target.p].splice(target.i,1);g.board[row][col]=Math.min(4,g.board[row][col]+1);
  }
  if(petrified.size)g.lastAction='Medusa hóa đá '+petrified.size+' quân đối thủ!';
 }
 refreshChaos(g);
 if(g.modeId==='agora'){
  g.agoraTurns=(g.agoraTurns||0)+1;
  if(g.agoraTurns%2===0&&g.gods.length===2&&g.gods.every(Boolean)){
   [g.gods[0],g.gods[1]]=[g.gods[1],g.gods[0]];
   g.advanced.circe=null;
   g.lastAction='Agora: hai vị thần đổi chủ sau mỗi vòng!';
  }
 }
 if(winnerChronus(g))return;
 if(g.workers.length===2&&g.athenaBlocked===p)g.athenaBlocked=null;
 g.ctx={};g.phase='move';g.selected=null;
 advance(g,p);
}
export function applyAction(g,p,a){
 if(!a||typeof a!=='object'||!['place','placeRam','move','build','skip','selectGod','prebuild','endMove','ferry','commandeer','removeBlock'].includes(a.type))throw Error('Hành động không hợp lệ.');
 if(g.winner!==null)throw Error('Ván đã kết thúc.');
 if(!Number.isInteger(p)||p<0||p>=g.workers.length||p!==g.turn)throw Error('Chưa đến lượt của bạn.');
 const allowed=legalActions(g,p).find(x=>matches(x,a));
 if(!allowed)throw Error('Nước đi hoặc kỹ năng không hợp lệ.');
 const power=god(g,p);
 if(a.type==='selectGod'&&g.phase==='fleecePick'){
  g.fleeceGod=a.god;g.phase='place';g.turn=0;g.ctx={startSeat:0};
  g.lastAction='Golden Fleece: đã chọn '+GODS[a.god].name+' làm năng lực chung.';
 }else if(a.type==='selectGod'){
  g.gods[p]=a.god;g.lastAction='Người chơi '+(p+1)+' chọn '+GODS[a.god].name+'.';
  if(p<g.gods.length-1)g.turn=p+1;
  else{
   g.turn=g.gods.indexOf('bia')>=0?g.gods.indexOf('bia'):0;
   g.ctx={startSeat:g.turn};g.phase='place';setupChaos(g);
  }
 }else if(a.type==='place'){
  g.workers[p].push({row:a.row,col:a.col});
  g.lastAction='Người chơi '+(p+1)+' đã đặt quân '+g.workers[p].length+'/2.';
  if(g.workers[p].length===2){
   const start=g.ctx?.startSeat??0;
   const next=(p+1)%g.workers.length;
   if(next!==start)g.turn=next;
   else if(g.modeId==='fleece'){
    g.turn=start;g.phase='ramPlace';g.lastAction='Người đặt quân đầu tiên hãy đặt tượng Cừu Vàng lên một ô trống.';
   }else{g.turn=start;g.phase='move';if(g.capacity!==4)beginAdvancedTurn(g,start);g.lastAction='Đã đặt đủ quân. Bắt đầu chơi.';}
  }
 }else if(a.type==='placeRam'){
  g.ram={row:a.row,col:a.col};g.turn=1;g.phase='move';beginAdvancedTurn(g,1);
  g.lastAction='Cừu Vàng đã xuất hiện. Quân cạnh tượng nhận năng lực '+GODS[g.fleeceGod].name+' trong lượt.';
 }else if(a.type==='ferry'){
  const from=g.workers[p][a.worker],victim=pawnAt(g,a.row,a.col);
  const landing={row:from.row+(from.row-a.row),col:from.col+(from.col-a.col)};
  g.workers[victim.p][victim.i]=landing;
  g.ctx={...g.ctx,charonUsed:true,fixedWorker:a.worker};
  g.lastAction='Charon kéo quân đối thủ qua phía bên kia trước khi đi.';
 }else if(a.type==='prebuild'){
  g.board[a.row][a.col]++;
  g.ctx={prometheusUsed:true,fixedWorker:a.worker};
  g.lastAction='Prometheus đã xây trước khi di chuyển, không được đi lên tầng.';
 }else if(a.type==='commandeer'){
  g.phase='dionysusMove';g.ctx={...g.ctx,dionysusTarget:a.target,dionysusUsed:true};
  g.lastAction='Dionysus điều khiển một quân của đối thủ để di chuyển và xây.';
 }else if(a.type==='removeBlock'){
  g.board[a.row][a.col]--;
  g.lastAction='Ares phá một khối công trình!';
  g.ctx.postDone=true;endTurn(g,p,true);
 }else if(a.type==='endMove'){
  g.selected=a.worker;g.phase='build';
  g.lastAction='Hermes kết thúc di chuyển và chọn quân để xây.';
 }else if(a.type==='move'){
  const controlled=g.phase==='dionysusMove',actor=controlled?g.ctx.dionysusTarget:p;
  const from={...g.workers[actor][a.worker]},before=g.board[from.row][from.col],after=g.board[a.row][a.col];
  const actorPower=controlled?null:power,blocker=pawnAt(g,a.row,a.col);
  if(blocker){
   if(actorPower==='apollo')g.workers[blocker.p][blocker.i]={...from};
   else if(actorPower==='minotaur')g.workers[blocker.p][blocker.i]={row:a.row+(a.row-from.row),col:a.col+(a.col-from.col)};
  }
  g.workers[actor][a.worker]={row:a.row,col:a.col};
  if(actorPower==='bia'){
   const back={row:a.row+(a.row-from.row),col:a.col+(a.col-from.col)};
   const target=cell(back.row,back.col)?pawnAt(g,back.row,back.col):null;
   if(target&&target.p!==actor){
    g.workers[target.p].splice(target.i,1);
    g.lastAction='Bia hạ gục quân đối thủ đứng phía sau!';
   }
  }
  g.ctx={...g.ctx,lastMoved:a.worker,
   upThisTurn:(g.ctx?.upThisTurn||after>before)};
  const eros=actorPower==='eros'&&g.workers[actor].some((w,i)=>i!==a.worker&&near(w,{row:a.row,col:a.col})&&(g.workers.length===3?after===g.board[w.row][w.col]:after===1&&g.board[w.row][w.col]===1));
  const win=((after===3&&before<3)||(actorPower==='pan'&&before-after>=2)||eros)&&!(isEdge(a.row,a.col)&&hasEnemyGod(g,actor,'hera'))&&!controlled;
  if(win){
   g.winner=p;g.phase='ended';g.selected=null;
   g.lastAction=eros?'Eros chiến thắng nhờ hai quân kết nối!':actorPower==='pan'&&before-after>=2?'Pan chiến thắng nhờ hạ xuống ít nhất hai tầng!':'Người chơi '+(p+1)+' leo lên tầng 3 và chiến thắng!';
  }else if(controlled){
   g.phase='dionysusBuild';g.selected=a.worker;
   g.lastAction='Dionysus: xây một khối bằng quân đối thủ (không thể thắng).';
  }else if(actorPower==='athena'&&after>before){
   g.athenaBlocked=g.workers.length===2?1-p:p;
   if(actorPower==='artemis')g.phase='extraMove';else{g.phase='build';g.selected=a.worker;}
  }else if(actorPower==='artemis'&&g.phase==='move'){
   g.ctx={...g.ctx,origin:{...from}};g.selected=a.worker;g.phase='extraMove';
   g.lastAction='Artemis có thể di chuyển thêm hoặc bỏ qua.';
  }else if(actorPower==='hermes'&&((g.phase==='move'&&after===before)||g.phase==='hermesMove')){
   g.phase='hermesMove';g.selected=null;
   g.ctx={...g.ctx,hermesStarted:true,hermesSteps:(g.ctx?.hermesSteps??0)+1};
   g.lastAction='Hermes có thể đi ngang tiếp hoặc chọn quân để xây.';
  }else if(actorPower==='triton'&&isEdge(a.row,a.col)){
   g.phase='tritonMove';g.selected=a.worker;
   g.ctx={...g.ctx,tritonSteps:(g.ctx?.tritonSteps??0)+1};
   g.lastAction='Triton vào rìa bàn: có thể di chuyển tiếp hoặc bỏ qua.';
  }else{
   g.phase=actorPower==='morpheus'?'morpheusBuild':'build';g.selected=a.worker;
   g.lastAction='Người chơi '+(p+1)+' di chuyển và chuẩn bị xây.';
  }
 }else if(a.type==='build'){
  const phase=g.phase,advanced=g.advanced;
  if(a.under){
   g.board[a.row][a.col]++;
   g.lastAction='Zeus xây một khối ngay dưới chân quân đang đứng.';
  }else if(a.dome){
   g.board[a.row][a.col]=4;
   g.ctx.domeBuilt=true;
   g.lastAction='Một mái vòm được hoàn thành.';
  }else{
   g.board[a.row][a.col]++;
   if(g.board[a.row][a.col]===4)g.ctx.domeBuilt=true;
   g.lastAction='Người chơi '+(p+1)+' xây tầng '+g.board[a.row][a.col]+'.';
  }
  if(winnerChronus(g)){
   // Chronus may win even on another player's turn.
  }else if(phase==='poseidonBuild'){
   g.ctx.bonusRemaining--;
   if(g.ctx.bonusRemaining<=0||!legalActions(g,p).some(x=>x.type==='build')){g.ctx.postDone=true;endTurn(g,p,true);}
   else g.lastAction='Poseidon: có thể tiếp tục xây thêm hoặc Bỏ qua.';
  }else if(phase==='morpheusBuild'){
   advanced.morpheus[p]=Math.max(0,(advanced.morpheus[p]||0)-1);
   if(!legalActions(g,p).some(x=>x.type==='build'))endTurn(g,p);
   else g.lastAction='Morpheus: xây thêm từ kho dự trữ hoặc Bỏ qua.';
  }else if(phase==='dionysusBuild'){
   g.ctx.postDone=true;endTurn(g,p,true);
  }else if(phase==='build'&&['demeter','hephaestus','hestia'].includes(power)){
   g.phase='extraBuild';g.ctx={...g.ctx,firstBuild:{row:a.row,col:a.col}};
   if(!legalActions(g,p).some(x=>x.type==='build'))endTurn(g,p);
  }else endTurn(g,p);
 }else if(a.type==='skip'){
  if(g.phase==='extraMove'||g.phase==='tritonMove'){
   g.phase=power==='morpheus'?'morpheusBuild':'build';
   g.lastAction='Bỏ qua bước di chuyển thêm.';
  }else if(g.phase==='extraBuild'||g.phase==='morpheusBuild')endTurn(g,p);
  else if(g.phase==='poseidonBuild'||g.phase==='aresRemove'||g.phase==='dionysusChoice'){
   g.ctx.postDone=true;endTurn(g,p,true);
  }
 }
 g.revision++;
 return g;
}
export function resetGame(g){const next=newGame(g.ruleset,g.capacity||g.workers.length,g.modeId);return {...next,revision:g.revision+1,lastAction:'Ván mới. Chọn thần hoặc đặt quân để bắt đầu.'};}
