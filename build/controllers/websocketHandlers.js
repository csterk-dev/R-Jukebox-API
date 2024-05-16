"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleSocketConnection = void 0;
const constants_1 = require("../constants");
/*
 * The current video state
 */
let currentVideo;
let isPlaying = false;
/**
 * Handles all socket events regarding the `currentVideo` and `isPlaying` states.
 *
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
function HandleSocketConnection(socket, io) {
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
    socket.on(constants_1.WebSocketEventKeys.setCurrentVideo, (video) => {
        console.log("Socket: Setting current video", video);
        currentVideo = video;
        console.log("Socket: Setting is playing", true);
        isPlaying = true;
        io.emit(constants_1.WebSocketEventKeys.currentVideo, currentVideo);
        io.emit(constants_1.WebSocketEventKeys.isPlaying, true);
    });
    /**
     * Endpoint to toggle the video playing state.
     */
    socket.on(constants_1.WebSocketEventKeys.setIsPlaying, (isPlayingState) => {
        console.log("Socket: Setting is playing", isPlayingState);
        isPlaying = isPlayingState;
        io.emit(constants_1.WebSocketEventKeys.isPlaying, isPlayingState);
    });
}
exports.HandleSocketConnection = HandleSocketConnection;
