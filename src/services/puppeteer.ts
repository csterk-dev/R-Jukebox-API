import { IFRAME_SELECTOR, PAUSE_TOOLTIP_SELECTOR, PLAY_BUTTON_SELECTOR, PLAY_TOOLTIP_SELECTOR, PLAYER_URL, SOCKET_EVENT_KEYS, TIME_CURRENT_SELECTOR, TIME_DURATION_SELECTOR } from "../constants";
import puppeteer, { Browser, Page } from "puppeteer";
import { Server as WsServer } from "socket.io";

/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 * @returns {Promise<Browser | undefined>} A promise containing the current puppeteer browser instance, or undefined.
 */
export async function initialsePuppeteerBrowser() {
  try {
    const browser = await puppeteer.launch({
      // Set timeout to be 24h to try and prevent `Requesting main frame too early!` error.
      timeout: 3600000,
      headless: false,
      // args: ["--start-windowed"],
      defaultViewport: null
      // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    if (!browser) {
      throw new Error("Failed to start puppeteer browser instance");
    }
    browser.on("error", console.log);
    return browser;

  } catch (error: any) {
    console.log("Error starting puppeteer", error);
  }
}



/**
 * Attempts to find the supplied `videoId` and resume playing.
 * If no matching `videoId` is found, the function will attempt to close any previous player pages in the browser,
 * and open a new page with the supplied `videoId`.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 * @returns An exit code: error == 1, OK == 0 | undefined.
 */
export async function playVideo(browser: Browser, io: WsServer, videoId: string) {
  io.emit(SOCKET_EVENT_KEYS.isLoading, true);

  try {
    const pages = await browser.pages();
    let currentPage: Page | undefined;

    /*
     * Close any pages that are not already active with the requested videoId.
     * If the requested videoId is already active, set it to the current page.
     */
    if (pages.length > 0) {
      await Promise.all(
        pages.map(async page => {
          const currentUrl = page.url();
          if (currentUrl.includes(PLAYER_URL) && currentUrl.includes(videoId)) {
            currentPage = page;
            console.log("PlayVideo:", "videoId found.");

          } else if (currentUrl.includes(PLAYER_URL)) {
            await page.close();
            console.log("PlayVideo:", `Closed previous page: ${currentUrl}.`);
          }
        })
      )
    }

    // If no previous page, open a new tab and navigate to the player
    if (!currentPage) {
      const url = `${PLAYER_URL}/${videoId}`;
      currentPage = await browser.newPage();
      await currentPage.goto(url);
    }

    try {
      // Get the player iframe so we can interact with it
      const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
      if (!iframeElementHandle) {
        console.log("PlayVideo:", "Iframe not ready.");
        io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
        return 1;
      }

      const iframeContentFrame = await iframeElementHandle.contentFrame();

      // Attempt to find the selector for 10seconds
      const playButton = await iframeContentFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
        visible: true,
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable (delisted or unavailable in this region).
      if (!playButton) {
        console.log("PlayVideo:", "Video unavailable.");
        io.emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
        return 1;
      }

      /*
       * By default the video should auto start.
       * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();

      if (htmlJsonButton.includes(PLAY_TOOLTIP_SELECTOR)) {
        playButton.click();
        console.log("PlayVideo:", "Video started.");
        return 0;
      }

      console.log("PlayVideo:", "Video already playing.");
      return 0;

    } catch (err: any) {
      console.log("PlayVideo:", "Something went wrong finding the youtube video.\n", err);
      io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong finding the youtube video.");
      return 1;

    }

  } catch (err: any) {
    console.log("PlayVideo:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    return 1;

  } finally {
    io.emit(SOCKET_EVENT_KEYS.isLoading, false);
  }
}



/**
 * Attempts to find the supplied `videoId` and pause playing.
 * If no matching `videoId` is found, the function emit an error and return an exit code 1.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 * @returns An exit code: error == 1, OK == 0 | undefined.
 */
export async function togglePlayingState(browser: Browser, io: WsServer, videoId: string, isPlayingState: boolean) {

  try {
    const pages = await browser.pages();
    let currentPage: Page | undefined;

    /*
     * Search through all the currently open pages for a page matching the provided videoId.
     */
    if (pages.length > 0) {
      pages.map(page => {
        const currentUrl = page.url();
        if (currentUrl.includes(PLAYER_URL) && currentUrl.includes(videoId)) {
          currentPage = page;
          console.log("ToggleVideoPlayingState:", "videoId found.");
        }
      })
    }

    if (!currentPage) {
      console.log("ToggleVideoPlayingState", "Cannot find current video.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot find current video.");
      return 1;
    }

    try {
      // Get the player iframe so we can interact with it
      const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
      if (!iframeElementHandle) {
        console.log("ToggleVideoPlayingState:", "Iframe not ready.");
        io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
        return 1;
      }

      const iframeContentFrame = await iframeElementHandle.contentFrame();

      // Attempt to find the selector for 10seconds 
      const playButton = await iframeContentFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
        visible: true,
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable (delisted or unavailable in this region).
      if (!playButton) {
        console.log("ToggleVideoPlayingState:", "Video unavailable.");
        io.emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
        return;
      }

      /*
       * Only update the player state if the incoming value matches the player.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();

      if (htmlJsonButton.includes(PAUSE_TOOLTIP_SELECTOR) && !isPlayingState) {

        playButton.click();
        console.log("ToggleVideoPlayingState:", "Video paused.");

      } else if (htmlJsonButton.includes(PLAY_TOOLTIP_SELECTOR) && isPlayingState) {

        playButton.click();
        console.log("ToggleVideoPlayingState:", "Video played.");
      }

    } catch (err: any) {
      console.log("PauseVideo:", "Something went wrong pausing the youtube video.\n", err);
      io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong pausing the youtube video.");
      return 1;

    }
  } catch (err: any) {
    console.log("PauseVideo:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    return 1;

  } finally {
    io.emit(SOCKET_EVENT_KEYS.isLoading, false);
  }
}


/**
 * Checks if the current video playing in the YouTube iframe has ended.
 * 
 * @param {Page} currentPage - The Puppeteer page object representing the browser tab.
 * @param {WsServer} io - The Socket.io server instance for emitting events to clients.
 * @returns {Promise<{ hasEnded: boolean, currentTime: number, durationTime: number } | number>} 
 * - Returns an object with `hasEnded`, `currentTime`, and `durationTime` properties, and `1` if an error occurs.
 */
export async function checkForEndOfVideo(currentPage: Page, io: WsServer) {
  try {
    // Get the player iframe so we can interact with it
    const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
    if (!iframeElementHandle) {
      console.log("checkForEndOfVideo:", "Iframe not ready.");
      io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
      return 1;
    }

    const iframeContentFrame = await iframeElementHandle.contentFrame();

    const currentTimeEl = await iframeContentFrame.waitForSelector(TIME_CURRENT_SELECTOR).catch(() => null);
    const durationTimeEl = await iframeContentFrame.waitForSelector(TIME_DURATION_SELECTOR).catch(() => null);

    if (!currentTimeEl || !durationTimeEl) {
      console.log("CheckForEndOfVideo:", "Cannot get video duration.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot get video duration.");
      return 1;
    }

    const currentTime = await iframeContentFrame.evaluate(el => el.textContent, currentTimeEl);
    const durationTime = await iframeContentFrame.evaluate(el => el.textContent, durationTimeEl);

    if (!currentTime || !durationTime) {
      console.log("CheckForEndOfVideo:", "Cannot read video times.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot read video times.");
      return 1;
    }

    const currentTimeSec = parseTime(currentTime);
    const durationTimeSec = parseTime(durationTime);

    /** To account for the scenario where the current time is slightly less than the duration time but the video has essentially finished playing (e.g. 1:28/1:29). */
    const toleranceSec = 1;

    const hasEnded = currentTimeSec >= durationTimeSec - toleranceSec;
    if (hasEnded) {
      console.log("CheckForEndOfVideo", "Video has ended.");
    }

    return {
      hasEnded,
      currentTime: currentTimeSec
    };

  } catch (error) {
    console.error("Error in checkForEndOfVideo:", error);
    io.emit(SOCKET_EVENT_KEYS.error, "Error checking video status.");
    return 1;
  }
}



/** 
 * Convert time from "MM:SS" or "HH:MM:SS" to seconds
 */
const parseTime = (timeStr: string) => {
  const parts = timeStr.split(":").map(Number);
  return parts.length === 3 ?
    parts[0] * 3600 + parts[1] * 60 + parts[2] :
    parts[0] * 60 + parts[1];
};