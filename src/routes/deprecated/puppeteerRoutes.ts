/* eslint-disable require-await */
import express, { Express, Request, Response } from "express";
import { HandlePauseVideo, HandlePlayVideo } from "../../controllers/depreciated/puppeteerHandlers";
import { initialsePuppeteerBrowser } from "../../services/puppeteer";

// Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers.
import asyncHandler from "express-async-handler"


/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 */
async function PlayerRouter(app: Express) {
  try {
    // Setup router to handle puppeteer requests and initialise puppeteer
    const playerRouter = express.Router();
    const browser = await initialsePuppeteerBrowser();

    try {

      if (!browser) {
        throw new Error("Browser failed to launch. No browser found");
      }

      /*
       * Initialise the puppeteer endpoints
       */
      playerRouter.post("/play", asyncHandler(async (req: Request, res: Response) => HandlePlayVideo(req, res, browser)));
      playerRouter.post("/pause", asyncHandler(async (req: Request, res: Response) => HandlePauseVideo(req, res, browser)));

      // Register the router to the app
      app.use("/player", playerRouter);

    } catch (error) {
      console.log(error);
    }
  } catch (error: any) {
    console.log("Error starting puppeteer", error);
  }
}