const $=id=>document.getElementById(id);
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const S={room:null,seat:-1,view:null,ws:null,selected:null,mode:'online',ruleset:'classic',difficulty:'normal',capacity:2,variant:'duel',spectate:false,powerMode:'move',
 sound:localStorage.getItem('santorini-sound')!=='false',quality:localStorage.getItem('santorini-quality')||'auto',lighting:localStorage.getItem('santorini-lighting')||'noon',epoch:0,attempt:0,active:false,three:null,oldRevision:-1};
let audio,toastTimer;
const MODE_UI={
 classic:{n:2,god:false,title:'♟ CLASSIC',description:'Classic — Hai người đấu trí, không dùng năng lực thần. Mỗi lượt di chuyển một quân rồi xây một tầng.'},
 duel:{n:2,god:true,title:'⚡ GOD POWERS',description:'God Powers — Hai người chọn thần riêng trong 30 lá, sử dụng năng lực đặc biệt để chiến thắng.'},
 trio:{n:3,god:true,title:'♜ 3 NGƯỜI',description:'Đấu tự do — Ba người chơi độc lập, mỗi người hai quân và một thần. Người cuối cùng còn lại chiến thắng.'},
 teams:{n:4,god:true,title:'♟ 4 NGƯỜI 2V2',description:'Đấu đội — Hai đội, dùng chung hai quân mỗi đội; bốn người có bốn thần riêng.'},
 agora:{n:2,god:true,title:'⇄ AGORA',description:'Agora Online — Hai người chọn thần cơ bản; sau mỗi vòng hai lượt, hai vị thần đổi chủ tự động.'},
 fleece:{n:2,god:true,title:'🐏 GOLDEN FLEECE',description:'Golden Fleece — Cả bàn dùng chung một thần; quân đứng cạnh tượng Cừu Vàng lúc bắt đầu lượt được dùng thần ấy.'}
};
let chosenMode='duel';
function selectMode(id){
 if(!MODE_UI[id])return;
 chosenMode=id;
 const m=MODE_UI[id];
 for(const b of document.querySelectorAll('#modeGrid [data-mode]')){
  const yes=b.dataset.mode===id;
  b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));
 }
 $('modeDescription').textContent=m.description;
 $('botCountSelect').value=String(m.n);
 $('teamSize').value=String(m.n);
 const input=document.querySelector('input[name="ruleset"][value="'+(m.god?'god':'classic')+'"]');
 if(input)input.checked=true;
}


