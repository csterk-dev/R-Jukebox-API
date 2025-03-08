import { StateType } from "index";

/**
 * Parses video duration strings in ISO 8601 and converts them to the total number of seconds.
 * @link [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Durations)
 * @example 
 * ```typescript
 * 'PT1H8M41S' -> 4081
 * ```
 * @param {string} duration - Duration string.
 * @returns {number} The total number of seconds, -1 for live videos.
 */
export function formatISO8601ToSeconds(duration: string): number {

  if (duration.toLowerCase() === "p0d") return -1;


  const prefixTrimmed = duration.toLowerCase().slice(2);

  let hours = 0;
  let mins = 0;
  let seconds = 0;

  const hourIndex = prefixTrimmed.indexOf("h");
  if (hourIndex !== -1) {
    hours = parseInt(prefixTrimmed.slice(0, hourIndex), 10);
  }

  const minIndex = prefixTrimmed.indexOf("m");
  if (minIndex !== -1) {
    mins = parseInt(prefixTrimmed.slice(hourIndex + 1, minIndex), 10);
  }

  const secIndex = prefixTrimmed.indexOf("s");
  if (secIndex !== -1) {
    // Ensure that minutes are included, otherwise use hours index
    if (minIndex === -1) {
      seconds = parseInt(prefixTrimmed.slice(hourIndex + 1, secIndex), 10);
    } else {
      seconds = parseInt(prefixTrimmed.slice(minIndex + 1, secIndex), 10);
    }
  }

  // Convert hours, minutes, and seconds to total seconds
  const totalSeconds = (hours * 3600) + (mins * 60) + seconds;

  return totalSeconds;
}


/** 
 * Convert time from "MM:SS" or "HH:MM:SS" to seconds
 * @param timeStr String to parse.
 * @returns {number} Parsed value in seconds
 */
export const formatPlayerTimeStringToSeconds = (timeStr: string) => {
  const parts = timeStr.split(":").map(Number);
  return parts.length === 3 ?
    parts[0] * 3600 + parts[1] * 60 + parts[2] :
    parts[0] * 60 + parts[1];
};


/**
 * @param fn Function wrapping code.
 * @param params An array of parameters to pass to function.
 * @returns The provided function with the applied param variables.
 */
export const functionWrapper = (fn: Function, params?: any[]): Function => {
  return () => fn.apply(this, params);
}


/** Used to validate the player state and returns an error response if something is missing. */
export function isPlayerReady(state: StateType) {
  if (!state.browser) return "No browser found. Refresh and try again.";
  if (!state.currentPage) return "No player page found.";
  if (!state.playerFrame) return "No player frame found.";
  if (!state.currentVideo) return "No current video found.";
  return null
}
