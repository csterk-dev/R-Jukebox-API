import { StateType } from "index";
import { Server as WsServer } from "socket.io";
import { SOCKET_EVENT_KEYS } from "../../../constants";
import { Database } from "sqlite3";
import { updateLogEntries } from "../../../services/database";


/** Used to validate the player state and returns an error response if any required vars are missing. */
export function isPlayerReady(state: StateType) {
  if (!state.browser) return "No browser found. Refresh and try again.";
  if (!state.currentPage) return "No player page found.";
  if (!state.playerFrame) return "No player frame found.";
  if (!state.currentVideo) return "No current video found.";
  return null
}

/** Resets the state values and updates any connected clients. */
export function clearState(io: WsServer, state: StateType) {
  console.log("ClearState:", "State reset.");
  clearInterval(state.checkVideoInterval);

  state.currentVideo = undefined;
  state.currentVideoTime = 0;
  state.isPlaying = false;
  io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  io.emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
}


/** 
 * Logs the provided information and updates the state var.
 * If the operation fails, then the player is notified via the global error state var instead. 
 */
export async function handleNewLogEntry(db: Database, io: WsServer, state: StateType, errorType: NewEntryLog["type"], callingFunction: NewEntryLog["callingFunction"], stackTrace: NewEntryLog["stackTrace"]): Promise<void> {
  const newLogEntry: NewEntryLog = {
    type: errorType,
    stackTrace,
    callingFunction
  }

  const updatedLogsRes = await updateLogEntries(db, newLogEntry);

  if (!updatedLogsRes.successState.success) {
    io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent ${errorType} from: '${callingFunction}'`);
    return
  }

  state.logs = updatedLogsRes.logs;
  io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
}