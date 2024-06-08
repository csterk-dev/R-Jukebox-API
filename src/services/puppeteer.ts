import { IFRAME_SELECTOR, PAUSE_TOOLTIP_SELECTOR, PLAY_BUTTON_SELECTOR, PLAY_TOOLTIP_SELECTOR, PLAYER_SLIDER_BOUNDING_WIDTH, PLAYER_SLIDER_LEVEL_OFFSET, PLAYER_URL, SOCKET_EVENT_KEYS, TIME_CURRENT_SELECTOR, TIME_DURATION_SELECTOR, VOLUME_BUTTON_SELECTOR, VOLUME_SLIDER_CONTAINER_SELECTOR } from "../constants";
import puppeteer, { Browser, Frame, Page } from "puppeteer";
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
 * Closes any previous player pages and opens a new player page with the supplied `videoId`.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function playVideo(browser: Browser, io: WsServer, videoId: string, playerVolume: number): Promise<0 | 1> {
  io.emit(SOCKET_EVENT_KEYS.isLoading, true);

  try {

    /*
     * Close any previous player pages
     */
    const pages = await browser.pages();
    if (pages.length > 0) {
      await Promise.all(
        pages.map(async page => {
          const currentUrl = page.url();
          if (currentUrl.includes(PLAYER_URL)) {
            await page.close();
            console.log("PlayVideo:", `Closed previous page: ${currentUrl}.`);
          }
        })
      )
    }

    // Open a new tab and navigate to the player
    const url = `${PLAYER_URL}/${videoId}`;
    const currentPage = await browser.newPage();
    await currentPage.goto(url);


    try {
      // Get the player iframe so we can interact with it
      const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
      if (!iframeElementHandle) {
        console.log("PlayVideo:", "Iframe not ready.");
        io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
        return 1;
      }

      const iframeContentFrame = await iframeElementHandle.contentFrame();

      // Ensure the player has the correct volume
      const volExitCode = await setPlayerVolume(currentPage, iframeContentFrame, playerVolume);
      console.log(volExitCode);
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
 * @returns An exit code: error == 1, OK == 0.
 */
export async function togglePlayingState(browser: Browser, io: WsServer, videoId: string, isPlayingState: boolean): Promise<0 | 1> {
  try {
    const currentPage = await getPlayerPage(browser, videoId);

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
        return 1;
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
      return 0;

    } catch (err: any) {
      console.log("PauseVideo:", "Something went wrong pausing the youtube video.\n", err);
      io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong pausing the youtube video.");
      return 1;

    }
  } catch (err: any) {
    console.log("PauseVideo:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    return 1;
  }
}


/**
 * Checks if the current video playing in the YouTube iframe has ended.
 * 
 * @param {Page} currentPage - The Puppeteer page object representing the browser tab.
 * @param {WsServer} io - The Socket.io server instance for emitting events to clients.
 * @returns {Promise<{ hasEnded: boolean, currentTime: number, durationTime: number } | number>} 
 * - Returns 1 if an error occurs or an object with `hasEnded` and `currentTime` properties.
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

    /** To account for the scenario where the current time is slightly less than the duration time but the video has essentially finished playing (e.g. 1:27/1:29). */
    const toleranceSec = 2;

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
 * Updates the player's volume to the be the new level.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 * @param level The new level to set to the player.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function adjustPlayerVolume(browser: Browser, io: WsServer, videoId: string, level: number): Promise<0 | 1> {
  try {
    const currentPage = await getPlayerPage(browser, videoId);

    if (!currentPage) {
      console.log("adjustPlayerVolume", "Cannot find current video.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot find current video.");
      return 1;
    }

    try {
      // Get the player iframe so we can interact with it
      const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
      if (!iframeElementHandle) {
        console.log("adjustPlayerVolume:", "Iframe not ready.");
        io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
        return 1;
      }

      const iframeContentFrame = await iframeElementHandle.contentFrame();

      // Ensure no invalid value can be recieved from the UI
      const levelVal = level > 100 ? 100 : level < 0 ? 0 : level;

      const exitCode = await setPlayerVolume(currentPage, iframeContentFrame, levelVal);
      if (exitCode === 1) {
        console.log("adjustPlayerVolume:", "Unable to set player volume.");
        io.emit(SOCKET_EVENT_KEYS.error, "Unable to set player volume.");
        return 1;
      }

      return 0;

    } catch (err: any) {
      console.log("adjustPlayerVolume:", "An error occured adjusting the player volume.\n", err);
      io.emit(SOCKET_EVENT_KEYS.error, "An error occured adjusting the player volume.");
      return 1;
    }

  } catch (err: any) {
    console.log("adjustPlayerVolume:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    return 1;
  }
}


/**
 * Interacts with the player to set a new volume level.
 * @param currentPage The current player page.
 * @param iframeContentFrame The iframe of the player.
 * @param level The new level.
 * @returns An exit code: error == 1, OK == 0.
 */
async function setPlayerVolume(currentPage: Page, iframeContentFrame: Frame, level: number): Promise<0 | 1> {
  
  // Find the volume slider container
  const volumeButton = await iframeContentFrame.waitForSelector(VOLUME_BUTTON_SELECTOR);
  volumeButton?.hover();
  const volumeSliderContainer = await iframeContentFrame.$(VOLUME_SLIDER_CONTAINER_SELECTOR);
  
  const boundingBox = await volumeSliderContainer?.boundingBox();
  if (!boundingBox) {
    return 1;
  }

  // Calculate the position to set the volume
  const volumePosition = boundingBox.x + (PLAYER_SLIDER_BOUNDING_WIDTH * (level + PLAYER_SLIDER_LEVEL_OFFSET) / 100);

  // Simulate the mouse drag to set the volume
  await currentPage.mouse.move(volumePosition, boundingBox.y + boundingBox.height / 2, { steps: 10 });
  await currentPage.mouse.down();
  await currentPage.mouse.up();
  return 0;
}


/**
 * Returns the player page of the current video, or null.
 * @param browser The current puppeteer browser instance.
 * @param videoId The id of the current video.
 * @returns {Promise<Page | null>} The player page or null.
 */
export async function getPlayerPage(browser: Browser, videoId: string): Promise<Page | undefined> {
  const pages = await browser.pages();
  let playerPage: Page | undefined;

  /*
   * Search through all the currently open pages for a page matching the provided videoId.
   */
  if (pages.length > 0) {
    playerPage = pages.find(page => {
      const currentUrl = page.url();
      return currentUrl.includes(PLAYER_URL) && currentUrl.includes(videoId);
    });
  }

  if (!playerPage) return undefined;
  return playerPage;
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