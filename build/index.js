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
const youtubeRoutes_1 = require("./routes/youtubeRoutes");
const websocketHandlers_1 = require("./controllers/websocketHandlers");
const websockets_1 = require("./services/websockets");
const puppeteer_1 = require("./services/puppeteer");
/*
 * Server setup
 */
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
const osPlatform = (0, os_1.platform)();
let browser;
/*
 * Constants
 */
const PORT = 3001;
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}.`;
/*
 * Initialise server endpoints and puppeteer instance.
 */
(async () => {
    browser = await (0, puppeteer_1.InitialsePuppeteerBrowser)();
})();
app.use("/youtube", youtubeRoutes_1.youtubeRouter);
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
/*
 * Start the server
 */
const server = app.listen(PORT, () => console.log(aliveMessage));
server.on("error", console.log);
/*
 * Open the player to accept connections
 */
const io = (0, websockets_1.InitialiseWebSocketServer)(server);
io.on("connection", (socket) => (0, websocketHandlers_1.HandleSocketConnection)(browser, io, socket));
// class="ytp-ad-skip-button-modern"
