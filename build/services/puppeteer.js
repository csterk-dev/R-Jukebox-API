"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialsePuppeteerBrowser = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Launches a puppeteer browser instance and intialises any puppeteer routes.
 * @returns {Promise<Browser | undefined>} A promise containing the current puppeteer browser instance, or undefined.
 */
async function InitialsePuppeteerBrowser() {
    try {
        const browser = await puppeteer_1.default.launch({
            headless: false,
            // args: ["--start-windowed"],
            defaultViewport: null
            // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        });
        if (!browser) {
            throw new Error("Failed to start puppeteer browser instance");
        }
        return browser;
    }
    catch (error) {
        console.log("Error starting puppeteer", error);
    }
}
exports.InitialsePuppeteerBrowser = InitialsePuppeteerBrowser;
