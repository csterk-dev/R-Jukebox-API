import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState } from "../services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, SOCKET_EVENT_KEYS } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser, Frame, Page } from "puppeteer";
import { formatISO8601ToSeconds } from "../utils";
import { Database } from "sqlite3";
import { getRecentlyPlayed, updateRecentlyPlayed } from "../services/database";


/*
 * The current video state
 */
type StateVars = {
  checkVideoInterval: NodeJS.Timeout | undefined;
  currentPage: Page | null;
  currentVideo: Video | undefined;
  currentVideoTime: number | undefined;
  isPlaying: boolean;
  playerFrame: Frame | null;
  playerVolume: number;
}

const state: StateVars = {
  checkVideoInterval: undefined,
  currentPage: null,
  currentVideo: undefined,
  currentVideoTime: undefined,
  isPlaying: false,
  playerFrame: null,
  playerVolume: PLAYER_VOLUME_DEFAULT
}


/**
 * Handles all socket events.
 * 
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function handleSocketConnection(browser: Browser | undefined, io: WsServer, socket: Socket, db: Database) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(SOCKET_EVENT_KEYS.getInitialState, (incomingClientId: string) => {
    setTimeout(async () => {
      await getInitialState(io, incomingClientId, db);
    }, 200);
  });


  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (incomingClientId: string, incomingVideo: Video) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    else {
      state.currentVideoTime = 0;
      io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);

      if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

      const playerElements = await playVideo(browser, io, incomingVideo.videoId, state.playerVolume);
      if (!playerElements) return;

      console.log("Socket:", "Setting currentVideo", incomingVideo.videoId);

      state.currentPage = playerElements.currentPage;
      state.playerFrame = playerElements.iFrame;
      state.currentVideo = incomingVideo;
      state.isPlaying = true;

      io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
      io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

      // Prevent race condition from within `playVideo()` where the youtube elements are animating their visibility and thus not 'visible' to be read yet inside of `startCheckForEndOfVideo()`.
      setTimeout(() => startCheckForEndOfVideo(io), 2000);

      // Update and return the latest history
      const updateHistoryExitCode = await updateRecentlyPlayed(db, io, incomingClientId, state.currentVideo);
      if (updateHistoryExitCode === 1) return;
      
      const history = await getRecentlyPlayed(db, io, incomingClientId);
      if (!history) return;

      io.emit(SOCKET_EVENT_KEYS.history, history);
    }
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingClientId: string, incomingIsPlaying: boolean) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, `Cannot ${incomingIsPlaying ? "play" : "pause"} while there isn't a current video.`);
    else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player iFrame found.");
    else {

      const exitCode = await togglePlayingState(io, incomingClientId, state.playerFrame, incomingIsPlaying);
      if (exitCode === 1) return;
      console.log("Socket: Setting isPlaying", incomingIsPlaying);

      state.isPlaying = incomingIsPlaying;

      io.emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
    }
  });


  /**
   * Endpoint to update the player volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setPlayerVolume, async (incomingClientId: string, incomingPlayerVol: number) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
    else if (!state.currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
    else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
    else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change volume while there isn't a current video.");
    else if (state.playerVolume !== incomingPlayerVol) {

      const exitCode = await adjustPlayerVolume(io, incomingClientId, state.currentPage, state.playerFrame, incomingPlayerVol)
      if (exitCode === 1) return;
      console.log("Socket:", "Setting playerVol", incomingPlayerVol);

      state.playerVolume = incomingPlayerVol;

      io.emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);
    }
  });


  /**
   * Endpoint to update the player progress.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideoTime, async (incomingClientId: string, incomingVideoTime: number) => {
    if (!browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
    else if (!state.currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
    else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
    else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change the progress while there isn't a current video.");
    else if (state.currentVideoTime !== incomingVideoTime) {

      const exitCode = await adjustPlayerProgress(io, incomingClientId, state.currentPage, state.playerFrame, formatISO8601ToSeconds(state.currentVideo.duration), incomingVideoTime)
      if (exitCode === 1) return;
      console.log("Socket:", "Setting video time", incomingVideoTime);

      state.currentVideoTime = incomingVideoTime;

      io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
    }
  });
}


/**
 * Returns the initial (current) state of the player to the connect client.
 */
async function getInitialState(io: WsServer, incomingClientId: string, db: Database) {
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);

  const history = await getRecentlyPlayed(db, io, incomingClientId);
  if (!history) return;

  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.history, history);
}


/**
 * Function that checks the current time and duration while the current video is playing to determine if the video has ended.
 */
function startCheckForEndOfVideo(io: WsServer) {

  const clearState = () => {
    console.log("StartCheckForEndOfVideo:", "State reset.");
    clearInterval(state.checkVideoInterval);

    state.currentVideo = undefined;
    state.currentVideoTime = 0;
    state.isPlaying = false;
    io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
    io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
    io.emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
  }

  try {
    state.checkVideoInterval = setInterval(async () => {
      if (!state.currentPage || !state.currentVideo || !state.isPlaying || !state.playerFrame) {
        return;
      }

      const timeState = await checkForEndOfVideo(state.playerFrame);

      // If an error occured with the iframe API the video will show an error code and the stop working.
      if (!timeState) {
        io.emit(SOCKET_EVENT_KEYS.error, "An error occured with the player.");
        clearState();
        return;
      }

      if (timeState.hasEnded) {
        clearState();
        return;
      }

      state.currentVideoTime = timeState.currentTime;
      io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);

    }, 5000);

  } catch (err: any) {
    console.log("StartCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current time.");
  }
}