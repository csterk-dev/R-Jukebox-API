"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeRouter = void 0;
/* eslint-disable require-await */
const youtubeHandler_1 = require("../controllers/youtubeHandler");
const express_1 = __importDefault(require("express"));
// Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers.
const express_async_handler_1 = __importDefault(require("express-async-handler"));
/** Youtube router containing the various endpoints that interact with the youtube API. */
exports.youtubeRouter = express_1.default.Router();
/*
 * Initialise the youtube endpoints
 */
exports.youtubeRouter.get("/search", (0, express_async_handler_1.default)(async (req, res) => (0, youtubeHandler_1.HandleSearchVideos)(req, res)));
