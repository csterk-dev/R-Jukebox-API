import { Browser } from "puppeteer";
import { Express, Request, Response } from "express";


/**
 * Play Video Route - Opens the provided URL in the browser.
 * Will attempt to find any currently open 'Youtube.com' pages to play the request video and close them prior to playing, otherwise will create a new page and play.
 */
export function PlayVideo(app: Express, browser: Browser) {
  app.post("/play", async (req: Request, res: Response) => {
    const { url } = req.body;

    try {
      const pages = await browser.pages();

      // Check if there are any existing YouTube pages and close them, then open a new page
      if (pages.length > 0) {
        // Check through the tabs and close any YouTube page
        await Promise.all(
          pages.map(async page => {
            const currentUrl = page.url();
            if (currentUrl.includes("youtube.com")) {
              await page.close();
              console.log(`Closed existing YouTube page: ${currentUrl}`);
            }
          })
        )
      }

      // Open a new tab and navigate to the URL
      const page = await browser.newPage();
      await page.goto(url);

      console.log(`Opened browser with URL: ${url}`);
      res.json({ status: "success" });
    } catch (error) {
      console.error(`Error opening browser: ${error}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}