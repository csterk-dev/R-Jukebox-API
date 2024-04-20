import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { platform } from "os";
import BodyParser from "body-parser";
import { PlayerRouter } from "./routes/puppeteerRoutes";
import { youtubeRouter } from "./routes/youtubeRoutes";


/*
 * Server setup
 */
const cors = require("cors");
const app = express();
app.use(cors());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json())
const osPlatform = platform();


/*
 * Constants 
 */
const PORT = process.env.PORT
const aliveMessage = `The server is running on port ${PORT}, on platform ${osPlatform}`


/*
 * Initialise server endpoints and puppeteer instance.
 */
PlayerRouter(app);
app.use("/youtube", youtubeRouter)
app.get("/", (req, res) => res.status(200).send({ message: aliveMessage }));



/*
 * Start the server
 */
app.listen(PORT, () => {
  console.log(aliveMessage);
});