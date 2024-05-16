"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialiseWebSocketServer = void 0;
const socket_io_1 = require("socket.io");
/**
 * Initialises a new Socket.IO server and returns it.
 * @param server The current express server instance.
 *
 * @returns {Socket.IO server} The Socket.IO server instance.
 */
function InitialiseWebSocketServer(server) {
    const s = new socket_io_1.Server(server, {
        // Enable cors and connection state recovery 
        connectionStateRecovery: {},
        cors: {
            origin: "*"
        }
    });
    s.on("error", console.log);
    return s;
}
exports.InitialiseWebSocketServer = InitialiseWebSocketServer;
