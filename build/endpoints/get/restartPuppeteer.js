"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestartPuppeteer = void 0;
/**
 * Restart Route - Restarts the puppeteer instance.
 */
function RestartPuppeteer(app, restartFunction) {
    app.get("/restartPuppeteer", async (req, res) => {
        try {
            await restartFunction(true);
            res.status(200).send({ message: "Puppeteer restarted" });
        }
        catch (err) {
            console.log("Error restarting puppeteer", err);
            res.status(500).send({ message: "Internal server error" });
        }
    });
}
exports.RestartPuppeteer = RestartPuppeteer;
