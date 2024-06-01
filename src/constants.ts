/* eslint-disable quotes */

/*
 * Server/Player vars 
 */
export const PORT = 3001;
export const PLAYER_URL = `http://localhost:${PORT}/player`;
/** @deprecated Youtube browser no longer supported. Use `PLAYER_URL` instead for static page player. */
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
  /** Used to return the current state to the newly connect client. */
  getInitialState: "get-initial-state",
  /** Gets the current video. */
  currentVideo: "current-video",
  /** THe videos time. */
  currentVideoTime: "current-video-time",
  /** Any error values. */
  error: "error",
  /** If the player is loading. */
  isLoading: "is-loading",
  /** Gets the value from the isPlaying boolean. */
  isPlaying: "is-playing",
  /** Updates the current video and sets `isPlaying` boolean to true on the server. */
  setCurrentVideo: "set-current-video",
  /** Updates the isPlaying boolean state. */
  setIsPlaying: "set-is-playing",
  /** Updates the volume of the operating system. */
  setSystemVolume: "set-system-vol",
  /** Gets the current ooperating system volume level. */
  systemVolume: "system-vol"
};

/*
 * Puppeteer selector vars 
 */
export const PLAY_TOOLTIP_SELECTOR = `data-title-no-tooltip="Play"`;
export const PAUSE_TOOLTIP_SELECTOR = `data-title-no-tooltip="Pause"`;
export const PLAY_BUTTON_SELECTOR = ".ytp-play-button";
export const IFRAME_SELECTOR = `iframe[id="player"]`;
export const TIME_CURRENT_SELECTOR = ".ytp-time-current";
export const TIME_DURATION_SELECTOR = ".ytp-time-duration";
// class="ytp-ad-skip-button-modern"


/*
 * Operating system vars 
 */
/** @remarks Ensure front and end values match */
export const SYSTEM_VOLUME_DEFAULT = 30.
// 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