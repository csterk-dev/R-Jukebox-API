import { IFRAME_SELECTOR, PAUSE_TOOLTIP_SELECTOR, PLAY_BUTTON_SELECTOR, PLAY_TOOLTIP_SELECTOR, PLAYER_PROGRESS_SLIDER_BOUNDING_WIDTH, PLAYER_SLIDER_LEVEL_OFFSET, PLAYER_URL, PLAYER_VOLUME_SLIDER_BOUNDING_WIDTH, SOCKET_EVENT_KEYS, TIME_CURRENT_SELECTOR, TIME_DURATION_SELECTOR, TIMELINE_SELECTOR, VOLUME_BUTTON_SELECTOR, VOLUME_SLIDER_CONTAINER_SELECTOR } from "../constants";
import puppeteer, { Browser, Frame, Page } from "puppeteer";
import { Server as WsServer } from "socket.io";
import { formatPlayerTimeStringToSeconds } from "../utils";

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
      // args: ["--start-windowed"],
      args: ["--disable-features=site-per-process"],
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
    console.log("Error starting puppeteer", error);
  }
}



/**
 * Closes any previous player pages and opens a new player page with the supplied `videoId`.
 * @returns The newly created page and player iframe or null if an error occurs.
 */
export async function playVideo(browser: Browser, io: WsServer, videoId: string, playerVolume: number): Promise<{ currentPage: Page; iFrame: Frame; } | null> {
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
        return null;
      }

      const iFrame = await iframeElementHandle.contentFrame();

      // Attempt to find the selector for 10seconds
      const playButton = await iFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
        visible: true,
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable (delisted, unavailable in this region or an error occured loading in the iframe).
      if (!playButton) {
        console.log("PlayVideo:", "Video unavailable.");
        io.emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
        return null;
      }

      /*
       * By default the video should auto start.
       * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();

      // Ensure the player has the correct volume
      await playButton.hover();

      const volExitCode = await setPlayerVolume(currentPage, iFrame, playerVolume);
      if (volExitCode === 1) {
        io.emit(SOCKET_EVENT_KEYS.error, `Unable to set initial player volume to: ${playerVolume}%.`);
      }

      if (htmlJsonButton.includes(PLAY_TOOLTIP_SELECTOR)) {
        playButton.click();
        console.log("PlayVideo:", "Video started.");
        return {
          currentPage,
          iFrame
        }
      }

      console.log("PlayVideo:", "Video already playing.");
      return {
        iFrame,
        currentPage
      }

    } catch (err: any) {
      console.log("PlayVideo:", "Something went wrong finding the youtube video.\n", err);
      io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong finding the youtube video.");
      return null;

    }

  } catch (err: any) {
    console.log("PlayVideo:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    return null;

  } finally {
    io.emit(SOCKET_EVENT_KEYS.isLoading, false);
  }
}



/**
 * Attempts to find the play/pause button within the iFrame and handles the action accordingly.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function togglePlayingState(io: WsServer, incomingClientId: string, iFrame: Frame, isPlayingState: boolean): Promise<0 | 1> {
  try {
    // Attempt to find the selector for 10seconds 
    const playButton = await iFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
      visible: true,
      timeout: 10000
    }).catch(() => null);


    // If the play button returns null, then the video is unavailable (delisted or unavailable in this region).
    if (!playButton) {
      console.log("ToggleVideoPlayingState:", "Video unavailable.");
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
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
    console.log("ToggleVideoPlayingState:", `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video.\n`, err);
    io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video.`);
    return 1;

  }
}



/**
 * Checks if the current video playing in the YouTube iframe has ended.
 * @returns {Promise<{ hasEnded: boolean, currentTime: number, durationTime: number } | number>} 
 * Returns null if an error occurs or an object with `hasEnded` and `currentTime` properties.
 */
export async function checkForEndOfVideo(iFrame: Frame) {
  try {
    const currentTimeEl = await iFrame.waitForSelector(TIME_CURRENT_SELECTOR).catch(() => null);
    const durationTimeEl = await iFrame.waitForSelector(TIME_DURATION_SELECTOR).catch(() => null);

    if (!currentTimeEl || !durationTimeEl) {
      console.log("CheckForEndOfVideo:", "Cannot get time elements.");
      return null;
    }

    const currentTime = await iFrame.evaluate(el => el.textContent, currentTimeEl);
    const durationTime = await iFrame.evaluate(el => el.textContent, durationTimeEl);

    if (!currentTime || !durationTime) {
      console.log("CheckForEndOfVideo:", "Cannot read video times.");
      return null;
    }

    const currentTimeSec = formatPlayerTimeStringToSeconds(currentTime);
    const durationTimeSec = formatPlayerTimeStringToSeconds(durationTime);

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
    console.error("CheckForEndOfVideo error:\n", error);
    return null;
  }
}


