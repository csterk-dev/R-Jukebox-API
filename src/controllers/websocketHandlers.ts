import { playVideo, togglePlayingState } from "../services/puppeteer";
import { SOCKET_EVENT_KEYS, SYSTEM_VOLUME_DEFAULT } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser } from "puppeteer";


/*
 * The current video state
 */
let currentVideo: Video | undefined;
let isPlaying: boolean = false;
let systemVolume: number | undefined = SYSTEM_VOLUME_DEFAULT;

/**
 * Handles all socket events.
 * 
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function handleSocketConnection(browser: Browser | undefined, io: WsServer, socket: Socket,) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(SOCKET_EVENT_KEYS.getInitialState, (incomingClientId) => {
    setTimeout(() => {
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.systemVolume, systemVolume);
    }, 200);
  });

  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (incomingVideo: Video) => {
    if (browser) {
      console.log("Socket:", "Setting currentVideo", incomingVideo.videoId);

      const exitCode = await playVideo(browser, io, incomingVideo.videoId);
      if (exitCode === 1) return;

      currentVideo = incomingVideo;
      isPlaying = true;

      io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.emit(SOCKET_EVENT_KEYS.isPlaying, true);
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    }
  });

  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingIsPlaying: boolean) => {
    if (browser && currentVideo) {
      console.log("Socket: Setting isPlaying", incomingIsPlaying);

      const exitCode = await togglePlayingState(browser, io, currentVideo.videoId, incomingIsPlaying);
      if (exitCode === 1) return;
      
      isPlaying = incomingIsPlaying;

      io.emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, "No browser or current video found");
    }
  });

  /**
   * Endpoint to update the system volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setSystemVolume, async (incomingSystemVol: number) => {
    if (systemVolume !== incomingSystemVol) {
      console.log("Socket:", "Setting systemVol", incomingSystemVol);

      // TODO
      systemVolume = incomingSystemVol;

      io.emit(SOCKET_EVENT_KEYS.systemVolume, systemVolume);
    }
  });
}
