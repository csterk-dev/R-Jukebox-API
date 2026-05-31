/* eslint-disable quotes */

/*
 * Server/Player vars 
 */
export const PORT = 3001;
export const PLAYER_URL = `http://localhost:${PORT}/player`;
export const PLAYER_VOLUME_DEFAULT = 30.
export const PLAYER_CHECK_VIDEO_INTERVAL = 5000;
/** 
 * @deprecated Youtube browser no longer supported. This variable was previously used for testing purposes. 
 * Use `PLAYER_URL` instead for static page player. 
 */
export const YOUTUBE_BROWSER_WATCH_PAGE_URL = "https://www.youtube.com/watch?v=";


/*
 * API vars 
 */
export const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";


/** 
 * Socket Event Keys.
 * @description An object containing the all possible connection events and their event key. 
 * @remarks Ensure that the client and server **have matching event keys.**
 */
export const SOCKET_EVENT_KEYS = {
  /** Adds to the top of the queue. */
  addToTopOfQueue: "add-to-top-of-queue",
  /** Adds to the bottom of the queue. */
  addToBottomOfQueue: "add-to-bottom-of-queue",
  /** Clears the queue. */
  clearQueue: "clear-queue",
  /** Gets the current video. */
  currentVideo: "current-video",
  /** The videos time. */
  currentVideoTime: "current-video-time",
  /** Deletes the provided item from the queue. */
  deleteQueueItem: "delete-queue-item",
  /** Used to broadcast any errors to all connected clients, in instances that a websocket response acknowledgement callback is not/cannot be present. */
  error: "error",
  /** Used to return the current state to the newly connect client. */
  getInitialState: "get-initial-state",
  /** Gets the history. */
  history: "history",
  /** If the player is loading. */
  isLoading: "is-loading",
  /** If the YouTube player is buffering. */
  isBuffering: "is-buffering",
  /** Gets the value from the isPlaying boolean. */
  isPlaying: "is-playing",
  /** Gets the player logs. */
  logs: "logs",
  /** Gets the next video in the queue. */
  playNextQueueItem: "play-next-queue-item",
  /** Gets the current ooperating player volume level. */
  playerVolume: "player-vol",
  /** Gets the queue. */
  queue: "queue",
  /** Updates the current video and sets `isPlaying` boolean to true on the server. */
  setCurrentVideo: "set-current-video",
  /** THe videos time. */
  setCurrentVideoTime: "set-current-video-time",
  /** Updates the isPlaying boolean state. */
  setIsPlaying: "set-is-playing",
  /** Updates the volume of the player. */
  setPlayerVolume: "set-player-vol"
};

/*
 * Puppeteer vars 
 */
export const IFRAME_SELECTOR = `iframe[id="player"]`;