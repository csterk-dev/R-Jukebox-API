import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState } from "../services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, SOCKET_EVENT_KEYS } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser, Frame, Page } from "puppeteer";
import { formatISO8601ToSeconds } from "../utils";


/*
 * The current video state
 */
let checkVideoInterval: NodeJS.Timeout | undefined;
let currentPage: Page | null;
let currentVideo: Video | undefined;
let currentVideoTime: number | undefined;
let isPlaying: boolean = false;
let playerFrame: Frame | null;
let playerVolume: number = PLAYER_VOLUME_DEFAULT;


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
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.playerVolume, playerVolume);
    }, 200);
  });


  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (incomingVideo: Video) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    else {
      console.log("Socket:", "Setting currentVideo", incomingVideo.videoId);

      const playerElements = await playVideo(browser, io, incomingVideo.videoId, playerVolume);
      if (!playerElements) return;

      currentPage = playerElements.currentPage;
      playerFrame = playerElements.iFrame;
      currentVideo = incomingVideo;
      currentVideoTime = 0;
      isPlaying = true;

      io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
      io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

      // Prevent race condition from within `playVideo()` where the youtube elements are animating their visibility and thus not 'visible' to be read yet inside of `startCheckForEndOfVideo()`.
      setTimeout(() => startCheckForEndOfVideo(io), 2000);
    }
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingIsPlaying: boolean) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    else if (!currentVideo) io.emit(SOCKET_EVENT_KEYS.error, `Cannot ${incomingIsPlaying ? "play" : "pause"} while there isn't a current video.`);
    else if (!playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player iFrame found.");
    else {

      const exitCode = await togglePlayingState(playerFrame, io, incomingIsPlaying);
      if (exitCode === 1) return;
      console.log("Socket: Setting isPlaying", incomingIsPlaying);

      isPlaying = incomingIsPlaying;

      io.emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
    }
  });


  /**
   * Endpoint to update the player volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setPlayerVolume, async (incomingPlayerVol: number) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
    else if (!currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
    else if (!playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
    else if (!currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change volume while there isn't a current video.");
    else if (playerVolume !== incomingPlayerVol) {

      const exitCode = await adjustPlayerVolume(currentPage, playerFrame, io, incomingPlayerVol)
      if (exitCode === 1) return;
      console.log("Socket:", "Setting playerVol", incomingPlayerVol);

      playerVolume = incomingPlayerVol;

      io.emit(SOCKET_EVENT_KEYS.playerVolume, playerVolume);
    }
  });


  /**
   * Endpoint to update the player progress.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideoTime, async (incomingVideoTime: number) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
    else if (!currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
    else if (!playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
    else if (!currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change the progress while there isn't a current video.");
    else if (currentVideoTime !== incomingVideoTime) {

      const exitCode = await adjustPlayerProgress(currentPage, playerFrame, io, formatISO8601ToSeconds(currentVideo.duration), incomingVideoTime)
      if (exitCode === 1) return;
      console.log("Socket:", "Setting video time", incomingVideoTime);

      currentVideoTime = incomingVideoTime;

      io.emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
    }
  });
}



/**
 * Function that checks the current time and duration while the current video is playing to determine if the video has ended.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 */
function startCheckForEndOfVideo(io: WsServer) {
  try {
    if (checkVideoInterval) clearInterval(checkVideoInterval);

    checkVideoInterval = setInterval(async () => {
      if (currentPage && currentVideo && isPlaying && playerFrame) {
        const timeState = await checkForEndOfVideo(playerFrame, io);
        if (typeof timeState !== "number") {
          if (timeState.hasEnded) {
            currentVideo = undefined;
            currentVideoTime = 0;
            isPlaying = false;
            clearInterval(checkVideoInterval);
            io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
            io.emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
            io.emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);

          } else {
            currentVideoTime = timeState.currentTime;
            io.emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
          }
        }
      }
    }, 5000);

  } catch (err: any) {
    console.log("StartCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current time.");
  }
}