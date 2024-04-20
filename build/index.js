"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const os_1 = require("os");
const body_parser_1 = __importDefault(require("body-parser"));
const puppeteerRoutes_1 = require("./routes/puppeteerRoutes");
const youtubeRoutes_1 = require("./routes/youtubeRoutes");
/*
 * Server setup
 */
const cors = require("cors");
const app = (0, express_1.default)();
app.use(cors());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
const osPlatform = (0, os_1.platform)();
/*
 * Constants
 */
const PORT = process.env.PORT;
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}`;
/*
 * Initialise server endpoints and puppeteer instance.
 */
(0, puppeteerRoutes_1.PlayerRouter)(app);
app.use("/youtube", youtubeRoutes_1.youtubeRouter);
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));
/*
 * Start the server
 */
app.listen(PORT, () => {
    console.log(aliveMessage);
});
