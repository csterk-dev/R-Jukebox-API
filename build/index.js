"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const isAlive_1 = require("./endpoints/get/isAlive");
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
function StartServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({ headless: false });
        // Initialise the server endpoints
        (0, isAlive_1.IsAlive)(app, PORT, osPlatform);
        (0, play_1.PlayVideo)(app, browser);
    });
}
StartServer();
/**
 * Start the server
 */
app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});
