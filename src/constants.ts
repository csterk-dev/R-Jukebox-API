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
export const PLAYBACK_ERROR_CONTENT_CONTAINER = "ytp-error-content-wrap-reason";
export const IFRAME_SELECTOR = `iframe[id="player"]`;
export const PAUSE_TOOLTIP_SELECTOR = `data-title-no-tooltip="Pause"`;
export const PLAY_BUTTON_SELECTOR = ".ytp-play-button";
export const PLAYER_VOLUME_SLIDER_BOUNDING_WIDTH = 40;
export const PLAYER_PROGRESS_SLIDER_BOUNDING_WIDTH = 616;
export const PLAYER_SLIDER_LEVEL_OFFSET = 15;
export const PLAY_TOOLTIP_SELECTOR = `data-title-no-tooltip="Play"`;
export const TIME_CURRENT_SELECTOR = ".ytp-time-current";
export const TIME_DURATION_SELECTOR = ".ytp-time-duration";
export const TIMELINE_SELECTOR = ".ytp-progress-list";
export const VOLUME_BUTTON_SELECTOR = '.ytp-mute-button';
export const VOLUME_SLIDER_CONTAINER_SELECTOR = '.ytp-volume-slider';

/** Selector notes: */
// class="ytp-ad-skip-button-modern"
// <div class="ytp-error-content-wrap-reason"><span>An error occurred. Please try again later. (Playback ID: buUDvEaZ4oDNuqR8) <br><a class="ytp-error-link" href="//support.google.com/youtube/?p=player_error1&amp;hl=en-GB" target="_blank">Learn More</a></span></div>