/* Active God Powers are shown in the HUD and can be inspected at any time. */
const POWER_GUIDE={
 apollo:{icon:'↔',kind:'Tự động · khi di chuyển',how:'Chọn quân của bạn, sau đó chạm ô đang có quân đối thủ nếu ô đó sáng. Hai quân sẽ đổi vị trí.',tip:'Chạm ô có quân đối thủ được đánh dấu để đổi chỗ (không cần bật nút).'},
 artemis:{icon:'➠',kind:'Chủ động · lượt di chuyển thứ hai',how:'Di chuyển một lần. Game tự mở bước đi thêm: chạm ô sáng để đi lần hai hoặc bấm “Bỏ qua”. Không được quay lại ô bắt đầu.',tip:'Đi lần đầu rồi chọn đi tiếp hoặc “Bỏ qua”.'},
 athena:{icon:'♙',kind:'Tự động · hiệu ứng hạn chế leo',how:'Dùng quân đi lên một tầng hợp lệ. Kỹ năng tự kích hoạt, khiến đối thủ không thể đi lên tầng trong thời gian hiệu lực.',tip:'Khi bạn leo lên, Athena tự cấm đối phương leo lên tầng.'},
 atlas:{icon:'◆',kind:'Chủ động · chọn xây mái vòm',how:'Sau khi đi quân, đến bước xây hãy bấm “◆ Đặt mái vòm”, sau đó chạm ô được đánh dấu. Bấm lại để xây tầng bình thường.',tip:'Trong bước xây: bấm “◆ Đặt mái vòm”, rồi chạm ô sáng.'},
 demeter:{icon:'▥',kind:'Chủ động · xây thêm ở ô khác',how:'Sau khi xây tầng đầu, game tự mở lượt xây thứ hai. Chạm một ô sáng khác ô vừa xây, hoặc bấm “Bỏ qua”.',tip:'Xây một ô, sau đó chọn ô KHÁC để xây thêm hoặc bấm “Bỏ qua”.'},
 hephaestus:{icon:'▣',kind:'Chủ động · xây thêm cùng ô',how:'Sau khi xây tầng đầu, game cho phép xây thêm một tầng ngay trên chính ô đó (không được xây mái vòm). Chạm ô sáng hoặc “Bỏ qua”.',tip:'Xây lần đầu, sau đó chạm LẠI ô đó nếu được đánh dấu.'},
 hermes:{icon:'☄',kind:'Chủ động · đi ngang nhiều lần',how:'Chọn quân và di chuyển qua các ô cùng độ cao. Có thể tiếp tục đi ngang; muốn dừng, chọn quân định xây rồi bấm “Xây ngay →”. Bạn cũng có thể xây mà không di chuyển.',tip:'Chạm ô cùng tầng để tiếp tục, hoặc chọn quân rồi bấm “Xây ngay →”.'},
 minotaur:{icon:'➜',kind:'Tự động · đẩy quân đối thủ',how:'Chọn quân rồi chạm ô có quân đối thủ được đánh dấu. Nếu phía sau đối thủ có ô trống hợp lệ, quân đối thủ sẽ bị đẩy lùi một ô.',tip:'Chạm ô quân đối thủ được đánh dấu để đẩy (nếu ô phía sau trống).'},
 pan:{icon:'↘',kind:'Tự động · điều kiện thắng đặc biệt',how:'Ngoài cách leo từ tầng 2 lên 3, Pan thắng ngay khi di chuyển xuống ít nhất 2 tầng, ví dụ 2 → 0.',tip:'Di chuyển xuống từ tầng 2 → 0 sẽ thắng ngay, không cần bật kỹ năng.'},
 prometheus:{icon:'⚡',kind:'Chủ động · xây trước khi đi',how:'Ở bước di chuyển, chọn quân, bấm “⚡ Xây trước”, chạm ô sáng để xây, rồi di chuyển đúng quân đó. Sau khi xây trước, không được di chuyển lên tầng.',tip:'Chọn quân → “⚡ Xây trước” → chạm ô xây → di chuyển quân.'}
};
Object.assign(POWER_GUIDE,{
 aphrodite:{icon:'♥',kind:'Tự động · hạn chế di chuyển',how:'Nếu đối thủ bắt đầu lượt cạnh quân Aphrodite, họ phải kết thúc nước đi cuối cạnh quân Aphrodite.',tip:'Đứng cạnh quân đối thủ để buộc họ không thể bỏ đi xa.'},
 ares:{icon:'⚒',kind:'Cuối lượt · phá khối',how:'Sau khi di chuyển và xây, chạm khối sáng cạnh quân không di chuyển để phá, hoặc bấm Bỏ qua.',tip:'Cuối lượt: phá một khối cạnh quân không di chuyển.'},
 bia:{icon:'⚔',kind:'Tự động · hạ quân',how:'Đặt quân trước. Di chuyển tới ô ngay trước quân đối thủ theo cùng hướng để loại quân đối thủ đứng phía sau.',tip:'Tiến quân vào vị trí trước đối thủ để loại quân phía sau.'},
 chaos:{icon:'✧',kind:'Tự động · đổi năng lực',how:'Nhận ngẫu nhiên một thần cơ bản chưa ai sở hữu; sau mỗi lượt xây mái vòm, kỹ năng đổi sang thần khác.',tip:'Theo dõi năng lực Chaos đang sở hữu bên cạnh tên thần.'},
 charon:{icon:'⇄',kind:'Trước khi đi · kéo quân',how:'Chọn quân Charon, chạm quân đối thủ sáng để kéo qua phía đối diện, sau đó đi và xây bình thường.',tip:'Chạm quân đối thủ được đánh dấu để kéo, rồi di chuyển.'},
 chronus:{icon:'⌛',kind:'Tự động · thắng đặc biệt',how:'Ngay khi bàn xuất hiện 5 tòa tháp hoàn chỉnh có mái vòm, Chronus thắng.',tip:'Hướng tới 5 tháp hoàn chỉnh để thắng.'},
 circe:{icon:'☽',kind:'Tự động · mượn năng lực',how:'Nếu hai quân đối thủ không đứng cạnh nhau đầu lượt, Circe dùng năng lực thần đối thủ và vô hiệu hóa năng lực của họ tới lượt Circe tiếp theo.',tip:'Chia tách quân đối thủ để mượn kỹ năng của họ.'},
 dionysus:{icon:'♧',kind:'Thêm lượt · điều khiển quân',how:'Khi hoàn tất một tháp bằng mái vòm, chọn Điều khiển để đi và xây bằng quân đối thủ, hoặc Bỏ qua; không thể thắng trong lượt phụ.',tip:'Xây mái vòm hoàn chỉnh để nhận lượt điều khiển quân đối thủ.'},
 eros:{icon:'♡',kind:'Tự động · thắng đặc biệt',how:'Đặt hai quân ở hai rìa đối diện. Di chuyển để hai quân đứng cạnh nhau trên tầng 1 (trận 3 người: cùng cao độ) thì thắng.',tip:'Di chuyển hai quân sát nhau trên tầng yêu cầu để thắng.'},
 hera:{icon:'♛',kind:'Tự động · chặn thắng viền',how:'Không đối thủ nào có thể thắng khi di chuyển tới ô rìa ngoài bàn.',tip:'Đối thủ không thể chiến thắng ở viền bàn.'},
 hestia:{icon:'▦',kind:'Xây thêm · ô trong',how:'Sau lần xây đầu, chọn ô trong lòng bàn để xây thêm hoặc bấm Bỏ qua.',tip:'Xây thêm một lần, chỉ tại ô không thuộc viền bàn.'},
 hypnus:{icon:'☁',kind:'Tự động · khóa quân',how:'Quân đối thủ cao hơn tất cả quân khác của họ không thể di chuyển trong lượt ấy.',tip:'Quân cao nhất duy nhất của đối thủ bị khóa.'},
 limus:{icon:'⊘',kind:'Tự động · cấm xây gần',how:'Đối thủ không được xây sát quân Limus, trừ xây mái vòm hoàn chỉnh.',tip:'Cấm xây sát quân của bạn ngoại trừ mái vòm tầng 3.'},
 medusa:{icon:'☿',kind:'Tự động · hóa đá',how:'Cuối lượt, quân đối thủ đứng cạnh quân Medusa nhưng thấp hơn sẽ bị loại và thay bằng một khối công trình.',tip:'Đứng cao hơn sát đối thủ để hóa đá cuối lượt.'},
 morpheus:{icon:'◈',kind:'Dự trữ · xây nhiều lần',how:'Đầu lượt nhận một khối xây dự trữ. Sau khi đi, dùng số khối tích lũy để xây nhiều lần hoặc Bỏ qua.',tip:'Tích khối, di chuyển rồi xây liên tiếp từ kho dự trữ.'},
 persephone:{icon:'🌱',kind:'Tự động · ép leo tầng',how:'Nếu đối thủ có nước đi hợp lệ lên tầng cao hơn, đối thủ bắt buộc phải leo tầng.',tip:'Ép đối thủ leo tầng nếu có thể.'},
 poseidon:{icon:'♆',kind:'Cuối lượt · xây tới 3 lần',how:'Nếu quân không di chuyển đứng ở tầng 0, sau lượt bình thường có thể xây thêm tối đa ba lần bằng quân đó hoặc Bỏ qua.',tip:'Giữ một quân ở tầng 0 để xây thêm ba lần.'},
 selene:{icon:'☾',kind:'Chủ động · mái vòm',how:'Sau khi đi, bấm Đặt mái vòm rồi chọn ô sáng bên cạnh quân nữ (quân thứ hai), dù quân nam vừa di chuyển.',tip:'Dùng mái vòm từ quân nữ (quân thứ hai).'},
 triton:{icon:'≈',kind:'Chủ động · đi tiếp',how:'Khi quân vào ô viền bàn, có thể di chuyển tiếp hoặc bấm Bỏ qua để chuyển sang xây.',tip:'Đi tới ô viền, chọn đi tiếp hoặc Bỏ qua.'},
 zeus:{icon:'⚡',kind:'Chủ động · xây dưới chân',how:'Sau khi di chuyển, chạm chính ô quân đang đứng để xây một khối ngay dưới chân nếu chưa ở tầng 3.',tip:'Bước xây: chạm ô quân đang đứng được đánh dấu.'}
});
const escHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let powerFocus=null;
function seatGod(v,seat){return v.modeId==='fleece'?v.game.fleeceGod:v.capacity===4?v.seatGods?.[seat]??null:v.game.gods?.[seat]??null;}
function abilityHint(g,id,ownTurn){
 const help=POWER_GUIDE[id];if(!help)return 'Đang đợi chọn thần.';
 if(!ownTurn)return help.tip;
 switch(g.phase){
  case 'place':return 'Đặt hai quân lên các ô trống trước khi dùng kỹ năng.';
  case 'move':
   if(id==='prometheus'&&g.ctx?.prometheusUsed)return 'Đã xây trước: chạm ô sáng để di chuyển đúng quân, không được leo lên.';
   if(id==='prometheus'&&S.powerMode==='prebuild')return 'Đang bật Xây trước: chạm ô sáng để xây trước khi di chuyển.';
   if(id==='atlas'||id==='demeter'||id==='hephaestus')return 'Chọn quân và di chuyển trước, kỹ năng được dùng ở bước xây.';
   if(id==='hermes')return S.selected===null?'Chọn quân để đi ngang hoặc chọn quân muốn xây ngay.':help.tip;
   return help.tip;
  case 'extraMove':return id==='artemis'?'Chạm ô sáng để đi lần 2 hoặc bấm “Bỏ qua”. Không quay lại ô đầu.':help.tip;
  case 'hermesMove':return 'Chọn quân để đi ngang tiếp; muốn xây, chọn quân rồi bấm “Xây ngay →”.';
  case 'tritonMove':return 'Triton đang ở rìa: chạm ô để đi tiếp hoặc Bỏ qua để xây.';
  case 'aresRemove':return 'Ares: chạm khối được đánh dấu để phá hoặc Bỏ qua.';
  case 'morpheusBuild':return 'Morpheus: còn '+(g.advanced?.morpheus?.[g.turn]||0)+' khối dự trữ. Xây hoặc Bỏ qua.';
  case 'poseidonBuild':return 'Poseidon: còn '+(g.ctx?.bonusRemaining||0)+' lần xây thêm. Xây hoặc Bỏ qua.';
  case 'dionysusChoice':return 'Dionysus: chọn đội đối thủ muốn điều khiển hoặc Bỏ qua.';
  case 'dionysusMove':return 'Dionysus: chọn quân đối thủ rồi di chuyển.';
  case 'dionysusBuild':return 'Dionysus: xây một khối bằng quân đối thủ.';
  case 'build':
   if(id==='atlas')return S.powerMode==='dome'?'Đang bật mái vòm: chạm ô sáng để đặt.':'Bấm “◆ Đặt mái vòm” hoặc chạm ô sáng để xây tầng.';
   if(id==='hermes')return 'Chạm ô sáng để xây với quân bạn đã chọn.';
   return 'Chạm ô sáng để xây. '+(id==='demeter'||id==='hephaestus'?'Sau đó bạn được chọn xây thêm.':'');
  case 'extraBuild':return id==='demeter'?'Xây thêm ở ô KHÁC hoặc bấm “Bỏ qua”.':id==='hephaestus'?'Chạm LẠI ô vừa xây để thêm một tầng hoặc “Bỏ qua”.':id==='hestia'?'Chạm ô trong lòng bàn để xây thêm hoặc Bỏ qua.':'Có thể xây thêm hoặc bỏ qua.';
  default:return help.tip;
 }
}
function renderPowers(){
 const v=S.view;if(!v||v.ruleset!=='god')return;
 const g=v.game,seat=v.activeSeat??g.turn;
 const currentGod=seatGod(v,seat);
 const currentPlayer=v.players?.[seat];
 const mine=S.seat===seat,ready=!!v.ready;
 $('powerOwner').textContent=v.modeId==='fleece'?(g.ctx?.fleeceActive===seat?'🐏 ĐƯỢC CỪU BAN PHÉP':'🐏 NĂNG LỰC CHUNG'):ready?(mine?'⚡ LƯỢT CỦA BẠN':'⚡ '+(currentPlayer?.bot?'BOT ĐANG CHƠI':'ĐANG ĐẾN LƯỢT')):'⚡ CHỜ ĐỦ NGƯỜI';
 $('powerActiveName').textContent=currentGod?v.gods?.[currentGod]?.name||currentGod:'Chưa chọn thần';
 $('powerUseHint').textContent=v.modeId==='fleece'&&g.phase==='ramPlace'?'Chạm một ô trống để đặt tượng Cừu Vàng.':v.modeId==='fleece'&&g.ram&&g.ctx?.fleeceActive!==seat?'Đứng cạnh Cừu Vàng khi bắt đầu lượt mới để nhận năng lực.':currentGod?abilityHint(g,currentGod,mine&&isTurn()):'Chọn God Power trước khi đặt quân.';
 const roster=v.players.map((p,i)=>{
  const power=seatGod(v,i),info=v.gods?.[power],you=i===S.seat,active=i===seat;
  const dead=!!g.eliminated?.[i],title=power?info?.name||power:'Chưa chọn';
  const name=p.name;
  return '<button type="button" class="power-god-chip'+(you?' yours':'')+(active?' on-turn':'')+(dead?' eliminated':'')+'" data-power-seat="'+i+'" title="'+escHtml(name+' · '+title+(power?' · '+(POWER_GUIDE[power]?.tip||''):''))+'" aria-label="Xem kỹ năng '+escHtml(title)+' của '+escHtml(name)+'"><strong>'+(you?'★ ':'')+escHtml(title)+'</strong><small>'+escHtml(name)+'</small></button>';
 });
 $('godRoster').innerHTML=roster.join('');
 if(!$('powersOverlay').classList.contains('hidden'))renderPowerCards();
}
function renderPowerCards(){
 const v=S.view;if(!v)return;
 const g=v.game,current=v.activeSeat??g.turn;
 const cards=v.players.map((p,i)=>{
  const id=seatGod(v,i),info=v.gods?.[id],guide=POWER_GUIDE[id],mine=i===S.seat,active=i===current;
  const type=guide?.kind||'Chưa chọn thần',how=guide?.how||'Người chơi này chưa chọn thần.',name=info?.name||'Chưa chọn';
  return '<article class="power-detail-card'+(mine?' is-own':'')+(active?' is-current':'')+(g.eliminated?.[i]?' is-eliminated':'')+'" data-power-card="'+i+'">'+
   '<div class="power-detail-header"><span class="power-symbol">'+escHtml(guide?.icon||'✦')+'</span><div><b>'+escHtml(name)+'</b><div class="power-owner-name">'+escHtml(p.name)+(mine?' · BẠN':'')+(p.bot?' · BOT':'')+'</div></div></div>'+
   '<div class="power-type">'+escHtml(type)+'</div><p>'+escHtml(info?.description||'Chưa chọn kỹ năng.')+'</p>'+
   '<div class="power-how"><strong>Cách thực hiện:</strong> '+escHtml(how)+'</div>'+
   (active&&id?'<div class="power-state">Trong lượt hiện tại: '+escHtml(abilityHint(g,id,mine&&isTurn()))+'</div>':'')+
  '</article>';
 });
 $('powersCards').innerHTML=cards.join('');
 if(powerFocus!==null){const el=$('powersCards').querySelector('[data-power-card="'+powerFocus+'"]');el?.scrollIntoView({block:'nearest',behavior:'instant'});}
}
function openPowers(seat=null){
 powerFocus=seat;
 $('powersOverlay').classList.remove('hidden');renderPowerCards();
}
function closePowers(){$('powersOverlay').classList.add('hidden');powerFocus=null;}

