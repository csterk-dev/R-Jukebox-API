import { adjustPlayerProgress, adjustPlayerVolume, checkForEndOfVideo, playVideo, togglePlayingState } from "../../services/puppeteer";
import { PLAYER_CHECK_VIDEO_INTERVAL, SOCKET_EVENT_KEYS } from "../../constants";
import { Server as WsServer } from "socket.io";
import { formatISO8601ToSeconds, isPlayerReady } from "../../utils";
import { Database } from "sqlite3";
import { addToBottomOfQueue, addToTopOfQueue, clearQueue, deleteQueueItem, getNextQueueItem, updateHistoryItems, updateLogEntries } from "../../services/database";
import { StateType } from "index";


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

  if (state.playerFrame) {
    const res = await togglePlayingState(state.playerFrame, req.isPlaying);

    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? `Something went wrong ${req.isPlaying ? "resuming" : "pausing"} the video`
      });

      const newLogEntry: NewEntryLog = {
        type: "error",
        stackTrace: res.stackTrace,
        callingFunction: res.callingFunction
      }
      const updatedLogsRes = await updateLogEntries(db, newLogEntry);

      /* 
       * If updating the log entries failed on first attempt, notify via the global error state var instead.
       */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, `Unable to update logs with recent error from: '${res.callingFunction}'`);
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
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

  if (state.playerVolume !== req.volumeLevel && (state.currentPage && state.playerFrame)) {
    const res = await adjustPlayerVolume(state.currentPage, state.playerFrame, req.volumeLevel)
    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? "Something went wrong adjusting the player volume."
      });

      const newLogEntry: NewEntryLog = {
        type: "error",
        stackTrace: res.stackTrace,
        callingFunction: res.callingFunction
      }
      const updatedLogsRes = await updateLogEntries(db, newLogEntry);

      /* 
       * If updating the log entries failed on first attempt, notify via the global error state var instead.
       */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${res.callingFunction}'`);
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
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

  if (state.currentVideoTime !== req.timestamp && (state.currentPage && state.playerFrame && state.currentVideo)) {
    const res = await adjustPlayerProgress(state.currentPage, state.playerFrame, formatISO8601ToSeconds(state.currentVideo.duration), req.timestamp)
    if (!res.success) {
      resCallback({
        success: false,
        errorMessage: res.errorMessage ?? "Something went wrong adjusting the player progress"
      });

      const newLogEntry: NewEntryLog = {
        type: "error",
        stackTrace: res.stackTrace,
        callingFunction: res.callingFunction
      }
      const updatedLogsRes = await updateLogEntries(db, newLogEntry);

      /* 
       * If updating the log entries failed on first attempt, notify via the global error state var instead.
       */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${res.callingFunction}'`);
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
      return;
    }
    console.log("Socket:", "Setting video time", req.timestamp);

    state.currentVideoTime = req.timestamp;

    io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
  }
}


/** Handles the adding of videos to the queue. */
export async function handleAddToQueue(db: Database, io: WsServer, state: StateType, req: VideoRequest, resCallback: (ack: WSAcknowledgement) => void, position: "top" | "bottom") {

  const updatedQueueRes = position === "bottom" ? await addToBottomOfQueue(db, req.video) : await addToTopOfQueue(db, req.video);
  if (!updatedQueueRes.successState.success) {
    resCallback({
      success: false,
      errorMessage: updatedQueueRes.successState.errorMessage ?? `Something went wrong adding the video to the ${position} of the queue.`
    });

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: updatedQueueRes.successState.stackTrace,
      callingFunction: updatedQueueRes.successState.callingFunction
    }
    const updatedLogsRes = await updateLogEntries(db, newLogEntry);

    /* 
     * If updating the log entries failed on first attempt, notify via the global error state var instead.
     */
    if (!updatedLogsRes.successState.success) {
      io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${updatedQueueRes.successState.callingFunction}'`);
      return
    }

    state.logs = updatedLogsRes.logs;
    io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    return;
  }

  console.log("Socket:", `Added video to ${position} of queue`, req.video.title);
  resCallback({ success: true });

  state.queue = updatedQueueRes.videos;
  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the deletion of videos from the queue. */
export async function handleDeleteFromQueue(db: Database, io: WsServer, state: StateType, req: RemoveQueueItemRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const updatedQueueRes = await deleteQueueItem(db, req.videoId);
  if (!updatedQueueRes.successState.success) {
    resCallback({
      success: false,
      errorMessage: updatedQueueRes.successState.errorMessage ?? "Something went wrong deleting the video from the queue."
    });

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: updatedQueueRes.successState.stackTrace,
      callingFunction: updatedQueueRes.successState.callingFunction
    }
    const updatedLogsRes = await updateLogEntries(db, newLogEntry);

    /* 
     * If updating the log entries failed on first attempt, notify via the global error state var instead.
     */
    if (!updatedLogsRes.successState.success) {
      io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${updatedQueueRes.successState.callingFunction}'`);
      return
    }

    state.logs = updatedLogsRes.logs;
    io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    return;
  }

  console.log("Socket:", "Deleted video", req.videoId);

  state.queue = updatedQueueRes.videos;

  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);
}


