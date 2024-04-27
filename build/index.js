"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const os_1 = require("os");
const body_parser_1 = __importDefault(require("body-parser"));
const puppeteerRoutes_1 = require("./routes/puppeteerRoutes");
const youtubeRoutes_1 = require("./routes/youtubeRoutes");
const websockets_1 = require("./services/websockets");
const constants_1 = require("./constants");
/*
 * Server setup
 */
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
const osPlatform = (0, os_1.platform)();
/*
 * Constants
 */
const PORT = process.env.PORT;
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;
/*
 * Initialise server endpoints and puppeteer instance.
 */
(0, puppeteerRoutes_1.PlayerRouter)(app);
app.use("/youtube", youtubeRoutes_1.youtubeRouter);
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
let currentVideo;
let isPlaying = false;
const io = (0, websockets_1.InitialiseWebSocketServer)(server);
io.on("connection", handleSocketConnection);
function handleSocketConnection(socket) {
    /**
     * Send the current state of the player, whether it is playing, and if so what is the current video
     */
    io.emit(constants_1.WebSocketEventKeys.isPlaying, isPlaying);
    io.emit(constants_1.WebSocketEventKeys.currentVideo, currentVideo);
    /**
     * Endpoint to set the current video that is playing.
     */
    socket.on(constants_1.WebSocketEventKeys.setCurrentVideo, (video) => {
        console.log("Socket: Setting current video", video);
        currentVideo = video;
        console.log("Socket: Setting is playing", true);
        isPlaying = true;
        io.emit(constants_1.WebSocketEventKeys.currentVideo, currentVideo);
        io.emit(constants_1.WebSocketEventKeys.isPlaying, isPlaying);
    });
    /**
     * Endpoint to toggle the video playing state.
     */
    socket.on(constants_1.WebSocketEventKeys.setIsPlaying, (isPlayingState) => {
        console.log("Socket: Setting is playing", isPlayingState);
        isPlaying = isPlayingState;
        io.emit(constants_1.WebSocketEventKeys.isPlaying, isPlaying);
    });
}
