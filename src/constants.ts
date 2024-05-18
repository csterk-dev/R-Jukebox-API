export const YOUTUBE_BROWSER_WATCH_PAGE_URL = "https://www.youtube.com/watch?v=";
export const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

/** 
 * An object containing the all possible connection events and their event key. 
 * 
 * Ensure that the client and server **have matching event keys.**
 */
export const WebSocketEventKeys = {
  /** Used to return the current state to the newly connect client. */
  getInitialState: "get-initial-state",
  /** Gets the current video. */
  currentVideo: "current-video",
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
}