/** Handles the retrieval of the next available queue item, and plays it. */
export async function handlePlayNextFromQueue(db: Database, io: WsServer, state: StateType, req: BaseRequest, resCallback: (ack: WSAcknowledgement) => void) {
  const nextQueueItemReturn = await getNextQueueItem(db);
  if (!nextQueueItemReturn.successState.success) {
    resCallback({
      success: false,
      errorMessage: nextQueueItemReturn.successState.errorMessage ?? "Something went wrong getting the next video from the queue."
    });

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: nextQueueItemReturn.successState.stackTrace,
      callingFunction: nextQueueItemReturn.successState.callingFunction
    }
    const updatedLogsRes = await updateLogEntries(db, newLogEntry);

    /* 
     * If updating the log entries failed on first attempt, notify via the global error state var instead.
     */
    if (!updatedLogsRes.successState.success) {
      io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${nextQueueItemReturn.successState.callingFunction}'`);
      return
    }

    state.logs = updatedLogsRes.logs;
    io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    return;
  }

  const { nextVideo, updatedQueue } = nextQueueItemReturn;


  state.queue = updatedQueue;
  io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

  // Queue must be empty if theres no next video
  if (!nextVideo) {
    console.log("Socket:", "No next video in queue.")
    return;
  }

  console.log("Socket:", "Got next video in queue.")
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

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: res.stackTrace,
      callingFunction: res.callingFunction
    }
    const updatedLogsRes = await updateLogEntries(db, newLogEntry);

    /* 
     * If updating the log entries failed on first attempt, notify via the global error state var instead.
     */
    if (!updatedLogsRes.successState.success) {
      io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${res.callingFunction}'`);
      return
    }

    state.logs = updatedLogsRes.logs;
    io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    return;
  }
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

    // Ensure we clear any previous intervals prior to spawning a new one for the new video.
    if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

    /** 
     * Check interval beings 
     */
    state.checkVideoInterval = setInterval(async () => {
      if (!state.currentPage || !state.currentVideo || !state.isPlaying || !state.playerFrame || state.isIntervalRunning || state.isLoading) {
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
      const checkForEndOfVideoRes = await checkForEndOfVideo(state.playerFrame);


      // Handle any player errors
      if (checkForEndOfVideoRes.status !== "success") {
        const { status, stackTrace, callingFunction } = checkForEndOfVideoRes;

        // Silently ignore false cases but still log them
        if (status === "detached-frame-error") {
          const newLogEntry: NewEntryLog = {
            type: "info",
            stackTrace,
            callingFunction
          }
          const updatedLogsRes = await updateLogEntries(db, newLogEntry);

          /* 
           * If updating the log entries failed on first attempt, notify via the global error state var instead.
           */
          if (!updatedLogsRes.successState.success) {
            io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent info from: 'checkForEndOfVideo'");
            return
          }

          state.logs = updatedLogsRes.logs;
          io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
          return;

        } else if (status === "error") {
          /*
           * If an error occured, reset, update state and attempt to load the next video (if any) from the queue.
           */
          io.emit(SOCKET_EVENT_KEYS.error, "An error occured with the player while checking its current progress");
          clearState(io, state);

          const newLogEntry: NewEntryLog = {
            type: "error",
            stackTrace: null,
            callingFunction: "checkForEndOfVideo"
          }
          const guy = await updateLogEntries(db, newLogEntry);

          /* 
           * If updating the log entries failed on first attempt, notify via the global error state var instead.
           */
          if (!guy.successState.success) {
            io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent error from: 'checkForEndOfVideo'");
            return
          }

          // Attempt to load the next video.
          const { nextVideo, updatedQueue, successState } = await getNextQueueItem(db);
          if (!successState.success) {
            state.isIntervalRunning = false;
            io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video");

            const newQueueUpdateLogEntry: NewEntryLog = {
              type: "error",
              stackTrace: successState.stackTrace,
              callingFunction: successState.callingFunction
            }
            const updatedLogsRes = await updateLogEntries(db, newQueueUpdateLogEntry);

            /* 
             * If updating the log entries failed on first attempt, notify via the global error state var instead.
             */
            if (!updatedLogsRes.successState.success) {
              io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent error from: 'checkForEndOfVideo'");
              return
            }

            state.logs = updatedLogsRes.logs;
            io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
            return;
          }

          state.queue = updatedQueue;
          io.emit(SOCKET_EVENT_KEYS.queue, state.queue);

          if (nextVideo) {
            await handlePlayVideo(db, io, state, { video: nextVideo });
          }
        }

      } else if (checkForEndOfVideoRes.playerState.hasEnded) {
        /*
         * No error occured. Check if the video has ended, reset, update state and attempt to load the next video (if any) from the queue.
         */
        clearState(io, state);

        const { nextVideo, updatedQueue, successState } = await getNextQueueItem(db);
        if (!successState.success) {
          state.isIntervalRunning = false;
          io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video.");

          const newLogEntry: NewEntryLog = {
            type: "error",
            stackTrace: successState.stackTrace,
            callingFunction: successState.callingFunction
          }
          const updatedLogsRes = await updateLogEntries(db, newLogEntry);

          /* 
           * If updating the log entries failed on first attempt, notify via the global error state var instead.
           */
          if (!updatedLogsRes.successState.success) {
            io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent error from: 'checkForEndOfVideo'");
            return
          }

          state.logs = updatedLogsRes.logs;
          io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
          return;
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
        state.currentVideoTime = checkForEndOfVideoRes.playerState.currentTime;
        io.emit(SOCKET_EVENT_KEYS.currentVideoTime, state.currentVideoTime);
      }

      state.isIntervalRunning = false;

    }, PLAYER_CHECK_VIDEO_INTERVAL);

  } catch (err: any) {
    /* 
     * Worst case scenario catch. If this goes off, something seriously bad happened for it to not be able play the next queue item and continue running.
     */
    console.error("startCheckForEndOfVideo:", "An error occured while checking the player's current time.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured while checking the player's current progress.");
    state.isIntervalRunning = false;
    clearState(io, state);


    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: err,
      callingFunction: "startCheckForEndOfVideo"
    }
    updateLogEntries(db, newLogEntry).then((updatedLogsRes) => {
      /* 
       * If updating the log entries failed on first attempt, notify via the global error state var instead.
       */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, "Failed to update logs with recent error from: 'startCheckForEndOfVideo'");
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    });
  }
}


