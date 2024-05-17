import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { platform } from "os";
import BodyParser from "body-parser";
import { Browser } from "puppeteer";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { HandleSocketConnection } from "./controllers/websocketHandlers";
import { InitialiseWebSocketServer } from "./services/websockets";
import { InitialsePuppeteerBrowser } from "./services/puppeteer";


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
  browser = await InitialsePuppeteerBrowser();
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
const io = InitialiseWebSocketServer(server);
io.on("connection", (socket) => HandleSocketConnection(browser, io, socket));

// class="ytp-ad-skip-button-modern"