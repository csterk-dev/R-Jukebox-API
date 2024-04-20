/* eslint-disable require-await */
import { HandleGetContentDetails, HandleSearchVideos } from "../controllers/youtubeHandler";
import express, { Request, Response } from "express";

// Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers.
import asyncHandler from "express-async-handler"


/** Youtube router containing the various endpoints that interact with the youtube API. */
export const youtubeRouter = express.Router();

/*
 * Initialise the youtube endpoints
 */
youtubeRouter.get("/search", asyncHandler(async (req: Request, res: Response) => HandleSearchVideos(req, res)));

youtubeRouter.get("/contentDetails", asyncHandler(async (req: Request, res: Response) => HandleGetContentDetails(req, res)));
