
import cors from "cors";
import express from "express";
import { platform } from "os";
import path from "path";
import BodyParser from "body-parser";
import { Browser, Frame, Page } from "puppeteer";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { onSocketConnection } from "./controllers/websocket";
import { getHistoryItems, getQueueItems, initialiseDBConnection } from "./services/database";
import { initialiseWebSocketServer } from "./services/websockets";
import { initialsePuppeteerBrowser } from "./services/puppeteer";
import { PLAYER_VOLUME_DEFAULT, PORT } from "./constants";
import { Database } from "sqlite3";
import { Queue } from "./utils/structures";
import { isMainThread, Worker } from "worker_threads";

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
}


/*
 * Server setup
 */
if (isMainThread) {
  const app = express();
  app.use(cors());
  app.use(BodyParser.urlencoded({ extended: false }));
  app.use(BodyParser.json());
  app.use(express.static(path.join(__dirname, "../public")));
  const osPlatform = platform();
  let db: Database | undefined;
  const tasks = new Queue<Function>();
  const isShuttingDown = false;

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
    queue: []
  }


  const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;


  /*
   * Initialise server endpoints, puppeteer instance and player state.
   */
  (async () => {
    db = await initialiseDBConnection();
    state.browser = await initialsePuppeteerBrowser(osPlatform);

    const historyRes = await getHistoryItems(db);
    historyRes ? state.history = historyRes : undefined;

    const queueRes = await getQueueItems(db);
    queueRes ? state.queue = queueRes : undefined;
  })();
  app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
  app.get("/player/:videoId", (req, res) => res.sendFile(path.join(__dirname, "../public", "player.html")));
  app.use("/youtube", youtubeRouter);


  /*
   * Start the server
   */
  const server = app.listen(PORT, () => console.log(aliveMessage));
  const io = initialiseWebSocketServer(server);
  io.on("connection", (socket) => db && onSocketConnection(io, socket, db, state, tasks, isShuttingDown));
  server.on("error", console.log);


  /*
   * Handle any synchronous tasks while running
   */
  const taskWorker = new Worker(__filename);

  taskWorker.on("message", () => {
    (async () => {
      while (!isShuttingDown) {
        console.log("AHHHHHHHH")
        try {
          console.log("BURGER")
          const task = tasks.dequeue();
          if (!task) continue;

          // eslint-disable-next-line no-await-in-loop
          await task();
          console.log("ENDDDDD")

        } catch (err: any) {
          console.error(err);
        }
      }
    })();
  });



  // taskWorker.postMessage([]);

}