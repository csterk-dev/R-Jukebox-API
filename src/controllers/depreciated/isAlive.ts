import { Express, Request, Response } from "express";


/**
 * Base Route - Used for debugging and ensuring the server is running.
 * 
 * @returns The current port and platforn from which the server is running on
 */
function IsAlive(app: Express, port?: string, platform?: NodeJS.Platform) {

  app.get("/", (req: Request, res: Response) => {
    res.status(200).send(`The server is running on port ${port}, on platform ${platform}`);
  });
}
