/* eslint-disable require-await */
import { getHistory } from "../../handlers/http/history/get";
import express, { Request, Response } from "express";

// Simple middleware for handling exceptions inside of async express routes and passing them to your express error handlers.
import asyncHandler from "express-async-handler"


/** History router containing the various endpoints that interact with the DB. */
export const historyRouter = express.Router();

/*
 * Initialise the history endpoints.
 */
historyRouter.get("/latest", asyncHandler(async (req: Request, res: Response) => getHistory(req, res)));