function message(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function beep(f=520){if(!S.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.value=f;v.gain.setValueAtTime(.034,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.17);}catch{}}
function roomCode(){return Array.from(crypto.getRandomValues(new Uint32Array(8)),x=>ALPHABET[x%ALPHABET.length]).join('');}
function seatToken(room){const key='santorini-seat:'+room;let t=localStorage.getItem(key);if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,t);}return t;}
function enter(room,mode='online',ruleset='classic',capacity=2,spectate=false,variant=chosenMode){
 S.mode=mode;S.ruleset=ruleset;S.capacity=capacity;S.variant=variant;S.spectate=spectate;S.room=room;S.seat=-1;S.active=true;S.view=null;S.selected=null;S.attempt=0;S.epoch++;S.oldRevision=-1;S.powerMode='move';
 S.difficulty=$('difficultySelect').value;
 $('landing').classList.add('hidden');$('game').classList.remove('hidden');$('exitBtn').classList.remove('hidden');
 history.replaceState({},'',location.pathname+'?room='+encodeURIComponent(room)+(mode==='bot'?'&mode=bot':ruleset==='god'?'&ruleset=god':'')+(capacity>2?'&players='+capacity:'')+'&variant='+encodeURIComponent(S.variant)+(spectate?'&spectate=1':''));
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
 url.searchParams.set('variant',S.variant);
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
  S.ruleset=S.view.ruleset??'classic';S.capacity=S.view.capacity||2;S.variant=S.view.modeId||S.variant;
  if(old&&old.revision!==S.view.game.revision){
   if(S.view.game.ctx?.prometheusUsed)S.powerMode='move';
   const g=S.view.game;
   if(g.phase==='move'&&g.ctx?.fixedWorker!==undefined)S.selected=g.ctx.fixedWorker;
   else if(['extraMove','tritonMove'].includes(g.phase))S.selected=g.selected;
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
function myTeam(){return S.seat<0?-1:S.capacity===3?S.seat:S.seat%2;}
function availableTiles(){
 const v=S.view;if(!v||!isTurn())return [];
 const g=v.game,phase=g.phase;
 if(phase==='place')return getActions('place');
 if(phase==='ramPlace')return getActions('placeRam');
 if(['move','extraMove','hermesMove','tritonMove','dionysusMove'].includes(phase)){
  if(S.selected===null)return [];
  return getActions(S.powerMode==='prebuild'?'prebuild':'move',S.selected).concat(S.powerMode==='move'?getActions('ferry',S.selected):[]);
 }
 if(['build','extraBuild','morpheusBuild','poseidonBuild','dionysusBuild'].includes(phase)){
  return getActions('build').filter(x=>!!x.dome===(S.powerMode==='dome'));
 }
 if(phase==='aresRemove')return getActions('removeBlock');
 return [];
}
function tileClick(row,col){
 const v=S.view;if(!isTurn()||!v)return;
 const g=v.game,phase=g.phase;
 if(phase==='place'){const a=getActions('place').find(a=>a.row===row&&a.col===col);if(a)send({type:'place',row,col});return;}
 if(phase==='ramPlace'){const a=getActions('placeRam').find(a=>a.row===row&&a.col===col);if(a)send({type:'placeRam',row,col});return;}
 if(['move','extraMove','hermesMove'].includes(phase)){
  const actor=phase==='dionysusMove'?g.ctx?.dionysusTarget:myTeam();
  const worker=g.workers[actor]?.findIndex(w=>w.row===row&&w.col===col);
  const allowedWorker=worker!==-1&&worker!==undefined&&getActions('move',worker).length+getActions('prebuild',worker).length+getActions('endMove',worker).length+getActions('ferry',worker).length>0;
  if(allowedWorker&&!(phase==='extraMove'&&worker!==g.selected)){
   S.selected=worker;S.powerMode='move';beep(380);render();return;
  }
  const action=availableTiles().find(a=>a.row===row&&a.col===col);
  if(action){send({type:action.type,worker:action.worker,row,col});if(action.type==='move')S.selected=null;if(action.type==='prebuild'){S.selected=action.worker;S.powerMode='move';}}
  else message('Chọn quân của bạn rồi chạm vào ô có vòng sáng.');
 }else if(['build','extraBuild','morpheusBuild','poseidonBuild','dionysusBuild'].includes(phase)){
  const a=availableTiles().find(a=>a.row===row&&a.col===col);
  if(a)send({type:'build',row,col,...(a.dome?{dome:true}:{}),...(a.under?{under:true}:{})});
  else message('Hãy chọn vị trí xây có vòng sáng.');
 }else if(phase==='aresRemove'){
  const a=availableTiles().find(x=>x.row===row&&x.col===col);
  if(a)send({type:'removeBlock',row,col});else message('Chạm khối cần phá hoặc Bỏ qua.');
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
  const control=g.phase==='dionysusMove'?g.ctx?.dionysusTarget:own;
  const choose=owner===control&&['move','extraMove','hermesMove','tritonMove','dionysusMove'].includes(g.phase);
  html+='<button class="tile '+(active?'legal ':'')+(choose&&wi===S.selected?'selected ':'')+'" data-row="'+row+'" data-col="'+col+'" aria-label="Ô '+(row+1)+'-'+(col+1)+' tầng '+level+'">';
  if(level){html+='<span class="building">';for(let n=0;n<Math.min(3,level);n++)html+='<span class="block"></span>';if(level===4)html+='<span class="dome"></span>';html+='</span><span class="level-pill">'+(level===4?'◆':level)+'</span>';}
  if(owner>=0)html+='<span class="worker p'+owner+'"><span class="worker-head"></span><span class="worker-body"></span><span class="worker-base"></span></span>';
  if(g.ram?.row===row&&g.ram?.col===col)html+='<span class="ram-token" title="Cừu Vàng">🐏</span>';
  html+='</button>';
 }
 $('board').innerHTML=html;
}
function renderBoard(){
 const v=S.view;if(!v)return;
 drawFallback();
 const ram=v.game.ram;
 $('ramMarker2d').classList.toggle('hidden',!ram);
 if(ram)$('ramMarker2d').textContent='🐏 Cừu Vàng · ô '+(ram.row+1)+'–'+(ram.col+1);
 if(S.three)S.three.update(v.game,availableTiles(),S.selected===null||S.seat===-1?null:{p:v.game.phase==='dionysusMove'?v.game.ctx?.dionysusTarget:myTeam(),i:S.selected},['build','extraBuild','morpheusBuild','poseidonBuild','dionysusBuild','aresRemove'].includes(v.game.phase)||S.powerMode==='prebuild');
}
function renderGodPick(g){
 const picking=['godpick','fleecePick'].includes(g.phase);
 const active=S.view?.ready&&isTurn()&&picking;
 $('godOverlay').classList.toggle('hidden',!picking||!S.view?.ready);
 if(!picking||!S.view?.ready)return;
 $('godPickTitle').textContent=g.phase==='fleecePick'?'Chọn năng lực chung cho Cừu Vàng':active?'Chọn vị thần của bạn':'Đối thủ đang chọn thần';
 $('godPickHint').textContent=g.phase==='fleecePick'?'Chọn một thần cơ bản. Ai đứng cạnh Cừu Vàng vào đầu lượt sẽ nhận năng lực thần ấy.':'Mỗi ghế chọn một vị thần riêng trước khi đặt quân.';
 const choices=S.view.gods||{},available=new Set(getActions('selectGod').map(x=>x.god)),group=$('godGroup').value;
 $('godCards').innerHTML=Object.entries(choices).filter(([id,info])=>group==='all'||(group==='advanced')===!!info.players).map(([id,info])=>{
  const picked=(S.view.capacity===4?S.view.seatGods:g.gods).includes(id),eligible=available.has(id),disabled=!active||picked||!eligible;
  return '<button class="god-card '+(info.players?'advanced ':'')+(picked?'picked ':'')+(!eligible?'unavailable ':'')+'" data-god="'+id+'" '+(disabled?'disabled':'')+'><span class="type-tag">'+(info.players?'NÂNG CAO':'CƠ BẢN')+'</span><span class="god-symbol">✦</span><strong>'+escHtml(info.name)+'</strong><small>'+escHtml(info.description)+'</small>'+(picked?'<span class="taken">ĐÃ CHỌN</span>':!eligible?'<span class="taken">KHÓA</span>':'')+'</button>';
 }).join('');
}
function render(){
 const connected=S.ws?.readyState===WebSocket.OPEN,v=S.view;
 $('connection').textContent=connected?'● Trực tuyến':'○ Đang kết nối';
 $('liveDot').classList.toggle('off',!connected);
 $('soundBtn').textContent='Âm thanh: '+(S.sound?'Bật':'Tắt');
 $('lightingBtn').textContent=S.lighting==='golden'?'🌅 Hoàng hôn':'☀ Ban ngày';
 $('qualityBtn').textContent=S.quality==='hd'?'✦ HD':S.quality==='eco'?'⚡ Eco':'✧ Auto';
 $('seatText').textContent=S.seat===-1?'Khán giả · Chỉ theo dõi':S.mode==='bot'?'Solo · Bạn ở ghế 1':'Bạn ở ghế '+(S.seat+1)+(S.capacity===4?' · Đội '+(myTeam()+1):'');
 if(!v){$('phaseLabel').textContent='Đang tải bàn chơi…';$('hint').textContent='Kết nối máy chủ';return;}
 const g=v.game,solo=v.mode==='bot',turn=isTurn();
 $('gameMode').textContent=solo?(v.capacity===3?'SOLO · 2 BOT':v.capacity===4?'SOLO · 3 BOT':'SOLO DEMO'):v.capacity===4?'ĐẤU ĐỘI 2V2':v.capacity===3?'3 NGƯỜI · ĐỘC LẬP':v.ruleset==='god'?'GOD POWERS':'PHÒNG';
 $('modeLive').textContent=MODE_UI[v.modeId]?.title||MODE_UI[S.variant]?.title||'♟ CLASSIC';
 $('roomCode').textContent=solo?'VS BOT':S.room;
 $('copyBtn').classList.toggle('hidden',solo);
 const teamNames=t=>v.players.filter(p=>p.team===t).map(p=>p.name).join(' + ');
 $('name0').textContent=teamNames(0);$('name1').textContent=teamNames(1);
 $('player2').classList.toggle('hidden',v.capacity!==3);
 if(v.capacity===3)$('name2').textContent=teamNames(2);
 for(let i=0;i<3;i++)$('player'+i).classList.toggle('eliminated',!!g.eliminated?.[i]);
 $('teamLabel0').textContent=v.capacity===4?'ĐỘI 01':'NGƯỜI CHƠI 01';
 $('teamLabel1').textContent=v.capacity===4?'ĐỘI 02':'NGƯỜI CHƠI 02';
 $('scoreChip').textContent='🏆 '+(v.stats?.wins||[]).map(n=>n||0).join(' – ');
 $('watcherChip').textContent='👁 '+(v.spectators||0);
 if(!$('historyOverlay').classList.contains('hidden'))renderHistory();
 for(let i=0;i<3;i++)$('player'+i).classList.toggle('active',(v.capacity===4?v.activeSeat%2===i:g.turn===i)&&g.phase!=='ended');
 $('player1').classList.toggle('bot-player',solo);
 $('godInfo').classList.toggle('hidden',v.ruleset!=='god');
 $('god2').classList.toggle('hidden',v.capacity!==3);
 if(v.capacity===3)$('god2').textContent=g.gods?.[2]?v.gods[g.gods[2]]?.name:'Chưa chọn';
 if(v.ruleset==='god'){
  $('god0').textContent=v.capacity===4?[0,2].map(i=>(i+1)+': '+(v.gods[v.seatGods?.[i]]?.name||'—')).join(' · '):(v.gods[g.gods?.[0]]?.name||'Chưa chọn');
  $('god1').textContent=v.capacity===4?[1,3].map(i=>(i+1)+': '+(v.gods[v.seatGods?.[i]]?.name||'—')).join(' · '):(v.gods[g.gods?.[1]]?.name||'Chưa chọn');
  const activeGod=v.capacity===4?v.seatGods?.[v.activeSeat]:g.gods?.[g.turn];
  $('godEffect').textContent=activeGod?v.gods[activeGod]?.description:'Chọn thần để bắt đầu.';
  renderPowers();
 }
 const phases={fleecePick:'CHỌN THẦN CHUNG',ramPlace:'ĐẶT CỪU VÀNG',godpick:'CHỌN THẦN',place:'ĐẶT QUÂN',move:'DI CHUYỂN',extraMove:'DI CHUYỂN 2',hermesMove:'HERMES',tritonMove:'TRITON',dionysusMove:'DIONYSUS',dionysusBuild:'XÂY QUÂN ĐỐI THỦ',dionysusChoice:'CHỌN ĐỐI THỦ',aresRemove:'ARES',poseidonBuild:'POSEIDON',morpheusBuild:'MORPHEUS',build:'XÂY DỰNG',extraBuild:'XÂY THÊM',ended:'KẾT THÚC'};
 $('phaseChip').textContent=phases[g.phase]||'CHƠI';
 const turnName=solo&&g.turn===1?'BOT':v.players[v.activeSeat]?.name||'Đối thủ';
 const messages={fleecePick:'Chọn thần dùng chung cho Cừu Vàng',ramPlace:'Chạm ô trống để đặt Cừu Vàng',godpick:'Chọn vị thần cho trận đấu',place:'Đặt hai quân lên bàn cờ',move:'Chọn quân rồi chạm ô sáng để đi',extraMove:'Artemis: đi thêm hoặc bỏ qua',hermesMove:'Hermes: tiếp tục đi ngang hoặc chọn quân để xây',tritonMove:'Triton: đi tiếp hoặc Bỏ qua',dionysusMove:'Chọn quân đối thủ để di chuyển',dionysusBuild:'Xây bằng quân đối thủ',dionysusChoice:'Chọn đội đối thủ để điều khiển',aresRemove:'Ares: phá khối hoặc Bỏ qua',poseidonBuild:'Poseidon: xây thêm hoặc Bỏ qua',morpheusBuild:'Morpheus: xây từ kho dự trữ hoặc Bỏ qua',build:'Chạm ô sáng để xây',extraBuild:'Có thể xây thêm hoặc bỏ qua',ended:'Trận đấu kết thúc'};
 $('phaseLabel').textContent=!v.ready?'Đợi đủ '+(v.capacity||2)+' người':g.phase==='ended'?'Đã kết thúc':turn?messages[g.phase]:(turnName+' đang thực hiện lượt');
 $('hint').textContent=!v.ready?'Sao chép link mời bạn bè tham gia.':turn?(g.phase==='move'&&g.ctx?.prometheusUsed?'Prometheus đã xây trước: không được di chuyển lên tầng.':messages[g.phase]):g.lastAction;
 renderGodPick(g);
 if(g.phase==='extraMove')S.selected=g.selected;
 if(g.phase==='move'&&g.ctx?.fixedWorker!==undefined)S.selected=g.ctx.fixedWorker;
 if(!turn&&g.phase!=='ended')S.selected=null;
 if(turn&&S.selected===null&&['move','hermesMove','tritonMove','dionysusMove'].includes(g.phase)){
  const legalWorkers=[...new Set(getActions('move').map(a=>a.worker))];
  if(legalWorkers.length===1)S.selected=legalWorkers[0];
 }
 const showPower=turn&&g.phase==='move'&&S.selected!==null&&getActions('prebuild',S.selected).length>0;
 $('powerBtn').classList.toggle('hidden',!showPower);
 $('powerBtn').classList.toggle('chosen',S.powerMode==='prebuild');
 $('powerBtn').textContent=S.powerMode==='prebuild'?'↩ Đi bình thường':'⚡ Xây trước';
 const dome=turn&&g.phase==='build'&&getActions('build').some(x=>x.dome);
 $('domeBtn').classList.toggle('hidden',!dome);
 $('domeBtn').classList.toggle('chosen',S.powerMode==='dome');
 $('domeBtn').textContent=S.powerMode==='dome'?'↩ Xây tầng':'◆ Đặt mái vòm';
 $('skipBtn').classList.toggle('hidden',!(turn&&getActions('skip').length));
 $('advancedActions').innerHTML=turn?getActions('commandeer').map(a=>'<button type="button" class="mini" data-command="'+a.target+'">Điều khiển phe '+(a.target+1)+'</button>').join(''):'';
 const end=turn&&S.selected!==null&&getActions('endMove',S.selected).length>0;
 $('endMoveBtn').classList.toggle('hidden',!end);
 $('restartBtn').classList.toggle('hidden',g.phase!=='ended'||S.seat<0);
 $('fillBotsBtn').classList.toggle('hidden',!(S.seat===0&&!v.ready&&v.mode==='online'&&v.capacity>2&&g.revision===0));
 $('winOverlay').classList.toggle('hidden',g.phase!=='ended');
 $('rematchBtn').classList.toggle('hidden',S.seat<0);
 if(g.phase==='ended'){
  $('winTitle').textContent=g.winner===myTeam()?(v.capacity===3?'Bạn chiến thắng!':'Đội bạn chiến thắng!'):solo?'BOT chiến thắng!':(v.capacity===3?'Người chơi ':'Đội ')+(g.winner+1)+' chiến thắng!';
  $('winText').textContent=g.lastAction;
 }
 renderBoard();
}
$('powersHelpBtn').onclick=()=>openPowers(null);
$('godRoster').addEventListener('click',e=>{const b=e.target.closest('[data-power-seat]');if(b)openPowers(Number(b.dataset.powerSeat));});
$('powersCloseBtn').onclick=closePowers;
$('powersOverlay').addEventListener('click',e=>{if(e.target===$('powersOverlay'))closePowers();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('powersOverlay').classList.contains('hidden'))closePowers();});
$('board').addEventListener('click',e=>{const b=e.target.closest('.tile');if(b)tileClick(+b.dataset.row,+b.dataset.col);});
$('godGroup').onchange=()=>{if(S.view)renderGodPick(S.view.game);};
$('godCards').addEventListener('click',e=>{const b=e.target.closest('button[data-god]');if(b&&!b.disabled)send({type:'selectGod',god:b.dataset.god});});
$('createBtn').onclick=()=>{
 const config=MODE_UI[chosenMode];
 enter(roomCode(),'online',config.god?'god':'classic',config.n,false,chosenMode);
};
$('modeGrid').onclick=e=>{const target=e.target.closest('[data-mode]');if(target)selectMode(target.dataset.mode);};
$('teamSize').onchange=()=>selectMode($('teamSize').value==='3'?'trio':$('teamSize').value==='4'?'teams':'duel');
$('botCountSelect').onchange=()=>{
 const n=Number($('botCountSelect').value);
 if(n===3)selectMode('trio');
 else if(n===4)selectMode('teams');
 else if(MODE_UI[chosenMode].n!==2)selectMode('duel');
};
$('demoBtn').onclick=()=>{
 const config=MODE_UI[chosenMode];
 enter(roomCode(),'bot',config.god?'god':'classic',config.n,false,chosenMode);
};
$('fillBotsBtn').onclick=()=>send({type:'fillBots',difficulty:$('difficultySelect').value});
$('joinBtn').onclick=()=>{const room=$('codeInput').value.trim().toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(room))return message('Mã phòng không hợp lệ.');enter(room,'online','classic');};
$('watchBtn').onclick=()=>{const room=$('codeInput').value.trim().toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(room))return message('Mã phòng không hợp lệ.');enter(room,'online','classic',2,true);};
$('codeInput').onkeydown=e=>{if(e.key==='Enter')$('joinBtn').click();};
$('nameInput').onkeydown=e=>{if(e.key==='Enter')$('createBtn').click();};
$('copyBtn').onclick=async()=>{const link=location.origin+location.pathname+'?room='+S.room+(S.ruleset==='god'?'&ruleset=god':'')+(S.capacity>2?'&players='+S.capacity:'')+'&variant='+encodeURIComponent(S.variant);try{await navigator.clipboard.writeText(link);message('Đã sao chép link mời.');}catch{prompt('Link mời',link);}};
$('exitBtn').onclick=()=>{
 if(S.seat>=0&&S.ws?.readyState===WebSocket.OPEN)S.ws.send(JSON.stringify({type:'leave'}));
 S.active=false;S.epoch++;S.ws?.close();S.view=null;S.seat=-1;S.room=null;
 $('historyOverlay').classList.add('hidden');closePowers();
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
$('advancedActions').onclick=e=>{const b=e.target.closest('[data-command]');if(b)send({type:'commandeer',target:Number(b.dataset.command)});};
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
selectMode('duel');
const params=new URLSearchParams(location.search),linkRoom=params.get('room');
if(linkRoom&&/^[A-Z2-9]{6,10}$/.test(linkRoom.toUpperCase())){
 $('codeInput').value=linkRoom.toUpperCase();
 if(localStorage.getItem('santorini-name')||params.get('spectate')==='1')enter(linkRoom.toUpperCase(),params.get('mode')==='bot'?'bot':'online',params.get('ruleset')==='god'?'god':'classic',Number(params.get('players'))||2,params.get('spectate')==='1',params.get('variant')||'duel');
}