/** Handles the playing of videos. */
export async function handlePlayVideo(db: Database, io: WsServer, state: StateType, req: VideoRequest, resCallback?: (ack: WSAcknowledgement) => void) {
  if (state.checkVideoInterval) clearInterval(state.checkVideoInterval);

  const res = await playVideo(io, req.video.videoId, state);
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
      const newLogEntry: NewEntryLog = {
        type: "error",
        stackTrace: res.successState.stackTrace,
        callingFunction: res.successState.callingFunction
      }
      const updatedLogsRes = await updateLogEntries(db, newLogEntry);

      /* 
      * If updating the log entries failed on first attempt, notify via the global error state var instead.
      */
      if (!updatedLogsRes.successState.success) {
        io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from: '${res.successState.callingFunction}'`);
        return
      }

      state.logs = updatedLogsRes.logs;
      io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    }
    return;
  }

  console.log("Socket:", "Setting currentVideo", req.video.videoId);

  state.currentPage = res.playerElements.currentPage;
  state.playerFrame = res.playerElements.iFrame;
  state.currentVideo = req.video;
  state.isPlaying = true;

  io.emit(SOCKET_EVENT_KEYS.currentVideo, state.currentVideo);
  io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

  /**
   * Prevent race condition from within `playVideo()` where the youtube elements are animating their visibility and thus not 'visible' to be read yet inside of `startCheckForEndOfVideo()`.
   * // setTimeout(() => startCheckForEndOfVideo(io, db, state), PLAYER_CHECK_VIDEO_INTERVAL);
   * ^^ Need to verify that removing the settimeout is okay on the RPI3. Ignored for RPI5 use...
   */
  startCheckForEndOfVideo(io, db, state);

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

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: updatedHistory.successState.stackTrace,
      callingFunction: updatedHistory.successState.callingFunction
    }
    const updatedLogsRes = await updateLogEntries(db, newLogEntry);

    /* 
     * If updating the log entries failed on first attempt, notify via the global error state var instead.
     */
    if (!updatedLogsRes.successState.success) {
      io.emit(SOCKET_EVENT_KEYS.error, `Failed to update logs with recent error from ${updatedHistory.successState.callingFunction}`);
      return
    }

    state.logs = updatedLogsRes.logs;
    io.emit(SOCKET_EVENT_KEYS.logs, state.logs);
    return;
  }

  state.history = updatedHistory.videos;
  io.emit(SOCKET_EVENT_KEYS.history, state.history);
}