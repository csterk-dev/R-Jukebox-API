import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState } from "../../services/puppeteer";
import { PLAYER_CHECK_VIDEO_INTERVAL, SOCKET_EVENT_KEYS } from "../../constants";
import { Server as WsServer } from "socket.io";
import { formatISO8601ToSeconds } from "../../utils";
import { Database } from "sqlite3";
import { addToBottomOfQueue, addToTopOfQueue, clearQueue, deleteQueueItem, getNextQueueItem, updateHistoryItems } from "../../services/database";
import { StateType } from "index";


/** Handles playing/pausing of the video player. */
export async function handlePlayPause(io: WsServer, state: StateType, clientId: string, isPlaying: boolean) {
  if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
  else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, `Cannot ${isPlaying ? "play" : "pause"} while there isn't a current video.`);
  else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player iFrame found.");
  else {

    const exitCode = await togglePlayingState(io, clientId, state.playerFrame, isPlaying);
    if (exitCode === 1) return;
    console.log("Socket: Setting isPlaying", isPlaying);

    state.isPlaying = isPlaying;

    io.emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
  }
}


/** Handles volume changes. */
export async function handleVolumeChange(io: WsServer, state: StateType, clientId: string, newVolume: number) {
  if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
  else if (!state.currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
  else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
  else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change volume while there isn't a current video.");
  else if (state.playerVolume !== newVolume) {

    const exitCode = await adjustPlayerVolume(io, clientId, state.currentPage, state.playerFrame, newVolume)
    if (exitCode === 1) return;
    console.log("Socket:", "Setting playerVol", newVolume);

    state.playerVolume = newVolume;

    io.emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);
  }
}


/** Handles updates to the player's progress. */
export async function handleProgressChange(io: WsServer, state: StateType, clientId: string, newProgress: number) {
  if (!state.browser) io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
  else if (!state.currentPage) io.emit(SOCKET_EVENT_KEYS.error, "No player page found.");
  else if (!state.playerFrame) io.emit(SOCKET_EVENT_KEYS.error, "No player frame found.");
  else if (!state.currentVideo) io.emit(SOCKET_EVENT_KEYS.error, "Cannot change the progress while there isn't a current video.");
  else if (state.currentVideoTime !== newProgress) {

    const exitCode = await adjustPlayerProgress(io, clientId, state.currentPage, state.playerFrame, formatISO8601ToSeconds(state.currentVideo.duration), newProgress)
    if (exitCode === 1) return;
    console.log("Socket:", "Setting video time", newProgress);

    state.currentVideoTime = newProgress;

    io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  }
}


/** Handles the adding of videos to the queue. */
export async function handleAddToQueue(db: Database, io: WsServer, state: StateType, clientId: string, newVideo: Video, position: "top" | "bottom") {
  
  const updatedQueue = position === "bottom" ? await addToBottomOfQueue(db, io, clientId, newVideo) : await addToTopOfQueue(db, io, clientId, newVideo);
  if (!updatedQueue) return;
  console.log("Socket:", `Added video to ${position} of queue`, newVideo.title);

  state.queue = updatedQueue;

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the deletion of videos from the queue. */
export async function handleDeleteFromQueue(db: Database, io: WsServer, state: StateType, clientId: string, videoId: Video["videoId"]) {
  const updatedQueue = await deleteQueueItem(db, io, clientId, videoId);
  if (!updatedQueue) return;
  console.log("Socket:", "Deleted video", videoId);

  state.queue = updatedQueue;

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the auto playing of queue videos. */
export async function handlePlayNextFromQueue(db: Database, io: WsServer, state: StateType, clientId: string) {
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
  await handlePlayNextVideo(io, db, state, nextVideo, clientId);
}


/** Handles the clearing of the queue. */
export async function handleClearQueue(db: Database, io: WsServer, state: StateType, clientId: string) {
  const exitCode = await clearQueue(db, io, clientId);
  if (exitCode === 1) return;
  console.log("Socket:", "Cleared the queue");

  state.queue = [];

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}



/** Resets the state values and updates any connected clients. */
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


/** Function that checks the current time and duration while the current video is playing to determine if the video has ended. */
function startCheckForEndOfVideo(io: WsServer, db: Database, state: StateType) {
  try {
    state.checkVideoInterval = setInterval(async () => {
      if (!state.currentPage || !state.currentVideo || !state.isPlaying || !state.playerFrame || state.isIntervalRunning || state.isLoading) {
        return;
      }

      state.isIntervalRunning = true;
      const { data, checkStatus } = await checkForEndOfVideo(state.playerFrame);


      // Handle or ignore error cases
      if (checkStatus !== "success" || !data) {
        if (checkStatus !== "error-ignored") {
          /*
           * If an error occured, reset, update state and attempt to load the next video (if any) from the queue.
           */
          io.emit(SOCKET_EVENT_KEYS.error, "An error occured with the player.");
          clearState(io, state);

          // Attempt to load the next video.
          const getNextQueueItemReturn = await getNextQueueItem(db, io);
          if (!getNextQueueItemReturn) {
            state.isIntervalRunning = false;
            return;
          }

          const [nextVideo, updatedQueue] = getNextQueueItemReturn;
          state.queue = updatedQueue;
          io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

          if (nextVideo) {
            await handlePlayNextVideo(io, db, state, nextVideo);
          }
        }

      } else if (data.hasEnded) {
        /*
         * If the video has ended, reset, update state and attempt to load the next video (if any) from the queue.
         */
        clearState(io, state);

        const getNextQueueItemReturn = await getNextQueueItem(db, io);
        if (!getNextQueueItemReturn) {
          state.isIntervalRunning = false;
          return;
        }

        const [nextVideo, updatedQueue] = getNextQueueItemReturn;
        state.queue = updatedQueue;
        io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

        if (nextVideo) {
          await handlePlayNextVideo(io, db, state, nextVideo);
        }

      } else if (checkStatus === "success" && data) {
        state.currentVideoTime = data.currentTime;
        io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
      }

      state.isIntervalRunning = false;

    }, PLAYER_CHECK_VIDEO_INTERVAL);

  } catch (err: any) {
    /* 
     * Worst case scenario catch. If this goes off, something seriously bad happened for it to not be able play the next queue item and continue running.
     */
    console.error("StartCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current time.");
    state.isIntervalRunning = false;
    clearState(io, state);
  }
}


/** Handles the playing of videos. */
export async function handlePlayNextVideo(io: WsServer, db: Database, state: StateType, incomingVideo: Video, incomingClientId?: string,) {
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
  // setTimeout(() => startCheckForEndOfVideo(io, db, state), PLAYER_CHECK_VIDEO_INTERVAL);
  startCheckForEndOfVideo(io, db, state); // Need to verify that removing the settimeout is okay on the RPI3

  // Update and return the latest history
  const updatedHistory = await updateHistoryItems(db, io, state.currentVideo, incomingClientId);
  if (!updatedHistory) return;

  state.history = updatedHistory;
  io.emit(SOCKET_EVENT_KEYS.history, state.history);
}