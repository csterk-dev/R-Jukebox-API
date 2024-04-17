import { platform } from "os";
import express from "express";
import BodyParser from "body-parser";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { Play } from "./endpoints/post/play";
import { Pause } from "./endpoints/post/pause";
import { IsAlive } from "./endpoints/get/isAlive";
import { CloseAllPages } from "./endpoints/get/closeAllPages";


dotenv.config();

/*
 * Constants 
 */
const PORT = process.env.PORT


/*
 * Server setup
 */
const app = express();
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json())
const osPlatform = platform();


/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 */
async function StartPuppeteer() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      // args: ["--start-windowed"],
      defaultViewport: null
      // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    });

    /*
     * Initialise the puppeteer endpoints
     */
    Play(app, browser);
    Pause(app, browser);
    CloseAllPages(app, browser);
  } catch (error: any) {
    console.log("Error starting puppeteer", error);
  }
}


/*
 * Initialise server endpoints and puppeteer instance.
 */
StartPuppeteer();
IsAlive(app, PORT, osPlatform);



/*
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});