/**
 * Updates the player's volume to the be the new level.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function adjustPlayerVolume(io: WsServer, incomingClientId: string, currentPage: Page, iFrame: Frame, level: number): Promise<0 | 1> {
  try {

    // Ensure no invalid value can be recieved from the UI
    const levelVal = level > 100 ? 100 : level < 0 ? 0 : level;

    const exitCode = await setPlayerVolume(currentPage, iFrame, levelVal);
    if (exitCode === 1) {
      console.log("adjustPlayerVolume:", "Cannot find volume bounding box.");
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Cannot find volume bounding box.");
      return 1;
    }

    return 0;

  } catch (err: any) {
    console.log("adjustPlayerVolume:", "An error occured adjusting the player volume.\n", err);
    io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "An error occured adjusting the player volume.");
    return 1;
  }
}


/**
 * Updates the player's current progress.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function adjustPlayerProgress(io: WsServer, incomingClientId: string, currentPage: Page, iFrame: Frame, durationSeconds: number, newTimeSeconds: number): Promise<0 | 1> {

  try {

    // Don't allow any incorrect values to be set
    const newTime = newTimeSeconds > durationSeconds ? durationSeconds : newTimeSeconds < 0 ? 0 : newTimeSeconds;

    const exitCode = await setPlayerProgress(currentPage, iFrame, durationSeconds, newTime);
    if (exitCode === 1) {
      console.log("adjustPlayerProgress:", "Cannot find progress bounding box.");
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Cannot find progress bounding box.");
      return 1;
    }

    return 0;

  } catch (err: any) {
    console.log("adjustPlayerProgress:", "An error occured adjusting the player's progress.\n", err);
    io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "An error occured adjusting the player's progress.");
    return 1;
  }
}


/**
 * Interacts with the player to set a new volume level.
 * @returns An exit code: error == 1, OK == 0.
 */
async function setPlayerVolume(currentPage: Page, iFrame: Frame, newVolumeLevel: number): Promise<0 | 1> {

  // Find the volume slider container and hover the button to make it 'open'
  const volumeButton = await iFrame.waitForSelector(VOLUME_BUTTON_SELECTOR).catch(() => null);
  volumeButton && volumeButton.hover();

  const volumeSliderContainer = await iFrame.$(VOLUME_SLIDER_CONTAINER_SELECTOR);

  const boundingBox = await volumeSliderContainer?.boundingBox();
  if (!boundingBox) {
    return 1;
  }

  // Calculate the position to set the volume
  const volumePosition = boundingBox.x + (PLAYER_VOLUME_SLIDER_BOUNDING_WIDTH * (newVolumeLevel + PLAYER_SLIDER_LEVEL_OFFSET) / 100);

  // Simulate the mouse drag to set the volume
  await currentPage.mouse.move(volumePosition, boundingBox.y + boundingBox.height / 2, { steps: 10 });
  await currentPage.mouse.down();
  await currentPage.mouse.up();
  return 0;
}


/**
 * Interacts with the player to set a new current time.
 * @returns An exit code: error == 1, OK == 0.
 */
async function setPlayerProgress(currentPage: Page, iFrame: Frame, durationSeconds: number, newTimeSeconds: number): Promise<0 | 1> {

  const timelineSliderContainer = await iFrame.$(TIMELINE_SELECTOR);

  const boundingBox = await timelineSliderContainer?.boundingBox();
  if (!boundingBox) {
    return 1;
  }

  // Calculate the position to set the volume
  const progressPosition = boundingBox.x + (PLAYER_PROGRESS_SLIDER_BOUNDING_WIDTH * (newTimeSeconds / durationSeconds));

  // Simulate the mouse drag to set the volume
  await currentPage.mouse.move(progressPosition, boundingBox.y + boundingBox.height / 2, { steps: 10 });
  await currentPage.mouse.down();
  await currentPage.mouse.up();
  return 0;
}