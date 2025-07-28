import cors from "cors";
import express from "express";
import { platform } from "os";
import path from "path";
import BodyParser from "body-parser";
import { Browser, Frame, Page } from "puppeteer";
import { youtubeRouter } from "./routes/youtube/router";
import { onConnection } from "./websocket/player";
import { initialiseDBConnection, initialiseStateVars } from "./services/database";
import { initialiseWebSocketServer } from "./services/websockets";
import { initialsePuppeteerBrowser } from "./services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, PORT } from "./constants";
import { Database } from "sqlite3";
import { historyRouter } from "./routes/history/router";


export type StateType = {
  browser: Browser | undefined;
  checkVideoInterval: NodeJS.Timeout | undefined;
  currentPage: Page | null;
  currentVideo: Video | undefined;
  currentVideoTime: number | undefined;
  isLoading: boolean;
  isPlaying: boolean;
  isIntervalRunning: boolean;
  playerFrame: Frame | null;
  playerVolume: number;
  queue: Video[];
  logs: EntryLog[];
}


/*
 * Initialise server & routes
 */
const osPlatform = platform();
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/youtube", youtubeRouter);
app.use("/history", historyRouter);
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
app.get("/player/:videoId", (req, res) => res.sendFile(path.join(__dirname, "../public", "player.html")));


let db: Database | undefined;


const state: StateType = {
  browser: undefined,
  checkVideoInterval: undefined,
  currentPage: null,
  currentVideo: undefined,
  currentVideoTime: undefined,
  isLoading: false,
  isPlaying: false,
  isIntervalRunning: false,
  playerFrame: null,
  playerVolume: PLAYER_VOLUME_DEFAULT,
  queue: [],
  logs: []
};


/*
 * Initialise player
 */
(async () => {
  db = await initialiseDBConnection();
  // Set the db instance on the app object so it can be accessed by handlers
  app.set("db", db);

  state.browser = await initialsePuppeteerBrowser(osPlatform);
  const { queue, logs } = await initialiseStateVars(db);

  state.queue = queue;
  state.logs = logs;

})();


/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
server.on("error", console.error);


/*
 * Initialise event handlers
 */
const io = initialiseWebSocketServer(server);
// You might still pass db to websocket handlers if they need it
io.on("connection", (socket) => db && onConnection(io, socket, db, state));