import { Server as WsServer } from "socket.io";
import { Server } from "http";


/**
 * Initialises a new Socket.IO server and returns it.
 * @param server The current express server instance.
 * 
 * @returns {Socket.IO} The Socket.IO server instance.
 */
export function initialiseWebSocketServer(server: Server) {
  
  const s = new WsServer(server, {
    // Enable cors and connection state recovery 
    connectionStateRecovery: {},
    cors: {
      origin: "*"
    }
  });
  s.on("error", console.log);
  return s;
}