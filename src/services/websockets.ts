import { Server as WsServer } from "socket.io";
import { Server } from "http";

const clientUrl = process.env.CLIENT_URL;


/**
 * Initialises a new Socket.IO server and returns it.
 * @param server The current express server instance.
 * 
 * @returns {Socket.IO server} The Socket.IO server instance.
 */
export function InitialiseWebSocketServer(server: Server) {
  
  return new WsServer(server, {
    // Enable cors and connection state recovery 
    connectionStateRecovery: {},
    cors: {
      origin: clientUrl
    }
  });
}