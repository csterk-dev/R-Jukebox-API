"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const os_1 = require("os");
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/*
 * Constants
 */
const PORT = process.env.PORT;
const WINDOWS_PLATFORM = "win32";
const MAC_PLATFORM = "darwin";
/*
 * Server setup
 */
const app = (0, express_1.default)();
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
const osPlatform = (0, os_1.platform)();
/**
 * Base Route - Used for debugging and ensuring the server is running.
 *
 * @returns The current port and platforn from which the server is running on
 */
app.get("/", (req, res) => {
    res.send(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});
/**
 * Play Route - Opens the provided url in the local
 */
app.post("/play", (req, res) => {
    const { url } = req.body;
    // Default: Chromium Browser
    let browserCommand = "chromium-browser";
    // Check if Chromium is installed
    (0, child_process_1.exec)("which chromium-browser", (whichError, whichStdout) => {
        // If Chromium is not installed, use alternative browser instead per platform (used testing locally)
        if (whichError || !whichStdout) {
            if (osPlatform === WINDOWS_PLATFORM) {
                browserCommand = "start microsoft-edge";
            }
            else if (osPlatform === MAC_PLATFORM) {
                browserCommand = "open -a 'Google Chrome'";
            }
            else {
                browserCommand = "google-chrome --no-sandbox";
            }
        }
        // Open browser with the appropriate command
        console.log(`executing command: ${browserCommand}`);
        (0, child_process_1.exec)(`${browserCommand} ${url}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error opening browser: ${error.message}`);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`Opened browser with URL: ${url}`);
            res.json({ status: "success" });
        });
    });
});
/**
 * Start the server
 */
app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});
