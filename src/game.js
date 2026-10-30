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
export function newGame(ruleset='classic',players=2){
 const count=players===3?3:2;
 return {board:Array.from({length:5},()=>Array(5).fill(0)),workers:Array.from({length:count},()=>[]),phase:ruleset==='god'?'godpick':'place',ruleset:ruleset==='god'?'god':'classic',gods:Array(count).fill(null),turn:0,selected:null,winner:null,eliminated:Array(count).fill(false),revision:0,lastAction:'Bắt đầu trận đấu.',ctx:{},athenaBlocked:null};
}
const cell=(r,c)=>Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<5&&c>=0&&c<5;
const near=(a,b)=>Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col))===1;
const eq=(a,b)=>!!a&&!!b&&a.row===b.row&&a.col===b.col;
const pawnAt=(g,r,c)=>{for(let p=0;p<g.workers.length;p++)for(let i=0;i<g.workers[p].length;i++)if(eq(g.workers[p][i],{row:r,col:c}))return {p,i};return null;};
const free=(g,r,c)=>cell(r,c)&&g.board[r][c]!==4&&!pawnAt(g,r,c);
const god=(g,p)=>g.ruleset==='god'?g.gods[p]:null;
export function legalBuilds(g,from){if(!from)return [];const out=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(near(from,{row,col})&&free(g,row,col))out.push({row,col});return out;}
function movedCopy(g,p,i,to,occupant=null){
 const workers=g.workers.map(t=>t.map(w=>({...w})));
 const from=workers[p][i];workers[p][i]={row:to.row,col:to.col};
 if(occupant)workers[occupant.p][occupant.i]=occupant.forced?{...occupant.forced}:{...from};
 return {...g,workers};
}
function legalMoveDetails(g,p,i){
 const from=g.workers[p]?.[i];if(!from||!['move','extraMove','hermesMove'].includes(g.phase))return [];
 if(g.ctx?.fixedWorker!==undefined&&g.ctx.fixedWorker!==i)return [];
 if(g.phase==='extraMove'&&g.selected!==i)return [];
 const power=god(g,p),before=g.board[from.row][from.col],out=[];
 for(let row=Math.max(0,from.row-1);row<=Math.min(4,from.row+1);row++)
 for(let col=Math.max(0,from.col-1);col<=Math.min(4,from.col+1);col++){
  const dest={row,col};if(!near(from,dest))continue;
  const h=g.board[row][col];if(h===4||h>before+1)continue;
  if(((g.workers.length===2?g.athenaBlocked===p:(g.athenaBlocked!==null&&g.athenaBlocked!==p))||g.ctx?.prometheusUsed)&&h>before)continue;
  if(g.phase==='hermesMove'&&h!==before)continue;
  if(g.phase==='extraMove'&&eq(dest,g.ctx?.origin))continue;
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
  const wins=(h===3&&before<3)||(power==='pan'&&before-h>=2);
  // Hermes may traverse an intermediate same-level square even when it is not a final build position.
  if(!wins&&!legalBuilds(projected,dest).length&&!(power==='hermes'&&h===before))continue;
  out.push({row,col,worker:i,...(special?{special}:{}),...(wins?{wins:true}:{})});
 }
 return out;
}
export function legalMoves(g,p,i){return legalMoveDetails(g,p,i).map(({row,col})=>({row,col}));}
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
 if(g.phase==='godpick')return Object.keys(GODS).filter(id=>!g.gods.includes(id)).map(id=>({type:'selectGod',god:id}));
 if(g.phase==='place'){const out=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(free(g,row,col))out.push({type:'place',row,col});return out;}
 if(['move','extraMove','hermesMove'].includes(g.phase)){
   const out=[];for(let i=0;i<g.workers[p].length;i++){
    out.push(...legalMoveDetails(g,p,i).map(x=>({type:'move',...x})));
    if(g.phase==='move')out.push(...legalPrebuilds(g,p,i));
   }
   if(g.phase==='extraMove')out.push({type:'skip'});
   if(god(g,p)==='hermes'&&(g.phase==='hermesMove'||g.phase==='move'))
    g.workers[p].forEach((w,worker)=>{if(legalBuilds(g,w).length)out.push({type:'endMove',worker});});
   return out;
 }
 if(g.phase==='build'||g.phase==='extraBuild'){
  const from=g.workers[p]?.[g.selected];if(!from)return [];
  let positions=legalBuilds(g,from);
  if(g.phase==='extraBuild'){
   if(god(g,p)==='demeter')positions=positions.filter(x=>!eq(x,g.ctx?.firstBuild));
   else if(god(g,p)==='hephaestus')positions=positions.filter(x=>eq(x,g.ctx?.firstBuild)&&g.board[x.row][x.col]<3);
   else positions=[];
  }
  const out=positions.map(pos=>({type:'build',...pos}));
  if(g.phase==='build'&&god(g,p)==='atlas')
   out.push(...positions.filter(pos=>g.board[pos.row][pos.col]<4).map(pos=>({type:'build',...pos,dome:true})));
  if(g.phase==='extraBuild')out.push({type:'skip'});
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
 (expected.dome===undefined? a.dome!==true : expected.dome===a.dome);
}
function advance(g,p){
 const count=g.workers.length;let next=(p+1)%count;
 for(let k=0;k<count;k++){
  if(g.eliminated?.[next]){next=(next+1)%count;continue;}
  // Athena's power expires when its owner takes their next turn.
  if(count===3&&g.athenaBlocked===next)g.athenaBlocked=null;
  const trial={...g,phase:'move',turn:next,ctx:{}};
  if(canTakeTurn(trial,next)){g.turn=next;g.phase='move';g.selected=null;return;}
  if(count===2){
   g.winner=p;g.phase='ended';g.lastAction='Đối thủ không thể di chuyển. Người chơi '+(p+1)+' chiến thắng!';return;
  }
  g.eliminated[next]=true;g.workers[next]=[];g.gods[next]=null;
  g.lastAction='Người chơi '+(next+1)+' bị loại vì không còn lượt hợp lệ.';
  const alive=g.eliminated.map((lost,i)=>lost?null:i).filter(x=>x!==null);
  if(alive.length===1){
   g.winner=alive[0];g.turn=alive[0];g.phase='ended';
   g.lastAction='Chỉ còn một người chơi. Người chơi '+(g.winner+1)+' chiến thắng!';return;
  }
  next=(next+1)%count;
 }
 throw Error('Không thể xác định người chơi tiếp theo.');
}
function endTurn(g,p){
 if(g.workers.length===2&&g.athenaBlocked===p)g.athenaBlocked=null;
 g.ctx={};g.phase='move';g.selected=null;
 advance(g,p);
}
export function applyAction(g,p,a){
 if(!a||typeof a!=='object'||!['place','move','build','skip','selectGod','prebuild','endMove'].includes(a.type))throw Error('Hành động không hợp lệ.');
 if(g.winner!==null)throw Error('Ván đã kết thúc.');
 if(!Number.isInteger(p)||p<0||p>=g.workers.length||p!==g.turn)throw Error('Chưa đến lượt của bạn.');
 const allowed=legalActions(g,p).find(x=>matches(x,a));
 if(!allowed)throw Error('Nước đi hoặc kỹ năng không hợp lệ.');
 const power=god(g,p);
 if(a.type==='selectGod'){
  g.gods[p]=a.god;g.lastAction='Người chơi '+(p+1)+' chọn '+GODS[a.god].name+'.';
  if(p<g.gods.length-1)g.turn=p+1;else{g.turn=0;g.phase='place';}
 }else if(a.type==='place'){
  g.workers[p].push({row:a.row,col:a.col});
  g.lastAction='Người chơi '+(p+1)+' đã đặt quân '+g.workers[p].length+'/2.';
  if(g.workers[p].length===2){
   if(p<g.workers.length-1)g.turn=p+1;
   else{g.turn=0;g.phase='move';g.lastAction='Đã đặt đủ quân. Người chơi 1 đi trước.';}
  }
 }else if(a.type==='prebuild'){
  g.board[a.row][a.col]++;
  g.ctx={prometheusUsed:true,fixedWorker:a.worker};
  g.lastAction='Prometheus đã xây trước khi di chuyển, không được đi lên tầng.';
 }else if(a.type==='endMove'){
  g.selected=a.worker;g.phase='build';
  g.lastAction='Hermes kết thúc di chuyển và chọn quân để xây.';
 }else if(a.type==='move'){
  const from=g.workers[p][a.worker],before=g.board[from.row][from.col],after=g.board[a.row][a.col];
  const blocker=pawnAt(g,a.row,a.col);
  if(blocker){
   if(power==='apollo')g.workers[blocker.p][blocker.i]={...from};
   else if(power==='minotaur')g.workers[blocker.p][blocker.i]={row:a.row+(a.row-from.row),col:a.col+(a.col-from.col)};
  }
  g.workers[p][a.worker]={row:a.row,col:a.col};
  if(after===3&&before<3||power==='pan'&&before-after>=2){
   g.winner=p;g.phase='ended';g.selected=null;
   g.lastAction=power==='pan'&&before-after>=2?'Pan chiến thắng nhờ hạ xuống ít nhất hai tầng!':'Người chơi '+(p+1)+' leo lên tầng 3 và chiến thắng!';
  }else{
   if(power==='athena'&&after>before)g.athenaBlocked=g.workers.length===2?1-p:p;
   if(power==='artemis'&&g.phase==='move'){
    g.ctx={origin:{...from}};g.selected=a.worker;g.phase='extraMove';
    g.lastAction='Artemis có thể di chuyển thêm một lần hoặc bỏ qua.';
   }else if(power==='hermes'&&((g.phase==='move'&&after===before)||g.phase==='hermesMove')){
    g.phase='hermesMove';g.selected=null;g.ctx={...g.ctx,hermesStarted:true,hermesSteps:(g.ctx?.hermesSteps??0)+1};
    g.lastAction='Hermes có thể tiếp tục đi trên cùng độ cao hoặc chọn quân để xây.';
   }else{
    g.phase='build';g.selected=a.worker;
    g.lastAction='Người chơi '+(p+1)+' di chuyển và chuẩn bị xây.';
   }
  }
 }else if(a.type==='build'){
  if(a.dome)g.board[a.row][a.col]=4;else g.board[a.row][a.col]++;
  g.lastAction=(a.dome?'Atlas đặt mái vòm':'Người chơi '+(p+1)+' xây tầng')+' '+(a.dome?'':g.board[a.row][a.col])+'.';
  if(g.phase==='build'&&['demeter','hephaestus'].includes(power)){
   g.phase='extraBuild';g.ctx={...g.ctx,firstBuild:{row:a.row,col:a.col}};
   if(!legalActions(g,p).some(x=>x.type==='build'))endTurn(g,p);
  }else endTurn(g,p);
 }else if(a.type==='skip'){
  if(g.phase==='extraMove'){g.phase='build';g.lastAction='Artemis bỏ qua lần di chuyển thứ hai.';}
  else if(g.phase==='extraBuild')endTurn(g,p);
 }
 g.revision++;
 return g;
}
export function resetGame(g){const next=newGame(g.ruleset,g.workers.length);return {...next,revision:g.revision+1,lastAction:'Ván mới. Chọn thần hoặc đặt quân để bắt đầu.'};}
