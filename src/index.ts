import express, { Express, Request, Response } from "express";
import { ExecException, exec } from "child_process";
import { platform } from "os";
import BodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

/*
 * Constants 
 */
const PORT = process.env.PORT
const WINDOWS_PLATFORM = 'win32';
const MAC_PLATFORM = 'darwin';


/*
 * Server setup
 */
const app: Express = express();
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json())
const osPlatform = platform();


/**
 * Base Route - Used for debugging and ensuring the server is running.
 * 
 * @returns The current port and platforn from which the server is running on
 */
app.get("/", (req: Request, res: Response) => {
  res.send(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});


/**
 * Play Route - Opens the provided url in the local
 */
app.post('/play', (req: Request, res: Response) => {
  const { url } = req.body;

  // Default: Chromium Browser
  let browserCommand = `chromium-browser`;

  // Check if Chromium is installed
  exec('which chromium-browser', (error: ExecException | null, stdout: string) => {

    // If Chromium is not installed, use alternative browser instead per platform (used testing locally)
    if (error || !stdout) {
      if (osPlatform === WINDOWS_PLATFORM) {
        browserCommand = "start microsoft-edge";
      } else if (osPlatform === MAC_PLATFORM) {
        browserCommand = "open -a 'Google Chrome'";
      } else {
        browserCommand = "google-chrome --no-sandbox";
      }
    }

    // Open browser with the appropriate command
    console.log(`executing command: ${browserCommand}`);
    exec(`${browserCommand} ${url}`, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error opening browser: ${error.message}`);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`Opened browser with URL: ${url}`);
      res.json({ status: 'success' });
    });
  });
});


/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`The server is running on port ${PORT}, on platform ${osPlatform}`);
});