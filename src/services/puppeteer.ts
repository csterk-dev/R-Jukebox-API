import { WebSocketEventKeys, YOUTUBE_BROWSER_WATCH_PAGE_URL } from "../constants";
import puppeteer, { Browser, Page } from "puppeteer";
import { Server as WsServer } from "socket.io";

/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 * @returns {Promise<Browser | undefined>} A promise containing the current puppeteer browser instance, or undefined.
 */
export async function InitialsePuppeteerBrowser() {
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
 * If no matching `videoId` is found, the function will attempt to close any previous youtube pages in the browser,
 * and open a new browser with the supplied `videoId`.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 */
export async function PlayVideo(browser: Browser, io: WsServer, videoId: string) {
  io.emit(WebSocketEventKeys.isLoading, true);

  try {
    const pages = await browser.pages();
    let currentPage: Page | undefined;

    /*
     * Close any youtube pages that are not already active with the requested videoId.
     * If the requested videoId is already active, set it to the current page.
     */
    if (pages.length > 0) {
      await Promise.all(
        pages.map(async page => {
          const currentUrl = page.url();
          if (currentUrl.includes("youtube.com") && currentUrl.includes(`?v=${videoId}`)) {
            currentPage = page;
            console.log("PlayVideo:", "videoId found");

          } else if (currentUrl.includes("youtube.com")) {
            await page.close();
            console.log("PlayVideo:", `Closed previous YouTube page: ${currentUrl}`);
          }
        })
      )
    }

    if (!currentPage) {
      // Open a new tab and navigate to the URL
      const url = `${YOUTUBE_BROWSER_WATCH_PAGE_URL}${videoId}`;
      currentPage = await browser.newPage();
      await currentPage.goto(url);
    }

    try {
      const playBtnSelector = ".ytp-play-button";
      const playButton = await currentPage.waitForSelector(playBtnSelector, {
        visible: true,
        // Attempt to find the selector for 10seconds 
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable.
      if (!playButton) {
        console.log("PlayVideo:", "Video unavailable");
        io.emit(WebSocketEventKeys.error, "Video unavailable");
        return;
      }

      /*
       * By default the video should auto start.
       * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();
      // eslint-disable-next-line quotes
      if (htmlJsonButton.includes(`data-title-no-tooltip="Play"`)) {

        await currentPage.keyboard.press("k");
        console.log("PlayVideo:", "Video started");
        return;
      }

      console.log("PlayVideo:", "Video already playing");

    } catch (err: any) {
      console.log("PlayVideo:", "Something went wrong finding the youtube video", err);
      io.emit(WebSocketEventKeys.error, "Something went wrong finding the youtube video");
    }

  } catch (err: any) {
    console.log("PlayVideo:", "An error occured", err);
    io.emit(WebSocketEventKeys.error, "Internal server error");

  } finally {
    io.emit(WebSocketEventKeys.isLoading, false);
  }
}



/**
 * Attempts to find the supplied `videoId` and pause playing.
 * If no matching `videoId` is found, the function will return HTTP status 404.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 * @param videoId The video to play.
 */
export async function TogglePlayingState(browser: Browser, io: WsServer, videoId: string, isPlayingState: boolean) {

  try {
    const pages = await browser.pages();
    let currentPage: Page | undefined;

    /*
     * Search through all the currently open pages for a page matching the provided videoId.
     */
    if (pages.length > 0) {
      pages.map(page => {
        const currentUrl = page.url();
        if (currentUrl.includes("youtube.com") && currentUrl.includes(`?v=${videoId}`)) {
          currentPage = page;
          console.log("ToggleVideoPlayingState:", "videoId found");

        }
      })
    }

    if (!currentPage) {
      console.log("ToggleVideoPlayingState", "Cannot find current video");
      io.emit(WebSocketEventKeys.error, "Cannot find current video");
      return;
    }

    try {
      const playBtnSelector = ".ytp-play-button";
      const playButton = await currentPage.waitForSelector(playBtnSelector, {
        visible: true,
        // Attempt to find the selector for 10seconds 
        timeout: 10000
      }).catch(() => null);


      // If the play button returns null, then the video is unavailable.
      if (!playButton) {
        console.log("ToggleVideoPlayingState:", "Video unavailable");
        io.emit(WebSocketEventKeys.error, "Video unavailable");
        return;
      }

      /*
       * Only update the player state if the incoming value matches the player.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();

      // eslint-disable-next-line quotes
      if (htmlJsonButton.includes(`data-title-no-tooltip="Pause"`) && !isPlayingState) {

        await currentPage.keyboard.press("k");
        console.log("ToggleVideoPlayingState:", "Video paused");

      // eslint-disable-next-line quotes
      } else if (htmlJsonButton.includes(`data-title-no-tooltip="Play"`) && isPlayingState) {
        await currentPage.keyboard.press("k");
        console.log("ToggleVideoPlayingState:", "Video played");
      }

    } catch (err: any) {
      console.log("PauseVideo:", "Something went wrong pausing the youtube video", err);
      io.emit(WebSocketEventKeys.error, "Something went wrong pausing the youtube video");
    }
  } catch (err: any) {
    console.log("PauseVideo:", "An error occured", err);

    io.emit(WebSocketEventKeys.error, "Internal server error");
  } finally {
    io.emit(WebSocketEventKeys.isLoading, false);
  }
}
