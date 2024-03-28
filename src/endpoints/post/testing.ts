/* eslint-disable multiline-comment-style */
import { Browser } from "puppeteer";
import { Express, Request, Response } from "express";
import { exec, ExecException } from "child_process";



/**
 * Play Child Process Route - Opens the provided url in the local browser using child process api
 */
function PlayChildProcess(app: Express, browser: Browser, platform: NodeJS.Platform) {

  // app.post("/play/childprocess", (req: Request, res: Response) => {
  //   const { url } = req.body;

  //   // Default: Chromium Browser
  //   let browserCommand = "chromium-browser";

  //   // Check if Chromium is installed
  //   exec("which chromium-browser", (whichError: ExecException | null, whichStdout: string) => {

  //     // If Chromium is not installed, use alternative browser instead per platform (used testing locally)
  //     if (whichError || !whichStdout) {
  //       if (platform === WINDOWS_PLATFORM) {
  //         browserCommand = "start microsoft-edge";
  //       } else if (platform === MAC_PLATFORM) {
  //         browserCommand = "open -a 'Google Chrome'";
  //       } else {
  //         browserCommand = "google-chrome --no-sandbox";
  //       }
  //     }

  //     // Open browser with the appropriate command
  //     console.log(`executing command: ${browserCommand}`);
  //     exec(`${browserCommand} ${url}`, (error: ExecException | null, stdout: string, stderr: string) => {
  //       if (error) {
  //         console.error(`Error opening browser: ${error.message}`);
  //         return res.status(500).json({ error: "Internal server error" });
  //       }
  //       if (stderr) {
  //         console.error(`stderr: ${stderr}`);
  //       }
  //       console.log(`Opened browser with URL: ${url}`);
  //       res.json({ status: "success" });
  //     });
  //   });
  // });
}