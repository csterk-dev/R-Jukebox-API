import { IFRAME_SELECTOR, PAUSE_TOOLTIP_SELECTOR, PLAY_BUTTON_SELECTOR, PLAY_TOOLTIP_SELECTOR, PLAYBACK_ERROR_CONTENT_CONTAINER, PLAYER_CHECK_VIDEO_INTERVAL, PLAYER_PROGRESS_SLIDER_BOUNDING_WIDTH, PLAYER_SLIDER_LEVEL_OFFSET, PLAYER_URL, PLAYER_VOLUME_SLIDER_BOUNDING_WIDTH, TIME_CURRENT_SELECTOR, TIME_DURATION_SELECTOR, TIMELINE_SELECTOR, VOLUME_BUTTON_SELECTOR, VOLUME_SLIDER_CONTAINER_SELECTOR } from "../constants";
import puppeteer, { Frame, Page } from "puppeteer";
import { formatPlayerTimeStringToSeconds } from "../utils";
import { StateType } from "index";

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
    console.error("Error starting puppeteer", error);
  }
}

type PlayVideoReturnType<T extends boolean> = {
  playerElements: T extends true ? { currentPage: Page; iFrame: Frame } : null
  successState: PuppeteerActionAcknowledgement;
};

/**
 * Closes any previous player pages and opens a new player page with the supplied `videoId`.
 * @returns The newly created page and player iframe or null if an error occurs.
 */
