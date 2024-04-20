import { Browser, Page } from "puppeteer";
import { Request, Response } from "express";
import { YOUTUBE_BROWSER_WATCH_PAGE_URL } from "../constants";

/**
 * Attempts to find the supplied `videoId` and resume playing.
 * If no matching `videoId` is found, the function will attempt to close any previous youtube pages in the browser,
 * and open a new browser with the supplied `videoId`.
 * 
 * @param req Express request parm containing the `videoId` to play.
 * @param res Express response parm.
 * @param browser The current puppeteer browser instance.
 */
export async function HandlePlayVideo(req: Request, res: Response, browser: Browser) {
  const { videoId } = req.body;


  if (!videoId) {
    res.status(400).json({ message: "No video ID provided" });
    return;
  }

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
            console.log("Page with existing videoId found")
          } else if (currentUrl.includes("youtube.com")) {
            await page.close();
            console.log(`Closed existing YouTube page: ${currentUrl}`);
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
        res.status(404).send({ message: "Video unavailable" });
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
        res.status(200).send({ message: "Video started" });
        return;
      }

      res.status(200).send({ message: "Video already playing" });

    } catch (err: any) {
      console.log(err);
      res.status(500).send({ message: "Something went wrong finding the youtube video" });
    }
  } catch (err: any) {
    console.error(`An error occured: ${err}`);

    res.status(500).send({ message: "Internal server error" });
  }
}



/**
 * Attempts to find the supplied `videoId` and pause playing.
 * If no matching `videoId` is found, the function will return HTTP status 404.
 * 
 * @param req Express request parm containing the `videoId` to pause.
 * @param res Express response parm.
 * @param browser The current puppeteer browser instance.
 */
export async function HandlePauseVideo(req: Request, res: Response, browser: Browser) {
  const { videoId } = req.body;

  if (!videoId) {
    res.status(400).json({ message: "No video ID provided" });
    return;
  }

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
          console.log("Page with existing videoId found")
        }
      })
    } else {
      res.status(404).send({ message: "No current pages" });
      return;
    }

    if (!currentPage) {
      res.status(404).send({ message: "No video found" });
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
        res.status(404).send({ message: "Video unavailable" });
        return;
      }

      /*
       * By default the video should auto start.
       * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
       */
      const outerHTML = await playButton.getProperty("outerHTML");
      const htmlJsonButton = await outerHTML.jsonValue();
      // eslint-disable-next-line quotes
      if (htmlJsonButton.includes(`data-title-no-tooltip="Pause"`)) {

        await currentPage.keyboard.press("k");
        res.status(200).send({ message: "Video paused" });
        return;
      }

      res.status(200).send({ message: "Video already paused" });

    } catch (err: any) {
      res.status(500).send({ message: "Something went wrong pausing the youtube video" });
    }
  } catch (err: any) {
    console.error(`An error occured: ${err}`);

    res.status(500).send({ message: "Internal server error" });
  }
}
