import { Express, Request, Response } from "express";
import { Browser } from "puppeteer";


/**
 * Close Pages Route - Closes all browser pages.
 */
export function CloseAllPages(app: Express, browser: Browser) {

  app.get("/closeAllPages", async (req: Request, res: Response) => {
    try {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await Promise.all(pages.map(async page => {
          await page.close();
        }));

        res.status(200).send({ message: "Closed all pages" });
        return;
      }
      res.status(200).send({ message: "Nothing to close" });
      
    } catch (err) {
      console.log("Error closing all pages", err);
      res.status(500).send({ message: "Internal server error" });
    }
  });
}



