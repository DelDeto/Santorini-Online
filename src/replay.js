// Santorini V1.7: compact, server-authoritative replay and Solo undo checkpoints.
// No player tokens or private room metadata are sent to spectators.
const clone = value => structuredClone(value);
export function recordReplay(room,action,seat){
 const g=room.game;
 const frame={
  revision:g.revision,seat,action:action.type,description:g.lastAction,
  phase:g.phase,turn:g.turn,winner:g.winner,modeId:room.modeId,
  board:g.board.map(row=>row.slice()),
  workers:g.workers.map(team=>team.map(w=>({row:w.row,col:w.col}))),
  gods:g.gods.slice(),ram:g.ram?{row:g.ram.row,col:g.ram.col}:null
 };
 room.replay??=[];
 room.replay.push(frame);
 if(room.replay.length>96)room.replay.splice(0,room.replay.length-96);
}
export function soloCheckpoint(room,seat){
 if(room.mode!=='bot'||seat!==0)return null;
 return {
  createdBy:seat,revisionAfter:null,game:clone(room.game),
  activeSeat:room.activeSeat,athenaAura:room.athenaAura,
  draftIndex:room.draftIndex,seatGods:clone(room.seatGods),
  historyLength:(room.history||[]).length,replayLength:(room.replay||[]).length,
  stats:clone(room.stats)
 };
}
export function canUndoSolo(room,seat=0){
 return room.mode==='bot'&&seat===0&&room.game.phase!=='ended'&&
  room.undo?.createdBy===0&&room.undo.revisionAfter===room.game.revision;
}
export function undoSolo(room,seat=0){
 if(!canUndoSolo(room,seat))return false;
 const saved=room.undo;
 room.game=clone(saved.game);
 room.activeSeat=saved.activeSeat;room.athenaAura=saved.athenaAura;
 room.draftIndex=saved.draftIndex;room.seatGods=clone(saved.seatGods);
 room.history=(room.history||[]).slice(0,saved.historyLength);
 room.replay=(room.replay||[]).slice(0,saved.replayLength);
 room.stats=clone(saved.stats);
 room.undo=null;
 return true;
}
