import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { platform } from "os";
import BodyParser from "body-parser";
import { Browser } from "puppeteer";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { handleSocketConnection } from "./controllers/websocketHandlers";
import { initialiseWebSocketServer } from "./services/websockets";
import { initialsePuppeteerBrowser } from "./services/puppeteer";


/*
 * Server setup
 */
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
const osPlatform = platform();
let browser: Browser | undefined

/*
 * Constants 
 */
const PORT = 3001;
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;


/*
 * Initialise server endpoints and puppeteer instance.
 */
(async () => {
  browser = await initialsePuppeteerBrowser();
})();
app.use("/youtube", youtubeRouter);
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));


/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
server.on("error", console.log);


/*
 * Open the player to accept connections
 */
const io = initialiseWebSocketServer(server);
io.on("connection", (socket) => handleSocketConnection(browser, io, socket));

// class="ytp-ad-skip-button-modern"