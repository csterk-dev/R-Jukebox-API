import { IFRAME_SELECTOR, PLAYER_URL } from "../constants";
import puppeteer, { Page } from "puppeteer";
import { parseErrorForDB } from "../utils";
import { StateType } from "index";

const YT_PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
} as const;

const JUKEBOX_PLAYER_WAIT_TIMEOUT = 15000;

/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 * @returns {Promise<Browser | undefined>} A promise containing the current puppeteer browser instance, or undefined.
 */
export async function initialsePuppeteerBrowser(osPlatform: NodeJS.Platform) {
  try {
    const browser = await puppeteer.launch({
      // Set timeout to be 24h to try and prevent `Requesting main frame too early!` error.
      timeout: 3600000,
      headless: false,
      args: [
        "--disable-features=site-per-process",
        "--autoplay-policy=no-user-gesture-required"
      ],
      defaultViewport: null,
      pipe: true,
      executablePath: osPlatform === "linux" ? "/usr/bin/chromium-browser" : undefined
    });

    if (!browser) {
      throw new Error("Failed to start puppeteer browser instance");
    }
    browser.on("error", console.log);
    return browser;

  } catch (error: any) {
    console.error("Error starting puppeteer", error);
  }
}

/**
 * Waits until the host-page YouTube IFrame Player bridge is ready.
 * Resolves when `window.jukeboxPlayerReady` is true and `jukeboxControl.getDuration` exists.
 * @param page Puppeteer page hosting `player.html`.
 * @param timeout Max wait in ms (default 15000).
 */
async function waitForJukeboxPlayer(page: Page, timeout = JUKEBOX_PLAYER_WAIT_TIMEOUT) {
  await page.waitForFunction(
    () => {
      const win = window as Window & {
        jukeboxPlayerReady?: boolean;
        jukeboxControl?: { getDuration: () => number };
      };
      return win.jukeboxPlayerReady && typeof win.jukeboxControl?.getDuration === "function";
    },
    { timeout }
  );
}

/**
 * Reads the YouTube player error code set by `onError` in `player.html`.
 * @param page Puppeteer page hosting `player.html`.
 * @returns YouTube error code, or `null` if no error was recorded.
 */
function getJukeboxPlayerError(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const win = window as Window & { jukeboxPlayerError?: number | null };
    return win.jukeboxPlayerError ?? null;
  });
}

type PlayVideoReturnType<T extends boolean> = {
  playerElements: T extends true ? { currentPage: Page } : null;
  successState: PuppeteerActionAcknowledgement;
};

/**
 * Closes any previous player pages and opens a new player page with the supplied `videoId`.
 * @returns The newly created page or null if an error occurs.
 */
export async function playVideo(videoId: string, state: StateType): Promise<PlayVideoReturnType<boolean>> {
  if (!state.browser) {
    return {
      playerElements: null,
      successState: {
        success: false,
        errorMessage: "No browser found. Refresh and try again.",
        stackTrace: "No browser found. Refresh and try again.",
        callingFunction: "playVideo"
      }
    };
  }

  try {
    const pages = await state.browser.pages();
    if (pages.length > 0) {
      await Promise.all(
        pages.map(async page => {
          const currentUrl = page.url();
          if (currentUrl.includes(PLAYER_URL)) {
            await page.close();
            console.log("PlayVideo:", `Closed previous page: ${currentUrl}.`);
          }
        })
      );
    }

    const url = `${PLAYER_URL}/${videoId}`;
    const currentPage = await state.browser.newPage();
    await currentPage.goto(url);

    try {
      const iframeElementHandle = await currentPage.waitForSelector(IFRAME_SELECTOR, {
        timeout: JUKEBOX_PLAYER_WAIT_TIMEOUT
      }).catch(() => null);

      if (!iframeElementHandle) {
        console.error("PlayVideo:", "Iframe not ready.");
        return {
          playerElements: null,
          successState: {
            success: false,
            errorMessage: "Page Iframe not ready.",
            stackTrace: "Page Iframe not ready.",
            callingFunction: "playVideo"
          }
        };
      }

      await waitForJukeboxPlayer(currentPage);

      const playerError = await getJukeboxPlayerError(currentPage);
      if (playerError != null) {
        console.error("PlayVideo:", "Video unavailable.", playerError);
        return {
          playerElements: null,
          successState: {
            success: false,
            errorMessage: "Video unavailable in this region",
            stackTrace: `YouTube player error code: ${playerError}`,
            callingFunction: "playVideo"
          }
        };
      }

      const volumeLevel = state.playerVolume;
      await currentPage.evaluate((vol) => {
        const win = window as Window & {
          jukeboxControl?: {
            unMute: () => void;
            setVolume: (v: number) => void;
            play: () => void;
            getState: () => number;
          };
        };
        win.jukeboxControl?.unMute();
        win.jukeboxControl?.setVolume(vol);
        const playerState = win.jukeboxControl?.getState();
        if (playerState !== 1 && playerState !== 3) {
          win.jukeboxControl?.play();
        }
      }, volumeLevel);

      console.log("PlayVideo:", "Video started.");
      return {
        playerElements: { currentPage },
        successState: { success: true }
      };

    } catch (err: any) {
      console.error("PlayVideo:", "Something went wrong finding the youtube video.\n", err);
      return {
        playerElements: null,
        successState: {
          success: false,
          errorMessage: "Something went wrong finding the Youtube video.",
          stackTrace: parseErrorForDB(err),
          callingFunction: "playVideo"
        }
      };
    }

  } catch (err: any) {
    console.error("PlayVideo:", "An error occured accessing the browser.\n", err);
    return {
      playerElements: null,
      successState: {
        success: false,
        errorMessage: "An error occured accessing the browser",
        stackTrace: parseErrorForDB(err),
        callingFunction: "playVideo"
      }
    };
  }
}

