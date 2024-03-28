import { platform } from "os";
import express from "express";
import BodyParser from "body-parser";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import { PlayVideo } from "./endpoints/post/play";
import { IsAlive } from "./endpoints/get/isAlive";

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


async function StartServer() {
  const browser = await puppeteer.launch({ headless: false });

  // Initialise the server endpoints
  IsAlive(app, PORT, osPlatform);
  PlayVideo(app, browser);
}
StartServer();


/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});