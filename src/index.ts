import cors from "cors";
import express from "express";
import { platform } from "os";
import path from "path";
import BodyParser from "body-parser";
import { Browser, Frame, Page } from "puppeteer";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { onSocketConnection } from "./controllers/websocket";
import { initialiseDBConnection, initialiseStateVars } from "./services/database";
import { initialiseWebSocketServer } from "./services/websockets";
import { initialsePuppeteerBrowser } from "./services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, PORT } from "./constants";
import { Database } from "sqlite3";


export type StateType = {
  browser: Browser | undefined;
  checkVideoInterval: NodeJS.Timeout | undefined;
  currentPage: Page | null;
  currentVideo: Video | undefined;
  currentVideoTime: number | undefined;
  history: Video[];
  isLoading: boolean;
  isPlaying: boolean;
  isIntervalRunning: boolean;
  playerFrame: Frame | null;
  playerVolume: number;
  queue: Video[];
  logs: EntryLog[];
}


/*
 * Server setup
 */
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
const osPlatform = platform();
let db: Database | undefined;


const state: StateType = {
  browser: undefined,
  checkVideoInterval: undefined,
  currentPage: null,
  currentVideo: undefined,
  currentVideoTime: undefined,
  history: [],
  isLoading: false,
  isPlaying: false,
  isIntervalRunning: false,
  playerFrame: null,
  playerVolume: PLAYER_VOLUME_DEFAULT,
  queue: [],
  logs: []
}


const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;


/*
 * Initialise server endpoints, puppeteer instance and player state.
 */
(async () => {
  db = await initialiseDBConnection();
  state.browser = await initialsePuppeteerBrowser(osPlatform);
  const { history, queue, logs } = await initialiseStateVars(db);

  state.history = history;
  state.queue = queue;
  state.logs = logs;

})();
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
app.get("/player/:videoId", (req, res) => res.sendFile(path.join(__dirname, "../public", "player.html")));
app.use("/youtube", youtubeRouter);


/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
const io = initialiseWebSocketServer(server);
io.on("connection", (socket) => db && onSocketConnection(io, socket, db, state));
server.on("error", console.error);