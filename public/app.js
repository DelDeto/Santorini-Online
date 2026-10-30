const $=id=>document.getElementById(id);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const S={room:null,seat:-1,view:null,ws:null,selected:null,sound:localStorage.getItem('santorini-sound')!=='false',tilt:localStorage.getItem('santorini-tilt')==='true',active:false,attempt:0,epoch:0};
let toastTimer,audio;
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2700);}
function beep(f=560){if(!S.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),v=audio.createGain();o.type='sine';o.frequency.value=f;v.gain.setValueAtTime(.045,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.14);}catch{}}
function roomCode(){const a=crypto.getRandomValues(new Uint32Array(8));return Array.from(a,x=>alphabet[x%alphabet.length]).join('');}
function token(room){const key='santorini-seat:'+room;let t=localStorage.getItem(key);if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,t);}return t;}
function enter(room){
  S.active=true;S.room=room;S.view=null;S.seat=-1;S.selected=null;S.attempt=0;S.epoch++;
  $('landing').classList.add('hidden');$('game').classList.remove('hidden');$('exitBtn').classList.remove('hidden');$('roomCode').textContent=room;
  history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(room));
  connect(S.epoch);render();
}
function connect(epoch){
  if(!S.active||epoch!==S.epoch)return;
  const name=($('nameInput').value.trim()||localStorage.getItem('santorini-name')||'Người chơi').slice(0,24);
  localStorage.setItem('santorini-name',name);
  const url=new URL((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/ws');
  url.searchParams.set('room',S.room);url.searchParams.set('token',token(S.room));url.searchParams.set('name',name);
  const ws=new WebSocket(url);S.ws=ws;
  $('connection').textContent='Đang kết nối…';$('liveDot').classList.add('off');
  ws.onopen=()=>{if(epoch!==S.epoch)return;S.attempt=0;render();};
  ws.onmessage=e=>{
    if(epoch!==S.epoch)return;
    let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='hello'){S.seat=m.seat;S.view=m.view;S.selected=null;render();}
    if(m.type==='state'){
      const old=S.view?.game;
      S.view=m.view;
      if(old&&old.revision!==m.view.game.revision){
        if(old.turn!==m.view.game.turn||old.phase!==m.view.game.phase)S.selected=null;
        beep(m.view.game.phase==='ended'?850:510);
      }
      render();
    }
    if(m.type==='error')toast(m.message);
  };
  ws.onclose=()=>{
    if(!S.active||epoch!==S.epoch||S.ws!==ws)return;
    $('connection').textContent='Mất kết nối, đang thử lại';$('liveDot').classList.add('off');
    setTimeout(()=>connect(epoch),Math.min(10000,1500*Math.pow(1.5,S.attempt++)));
  };
  ws.onerror=()=>{};
}
function send(a){if(S.ws?.readyState!==WebSocket.OPEN){toast('Chưa kết nối đến máy chủ.');return;}S.ws.send(JSON.stringify(a));}
function occupied(g,r,c){return g.workers.some(t=>t.some(w=>w.row===r&&w.col===c));}
function neighbor(a,b){return Math.max(Math.abs(a.row-b.row),Math.abs(a.col-b.col))===1;}
function builds(g,from){const out=[];for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(neighbor(from,{row:r,col:c})&&g.board[r][c]<4&&!occupied(g,r,c))out.push(r+','+c);return out;}
function moves(g,worker){
  const from=g.workers[S.seat]?.[worker];if(!from)return [];
  const out=[];for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const dest={row:r,col:c},h=g.board[r][c],before=g.board[from.row][from.col];
    if(!neighbor(from,dest)||h===4||occupied(g,r,c)||h>before+1)continue;
    const projected={...g,workers:g.workers.map((team,p)=>team.map((w,i)=>p===S.seat&&i===worker?dest:w))};
    if(before===2&&h===3||builds(projected,dest).length)out.push(r+','+c);
  }return out;
}
function validBuilds(g){const from=g.workers[S.seat]?.[g.selected];return from?builds(g,from):[];}
function tileClick(r,c){
  const v=S.view;if(!v||!v.ready||S.ws?.readyState!==WebSocket.OPEN||v.game.turn!==S.seat||v.game.phase==='ended')return;
  const g=v.game,team=g.workers[S.seat];
  if(g.phase==='place'){send({type:'place',row:r,col:c});return;}
  if(g.phase==='move'){
    const own=team.findIndex(w=>w.row===r&&w.col===c);
    if(own!==-1){S.selected=own;beep(390);render();return;}
    if(S.selected!==null&&moves(g,S.selected).includes(r+','+c)){send({type:'move',worker:S.selected,row:r,col:c});S.selected=null;}
    else toast('Chọn quân của bạn và ô viền sáng.');
  }else if(g.phase==='build'&&validBuilds(g).includes(r+','+c)){send({type:'build',row:r,col:c});}
}
function drawBoard(g,enabled){
  const valid=enabled?(g.phase==='move'&&S.selected!==null?moves(g,S.selected):g.phase==='build'?validBuilds(g):[]):[];
  let html='';
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const k=r+','+c,level=g.board[r][c];
    let owner=-1,wi=-1;
    for(let p=0;p<2;p++)for(let i=0;i<g.workers[p].length;i++)
      if(g.workers[p][i].row===r&&g.workers[p][i].col===c){owner=p;wi=i;}
    const placeable=enabled&&g.phase==='place'&&owner===-1;
    const select=enabled&&g.phase==='move'&&owner===S.seat&&S.selected===wi;
    const interact=placeable||valid.includes(k)||(enabled&&g.phase==='move'&&owner===S.seat);
    html+='<button type="button" class="tile '+(owner!==-1?'occupied ':'')+(placeable?'placeable ':'')+(valid.includes(k)?'legal ':'')+(select?'selected ':'')+(interact?'selectable':'')+'" data-row="'+r+'" data-col="'+c+'" aria-label="Hàng '+(r+1)+', cột '+(c+1)+', tầng '+(level===4?'vòm':level)+'" '+(!interact?'tabindex="-1"':'')+'>';
    if(level){html+='<span class="building">';for(let n=1;n<=Math.min(3,level);n++)html+='<span class="block"></span>';if(level===4)html+='<span class="dome"></span>';html+='</span><span class="level-pill">'+(level===4?'◆':level)+'</span>';}
    if(owner!==-1)html+='<span class="worker p'+owner+'"><span class="worker-head"></span><span class="worker-body"></span><span class="worker-base"></span></span>';
    html+='</button>';
  }
  $('board').innerHTML=html;
}
function render(){
  const v=S.view,connected=S.ws?.readyState===WebSocket.OPEN;
  $('connection').textContent=connected?'● Trực tuyến':'○ Đang kết nối…';
  $('liveDot').classList.toggle('off',!connected);
  $('viewBtn').textContent='Góc nhìn 3D: '+(S.tilt?'Bật':'Tắt');
  $('soundBtn').textContent='Âm thanh: '+(S.sound?'Bật':'Tắt');
  document.querySelector('.island').classList.toggle('tilted',S.tilt);
  $('seatText').textContent=S.seat===-1?'Chế độ theo dõi':'Bạn ở ghế '+(S.seat+1);
  if(!v){$('phaseLabel').textContent='Đang vào phòng…';$('hint').textContent='Đồng bộ dữ liệu bàn chơi';return;}
  $('name0').textContent=v.players[0].name;$('name1').textContent=v.players[1].name;
  const g=v.game,acting=v.ready&&connected&&g.turn===S.seat&&g.phase!=='ended';
  $('player0').classList.toggle('active',g.turn===0&&g.phase!=='ended');
  $('player1').classList.toggle('active',g.turn===1&&g.phase!=='ended');
  if(!v.ready){$('phaseLabel').textContent='Đang chờ người thứ hai';$('hint').textContent='Sao chép link phòng và gửi cho bạn bè.';}
  else if(g.phase==='place'){$('phaseLabel').textContent=acting?'Lượt của bạn · Đặt quân':'Người chơi '+(g.turn+1)+' đang đặt quân';$('hint').textContent=acting?'Chạm ô trống để đặt quân.':g.lastAction;}
  else if(g.phase==='move'){$('phaseLabel').textContent=acting?'Lượt của bạn · Di chuyển':'Người chơi '+(g.turn+1)+' đang di chuyển';$('hint').textContent=acting?'Chọn quân, sau đó chọn ô viền sáng.':g.lastAction;}
  else if(g.phase==='build'){$('phaseLabel').textContent=acting?'Lượt của bạn · Xây dựng':'Người chơi '+(g.turn+1)+' đang xây dựng';$('hint').textContent=acting?'Chạm ô viền sáng để xây.':g.lastAction;}
  else{$('phaseLabel').textContent='Ván đấu kết thúc';$('hint').textContent=g.lastAction;}
  $('restartBtn').classList.toggle('hidden',g.phase!=='ended'||S.seat===-1);
  $('winOverlay').classList.toggle('hidden',g.phase!=='ended');
  $('rematchBtn').classList.toggle('hidden',S.seat===-1);
  if(g.phase==='ended'){$('winTitle').textContent=g.winner===S.seat?'Bạn chiến thắng!':'Người chơi '+(g.winner+1)+' chiến thắng!';$('winText').textContent=g.lastAction;}
  if(!acting||g.phase!=='move')S.selected=null;
  drawBoard(g,acting);
}
$('board').addEventListener('click',e=>{const tile=e.target.closest('.tile');if(tile)tileClick(Number(tile.dataset.row),Number(tile.dataset.col));});
$('createBtn').addEventListener('click',()=>enter(roomCode()));
$('joinBtn').addEventListener('click',()=>{const room=$('codeInput').value.trim().toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(room)){toast('Mã phòng cần 6–10 ký tự, không gồm 0, 1, I, O.');return;}enter(room);});
$('codeInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinBtn').click();});
$('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('createBtn').click();});
$('copyBtn').addEventListener('click',async()=>{const link=location.origin+location.pathname+'?room='+S.room;try{await navigator.clipboard.writeText(link);toast('Đã sao chép link mời.');}catch{prompt('Sao chép link mời:',link);}});
$('exitBtn').addEventListener('click',()=>{S.active=false;S.epoch++;S.ws?.close();S.room=null;S.view=null;S.seat=-1;history.replaceState({},'',location.pathname);$('game').classList.add('hidden');$('landing').classList.remove('hidden');$('exitBtn').classList.add('hidden');});
$('viewBtn').addEventListener('click',()=>{S.tilt=!S.tilt;localStorage.setItem('santorini-tilt',String(S.tilt));render();});
$('soundBtn').addEventListener('click',()=>{S.sound=!S.sound;localStorage.setItem('santorini-sound',String(S.sound));render();beep(500);});
$('restartBtn').addEventListener('click',()=>send({type:'restart'}));
$('rematchBtn').addEventListener('click',()=>send({type:'restart'}));
$('nameInput').value=localStorage.getItem('santorini-name')||'';
const linkRoom=new URLSearchParams(location.search).get('room');
if(linkRoom){$('codeInput').value=linkRoom.toUpperCase();if(localStorage.getItem('santorini-name'))enter(linkRoom.toUpperCase());}
