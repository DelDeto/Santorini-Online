export function newGame() {
  return {board:Array.from({length:5},()=>Array(5).fill(0)),workers:[[],[]],phase:'place',turn:0,selected:null,winner:null,revision:0,lastAction:'Chờ người chơi đặt quân cờ.'};
}
function cell(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<5&&c>=0&&c<5;}
function near(a,b){return Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col))===1;}
function occupied(g,r,c){return g.workers.some(t=>t.some(w=>w.row===r&&w.col===c));}
export function legalBuilds(g,from){
  const out=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++)
    if(near(from,{row,col})&&g.board[row][col]<4&&!occupied(g,row,col))out.push({row,col});
  return out;
}
export function legalMoves(g,p,i){
  const from=g.workers[p]?.[i];if(!from)return [];
  const out=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const dest={row,col},h=g.board[row][col],fromHeight=g.board[from.row][from.col];
    if(!near(from,dest)||h===4||occupied(g,row,col)||h>fromHeight+1)continue;
    const wins=fromHeight===2&&h===3;
    const projected={...g,workers:g.workers.map((team,pi)=>team.map((w,wi)=>pi===p&&wi===i?dest:w))};
    if(wins||legalBuilds(projected,dest).length)out.push(dest);
  }
  return out;
}
export function canTakeTurn(g,p){return g.workers[p].some((_,i)=>legalMoves(g,p,i).length>0);}
export function applyAction(g,p,a){
  if(!a||typeof a!=='object')throw Error('Hành động không hợp lệ.');
  if(g.winner!==null)throw Error('Ván đã kết thúc.');
  if(p!==0&&p!==1)throw Error('Không có ghế chơi.');
  if(p!==g.turn)throw Error('Chưa đến lượt của bạn.');
  const {row,col}=a;if(!cell(row,col))throw Error('Vị trí không hợp lệ.');
  if(g.phase==='place'){
    if(a.type!=='place')throw Error('Hãy đặt quân trước.');
    if(occupied(g,row,col)||g.board[row][col]!==0)throw Error('Ô đã có quân.');
    g.workers[p].push({row,col});
    g.lastAction='Người chơi '+(p+1)+' đã đặt quân '+g.workers[p].length+'/2.';
    if(g.workers[p].length===2){if(p===0)g.turn=1;else{g.turn=0;g.phase='move';g.lastAction='Bắt đầu! Người chơi 1 đi trước.';}}
  }else if(g.phase==='move'){
    if(a.type!=='move')throw Error('Hãy chọn ô di chuyển.');
    if(!Number.isInteger(a.worker)||a.worker<0||a.worker>=2)throw Error('Chọn một quân của bạn.');
    if(!legalMoves(g,p,a.worker).some(x=>x.row===row&&x.col===col))throw Error('Nước đi không hợp lệ.');
    const old=g.workers[p][a.worker],before=g.board[old.row][old.col],after=g.board[row][col];
    g.workers[p][a.worker]={row,col};
    if(before===2&&after===3){g.winner=p;g.phase='ended';g.selected=null;g.lastAction='Người chơi '+(p+1)+' đã leo lên tầng 3 và chiến thắng!';}
    else{g.phase='build';g.selected=a.worker;g.lastAction='Người chơi '+(p+1)+' đã di chuyển quân.';}
  }else if(g.phase==='build'){
    if(a.type!=='build')throw Error('Hãy xây dựng trước.');
    const moved=g.workers[p][g.selected];
    if(!moved||!legalBuilds(g,moved).some(x=>x.row===row&&x.col===col))throw Error('Không thể xây tại ô này.');
    g.board[row][col]++;
    g.lastAction='Người chơi '+(p+1)+' xây '+(g.board[row][col]===4?'mái vòm':'tầng '+g.board[row][col])+'.';
    g.phase='move';g.selected=null;g.turn=1-p;
    if(!canTakeTurn(g,g.turn)){g.winner=p;g.phase='ended';g.lastAction='Người chơi '+(g.turn+1)+' hết nước đi. Người chơi '+(p+1)+' chiến thắng!';}
  }else throw Error('Trạng thái ván không hợp lệ.');
  g.revision++;return g;
}
export function resetGame(g){return {...newGame(),revision:g.revision+1,lastAction:'Ván mới. Mỗi người đặt 2 quân.'};}