export async function playVideo(videoId: string, state: StateType): Promise<PlayVideoReturnType<boolean>> {
  if (!state.browser) {
    // io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    // return null;
    return {
      playerElements: null,
      successState: {
        success: false,
        errorMessage: "No browser found. Refresh and try again.",
        stackTrace: "No browser found. Refresh and try again.",
        callingFunction: "playVideo"
      }
    }
  }

  try {
    /*
     * Close any previous player pages
     */
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
      )
    }

    // Open a new tab and navigate to the player
    const url = `${PLAYER_URL}/${videoId}`;
    const currentPage = await state.browser.newPage();
    await currentPage.goto(url);


    try {
      // Get the player iframe so we can interact with it
      const iframeElementHandle = await currentPage.$(IFRAME_SELECTOR);
      if (!iframeElementHandle) {
        console.error("PlayVideo:", "Iframe not ready.");
        // io.emit(SOCKET_EVENT_KEYS.error, "Iframe not ready.");
        // return null;
        return {
          playerElements: null,
          successState: {
            success: false,
            errorMessage: "Page Iframe not ready.",
            stackTrace: "Page Iframe not ready.",
            callingFunction: "playVideo"
          }
        }
      }

      const iFrame = await iframeElementHandle.contentFrame();

      // Attempt to find the selector for 10seconds
      const playButton = await iFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
        visible: true,
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable (delisted, unavailable in this region or an error occured loading in the iframe).
      if (!playButton) {
        console.error("PlayVideo:", "Video unavailable in this region.");
        // io.emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
        // return null;
        return {
          playerElements: null,
          successState: {
            success: false,
            errorMessage: "Video unavailable in this region",
            stackTrace: "Video unavailable in this region",
            callingFunction: "playVideo"
          }
        }
      }

      /*
       * By default the video should auto start.
       * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();

      // Ensure the player has the correct volume
      await playButton.hover();

      const volExitCode = await setPlayerVolume(currentPage, iFrame, state.playerVolume);
      if (volExitCode === 1) {
        console.error(`Unable to set initial player volume to: ${state.playerVolume}%.`)
      }



      if (htmlJsonButton.includes(PLAY_TOOLTIP_SELECTOR)) {
        await playButton.click(); // if a video is unlisted than this can fail if the selector was present prior to the Youtube block overlay appearing
        console.log("PlayVideo:", "Video started.");
        return {
          playerElements: {
            currentPage,
            iFrame
          },
          successState: { success: true }
        }
      }

      console.log("PlayVideo:", "Video already playing.");
      return {
        playerElements: {
          currentPage,
          iFrame
        },
        successState: { success: true }
      }

    } catch (err: any) {
      console.error("PlayVideo:", "Something went wrong finding the youtube video.\n", err);
      // io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong finding the youtube video.");
      // return null;
      return {
        playerElements: null,
        successState: {
          success: false,
          errorMessage: "Something went wrong finding the Youtube video.",
          stackTrace: err,
          callingFunction: "playVideo"
        }
      }
    }

  } catch (err: any) {
    console.error("PlayVideo:", "An error occured accessing the browser.\n", err);
    // io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
    // return null;
    return {
      playerElements: null,
      successState: {
        success: false,
        errorMessage: "An error occured accessing the browser",
        stackTrace: err,
        callingFunction: "playVideo"
      }
    }
  }
}



/**
 * Attempts to find the play/pause button within the iFrame and handles the action accordingly.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function togglePlayingState(iFrame: Frame, isPlayingState: boolean): Promise<PuppeteerActionAcknowledgement> {
  try {
    // Attempt to find the selector for 10seconds 
    const playButton = await iFrame.waitForSelector(PLAY_BUTTON_SELECTOR, {
      visible: true,
      timeout: 10000
    }).catch(() => null);


    // If the play button returns null, then the video is unavailable (delisted or unavailable in this region).
    if (!playButton) {
      console.error("ToggleVideoPlayingState:", "Video unavailable.");
      // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Video unavailable.");
      return {
        success: false,
        errorMessage: "Video unavailable",
        callingFunction: "togglePlayingState",
        stackTrace: "Video unavailable"
      }
    }

    /*
     * Only update the player state if the incoming value matches the player.
     */
    const outerHTML = await playButton.getProperty("outerHTML");
    const htmlJsonButton = await outerHTML.jsonValue();

    if (htmlJsonButton.includes(PAUSE_TOOLTIP_SELECTOR) && !isPlayingState) {

      await playButton.click()
      console.log("ToggleVideoPlayingState:", "Video paused.");

    } else if (htmlJsonButton.includes(PLAY_TOOLTIP_SELECTOR) && isPlayingState) {
      await playButton.click();
      console.log("ToggleVideoPlayingState:", "Video played.");
    }
    return { success: true }

  } catch (err: any) {
    console.error("ToggleVideoPlayingState:", `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video.\n`, err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video.`);
    // return 1;
    return {
      success: false,
      errorMessage: `Something went wrong ${isPlayingState ? "resuming" : "pausing"} the video`,
      callingFunction: "togglePlayingState",
      stackTrace: err
    }
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
    status: "error" | "detached-frame-error";
    playerState: null;
  } & BaseError;


/**
 * Checks if the current video playing in the YouTube iframe has ended.
 * Returns null if an error occurs or an object with `hasEnded` and `currentTime` properties.
 */
export async function checkForEndOfVideo(iFrame: Frame): Promise<CheckForEndOfVideoReturn> {
  try {
    const playbackErrorEl = await iFrame.waitForSelector(PLAYBACK_ERROR_CONTENT_CONTAINER, {
      visible: true,
      timeout: PLAYER_CHECK_VIDEO_INTERVAL
    }).catch(() => null);

    if (playbackErrorEl) {
      console.error("CheckForEndOfVideo:", "Playback error detected.");
      return {
        status: "error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: "Playback error detected."
      };
    }

    const currentTimeEl = await iFrame.waitForSelector(TIME_CURRENT_SELECTOR, { timeout: PLAYER_CHECK_VIDEO_INTERVAL }).catch(() => null);
    const durationTimeEl = await iFrame.waitForSelector(TIME_DURATION_SELECTOR, { timeout: PLAYER_CHECK_VIDEO_INTERVAL }).catch(() => null);

    if (!currentTimeEl || !durationTimeEl) {
      console.error("CheckForEndOfVideo:", "Cannot get time elements.");
      return {
        status: "error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: "Cannot get time elements."
      };
    }

    const currentTime = await iFrame.evaluate(el => el.textContent, currentTimeEl);
    const durationTime = await iFrame.evaluate(el => el.textContent, durationTimeEl);

    if (!currentTime || !durationTime) {
      console.error("CheckForEndOfVideo:", "Cannot read video times.");
      return {
        status: "error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: "Cannot read time elements."
      };
    }

    const currentTimeSec = formatPlayerTimeStringToSeconds(currentTime);
    const durationTimeSec = formatPlayerTimeStringToSeconds(durationTime);

    /** To account for the scenario where the current time is slightly less than the duration time but the video has essentially finished playing (e.g. 1:27/1:29). */
    const toleranceSec = 2;

    const hasEnded = currentTimeSec >= durationTimeSec - toleranceSec;
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
        currentTime: currentTimeSec
      }
    };

  } catch (error: any) {
    const errMessage: string = error.message;
    const detatchedFrameMessage = "Attempted to use detached Frame";

    /*
     * Allow detached frame errors to be ignored.
     * Detached frame errors occur when the playerFrame changes as the function attempts to interact with the old frame as it is changing.
     */
    if (errMessage.includes(detatchedFrameMessage)) {
      console.error("CheckForEndOfVideo error:\n", "Detached frame error encountered - this can safely be ignored");
      return {
        status: "detached-frame-error",
        playerState: null,
        callingFunction: "checkForEndOfVideo",
        stackTrace: "Detached frame error encountered - this can safely be ignored."
      };
    }

    console.error("CheckForEndOfVideo error:\n", error);
    return {
      status: "error",
      playerState: null,
      callingFunction: "checkForEndOfVideo",
      stackTrace: error
    };
  }
}


/**
 * Updates the player's volume to the be the new level.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function adjustPlayerVolume(currentPage: Page, iFrame: Frame, level: number): Promise<PuppeteerActionAcknowledgement> {
  try {

    // Ensure no invalid value can be recieved from the UI
    const levelVal = level > 100 ? 100 : level < 0 ? 0 : level;

    const exitCode = await setPlayerVolume(currentPage, iFrame, levelVal);
    if (exitCode === 1) {
      console.error("adjustPlayerVolume:", "Cannot find volume bounding box.");
      // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Cannot find volume bounding box.");
      // return 1;
      return {
        success: false,
        errorMessage: "Cannot find volume bounding box",
        callingFunction: "adjustPlayerVolume",
        stackTrace: "Cannot find volume bounding box"
      }
    }

    return { success: true }

  } catch (err: any) {
    console.error("adjustPlayerVolume:", "An error occured adjusting the player volume.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "An error occured adjusting the player volume.");
    // return 1;
    return {
      success: false,
      errorMessage: "An error occured adjusting the player volume",
      stackTrace: err,
      callingFunction: "adjustPlayerVolume"
    }
  }
}


/**
 * Updates the player's current progress.
 * @returns An exit code: error == 1, OK == 0.
 */
export async function adjustPlayerProgress(currentPage: Page, iFrame: Frame, durationSeconds: number, newTimeSeconds: number): Promise<PuppeteerActionAcknowledgement> {

  try {
    // Don't allow any incorrect values to be set
    const newTime = newTimeSeconds > durationSeconds ? durationSeconds : newTimeSeconds < 0 ? 0 : newTimeSeconds;

    const exitCode = await setPlayerProgress(currentPage, iFrame, durationSeconds, newTime);
    if (exitCode === 1) {
      console.error("adjustPlayerProgress:", "Cannot find progress bounding box.");
      // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Cannot find progress bounding box.");
      return {
        success: false,
        errorMessage: "Cannot find progress bounding box",
        callingFunction: "adjustPlayerProgress",
        stackTrace: "Cannot find progress bounding box"
      }
    }

    return { success: true }

  } catch (err: any) {
    console.error("adjustPlayerProgress:", "An error occured adjusting the player progress.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "An error occured adjusting the player progress.");
    // return 1;
    return {
      success: false,
      errorMessage: "An error occured adjusting the player progress",
      stackTrace: err,
      callingFunction: "adjustPlayerProgress"
    }
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