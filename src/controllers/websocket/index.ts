import { SOCKET_EVENT_KEYS } from "../../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Database } from "sqlite3";
import { StateType } from "index";
import { handleAddToQueue, handleClearQueue, handleDeleteFromQueue, handlePlayNextFromQueue, handlePlayNextVideo, handlePlayPause, handleProgressChange, handleVolumeChange } from "./handlers";
import { Queue } from "../../utils/structures";
import { functionWrapper } from "../../utils/index";


/**
 * Handles all socket events.
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function onSocketConnection(io: WsServer, socket: Socket, db: Database, state: StateType, tasks: Queue<Function>, isShuttingDown: boolean) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(SOCKET_EVENT_KEYS.getInitialState, (incomingClientId: string) => {
    setTimeout(() => {
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.queue, state.queue);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.history, state.history);
    }, 200);
  });


  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, (incomingClientId: string, incomingVideo: Video) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handlePlayNextVideo, [io, db, state, incomingVideo, incomingClientId]));
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingClientId: string, incomingIsPlaying: boolean) => {
    await handlePlayPause(io, state, incomingClientId, incomingIsPlaying);
  });


  /**
   * Endpoint to update the player volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setPlayerVolume, async (incomingClientId: string, incomingPlayerVol: number) => {
    await handleVolumeChange(io, state, incomingClientId, incomingPlayerVol);
  });


  /**
   * Endpoint to update the player progress.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideoTime, async (incomingClientId: string, incomingVideoTime: number) => {
    await handleProgressChange(io, state, incomingClientId, incomingVideoTime);
  });


  /**
   * Endpoint to add a video to the end of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToBottomOfQueue, (incomingClientId: string, incomingVideo: Video) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handleAddToQueue, [db, io, state, incomingClientId, incomingVideo, "bottom"]));
  });


  /**
   * Endpoint to add a video to the start of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToTopOfQueue, (incomingClientId: string, incomingVideo: Video) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handleAddToQueue, [db, io, state, incomingClientId, incomingVideo, "top"]));
  });


  /**
   * Endpoint to delete a video form the queue
   */
  socket.on(SOCKET_EVENT_KEYS.deleteQueueItem, (incomingClientId: string, videoId: Video["videoId"]) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handleDeleteFromQueue, [db, io, state, incomingClientId, videoId]));
  });


  /**
   * Endpoint to play to the next queue item.
   */
  socket.on(SOCKET_EVENT_KEYS.playNextQueueItem, (incomingClientId: string) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handlePlayNextFromQueue, [db, io, state, incomingClientId]));
  });


  /**
   * Endpoint to clear the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.clearQueue, (incomingClientId: string) => {
    if (!isShuttingDown) tasks.enqueue(functionWrapper(handleClearQueue, [db, io, state, incomingClientId]));
  });
}