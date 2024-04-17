"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const play_1 = require("./endpoints/post/play");
const pause_1 = require("./endpoints/post/pause");
const isAlive_1 = require("./endpoints/get/isAlive");
const closeAllPages_1 = require("./endpoints/get/closeAllPages");
dotenv_1.default.config();
/*
 * Constants
 */
const PORT = process.env.PORT;
/*
 * Server setup
 */
const app = (0, express_1.default)();
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
const osPlatform = (0, os_1.platform)();
/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 */
async function StartPuppeteer() {
    try {
        const browser = await puppeteer_1.default.launch({
            headless: false,
            // args: ["--start-windowed"],
            defaultViewport: null
            // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        });
        /*
         * Initialise the puppeteer endpoints
         */
        (0, play_1.Play)(app, browser);
        (0, pause_1.Pause)(app, browser);
        (0, closeAllPages_1.CloseAllPages)(app, browser);
    }
    catch (error) {
        console.log("Error starting puppeteer", error);
    }
}
/*
 * Initialise server endpoints and puppeteer instance.
 */
StartPuppeteer();
(0, isAlive_1.IsAlive)(app, PORT, osPlatform);
/*
 * Start the server
 */
app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});
