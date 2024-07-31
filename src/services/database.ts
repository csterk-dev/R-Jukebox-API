import path from "path";
import sqlite3, { Database } from "sqlite3";
import { Server as WsServer } from "socket.io";
import { SOCKET_EVENT_KEYS } from "../constants";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"
import dayjs from "dayjs";
dayjs.extend(utc);
dayjs.extend(timezone);


const DB_URL = path.join(__dirname, "../../data/db.sqlite3");


/**
 * Establishes a connection to the database and returns the database object. 
 * It will additionall If no database exisits, it will create a new database and generate the base tables.
 * @returns The sqlite database object.
 */
export async function initialiseDBConnection() {
  let db: Database;
  try {
    // Attempt to open the database in read-write mode
    db = await createDB(sqlite3.OPEN_READWRITE);
    console.log("InitialiseDBConnection:", "Connected to the SQLite database.");
    createTables(db);

  } catch (error: any) {
    console.error("InitialiseDBConnection:", "Failed to initialize database connection:", error.message);
    throw error;
  }

  return db;
}


/**
 * Gets the recently played videos from the db.
 * @returns An array of recently played videos or null if an error occured.
 */
export async function getRecentlyPlayed(db: Database, io: WsServer, incomingClientId: string) {
  try {
    return await getHistory(db);
  } catch (err: any) {
    console.log("GetRecentlyPlayed:", "Something went wrong getting the recently played videos.\n", err);
    io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the recently played videos.");
    return null;
  }
}


export async function updateRecentlyPlayed(db: Database, io: WsServer, incomingClientId: string, newVideo: Video) {
  try {
    await updateHistory(db, newVideo);
    return 0;
  } catch (err: any) {
    console.log("UpdateRecentlyPlayed:", "Something went wrong updating the recently played videos.\n", err);
    io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong updating the recently played videos.");
    return 1;
  }
}


/**
 * Gets the all videos in the history table up to the 30 days ago. Throws an error if the operation fails.
 * @param db SQLite obj.
 * @returns An array of Videos.
 */
function getHistory(db: Database) {
  const date30DaysAgo = dayjs().subtract(30, "days");
  const query = `SELECT * from history WHERE playedAt >= '${date30DaysAgo.format()}' ORDER BY playedAt DESC`;


  // Calculate the date 30 days ago
  return new Promise<HistoryVideo[]>((resolve, reject) => {

    db.all<HistoryVideo>(query, (err, rows) => {
      if (err) reject(err);
      const parsedRows = rows.map(v => {
        const thumbnails = JSON.parse(v.thumbnails as unknown as string);

        return {
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          duration: v.duration,
          publishedAt: v.publishedAt,
          playedAt: v.playedAt,
          playedDate: v.playedDate,
          thumbnails,
          title: v.title,
          videoId: v.videoId
        }
      })
      resolve(parsedRows);
    })
  })
}


/**
 * Inserts into the history table the provided video. Throws an error if the operation fails.
 * @param db SQLite obj.
 * @param video Video to insert.
 */
function updateHistory(db: Database, video: Video) {
  const query = `
    INSERT INTO history (channelId, channelTitle, duration, publishedAt, thumbnails, title, videoId, playedAt, playedDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (videoId, playedDate)
    DO UPDATE SET playedAt = excluded.playedAt, playedDate = excluded.playedDate;
  `;
  const thumbnails = JSON.stringify(video.thumbnails);

  return new Promise<void>((resolve, reject) => {
    db.run(
      query,
      [video.channelId, video.channelTitle, video.duration, video.publishedAt, thumbnails, video.title, video.videoId, dayjs().format(), dayjs().format("DD/MM/YYYY")],
      err => {
        if (err) reject(err);
        console.log("UpdateHistory:", "Updated history with video", video.videoId);
        resolve();
      }
    )
  })
}


/**
 * Creates the db with the supplied option flags.
 * @param options
 * @returns The database object.
 */
function createDB(options: number) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(DB_URL, options, (err: any) => {
      if (err) {
        // If the error indicates that the database does not exist, create a new one, else return the error
        if (err.code !== "SQLITE_CANTOPEN") {
          console.error(err.message);
          reject(err);
        } else {
          createDB(sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
            .then(res => resolve(res));
        }
      } else {
        resolve(db);
      }
    });
  });
}


/**
 * Creates the required tables if they don't already exist.
 * @param db Database connection instance object.
 */
function createTables(db: sqlite3.Database) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId TEXT,
        channelTitle TEXT,
        duration TEXT,
        publishedAt TEXT,
        thumbnails TEXT,
        title TEXT,
        videoId TEXT,
        playedAt TEXT,
        playedDate TEXT,
        CONSTRAINT video_id_unique UNIQUE (videoId, playedDate)
      )`,
    (err) => {
      if (err) {
        console.log("CreateTables:", err.message);
      } else {
        console.log("CreateTables:", "Table \"history\" is ready.");
      }
    }
  );
}