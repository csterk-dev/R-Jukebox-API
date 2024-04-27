import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { platform } from "os";
import BodyParser from "body-parser";
import { PlayerRouter } from "./routes/puppeteerRoutes";
import { youtubeRouter } from "./routes/youtubeRoutes";
import { InitialiseWebSocketServer } from "./services/websockets";
import { Socket } from "socket.io";
import { WebSocketEventKeys } from "./constants";


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
const PORT = process.env.PORT;
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
const server = app.listen(PORT, () => {
  console.log(aliveMessage);
});

/**
 * The current video state
 */
let currentVideo: Video | undefined;
let isPlaying = false;

const io = InitialiseWebSocketServer(server);


io.on("connection", handleSocketConnection);


function handleSocketConnection(socket: Socket) {

  /**
   * Send the current state of the player, whether it is playing, and if so what is the current video
   */
  io.emit(WebSocketEventKeys.isPlaying, isPlaying);
  io.emit(WebSocketEventKeys.currentVideo, currentVideo);

  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(WebSocketEventKeys.setCurrentVideo, (video) => {
    console.log("Socket: Setting current video", video);
    currentVideo = video;
    console.log("Socket: Setting is playing", true);
    isPlaying = true;
    io.emit(WebSocketEventKeys.currentVideo, currentVideo);
    io.emit(WebSocketEventKeys.isPlaying, true);
  });

  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(WebSocketEventKeys.setIsPlaying, (isPlayingState: boolean) => {
    console.log("Socket: Setting is playing", isPlayingState);
    isPlaying = isPlayingState;
    io.emit(WebSocketEventKeys.isPlaying, isPlayingState);
  });
}

