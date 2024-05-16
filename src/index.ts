import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { platform } from "os";
import BodyParser from "body-parser";
import { PlayerRouter } from "./routes/puppeteerRoutes";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { InitialiseWebSocketServer } from "./services/websockets";
import { HandleSocketConnection } from "./controllers/websocketHandlers";


/*
 * Server setup
 */
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
const osPlatform = platform();


/*
 * Constants 
 */
const PORT = 3001;
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;


/*
 * Initialise server endpoints and puppeteer instance.
 */
PlayerRouter(app);
app.use("/youtube", youtubeRouter);
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));


/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
server.on("error", console.log);


/*
 * Open the websocket 
 */
const io = InitialiseWebSocketServer(server);
io.on("connection", (socket) => HandleSocketConnection(socket, io));

// class="ytp-ad-skip-button-modern"