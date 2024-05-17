"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventKeys = exports.YOUTUBE_API_URL = exports.YOUTUBE_BROWSER_WATCH_PAGE_URL = void 0;
exports.YOUTUBE_BROWSER_WATCH_PAGE_URL = "https://www.youtube.com/watch?v=";
exports.YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
/**
 * An object containing the all possible connection events and their event key.
 *
 * Ensure that the client and server **have matching event keys.**
 */
exports.WebSocketEventKeys = {
    /** Any error values. */
    error: "error",
    /** If the player is loading. */
    isLoading: "is-loading",
    /** Gets the value from the isPlaying boolean. */
    isPlaying: "is-playing",
    /** Updates the isPlaying boolean state. */
    setIsPlaying: "set-is-playing",
    /** Gets the current video. */
    currentVideo: "current-video",
    /** Updates the current video and sets `isPlaying` boolean to true on the server. */
    setCurrentVideo: "set-current-video",
    /** Used to return the current state to the newly connect client. */
    getInitialState: "get-initial-state"
};
