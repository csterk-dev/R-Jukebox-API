import cors from "cors";
import express from "express";
import { platform } from "os";
import path from "path";
import BodyParser from "body-parser";
import { Browser } from "puppeteer";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { handleSocketConnection } from "./controllers/websocketHandlers";
import { initialiseWebSocketServer } from "./services/websockets";
import { initialsePuppeteerBrowser } from "./services/puppeteer";
import { PORT } from "./constants";

/*
 * Server setup
 */
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
const osPlatform = platform();
let browser: Browser | undefined


const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;


/*
 * Initialise server endpoints, puppeteer instance and player page.
 */
(async () => {
  browser = await initialsePuppeteerBrowser(osPlatform);
})();
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
app.get("/player/:videoId", (req, res) => res.sendFile(path.join(__dirname, "../public", "player.html")));
app.use("/youtube", youtubeRouter);


/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
const io = initialiseWebSocketServer(server);
io.on("connection", (socket) => handleSocketConnection(browser, io, socket));
server.on("error", console.log);