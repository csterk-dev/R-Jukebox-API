"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable require-await */
const express_1 = __importDefault(require("express"));
const puppeteerHandlers_1 = require("../../controllers/depreciated/puppeteerHandlers");
const puppeteer_1 = require("../../services/puppeteer");
// Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers.
const express_async_handler_1 = __importDefault(require("express-async-handler"));
/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 */
async function PlayerRouter(app) {
    try {
        // Setup router to handle puppeteer requests and initialise puppeteer
        const playerRouter = express_1.default.Router();
        const browser = await (0, puppeteer_1.InitialsePuppeteerBrowser)();
        try {
            if (!browser) {
                throw new Error("Browser failed to launch. No browser found");
            }
            /*
             * Initialise the puppeteer endpoints
             */
            playerRouter.post("/play", (0, express_async_handler_1.default)(async (req, res) => (0, puppeteerHandlers_1.HandlePlayVideo)(req, res, browser)));
            playerRouter.post("/pause", (0, express_async_handler_1.default)(async (req, res) => (0, puppeteerHandlers_1.HandlePauseVideo)(req, res, browser)));
            // Register the router to the app
            app.use("/player", playerRouter);
        }
        catch (error) {
            console.log(error);
        }
    }
    catch (error) {
        console.log("Error starting puppeteer", error);
    }
}
