"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsAlive = void 0;
/**
 * Base Route - Used for debugging and ensuring the server is running.
 *
 * @returns The current port and platforn from which the server is running on
 */
function IsAlive(app, port, platform) {
    app.get("/", (req, res) => {
        res.send(`The server is running on port ${port}, on platform ${platform}`);
    });
}
exports.IsAlive = IsAlive;
