import { z } from "zod";
import { Request, Response } from "express";
import { getHistoryItems, updateLogEntries } from "../../../services/database";
import { Database } from "sqlite3";
import { parseErrorForDB } from "../../../utils";


const getHistory_Query = z
  .object({
    sort: z.enum(["PLAYED_AT_DATE_ASCENDING", "PLAYED_AT_DATE_DESCENDING"]).optional(),
    page: z.coerce.number().min(0).default(0),
    step: z.coerce.number().min(1).default(10),
    searchTerm: z.string().trim().optional()
  });


export async function getHistory(req: Request, res: Response) {
  const db: Database = req.app.get("db");

  if (!db) {
    res.status(500).json({ message: "Database not initialized." });
    return;
  }


  const result = getHistory_Query.safeParse(req.query);

  if (!result.success) {
    console.error("getHistory", "Zod Error", result.error.message);
    res.status(400).json({ message: "Invalid history request body." });
    return;
  }

  const { step, searchTerm, sort, page } = result.data;

  try {
    // Calculate offset for pagination
    const limit = step;
    const offset = page * limit;

    const items: HistoryVideo[] = await getHistoryItems(db, limit, offset, searchTerm, sort);

    res.status(200).json(items);

  } catch (error: any) {
    console.error("getHistory", "Error fetching history items:", error);

    const newLogEntry: NewEntryLog = {
      type: "error",
      stackTrace: parseErrorForDB(error),
      callingFunction: "getHistory"
    }

    updateLogEntries(db, newLogEntry);

    res.status(500).json({ message: "Failed to retrieve history items." });
  }
}