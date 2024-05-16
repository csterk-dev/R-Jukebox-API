import puppeteer from "puppeteer";

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