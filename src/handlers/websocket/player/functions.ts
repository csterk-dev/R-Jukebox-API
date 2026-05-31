import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState, YT_PLAYER_STATE } from "../../../services/puppeteer";
import { PLAYER_CHECK_VIDEO_INTERVAL, SOCKET_EVENT_KEYS } from "../../../constants";
import { Server as WsServer } from "socket.io";
import { formatISO8601ToSeconds } from "../../../utils";
import { Database } from "sqlite3";
import { addToBottomOfQueue, addToTopOfQueue, clearQueue, deleteQueueItem, getNextQueueItem, updateHistoryItems, updateLogEntries } from "../../../services/database";
import { StateType } from "index";
import { clearState, handleNewLogEntry, isPlayerReady } from "./utils";


/** Handles playing/pausing of the video player. */
export async function handlePlayPause(db: Database, io: WsServer, state: StateType, req: PlayPauseRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const stateValidationError = isPlayerReady(state);
  if (stateValidationError) {
    resCallback({
      success: false,
      errorMessage: stateValidationError
    });
    return;
  }

  if (state.currentPage) {
    const res = await togglePlayingState(state.currentPage, req.isPlaying);

    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? `Something went wrong ${req.isPlaying ? "resuming" : "pausing"} the video`
      });

      await handleNewLogEntry(db, io, state, "error", res.callingFunction, res.stackTrace);
      return;
    }

    console.log("Socket: Setting isPlaying", req.isPlaying);

    state.isPlaying = req.isPlaying;

    io.emit(SOCKET_EVENT_KEYS.isPlaying, state.isPlaying);
  }
}

/** Handles volume changes. */
export async function handleVolumeChange(db: Database, io: WsServer, state: StateType, req: UpdatePlayerVolumeRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const stateValidationError = isPlayerReady(state);
  if (stateValidationError) {
    resCallback({
      success: false,
      errorMessage: stateValidationError
    });
    return;
  }

  if (state.playerVolume !== req.volumeLevel && state.currentPage) {
    const res = await adjustPlayerVolume(state.currentPage, req.volumeLevel)
    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? "Something went wrong adjusting the player volume."
      });

      await handleNewLogEntry(db, io, state, "error", res.callingFunction, res.stackTrace);
      return;
    }

    console.log("Socket:", "Setting playerVol", req.volumeLevel);

    state.playerVolume = req.volumeLevel;

    io.emit(SOCKET_EVENT_KEYS.playerVolume, state.playerVolume);
  }
}


/** Handles updates to the player's progress. */
export async function handleProgressChange(db: Database, io: WsServer, state: StateType, req: UpdatePlayerTimestampRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const stateValidationError = isPlayerReady(state);
  if (stateValidationError) {
    resCallback({
      success: false,
      errorMessage: stateValidationError
    });
    return;
  }

  if (state.currentVideoTime !== req.timestamp && state.currentPage && state.currentVideo) {
    const res = await adjustPlayerProgress(state.currentPage, formatISO8601ToSeconds(state.currentVideo.duration), req.timestamp)
    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? "Something went wrong adjusting the player progress"
      });

      await handleNewLogEntry(db, io, state, "error", res.callingFunction, res.stackTrace);
      return;
    }

    console.log("Socket:", "Setting video time", req.timestamp);

    state.currentVideoTime = req.timestamp;

    io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  }
}


