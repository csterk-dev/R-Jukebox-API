import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState } from "../services/puppeteer";
import { PLAYER_CHECK_VIDEO_INTERVAL, SOCKET_EVENT_KEYS } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { formatISO8601ToSeconds } from "../utils";
import { Database } from "sqlite3";
import { addToBottomOfQueue, addToTopOfQueue, clearQueue, deleteQueueItem, getNextQueueItem, updateHistoryItems } from "../services/database";
import { StateType } from "index";



/**
 * Handles all socket events.
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function handleSocketConnection(io: WsServer, socket: Socket, db: Database, state: StateType) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(SOCKET_EVENT_KEYS.getInitialState, (incomingClientId: string) => {
    setTimeout(() => {
      getInitialState(io, incomingClientId, state);
    }, 200);
  });


  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (incomingClientId: string, incomingVideo: Video) => {
    await handlePlayNextVideo(io, db, state, incomingVideo, incomingClientId);
  });


  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingClientId: string, incomingIsPlaying: boolean) => {
    if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No state.browser found. Refresh and try again.");
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
    if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
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
    if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found.");
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


  /**
   * Endpoint to add a video to the end of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToBottomOfQueue, async (incomingClientId: string, incomingVideo: Video) => {
    const updatedQueue = await addToBottomOfQueue(db, io, incomingClientId, incomingVideo);
    if (!updatedQueue) return;
    console.log("Socket:", "Added video to bottom of queue", incomingVideo.title);

    state.queue = updatedQueue;

    io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
  });


  /**
   * Endpoint to add a video to the start of the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.addToTopOfQueue, async (incomingClientId: string, incomingVideo: Video) => {
    const updatedQueue = await addToTopOfQueue(db, io, incomingClientId, incomingVideo);
    if (!updatedQueue) return;
    console.log("Socket:", "Added video to top of queue", incomingVideo.title);

    state.queue = updatedQueue;

    io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
  });


  /**
   * Endpoint to delete a video form the queue
   */
  socket.on(SOCKET_EVENT_KEYS.deleteQueueItem, async (incomingClientId: string, videoId: Video["videoId"]) => {
    const updatedQueue = await deleteQueueItem(db, io, incomingClientId, videoId);
    if (!updatedQueue) return;
    console.log("Socket:", "Deleted video", videoId);

    state.queue = updatedQueue;

    io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
  });


  /**
   * Endpoint to play to the next queue item.
   */
  socket.on(SOCKET_EVENT_KEYS.playNextQueueItem, async (incomingClientId: string) => {
    const getNextQueueItemReturn = await getNextQueueItem(db, io);
    if (!getNextQueueItemReturn) return;
    const [nextVideo, updatedQueue] = getNextQueueItemReturn;


    state.queue = updatedQueue;
    io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

    // Queue must be empty if theres no next video
    if (!nextVideo) {
      console.log("Socket:", "No next video in queue.")
      return;
    }

    console.log("Socket:", "Got next video in queue.")
    await handlePlayNextVideo(io, db, state, nextVideo, incomingClientId);
  });


  /**
   * Endpoint to clear the queue.
   */
  socket.on(SOCKET_EVENT_KEYS.clearQueue, async (incomingClientId: string) => {
    const exitCode = await clearQueue(db, io, incomingClientId);
    if (exitCode === 1) return;
    console.log("Socket:", "Cleared the queue");

    state.queue = [];

    io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
  });
}


/**
 * Returns the initial (current) state of the player to the connect client.
 */
function getInitialState(io: WsServer, incomingClientId: string, state: StateType) {
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.queue, state.queue);
  io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.history, state.history);
}


/**
 * Resets the state values and updates any connected clients.
 */
function clearState(io: WsServer, state: StateType) {
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
 * Function that checks the current time and duration while the current video is playing to determine if the video has ended.
 */
function startCheckForEndOfVideo(io: WsServer, db: Database, state: StateType) {
  try {
    state.checkVideoInterval = setInterval(async () => {
      if (!state.currentPage || !state.currentVideo || !state.isPlaying || !state.playerFrame || state.isIntervalRunning || state.isLoading) {
        return;
      }
      console.log("before check for end starts")
      state.isIntervalRunning = true;
      const timeState = await checkForEndOfVideo(state.playerFrame);
      console.log("after check for end starts")

      // If an error occured with the iframe API the video will show an error code and the stop working.
      if (!timeState) {
        io.emit(SOCKET_EVENT_KEYS.error, "An error occured with the player.");
        clearState(io, state);

        // Attempt to load the next video.
        const getNextQueueItemReturn = await getNextQueueItem(db, io);
        if (!getNextQueueItemReturn) {
          state.isIntervalRunning = false;
          return;
        }

        const [nextVideo, updatedQueue] = getNextQueueItemReturn;

        // No next item means the Queue is empty
        if (!nextVideo) {
          state.isIntervalRunning = false;
          return;
        }

        state.queue = updatedQueue;

        io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

        await handlePlayNextVideo(io, db, state, nextVideo);

      } else if (timeState.hasEnded) {
        clearState(io, state);
        // Attempt to load the next video.
        const getNextQueueItemReturn = await getNextQueueItem(db, io);
        if (!getNextQueueItemReturn) {
          state.isIntervalRunning = false;
          return;
        }

        const [nextVideo, updatedQueue] = getNextQueueItemReturn;

        // No next item means the Queue is empty
        if (!nextVideo) {
          state.isIntervalRunning = false;
          return;
        }

        state.queue = updatedQueue;

        io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

        await handlePlayNextVideo(io, db, state, nextVideo);

      } else {
        state.currentVideoTime = timeState.currentTime;
        io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
      }

      state.isIntervalRunning = false;

    }, PLAYER_CHECK_VIDEO_INTERVAL);

  } catch (err: any) {
    console.log("StartCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current time.");
    state.isIntervalRunning = false;
  }
}


async function handlePlayNextVideo(io: WsServer, db: Database, state: StateType, incomingVideo: Video, incomingClientId?: string,) {
  if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

  const playerElements = await playVideo(io, incomingVideo.videoId, state);
  if (!playerElements) return;

  console.log("Socket:", "Setting currentVideo", incomingVideo.videoId);

  state.currentPage = playerElements.currentPage;
  state.playerFrame = playerElements.iFrame;
  state.currentVideo = incomingVideo;
  state.isPlaying = true;

  io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

  // Prevent race condition from within `playVideo()` where the youtube elements are animating their visibility and thus not 'visible' to be read yet inside of `startCheckForEndOfVideo()`.
  setTimeout(() => startCheckForEndOfVideo(io, db, state), PLAYER_CHECK_VIDEO_INTERVAL);

  // Update and return the latest history
  const updatedHistory = await updateHistoryItems(db, io, state.currentVideo, incomingClientId);
  if (!updatedHistory) return;

  state.history = updatedHistory;
  io.emit(SOCKET_EVENT_KEYS.history, state.history);
}