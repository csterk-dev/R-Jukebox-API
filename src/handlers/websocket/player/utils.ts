import { StateType } from "index";


/** Used to validate the player state and returns an error response if any required vars are missing. */
export function isPlayerReady(state: StateType) {
  if (!state.browser) return "No browser found. Refresh and try again.";
  if (!state.currentPage) return "No player page found.";
  if (!state.playerFrame) return "No player frame found.";
  if (!state.currentVideo) return "No current video found.";
  return null
}