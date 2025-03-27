import { SOCKET_EVENT_KEYS } from "../../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Database } from "sqlite3";
import { StateType } from "index";
import { handleAddToQueue, handleClearQueue, handleDeleteFromQueue, handlePlayNextFromQueue, handlePlayPause, handlePlayVideo, handleProgressChange, handleVolumeChange } from "./handlers";


/**
 * Handles all socket events.
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function onSocketConnection(io: WsServer, socket: Socket, db: Database, state: StateType) {

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
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.logs, state.logs);
    }, 200);
  });


  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (req: VideoRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handlePlayVideo(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (req: PlayPauseRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handlePlayPause(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to update the player volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setPlayerVolume, async (req: UpdatePlayerVolumeRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleVolumeChange(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to update the player progress.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideoTime, async (req: UpdatePlayerTimestampRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleProgressChange(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to add a video to the end of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToBottomOfQueue, async (req: VideoRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleAddToQueue(db, io, state, req, resCallback, "bottom");
  });


  /**
   * Endpoint to add a video to the start of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToTopOfQueue, async (req: VideoRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleAddToQueue(db, io, state, req, resCallback, "top");
  });


  /**
   * Endpoint to delete a video form the queue
   */
  socket.on(SOCKET_EVENT_KEYS.deleteQueueItem, async (req: RemoveQueueItemRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleDeleteFromQueue(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to play to the next queue item.
   */
  socket.on(SOCKET_EVENT_KEYS.playNextQueueItem, async (req: BaseRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handlePlayNextFromQueue(db, io, state, req, resCallback);
  });


  /**
   * Endpoint to clear the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.clearQueue, async (req: BaseRequest, resCallback: (ack: WSAcknowledgement) => void) => {
    await handleClearQueue(db, io, state, req, resCallback);
  });
}