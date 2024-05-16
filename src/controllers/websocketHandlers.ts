import { WebSocketEventKeys } from "../constants";
import { Socket, Server as WsServer } from "socket.io";


/*
 * The current video state
 */
let currentVideo: Video | undefined;
let isPlaying: boolean = false;


/**
 * Handles all socket events regarding the `currentVideo` and `isPlaying` states.
 * 
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function HandleSocketConnection(socket: Socket, io: WsServer) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(WebSocketEventKeys.getInitialState, (incomingClientId) => {
    io.to(incomingClientId).emit(WebSocketEventKeys.isPlaying, isPlaying);
    io.to(incomingClientId).emit(WebSocketEventKeys.currentVideo, currentVideo);
  });

  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(WebSocketEventKeys.setCurrentVideo, (video) => {
    console.log("Socket: Setting current video", video);
    currentVideo = video;
    console.log("Socket: Setting is playing", true);
    isPlaying = true;
    io.emit(WebSocketEventKeys.currentVideo, currentVideo);
    io.emit(WebSocketEventKeys.isPlaying, true);
  });

  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(WebSocketEventKeys.setIsPlaying, (isPlayingState: boolean) => {
    console.log("Socket: Setting is playing", isPlayingState);
    isPlaying = isPlayingState;
    io.emit(WebSocketEventKeys.isPlaying, isPlayingState);
  });
}
