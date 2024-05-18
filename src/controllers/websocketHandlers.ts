import { PlayVideo, TogglePlayingState } from "../services/puppeteer";
import { WebSocketEventKeys } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser } from "puppeteer";


/*
 * The current video state
 */
let currentVideo: Video | undefined;
let isPlaying: boolean = false;


/**
 * Handles all socket events.
 * 
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function HandleSocketConnection(browser: Browser | undefined, io: WsServer, socket: Socket, ) {

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
  socket.on(WebSocketEventKeys.setCurrentVideo, async (video: Video) => {
    console.log("Socket:", "Setting currentVideo", video.videoId);

    if (browser) {
      await PlayVideo(browser, io, video.videoId)
      currentVideo = video;
      isPlaying = true;
      io.emit(WebSocketEventKeys.currentVideo, currentVideo);
      io.emit(WebSocketEventKeys.isPlaying, true);
    } else {
      io.emit(WebSocketEventKeys.error, "No browser found");
    }
  });

  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(WebSocketEventKeys.setIsPlaying, async (isPlayingState: boolean) => {
    if (browser && currentVideo) {
      console.log("Socket: Setting isPlaying", isPlayingState);
      isPlaying = isPlayingState;

      await TogglePlayingState(browser, io, currentVideo.videoId, isPlayingState);
      io.emit(WebSocketEventKeys.isPlaying, isPlaying);
    } else {
      io.emit(WebSocketEventKeys.error, "No browser or current video found");
    }
  });
}
