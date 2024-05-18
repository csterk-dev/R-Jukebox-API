"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleSocketConnection = void 0;
const puppeteer_1 = require("../services/puppeteer");
const constants_1 = require("../constants");
/*
 * The current video state
 */
let currentVideo;
let isPlaying = false;
/**
 * Handles all socket events.
 *
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
function HandleSocketConnection(browser, io, socket) {
    /**
     * Send the current state of the player to the newly connect client.
     */
    socket.on(constants_1.WebSocketEventKeys.getInitialState, (incomingClientId) => {
        io.to(incomingClientId).emit(constants_1.WebSocketEventKeys.isPlaying, isPlaying);
        io.to(incomingClientId).emit(constants_1.WebSocketEventKeys.currentVideo, currentVideo);
    });
    /**
     * Endpoint to set the current video that is playing.
     */
    socket.on(constants_1.WebSocketEventKeys.setCurrentVideo, async (video) => {
        console.log("Socket:", "Setting currentVideo", video.videoId);
        if (browser) {
            await (0, puppeteer_1.PlayVideo)(browser, io, video.videoId);
            currentVideo = video;
            isPlaying = true;
            io.emit(constants_1.WebSocketEventKeys.currentVideo, currentVideo);
            io.emit(constants_1.WebSocketEventKeys.isPlaying, true);
        }
        else {
            io.emit(constants_1.WebSocketEventKeys.error, "No browser found");
        }
    });
    /**
     * Endpoint to toggle the video playing state.
     */
    socket.on(constants_1.WebSocketEventKeys.setIsPlaying, async (isPlayingState) => {
        if (browser && currentVideo) {
            console.log("Socket: Setting isPlaying", isPlayingState);
            isPlaying = isPlayingState;
            await (0, puppeteer_1.ToggleVideoPlayingState)(browser, io, currentVideo.videoId, isPlayingState);
            io.emit(constants_1.WebSocketEventKeys.isPlaying, isPlaying);
        }
        else {
            io.emit(constants_1.WebSocketEventKeys.error, "No browser or current video found");
        }
    });
}
exports.HandleSocketConnection = HandleSocketConnection;
