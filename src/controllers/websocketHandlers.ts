import { adjustPlayerVolume, checkForEndOfVideo, getPlayerPage, playVideo, togglePlayingState } from "../services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, SOCKET_EVENT_KEYS } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser } from "puppeteer";


/*
 * The current video state
 */
let checkVideoInterval: NodeJS.Timeout | undefined;
let currentVideo: Video | undefined;
let currentVideoTime: number | undefined;
let isPlaying: boolean = false;
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

      const exitCode = await playVideo(browser, io, incomingVideo.videoId, playerVolume);
      if (exitCode === 1) return;

      currentVideo = incomingVideo;
      isPlaying = true;

      io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

      // Start checking for the end of the video
      if (currentVideo) {
        startCheckForEndOfVideo(browser, io, currentVideo.videoId);
      }
    } 
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingIsPlaying: boolean) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    else if (!currentVideo) io.emit(SOCKET_EVENT_KEYS.error, `Cannot ${incomingIsPlaying ? "play" : "pause"} while there isn't a current video.`);
    else {
      
      const exitCode = await togglePlayingState(browser, io, currentVideo.videoId, incomingIsPlaying);
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
    else if (!currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change volume while there isn't a current video.");
    else if (playerVolume !== incomingPlayerVol) {
      
      const exitCode = await adjustPlayerVolume(browser, io, currentVideo.videoId, incomingPlayerVol)
      if (exitCode === 1) return;
      console.log("Socket:", "Setting playerVol", incomingPlayerVol);

      playerVolume = incomingPlayerVol;

      io.emit(SOCKET_EVENT_KEYS.playerVolume, playerVolume);
    }
  });
}



/**
 * Function that checks the current time and duration while the current video is playing to determine if the video has ended.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 */
async function startCheckForEndOfVideo(browser: Browser, io: WsServer, videoId: string) {
  try {
    const currentPage = await getPlayerPage(browser, videoId);

    if (!currentPage) {
      console.log("StartCheckForEndOfVideo", "Cannot find current video.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot find current video.");
      return;
    }

    if (checkVideoInterval) clearInterval(checkVideoInterval);

    checkVideoInterval = setInterval(async () => {
      if (currentPage && currentVideo && isPlaying) {
        const timeState = await checkForEndOfVideo(currentPage, io);
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