/** Handles the adding of videos to the queue. */
export async function handleAddToQueue(db: Database, io: WsServer, state: StateType, req: VideoRequest, resCallback: (ack: WSAcknowledgement) => void, position: "top" | "bottom") {

  const res = position === "bottom" ? await addToBottomOfQueue(db, req.video) : await addToTopOfQueue(db, req.video);
  if (!res.successState.success) {
    resCallback({
      success: false,
      errorMessage: res.successState.errorMessage ?? `Something went wrong adding the video to the ${position} of the queue.`
    });

    await handleNewLogEntry(db, io, state, "error", res.successState.callingFunction, res.successState.stackTrace);
    return;
  }

  console.log("Socket:", `Added video to ${position} of queue`, req.video.title);
  resCallback({ success: true });

  state.queue = res.videos;
  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the deletion of videos from the queue. */
export async function handleDeleteFromQueue(db: Database, io: WsServer, state: StateType, req: RemoveQueueItemRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const res = await deleteQueueItem(db, req.videoId);
  if (!res.successState.success) {
    resCallback({
      success: false,
      errorMessage: res.successState.errorMessage ?? "Something went wrong deleting the video from the queue."
    });

    await handleNewLogEntry(db, io, state, "error", res.successState.callingFunction, res.successState.stackTrace);
    return;
  }

  console.log("Socket:", "Deleted video", req.videoId);

  state.queue = res.videos;

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the retrieval of the next available queue item, and plays it. */
export async function handlePlayNextFromQueue(db: Database, io: WsServer, state: StateType, req: BaseRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const res = await getNextQueueItem(db);
  if (!res.successState.success) {
    resCallback({
      success: false,
      errorMessage: res.successState.errorMessage ?? "Something went wrong getting the next video from the queue."
    });

    await handleNewLogEntry(db, io, state, "error", res.successState.callingFunction, res.successState.stackTrace);
    return;
  }

  const { nextVideo, updatedQueue } = res;


  state.queue = updatedQueue;
  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

  // Queue must be empty if theres no next video
  if (!nextVideo) {
    console.log("Socket:", "No next video in queue.");
    return;
  }

  console.log("Socket:", "Got next video in queue.");
  await handlePlayVideo(db, io, state, { video: nextVideo }, resCallback);
}


/** Handles the clearing of the queue. */
export async function handleClearQueue(db: Database, io: WsServer, state: StateType, req: BaseRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const res = await clearQueue(db);
  if (!res.success) {
    resCallback({
      success: false,
      errorMessage: res.errorMessage ?? "Something went wrong clearing the queue."
    });

    await handleNewLogEntry(db, io, state, "error", res.callingFunction, res.stackTrace);
    return;
  }
  console.log("Socket:", "Cleared the queue");

  state.queue = [];

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the playing of videos. */
export async function handlePlayVideo(db: Database, io: WsServer, state: StateType, req: VideoRequest, resCallback?: (ack: WSAcknowledgement) => void) {
  if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

  state.isLoading = true;
  io.emit(SOCKET_EVENT_KEYS.isLoading, state.isLoading);

  state.isBuffering = false;
  io.emit(SOCKET_EVENT_KEYS.isBuffering, false);

  const onPlayerStateChange = (ytState: number) => {
    const buffering = ytState === YT_PLAYER_STATE.BUFFERING;
    if (state.isBuffering === buffering) return;
    state.isBuffering = buffering;
    io.emit(SOCKET_EVENT_KEYS.isBuffering, buffering);
  };

  const res = await playVideo(req.video.videoId, state, onPlayerStateChange);
  if (!res.playerElements || !res.successState.success) {
    if (resCallback) {
      resCallback({
        success: false,
        errorMessage: res.successState.errorMessage
      })
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, res.successState.errorMessage);
    }

    if (!res.successState.success) {
      await handleNewLogEntry(db, io, state, "error", res.successState.callingFunction, res.successState.stackTrace);
    }
    return;
  }
  
  console.log("Socket:", "Setting currentVideo", req.video.videoId);
  state.currentPage = res.playerElements.currentPage;
  
  state.currentVideoTime = 0;
  io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  
  state.currentVideo = req.video;
  io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  
  state.isLoading = false;
  io.emit(SOCKET_EVENT_KEYS.isLoading, state.isLoading);
  
  state.isPlaying = true;
  io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

  /**
   * Prevent race condition from within `playVideo()` where the youtube elements are animating their visibility and thus not 'visible' to be read yet inside of `handleCheckForEndOfVideo()`.
   * // setTimeout(() => handleCheckForEndOfVideo(io, db, state), PLAYER_CHECK_VIDEO_INTERVAL);
   * ^^ Need to verify that removing the settimeout is okay on the RPI3. Ignored for RPI5 use...
   */
  handleCheckForEndOfVideo(io, db, state);

  // Update and return the latest history
  const updatedHistory = await updateHistoryItems(db, state.currentVideo);
  if (!updatedHistory.successState.success) {
    if (resCallback) {
      resCallback({
        success: false,
        errorMessage: updatedHistory.successState.errorMessage ?? "Something went wrong adding to the recently played vidoes."
      });
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, updatedHistory.successState.errorMessage);
    }

    await handleNewLogEntry(db, io, state, "error", updatedHistory.successState.callingFunction, updatedHistory.successState.stackTrace);
  }
}



/** Function that checks the current time and duration while the current video is playing to determine if the video has ended. */
function handleCheckForEndOfVideo(io: WsServer, db: Database, state: StateType) {
  try {

    // Ensure we clear any previous intervals prior to spawning a new one for the new video.
    if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

    /** 
     * Check interval beings 
     */
    state.checkVideoInterval = setInterval(async () => {
      if (!state.currentPage || !state.currentVideo || !state.isPlaying || state.isIntervalRunning || state.isLoading) {
        return;
      }

      /**
       * This internal boolean for the interval logic prevents multiple overlapping intervals from being created
       * when Puppeteer's async operations are slow to complete. Without this safeguard, a new interval could be
       * inadvertently started every 5 seconds, even if the previous one is still running.
       *
       * This issue was observed when `getNextQueueItem` was triggered simultaneously in two places,
       * causing two videos to be popped from the queue at once and resulting in the first video being lost.
       */
      state.isIntervalRunning = true;
      const checkForEndOfVideoRes = await checkForEndOfVideo(state.currentPage);


      // Handle any player errors
      if (checkForEndOfVideoRes.status !== "success") {
        const { stackTrace, callingFunction } = checkForEndOfVideoRes;

        io.emit(SOCKET_EVENT_KEYS.error, "An error occured with the player while checking its current progress. Check the 'Player Logs' for more info.");
        clearState(io, state);

        await handleNewLogEntry(db, io, state, "error", callingFunction, stackTrace);

        const { nextVideo, updatedQueue, successState: nextItemSuccessState } = await getNextQueueItem(db);

        if (!nextItemSuccessState.success) {
          io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video");
          await handleNewLogEntry(db, io, state, "error", nextItemSuccessState.callingFunction, nextItemSuccessState.stackTrace);

          state.isIntervalRunning = false;
          return;
        }

        state.queue = updatedQueue;
        io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

        if (nextVideo) await handlePlayVideo(db, io, state, { video: nextVideo });

      } else if (checkForEndOfVideoRes.playerState.hasEnded) {
        /*
         * No error occured. Check if the video has ended, reset, update state and attempt to load the next video (if any) from the queue.
         */
        clearState(io, state);

        const { nextVideo, updatedQueue, successState: nextItemSuccessState } = await getNextQueueItem(db);
        if (!nextItemSuccessState.success) {
          io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video.");
          await handleNewLogEntry(db, io, state, "error", nextItemSuccessState.callingFunction, nextItemSuccessState.stackTrace);

          state.isIntervalRunning = false;
          return
        }

        state.queue = updatedQueue;
        io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

        if (nextVideo) {
          await handlePlayVideo(db, io, state, { video: nextVideo });
        }

      } else if (checkForEndOfVideoRes.status === "success") {
        /*
         * Video is still playing. Update the current time and broadcast.
         */
        const { isBuffering } = checkForEndOfVideoRes.playerState;
        if (state.isBuffering !== isBuffering) {
          state.isBuffering = isBuffering;
          io.emit(SOCKET_EVENT_KEYS.isBuffering, isBuffering);
        }

        state.currentVideoTime = checkForEndOfVideoRes.playerState.currentTime;
        io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
      }

      // Important to only update the interval running state boolean at the end of the success chain so that it can re-run in the next interval.
      state.isIntervalRunning = false;

    }, PLAYER_CHECK_VIDEO_INTERVAL);

  } catch (err: any) {
    /* 
     * Worst case scenario catch. If this goes off, something seriously bad happened for it to not be able play the next queue item and continue running.
     */
    console.error("handleCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current progress.");
    state.isIntervalRunning = false;
    clearState(io, state);


    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: err,
      callingFunction: "handleCheckForEndOfVideo"
    }
    updateLogEntries(db, newLogEntry).then((updatedLogsRes) => {
      /* 
       * If updating the log entries failed on first attempt, notify via the global error state var instead.
       */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent error from: 'handleCheckForEndOfVideo'");
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    });
  }
}
