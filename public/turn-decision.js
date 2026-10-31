/**
 * Optional actions only appear when the server authorizes them in legalActions.
 * Keep the Skip/Finish command outside horizontally scrolling special-power buttons.
 */
export const OPTIONAL_PHASES=Object.freeze({
 extraMove:'✓ Dừng di chuyển',extraBuild:'✓ Dừng xây thêm',
 tritonMove:'✓ Dừng di chuyển',heroSprint:'✓ Dừng di chuyển',
 poseidonBuild:'✓ Dừng xây thêm',morpheusBuild:'✓ Kết thúc xây',
 aresRemove:'✓ Không phá khối',dionysusChoice:'✓ Bỏ lượt phụ',
 heroPost:'✓ Không dùng Hero',heroCorner:'✓ Hoàn tất',
 heroDomes:'✓ Dừng dựng mái vòm',heroMedea:'✓ Dừng tháo tầng'
});
export function turnDecision(game,legalActions=[]){
 const canSkip=legalActions.some(a=>a.type==='skip');
 const phase=game?.phase??'';
 const used=phase==='poseidonBuild'?Math.max(0,Math.min(3,3-(game.ctx?.bonusRemaining??3))):null;
 return {
  canSkip,skipLabel:canSkip?(OPTIONAL_PHASES[phase]??'✓ Bỏ qua'):'',
  skipTitle:!canSkip?'':phase==='poseidonBuild'
   ?'Poseidon: đã xây thêm '+used+' lần. Có thể dừng mà không cần đủ 3 lần.'
   :'Kết thúc hiệu ứng tùy chọn và tiếp tục theo luật chơi.',
  bonusUsed:used,bonusLeft:used===null?null:3-used
 };
}
