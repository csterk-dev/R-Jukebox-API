import { Browser, Page } from "puppeteer";
import { Express, Request, Response } from "express";


/**
 * Pause Video Route - Finds the current youtube videoId in the browser and attempt to pause it.
 * If no page with the provided videoId is present, will return 404.
 */
export function Pause(app: Express, browser: Browser) {
  app.post("/pause", async (req: Request, res: Response) => {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: "No video ID provided" });
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
          timeout: 10000 // Attempt to find the selector for 10seconds 
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
  });
}