/**
 * Attempts to play or pause the video via the YouTube IFrame Player API.
 */
export async function togglePlayingState(currentPage: Page, isPlayingState: boolean): Promise<PuppeteerActionAcknowledgement> {
  try {
    const playerError = await getJukeboxPlayerError(currentPage);
    if (playerError != null) {
      console.error("ToggleVideoPlayingState:", "Video unavailable.");
      return {
        success: false,
        errorMessage: "Video unavailable",
        callingFunction: "togglePlayingState",
        stackTrace: `YouTube player error code: ${playerError}`
      };
    }

    const didToggle = await currentPage.evaluate((shouldPlay) => {
      const win = window as Window & {
        jukeboxControl?: {
          play: () => void;
          pause: () => void;
          getState: () => number;
        };
      };
      const control = win.jukeboxControl;
      if (!control) {
        return false;
      }

      const state = control.getState();
      if (state === 1 && !shouldPlay) {
        control.pause();
        return true;
      }
      if (state !== 1 && shouldPlay) {
        control.play();
        return true;
      }
      return false;
    }, isPlayingState);

    if (didToggle) {
      console.log("ToggleVideoPlayingState:", isPlayingState ? "Video played." : "Video paused.");
    }

    return { success: true };

  } catch (err: any) {
    console.error("ToggleVideoPlayingState:", `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video.\n`, err);
    return {
      success: false,
      errorMessage: `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video`,
      callingFunction: "togglePlayingState",
      stackTrace: parseErrorForDB(err)
    };
  }
}

type BaseError = Pick<NewEntryLog, "callingFunction" | "stackTrace">;
type CheckForEndOfVideoReturn =
  | {
    status: "success";
    playerState: {
      hasEnded: boolean;
      currentTime: number;
    };
  }
  | {
    status: "error";
    playerState: null;
  } & BaseError;

/**
 * Checks if the current video playing in the YouTube player has ended.
 */
export async function checkForEndOfVideo(currentPage: Page): Promise<CheckForEndOfVideoReturn> {
  try {
    const playerError = await getJukeboxPlayerError(currentPage);
    if (playerError != null) {
      console.error("CheckForEndOfVideo:", "Playback error detected.");
      return {
        status: "error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: `YouTube player error code: ${playerError}`
      };
    }

    const playerState = await currentPage.evaluate(() => {
      const win = window as Window & {
        jukeboxControl?: {
          getState: () => number;
          getCurrentTime: () => number;
          getDuration: () => number;
        };
      };
      const control = win.jukeboxControl;
      if (!control) {
        return null;
      }

      return {
        state: control.getState(),
        currentTime: control.getCurrentTime(),
        duration: control.getDuration()
      };
    });

    if (!playerState) {
      console.error("CheckForEndOfVideo:", "Cannot read player state.");
      return {
        status: "error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: "Cannot read player state."
      };
    }

    const { state, currentTime, duration } = playerState;

    if (state === YT_PLAYER_STATE.ENDED) {
      console.log("CheckForEndOfVideo", "Video has ended.");
      return {
        status: "success",
        playerState: {
          hasEnded: true,
          currentTime: 0
        }
      };
    }

    const toleranceSec = 2;
    const hasEnded = duration > 0 && currentTime >= duration - toleranceSec;
    if (hasEnded) {
      console.log("CheckForEndOfVideo", "Video has ended.");
      return {
        status: "success",
        playerState: {
          hasEnded: true,
          currentTime: 0
        }
      };
    }

    return {
      status: "success",
      playerState: {
        hasEnded: false,
        currentTime: Math.floor(currentTime)
      }
    };

  } catch (error: any) {
    console.error("CheckForEndOfVideo error:\n", error);
    return {
      status: "error",
      playerState: null,
      callingFunction: "checkForEndOfVideo",
      stackTrace: parseErrorForDB(error)
    };
  }
}

/**
 * Updates the player's volume to the be the new level.
 */
export async function adjustPlayerVolume(currentPage: Page, level: number): Promise<PuppeteerActionAcknowledgement> {
  try {
    const levelVal = level > 100 ? 100 : level < 0 ? 0 : level;

    await currentPage.evaluate((vol) => {
      const win = window as Window & {
        jukeboxControl?: {
          unMute: () => void;
          setVolume: (v: number) => void;
        };
      };
      win.jukeboxControl?.unMute();
      win.jukeboxControl?.setVolume(vol);
    }, levelVal);

    return { success: true };

  } catch (err: any) {
    console.error("adjustPlayerVolume:", "An error occured adjusting the player volume.\n", err);
    return {
      success: false,
      errorMessage: "An error occured adjusting the player volume",
      stackTrace: parseErrorForDB(err),
      callingFunction: "adjustPlayerVolume"
    };
  }
}

/**
 * Updates the player's current progress.
 */
export async function adjustPlayerProgress(currentPage: Page, durationSeconds: number, newTimeSeconds: number): Promise<PuppeteerActionAcknowledgement> {
  try {
    const newTime = newTimeSeconds > durationSeconds ? durationSeconds : newTimeSeconds < 0 ? 0 : newTimeSeconds;

    await currentPage.evaluate((seekTime) => {
      const win = window as Window & {
        jukeboxControl?: { seek: (s: number) => void };
      };
      win.jukeboxControl?.seek(seekTime);
    }, newTime);

    return { success: true };

  } catch (err: any) {
    console.error("adjustPlayerProgress:", "An error occured adjusting the player progress.\n", err);
    return {
      success: false,
      errorMessage: "An error occured adjusting the player progress",
      stackTrace: parseErrorForDB(err),
      callingFunction: "adjustPlayerProgress"
    };
  }
}
