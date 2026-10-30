const $=id=>document.getElementById(id);
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const S={room:null,seat:-1,view:null,ws:null,selected:null,mode:'online',ruleset:'classic',difficulty:'normal',capacity:2,spectate:false,powerMode:'move',
 sound:localStorage.getItem('santorini-sound')!=='false',quality:localStorage.getItem('santorini-quality')||'auto',lighting:localStorage.getItem('santorini-lighting')||'noon',epoch:0,attempt:0,active:false,three:null,oldRevision:-1};
let audio,toastTimer;
function message(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function beep(f=520){if(!S.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.value=f;v.gain.setValueAtTime(.034,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.17);}catch{}}
function roomCode(){return Array.from(crypto.getRandomValues(new Uint32Array(8)),x=>ALPHABET[x%ALPHABET.length]).join('');}
function seatToken(room){const key='santorini-seat:'+room;let t=localStorage.getItem(key);if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,t);}return t;}
function enter(room,mode='online',ruleset='classic',capacity=2,spectate=false){
 S.mode=mode;S.ruleset=ruleset;S.capacity=capacity;S.spectate=spectate;S.room=room;S.seat=-1;S.active=true;S.view=null;S.selected=null;S.attempt=0;S.epoch++;S.oldRevision=-1;S.powerMode='move';
 S.difficulty=$('difficultySelect').value;
 $('landing').classList.add('hidden');$('game').classList.remove('hidden');$('exitBtn').classList.remove('hidden');
 history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(room)+(mode==='bot'?'&mode=bot':ruleset==='god'?'&ruleset=god':'')+(capacity>2?'&players='+capacity:'')+(spectate?'&spectate=1':''));
 connect(S.epoch);render();ensure3d();
}
function ensure3d(){
 if(S.three || $('scene3d').dataset.state==='loading')return;
 $('scene3d').dataset.state='loading';
 import('./board3d.js').then(({createBoard3D})=>{
  if(!S.active)return;
  S.three=createBoard3D($('scene3d'),tileClick);
  S.three.setQuality(S.quality);S.three.setLighting(S.lighting);
  $('scene3d').classList.add('ready');
  $('boardFallback').classList.add('hidden');
  $('scene3d').dataset.state='ready';renderBoard();
 }).catch(e=>{
  console.warn('Three.js unavailable, 2D fallback enabled:',e);
  $('scene3d').dataset.state='fallback';$('scene3d').classList.add('hidden');$('boardFallback').classList.remove('hidden');
  message('Thiết bị chưa tải được 3D. Bạn vẫn có thể chơi bàn 2D.');
 });
}
function connect(epoch){
 if(!S.active||epoch!==S.epoch)return;
 const name=($('nameInput').value.trim()||localStorage.getItem('santorini-name')||'Người chơi').slice(0,24);
 localStorage.setItem('santorini-name',name);
 const url=new URL((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/ws');
 url.searchParams.set('room',S.room);url.searchParams.set('token',seatToken(S.room));url.searchParams.set('name',name);
 if(S.mode==='bot'){url.searchParams.set('mode','bot');url.searchParams.set('difficulty',S.difficulty);}
 if(S.capacity>2)url.searchParams.set('players',String(S.capacity));
 if(S.spectate)url.searchParams.set('spectate','1');
 else if(S.ruleset==='god')url.searchParams.set('ruleset','god');
 const ws=new WebSocket(url);S.ws=ws;
 $('connection').textContent='Đang kết nối…';$('liveDot').classList.add('off');
 ws.onopen=()=>{if(epoch!==S.epoch)return;S.attempt=0;render();};
 ws.onmessage=e=>{
  if(epoch!==S.epoch)return;
  let msg;try{msg=JSON.parse(e.data);}catch{return;}
  if(msg.type==='error'){message(msg.message);return;}
  if(msg.type==='left'){return;}
  if(msg.type==='pong')return;
  const old=S.view?.game;
  if(msg.type==='hello'){S.seat=msg.seat;S.view=msg.view;}
  else if(msg.type==='state'){S.view=msg.view;}
  else return;
  S.ruleset=S.view.ruleset??'classic';S.capacity=S.view.capacity||2;
  if(old&&old.revision!==S.view.game.revision){
   const g=S.view.game;
   if(g.phase==='move'&&g.ctx?.fixedWorker!==undefined)S.selected=g.ctx.fixedWorker;
   else if(g.phase==='extraMove')S.selected=g.selected;
   else if(old.phase!==g.phase||old.turn!==g.turn){S.selected=null;S.powerMode='move';}
   beep(g.phase==='ended'?890:g.phase==='build'||g.phase==='extraBuild'?670:440);
  }
  render();
 };
 ws.onclose=()=>{
  if(!S.active||epoch!==S.epoch||S.ws!==ws)return;
  $('connection').textContent='Đang thử kết nối lại';$('liveDot').classList.add('off');
  setTimeout(()=>connect(epoch),Math.min(12000,1100*Math.pow(1.6,S.attempt++)));
 };
 ws.onerror=()=>{};
}
function send(a){if(S.ws?.readyState!==WebSocket.OPEN)return message('Mất kết nối với máy chủ.');S.ws.send(JSON.stringify(a));}
function actions(){return S.view?.legalActions||[];}
function getActions(type,worker){return actions().filter(a=>a.type===type&&(worker===undefined||a.worker===worker));}
function isTurn(){return S.view?.ready&&S.ws?.readyState===WebSocket.OPEN&&S.seat===S.view.activeSeat&&S.view.game.phase!=='ended';}
function myTeam(){return S.seat<0?-1:S.seat%2;}
function availableTiles(){
 const v=S.view;if(!v||!isTurn())return [];
 const g=v.game,phase=g.phase;
 if(phase==='place')return getActions('place');
 if(['move','extraMove','hermesMove'].includes(phase)){
  if(S.selected===null)return [];
  return getActions(S.powerMode==='prebuild'?'prebuild':'move',S.selected);
 }
 if(['build','extraBuild'].includes(phase)){
  return getActions('build').filter(x=>!!x.dome===(S.powerMode==='dome'));
 }
 return [];
}
function tileClick(row,col){
 const v=S.view;if(!isTurn()||!v)return;
 const g=v.game,phase=g.phase;
 if(phase==='place'){const a=getActions('place').find(a=>a.row===row&&a.col===col);if(a)send({type:'place',row,col});return;}
 if(['move','extraMove','hermesMove'].includes(phase)){
  const worker=g.workers[myTeam()]?.findIndex(w=>w.row===row&&w.col===col);
  const allowedWorker=worker!==-1&&worker!==undefined&&getActions('move',worker).length+getActions('prebuild',worker).length+getActions('endMove',worker).length>0;
  if(allowedWorker&&!(phase==='extraMove'&&worker!==g.selected)){
   S.selected=worker;S.powerMode='move';beep(380);render();return;
  }
  const action=availableTiles().find(a=>a.row===row&&a.col===col);
  if(action){send({type:action.type,worker:action.worker,row,col});if(action.type==='move')S.selected=null;}
  else message('Chọn quân của bạn rồi chạm vào ô có vòng sáng.');
 }else if(['build','extraBuild'].includes(phase)){
  const a=availableTiles().find(a=>a.row===row&&a.col===col);
  if(a)send({type:'build',row,col,...(a.dome?{dome:true}:{})});
  else message('Hãy chọn vị trí xây có vòng sáng.');
 }
}
function drawFallback(){
 const g=S.view?.game;if(!g)return;
 const options=availableTiles(),tiles=new Set(options.map(a=>a.row+','+a.col));
 const own=myTeam();
 let html='';
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  const level=g.board[row][col],k=row+','+col,active=tiles.has(k);
  const owner=g.workers.findIndex(team=>team.some(w=>w.row===row&&w.col===col));
  const wi=owner<0?-1:g.workers[owner].findIndex(w=>w.row===row&&w.col===col);
  const choose=owner===own&&['move','extraMove','hermesMove'].includes(g.phase);
  html+='<button class="tile '+(active?'legal ':'')+(choose&&wi===S.selected?'selected ':'')+'" data-row="'+row+'" data-col="'+col+'" aria-label="Ô '+(row+1)+'-'+(col+1)+' tầng '+level+'">';
  if(level){html+='<span class="building">';for(let n=0;n<Math.min(3,level);n++)html+='<span class="block"></span>';if(level===4)html+='<span class="dome"></span>';html+='</span><span class="level-pill">'+(level===4?'◆':level)+'</span>';}
  if(owner>=0)html+='<span class="worker p'+owner+'"><span class="worker-head"></span><span class="worker-body"></span><span class="worker-base"></span></span>';
  html+='</button>';
 }
 $('board').innerHTML=html;
}
function renderBoard(){
 const v=S.view;if(!v)return;
 drawFallback();
 if(S.three)S.three.update(v.game,availableTiles(),S.selected===null||S.seat===-1?null:{p:S.seat,i:S.selected},['build','extraBuild'].includes(v.game.phase)||S.powerMode==='prebuild');
}
function renderGodPick(g){
 const active=S.view?.ready&&isTurn()&&g.phase==='godpick';
 $('godOverlay').classList.toggle('hidden',g.phase!=='godpick'||!S.view?.ready);
 if(g.phase!=='godpick'||!S.view?.ready)return;
 $('godPickTitle').textContent=active?'Chọn vị thần của bạn':!S.view.ready?'Đợi đối thủ tham gia':'Đối thủ đang chọn thần';
 $('godPickHint').textContent=g.gods[0]?'Đã chọn '+S.view.gods?.[g.gods[0]]?.name+' · Đang chờ lượt còn lại.':'Mỗi vị thần chỉ có một người sử dụng.';
 const choices=S.view.gods||{};
 $('godCards').innerHTML=Object.entries(choices).map(([id,info])=>{
  const picked=g.gods.includes(id),disabled=!active||picked;
  return '<button class="god-card '+(picked?'picked ':'')+'" data-god="'+id+'" '+(disabled?'disabled':'')+'><span class="god-symbol">✦</span><strong>'+info.name+'</strong><small>'+info.description+'</small>'+(picked?'<span class="taken">ĐÃ CHỌN</span>':'')+'</button>';
 }).join('');
}
function render(){
 const connected=S.ws?.readyState===WebSocket.OPEN,v=S.view;
 $('connection').textContent=connected?'● Trực tuyến':'○ Đang kết nối';
 $('liveDot').classList.toggle('off',!connected);
 $('soundBtn').textContent='Âm thanh: '+(S.sound?'Bật':'Tắt');
 $('lightingBtn').textContent=S.lighting==='golden'?'🌅 Hoàng hôn':'☀ Ban ngày';
 $('qualityBtn').textContent=S.quality==='hd'?'✦ HD':S.quality==='eco'?'⚡ Eco':'✧ Auto';
 $('seatText').textContent=S.seat===-1?'Khán giả · Chỉ theo dõi':S.mode==='bot'?'Solo · Bạn ở ghế 1':'Bạn ở ghế '+(S.seat+1)+(S.capacity>2?' · Đội '+(myTeam()+1):'');
 if(!v){$('phaseLabel').textContent='Đang tải bàn chơi…';$('hint').textContent='Kết nối máy chủ';return;}
 const g=v.game,solo=v.mode==='bot',turn=isTurn();
 $('gameMode').textContent=solo?'SOLO DEMO':v.ruleset==='god'?'GOD POWERS':'PHÒNG';
 $('roomCode').textContent=solo?'VS BOT':S.room;
 $('copyBtn').classList.toggle('hidden',solo);
 const teamNames=t=>v.players.filter(p=>p.team===t).map(p=>p.name).join(' + ');
 $('name0').textContent=teamNames(0);$('name1').textContent=teamNames(1);
 $('teamLabel0').textContent=v.capacity>2?'ĐỘI 01':'NGƯỜI CHƠI 01';
 $('teamLabel1').textContent=v.capacity>2?'ĐỘI 02':'NGƯỜI CHƠI 02';
 $('scoreChip').textContent='🏆 '+(v.stats?.wins?.[0]||0)+' – '+(v.stats?.wins?.[1]||0);
 $('watcherChip').textContent='👁 '+(v.spectators||0);
 if(!$('historyOverlay').classList.contains('hidden'))renderHistory();
 for(let i=0;i<2;i++)$('player'+i).classList.toggle('active',g.turn===i&&g.phase!=='ended');
 $('player1').classList.toggle('bot-player',solo);
 $('godInfo').classList.toggle('hidden',v.ruleset!=='god');
 if(v.ruleset==='god'){
  $('god0').textContent=g.gods?.[0]?v.gods[g.gods[0]].name:'Chưa chọn';
  $('god1').textContent=g.gods?.[1]?v.gods[g.gods[1]].name:'Chưa chọn';
  const activeGod=g.gods?.[g.turn];
  $('godEffect').textContent=activeGod?v.gods[activeGod]?.description:'Chọn thần để bắt đầu.';
 }
 const phases={godpick:'CHỌN THẦN',place:'ĐẶT QUÂN',move:'DI CHUYỂN',extraMove:'DI CHUYỂN 2',hermesMove:'HERMES',build:'XÂY DỰNG',extraBuild:'XÂY THÊM',ended:'KẾT THÚC'};
 $('phaseChip').textContent=phases[g.phase]||'CHƠI';
 const turnName=solo&&g.turn===1?'BOT':v.players[g.turn]?.name||'Đối thủ';
 const messages={godpick:'Chọn vị thần cho trận đấu',place:'Đặt hai quân lên bàn cờ',move:'Chọn quân, sau đó chọn ô muốn đi',extraMove:'Artemis: đi thêm hoặc bỏ qua',hermesMove:'Hermes: tiếp tục đi ngang hoặc chọn quân để xây',build:'Chạm ô sáng để xây một tầng',extraBuild:'Có thể xây thêm hoặc bỏ qua',ended:'Trận đấu kết thúc'};
 $('phaseLabel').textContent=!v.ready?'Đợi đủ '+(v.capacity||2)+' người':g.phase==='ended'?'Đã kết thúc':turn?messages[g.phase]:(turnName+' đang thực hiện lượt');
 $('hint').textContent=!v.ready?'Sao chép link mời bạn bè tham gia.':turn?(g.phase==='move'&&g.ctx?.prometheusUsed?'Prometheus đã xây trước: không được di chuyển lên tầng.':messages[g.phase]):g.lastAction;
 renderGodPick(g);
 if(g.phase==='extraMove')S.selected=g.selected;
 if(g.phase==='move'&&g.ctx?.fixedWorker!==undefined)S.selected=g.ctx.fixedWorker;
 if(!turn&&g.phase!=='ended')S.selected=null;
 const showPower=turn&&g.phase==='move'&&S.selected!==null&&getActions('prebuild',S.selected).length>0;
 $('powerBtn').classList.toggle('hidden',!showPower);
 $('powerBtn').classList.toggle('chosen',S.powerMode==='prebuild');
 $('powerBtn').textContent=S.powerMode==='prebuild'?'↩ Đi bình thường':'⚡ Xây trước';
 const dome=turn&&g.phase==='build'&&getActions('build').some(x=>x.dome);
 $('domeBtn').classList.toggle('hidden',!dome);
 $('domeBtn').classList.toggle('chosen',S.powerMode==='dome');
 $('domeBtn').textContent=S.powerMode==='dome'?'↩ Xây tầng':'◆ Đặt mái vòm';
 $('skipBtn').classList.toggle('hidden',!(turn&&getActions('skip').length));
 const end=turn&&S.selected!==null&&getActions('endMove',S.selected).length>0;
 $('endMoveBtn').classList.toggle('hidden',!end);
 $('restartBtn').classList.toggle('hidden',g.phase!=='ended'||S.seat<0);
 $('winOverlay').classList.toggle('hidden',g.phase!=='ended');
 $('rematchBtn').classList.toggle('hidden',S.seat<0);
 if(g.phase==='ended'){
  $('winTitle').textContent=g.winner===myTeam()?'Đội bạn chiến thắng!':solo?'BOT chiến thắng!':'Đội '+(g.winner+1)+' chiến thắng!';
  $('winText').textContent=g.lastAction;
 }
 renderBoard();
}
$('board').addEventListener('click',e=>{const b=e.target.closest('.tile');if(b)tileClick(+b.dataset.row,+b.dataset.col);});
$('godCards').addEventListener('click',e=>{const b=e.target.closest('button[data-god]');if(b&&!b.disabled)send({type:'selectGod',god:b.dataset.god});});
$('createBtn').onclick=()=>{const n=Number($('teamSize').value),rule=n>2?'classic':document.querySelector('input[name="ruleset"]:checked')?.value==='god'?'god':'classic';enter(roomCode(),'online',rule,n);};
$('teamSize').onchange=()=>{if(+$('teamSize').value>2){const classic=document.querySelector('input[name="ruleset"][value="classic"]');classic.checked=true;message('Phòng 3–4 người dùng luật Classic chia đội.');}};
$('demoBtn').onclick=()=>enter(roomCode(),'bot',document.querySelector('input[name="ruleset"]:checked')?.value==='god'?'god':'classic');
$('joinBtn').onclick=()=>{const room=$('codeInput').value.trim().toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(room))return message('Mã phòng không hợp lệ.');enter(room,'online','classic');};
$('watchBtn').onclick=()=>{const room=$('codeInput').value.trim().toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(room))return message('Mã phòng không hợp lệ.');enter(room,'online','classic',2,true);};
$('codeInput').onkeydown=e=>{if(e.key==='Enter')$('joinBtn').click();};
$('nameInput').onkeydown=e=>{if(e.key==='Enter')$('createBtn').click();};
$('copyBtn').onclick=async()=>{const link=location.origin+location.pathname+'?room='+S.room+(S.ruleset==='god'?'&ruleset=god':'')+(S.capacity>2?'&players='+S.capacity:'');try{await navigator.clipboard.writeText(link);message('Đã sao chép link mời.');}catch{prompt('Link mời',link);}};
$('exitBtn').onclick=()=>{
 if(S.seat>=0&&S.ws?.readyState===WebSocket.OPEN)S.ws.send(JSON.stringify({type:'leave'}));
 S.active=false;S.epoch++;S.ws?.close();S.view=null;S.seat=-1;S.room=null;
 $('historyOverlay').classList.add('hidden');
 S.three?.destroy();S.three=null;
 $('scene3d').classList.remove('ready');$('scene3d').classList.remove('hidden');$('scene3d').dataset.state='';
 $('boardFallback').classList.remove('hidden');
 history.replaceState({},'',location.pathname);
 $('game').classList.add('hidden');$('landing').classList.remove('hidden');$('exitBtn').classList.add('hidden');
};
$('viewBtn').onclick=()=>{S.three?.resetCamera();message('Đã đưa camera về góc nhìn mặc định.');};
$('soundBtn').onclick=()=>{S.sound=!S.sound;localStorage.setItem('santorini-sound',String(S.sound));render();beep(450);};
$('lightingBtn').onclick=()=>{S.lighting=S.lighting==='golden'?'noon':'golden';localStorage.setItem('santorini-lighting',S.lighting);S.three?.setLighting(S.lighting);render();};
$('qualityBtn').onclick=()=>{S.quality=S.quality==='auto'?'hd':S.quality==='hd'?'eco':'auto';localStorage.setItem('santorini-quality',S.quality);const actual=S.three?.setQuality(S.quality);if(S.quality==='hd'&&actual==='eco')message('Đồ họa HD không bật khi chế độ tiết kiệm dữ liệu đang hoạt động.');render();};
$('powerBtn').onclick=()=>{S.powerMode=S.powerMode==='prebuild'?'move':'prebuild';render();};
$('domeBtn').onclick=()=>{S.powerMode=S.powerMode==='dome'?'move':'dome';render();};
$('skipBtn').onclick=()=>send({type:'skip'});
$('endMoveBtn').onclick=()=>{if(S.selected!==null)send({type:'endMove',worker:S.selected});};
$('restartBtn').onclick=()=>send({type:'restart'});
$('rematchBtn').onclick=()=>send({type:'restart'});
function renderHistory(){
 const v=S.view;if(!v)return;
 $('historyStats').textContent='Tổng số trận: '+(v.stats?.matches||0)+' · Đội 1 thắng '+(v.stats?.wins?.[0]||0)+' · Đội 2 thắng '+(v.stats?.wins?.[1]||0);
 const list=v.history||[];
 $('historyEvents').innerHTML=list.length?list.slice().reverse().map(e=>'<li><span>Ghế '+(e.seat+1)+' · '+(e.action||'')+'</span><strong></strong></li>').join(''):'<li>Chưa có hành động nào.</li>';
 [...$('historyEvents').querySelectorAll('strong')].forEach((node,i)=>node.textContent=list.slice().reverse()[i]?.description||'');
}
$('historyBtn').onclick=()=>{renderHistory();$('historyOverlay').classList.remove('hidden');};
$('historyClose').onclick=()=>$('historyOverlay').classList.add('hidden');
$('historyOverlay').addEventListener('click',e=>{if(e.target===$('historyOverlay'))$('historyOverlay').classList.add('hidden');});
$('nameInput').value=localStorage.getItem('santorini-name')||'';
const params=new URLSearchParams(location.search),linkRoom=params.get('room');
if(linkRoom&&/^[A-Z2-9]{6,10}$/.test(linkRoom.toUpperCase())){
 $('codeInput').value=linkRoom.toUpperCase();
 if(localStorage.getItem('santorini-name')||params.get('spectate')==='1')enter(linkRoom.toUpperCase(),params.get('mode')==='bot'?'bot':'online',params.get('ruleset')==='god'?'god':'classic',Number(params.get('players'))||2,params.get('spectate')==='1');
}
