import path from "path";
import sqlite3, { Database } from "sqlite3";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone"
import dayjs from "dayjs";
dayjs.extend(utc);
dayjs.extend(timezone);


const DB_URL = path.join(__dirname, "../../data/db.sqlite3");


/**
 * Establishes a connection to the database and returns the database object. 
 * If no database exisits, it will create a new database and generate the base tables.
 * @returns Database connection instance.
 */
export async function initialiseDBConnection(): Promise<Database> {
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



type HistoryReturn = {
  videos: HistoryVideo[];
  successState: DbActionAcknowledgement;
}



/**
 * Gets all history videos.
 * @returns An array of history items or error state object if an error occured.
 */
export async function getHistoryItems(db: Database): Promise<HistoryReturn> {
  try {
    const history = await getHistory(db);

    return {
      videos: history,
      successState: { success: true }
    }

  } catch (err: any) {
    console.error("getHistoryItems:", "Something went wrong getting the recently played videos.\n", err);
    //   if (io && incomingClientId) {
    //     io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the history.");
    //   }
    //   return null;
    // }
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong getting the recently played videos",
        stackTrace: err,
        callingFunction: "getHistoryItems"
      }
    }
  }
}

/**
 * Adds the provided new video to the history and returns the updated history.
 * @returns The updated history or empty array if an error occured.
 */
export async function updateHistoryItems(db: Database, newVideo: Video): Promise<HistoryReturn> {
  try {
    const updatedHistory = await updateHistory(db, newVideo);

    return {
      videos: updatedHistory,
      successState: { success: true }
    }
  } catch (err: any) {
    console.error("updateHistoryItems:", "Something went wrong updating the recently played videos.\n", err);
    // if (incomingClientId) {
    //   io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong updating the history.");
    // }
    // return null;
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong updating the recently played videos",
        stackTrace: err,
        callingFunction: "updateHistoryItems"
      }
    }
  }
}



type QueueReturn = {
  videos: Video[];
  successState: DbActionAcknowledgement;
}


/**
 * Gets the all the queue videos or null if an error occured.
 * @returns An array of videos or empty array if an error occured.
 */
export async function getQueueItems(db: Database): Promise<QueueReturn> {
  try {
    const queue = await getQueue(db);

    return {
      videos: queue,
      successState: { success: true }
    }

  } catch (err: any) {
    console.error("getQueueItems:", "Something went wrong getting the queue.\n", err);
    // if (io && incomingClientId) {
    //   io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the queue.");
    // }
    // return null;
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong getting the queue",
        stackTrace: err,
        callingFunction: "getQueueItems"
      }
    }
  }
}


type NextQueueItemReturn = {
  nextVideo: Video | null;
  updatedQueue: Video[];
  successState: DbActionAcknowledgement;
}


/**
 * 'Pops' the next item from the queue and returns it.
 * @returns An object containing the next video and the queue, or null and an empty array if an error occured.
 */
export async function getNextQueueItem(db: Database): Promise<NextQueueItemReturn> {
  try {
    const [nextVideo, updatedQueue] = await getAndRemoveNextVideo(db);

    return {
      nextVideo,
      updatedQueue,
      successState: { success: true }
    }

  } catch (err: any) {
    console.error("getNextQueueItem:", "Something went wrong getting the next video.\n", err);
    // if (incomingClientId) {
    //   io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video.");
    // } else {
    //   io.emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the next video.");
    // }
    // return null;
    return {
      nextVideo: null,
      updatedQueue: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong getting the video from the queue",
        stackTrace: err,
        callingFunction: "getNextQueueItem"
      }
    }
  }
}



type UpdateQueueReturnType = {
  videos: Video[];
  successState: DbActionAcknowledgement;
}


/**
 * Deletes the specified video from the queue.
 * @returns An array of queue videos or empty array if an error occured.
 */
export async function deleteQueueItem(db: Database, videoId: Video["videoId"]): Promise<UpdateQueueReturnType> {
  try {
    const updatedQueue = await deleteQueueVideo(db, videoId);
    return {
      videos: updatedQueue,
      successState: { success: true }
    }

  } catch (err: any) {
    console.error("deleteQueueItem:", "Something went wrong removing the video from the queue.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong removing the video from the queue.");
    // return null;
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong removing the video from the queue",
        stackTrace: err,
        callingFunction: "deleteQueueItem"
      }
    }
  }
}


/**
 * Clears the queue.
 * @returns Returns `success: true` if successful, otherwise `success: false` and error message/stack trace.
 */
export async function clearQueue(db: Database): Promise<DbActionAcknowledgement> {
  try {
    await truncateQueue(db);
    return { success: true }
  } catch (err: any) {
    console.error("clearQueue:", "Something went wrong clearing the queue.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong clearing the queue.");
    // return 1;
    return {
      success: false,
      errorMessage: "Something went wrong clearing the queue",
      stackTrace: err,
      callingFunction: "clearQueue"
    }
  }
}



/**
 * Added the provided video from the bottom of the queue.
 * @returns An array of queue videos or empty array if an error occured.
*/
export async function addToBottomOfQueue(db: Database, newVideo: Video): Promise<UpdateQueueReturnType> {
  try {
    const updatedQueue = await insertToBottom(db, newVideo);
    return {
      videos: updatedQueue,
      successState: { success: true }
    }
  } catch (err: any) {
    console.error("addToBottomOfQueue:", "Something went wrong adding the video to the bottom of the queue.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong adding the video to the bottom of the queue.");
    // return null;
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong adding the video to the bottom of the queue",
        stackTrace: err,
        callingFunction: "addToBottomOfQueue"
      }
    }
  }
}


/**
 * Added the provided video from the top of the queue.
 * @returns An array of queue videos or empty array if an error occured.
 */
export async function addToTopOfQueue(db: Database, newVideo: Video): Promise<UpdateQueueReturnType> {
  try {
    const updatedQueue = await insertToTop(db, newVideo);
    return {
      videos: updatedQueue,
      successState: { success: true }
    }
  } catch (err: any) {
    console.error("addToTopOfQueue:", "Something went wrong adding the video to the top of the queue.\n", err);
    // io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong adding the video to the top of the queue.");
    // return null;
    return {
      videos: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong adding the video to the top of the queue",
        stackTrace: err,
        callingFunction: "addToTopOfQueue"
      }
    }
  }
}



type LogsReturn = {
  logs: EntryLog[];
  successState: DbActionAcknowledgement;
}


/**
 * Gets the all the queue videos or null if an error occured.
 * @returns An array of logs or empty array if an error occured.
 */
export async function getLogEntries(db: Database): Promise<LogsReturn> {
  try {
    const logs = await getLogs(db);

    return {
      logs,
      successState: { success: true }
    }

  } catch (err: any) {
    console.error("GetQueueItems:", "Something went wrong getting the logs.\n", err);
    // if (io && incomingClientId) {
    //   io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.error, "Something went wrong getting the queue.");
    // }
    // return null;
    return {
      logs: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong getting the logs",
        stackTrace: err,
        callingFunction: "getLogEntries"
      }
    }
  }
}


/**
 * Adds the a new log entry.
 * @returns An array of logs or empty array if an error occured.
 */
export async function updateLogEntries(db: Database, newLog: NewEntryLog): Promise<LogsReturn> {
  try {
    const updatedLogEntries = await insertLog(db, newLog);

    return {
      logs: updatedLogEntries,
      successState: { success: true }
    }
  } catch (err: any) {
    console.error("updateLogEntries:", "Something went wrong updating the log entries.\n", err);
    return {
      logs: [],
      successState: {
        success: false,
        errorMessage: "Something went wrong updating the log entries",
        stackTrace: err,
        callingFunction: "updateLogEntries"
      }
    }
  }
}


/**
 * Gets the all videos in the history table up to the 30 days ago. Throws an error if the operation fails.
 */
function getHistory(db: Database) {
  const date30DaysAgo = dayjs().subtract(30, "days");
  const query = `SELECT * from history WHERE playedAt >= '${date30DaysAgo.format()}' ORDER BY playedAt DESC`;

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
 * @returns The update history array.
 */
function updateHistory(db: Database, video: Video) {
  const query = `
    INSERT INTO history (channelId, channelTitle, duration, publishedAt, thumbnails, title, videoId, playedAt, playedDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (videoId, playedDate)
    DO UPDATE SET playedAt = excluded.playedAt, playedDate = excluded.playedDate;
  `;
  const updateVidthumbnails = JSON.stringify(video.thumbnails);

  return new Promise<HistoryVideo[]>((resolve, reject) => {
    db.run(
      query,
      [video.channelId, video.channelTitle, video.duration, video.publishedAt, updateVidthumbnails, video.title, video.videoId, dayjs().format(), dayjs().format("DD/MM/YYYY")],
      err => {
        if (err) reject(err);
        console.log("UpdateHistory:", "Updated history with video", video.videoId);

        const date30DaysAgo = dayjs().subtract(30, "days");
        const getQuery = `SELECT * from history WHERE playedAt >= '${date30DaysAgo.format()}' ORDER BY playedAt DESC`;

        db.all<HistoryVideo>(getQuery, (getErr, rows) => {
          if (getErr) {
            return reject(getErr);
          }

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
        });
      }
    )
  })
}


/**
 * Gets the all videos in the queue table. Throws an error if the operation fails.
 */
function getQueue(db: Database) {
  const query = "SELECT * from queue ORDER BY position ASC";

  return new Promise<Video[]>((resolve, reject) => {

    db.all<Video>(query, (err, rows) => {
      if (err) reject(err);

      const parsedRows = rows.map(v => {
        const thumbnails = JSON.parse(v.thumbnails as unknown as string);

        return {
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          duration: v.duration,
          publishedAt: v.publishedAt,
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
 * Inserts the provided video, and if it already exists in the table, updates its position to be the first item, otherwise inserts into the table at the first position.
 * @returns The updated queue array.
 */
function insertToTop(db: Database, video: Video): Promise<Video[]> {
  const query = `
    INSERT INTO queue (channelId, channelTitle, duration, publishedAt, thumbnails, title, videoId, position) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 
      (SELECT COALESCE(MIN(position), 0) - 1 FROM queue)
    )
    ON CONFLICT (videoId)
    DO UPDATE SET position = (SELECT COALESCE(MIN(position), 0) - 1 FROM queue);
  `;
  const thumbnail = JSON.stringify(video.thumbnails);

  return new Promise<Video[]>((resolve, reject) => {
    db.run(
      query,
      [video.channelId, video.channelTitle, video.duration, video.publishedAt, thumbnail, video.title, video.videoId],
      (updateErr) => {
        if (updateErr) {
          return reject(updateErr);
        }

        console.log("insertToTop:", "Updated queue with video", video.videoId);

        // After the insert/update, fetch the entire queue ordered by position
        db.all<Video>("SELECT * FROM queue ORDER BY position ASC", (getErr, rows) => {
          if (getErr) {
            return reject(getErr);
          }

          const parsedRows = rows.map(v => {
            const thumbnails = JSON.parse(v.thumbnails as unknown as string);
            return {
              channelId: v.channelId,
              channelTitle: v.channelTitle,
              duration: v.duration,
              publishedAt: v.publishedAt,
              thumbnails,
              title: v.title,
              videoId: v.videoId
            }
          });

          resolve(parsedRows);
        });
      }
    );
  });
}


/**
 * Inserts the provided video, and if it already exists in the table, updates its position to be the last item, otherwise inserts into the table at the last position.
 * @returns The updated queue array.
 */
function insertToBottom(db: Database, video: Video) {
  const query = `
    INSERT INTO queue (channelId, channelTitle, duration, publishedAt, thumbnails, title, videoId, position) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 
      (SELECT COALESCE(MAX(position), 0) + 1 FROM queue)
    )
    ON CONFLICT (videoId)
    DO UPDATE SET position = (SELECT COALESCE(MAX(position), 0) + 1 FROM queue);
  `;
  const updateVidthumbnails = JSON.stringify(video.thumbnails);

  return new Promise<Video[]>((resolve, reject) => {
    db.run(
      query,
      [video.channelId, video.channelTitle, video.duration, video.publishedAt, updateVidthumbnails, video.title, video.videoId],
      (updateErr) => {
        if (updateErr) reject(updateErr);

        console.log("insertToBottom:", "Updated queue with video", video.videoId);

        // After the insert/update, fetch the entire queue ordered by position
        db.all<Video>("SELECT * FROM queue ORDER BY position ASC", (getErr, rows) => {
          if (getErr) {
            return reject(getErr);
          }

          const parsedRows = rows.map(v => {
            const thumbnails = JSON.parse(v.thumbnails as unknown as string);
            return {
              channelId: v.channelId,
              channelTitle: v.channelTitle,
              duration: v.duration,
              publishedAt: v.publishedAt,
              thumbnails,
              title: v.title,
              videoId: v.videoId
            }
          });

          resolve(parsedRows);
        });
      }
    );
  });
}


/**
 * Returns the removed item from the queue, as well as the updated queue.
 */
function getAndRemoveNextVideo(db: Database): Promise<[Video | null, Video[]]> {
  const query = `
    SELECT * FROM queue
    WHERE position = (SELECT MIN(position) FROM queue)
    LIMIT 1
  `;

  return new Promise<[Video | null, Video[]]>((resolve, reject) => {
    db.get<Video>(query, (getErr, nextVideo) => {
      if (getErr) return reject(getErr);

      if (!nextVideo) {
        // No video to return (queue is empty)
        return resolve([null, []]);
      }

      const parsedNextVideo: Video = {
        channelId: nextVideo.channelId,
        channelTitle: nextVideo.channelTitle,
        duration: nextVideo.duration,
        publishedAt: nextVideo.publishedAt,
        thumbnails: JSON.parse(nextVideo.thumbnails as unknown as string),
        title: nextVideo.title,
        videoId: nextVideo.videoId
      };

      // Once the video is retrieved, remove it from the queue
      const deleteQuery = `
        DELETE FROM queue
        WHERE videoId = ?
      `;
      db.run(deleteQuery, [nextVideo.videoId], (deleteErr) => {
        if (deleteErr) return reject(deleteErr);

        console.log("getAndRemoveNextVideo:", "Removed video", nextVideo.videoId);

        // Fetch the updated queue after deletion
        db.all<Video>("SELECT * FROM queue ORDER BY position ASC", (err, updatedQueue) => {
          if (err) return reject(err);


          const parsedUpdatedQueue = updatedQueue.map((v) => ({
            channelId: v.channelId,
            channelTitle: v.channelTitle,
            duration: v.duration,
            publishedAt: v.publishedAt,
            thumbnails: JSON.parse(v.thumbnails as unknown as string),
            title: v.title,
            videoId: v.videoId
          }));

          // Return the next video, and updated queue (without the next video)
          resolve([parsedNextVideo, parsedUpdatedQueue]);
        });
      });
    });
  });
}


/**
 * Deletes the provided videoId from the queue.
 * @returns The updated queue array.
 */
function deleteQueueVideo(db: Database, videoId: string) {
  const query = `
        DELETE FROM queue
        WHERE videoId = ?
      `;

  return new Promise<Video[]>((resolve, reject) => {
    db.run(query, [videoId], (deleteErr) => {
      if (deleteErr) return reject(deleteErr);

      // Return the video that was removed
      console.log("deleteQueueVideo:", "Removed video", videoId);

      // After the delete, fetch the entire queue ordered by position
      db.all<Video>("SELECT * FROM queue ORDER BY position ASC", (getErr, rows) => {
        if (getErr) {
          return reject(getErr);
        }

        const parsedRows = rows.map(v => {
          const thumbnails = JSON.parse(v.thumbnails as unknown as string);
          return {
            channelId: v.channelId,
            channelTitle: v.channelTitle,
            duration: v.duration,
            publishedAt: v.publishedAt,
            thumbnails,
            title: v.title,
            videoId: v.videoId
          }
        });

        resolve(parsedRows);
      });
    });
  });
}


/**
 * Gets the last 50 (unless otherewise specified) previously saved logs. Throws an error if the operation fails.
 */
function getLogs(db: Database, limit: number = 50) {
  const query = `
    SELECT * FROM logs 
    ORDER BY dateTime DESC 
    LIMIT ?;
  `;

  return new Promise<EntryLog[]>((resolve, reject) => {
    db.all(query, [limit], (err, rows) => {
      if (err) return reject(err);
      resolve(rows as EntryLog[]);
    });
  });
}


/**
 * Inserts the provided log and its optional metada and returns the updated log history.
 * @returns The updated logs.
 */
function insertLog(db: Database, log: NewEntryLog, limit: number = 50) {
  const query = `
    INSERT INTO logs (type, callingFunction, stackTrace, dateTime)
    VALUES (?, ?, ?, ?);
  `;

  const getLogsQuery = `
    SELECT * FROM logs 
    ORDER BY dateTime DESC 
    LIMIT ?;
  `;

  const stackTraceString = !log.stackTrace ? null :
    typeof log.stackTrace === "string" ? log.stackTrace :
      JSON.stringify(log.stackTrace, null, 2);

  return new Promise<EntryLog[]>((resolve, reject) => {
    db.run(query, [log.type, log.callingFunction, stackTraceString, dayjs().format()], (err) => {
      if (err) {
        console.error("InsertLog Error:", err.message);
        return reject(err);
      }

      console.log("InsertLog:", `Logged ${log.type} at`, dayjs().format());

      // Fetch updated logs after insert
      db.all(getLogsQuery, [limit], (getErr, rows) => {
        if (getErr) {
          console.error("GetLogs Error:", getErr.message);
          return reject(getErr);
        }
        resolve(rows as EntryLog[]);
      });
    });
  });
}


/**
 * Deletes the queue table's content.
 */
function truncateQueue(db: Database): Promise<void | Error> {
  const query = "DELETE FROM queue";

  return new Promise<void | Error>((resolve, reject) => {

    db.run(query, (deleteErr) => {
      if (deleteErr) return reject(deleteErr);

      // Return the video that was removed
      console.log("truncateQueue:", "Cleared queue");

      resolve();
    });
  });
}


/**
 * Creates the db with the supplied option flags and returns it.
 */
function createDB(options: number) {
  return new Promise<Database>((resolve, reject) => {
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
 */
function createTables(db: Database) {
  db.exec(
    `
    CREATE TABLE IF NOT EXISTS history (
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
    );

    CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId TEXT,
        channelTitle TEXT,
        duration TEXT,
        publishedAt TEXT,
        thumbnails TEXT,
        title TEXT,
        videoId TEXT,
        position INTEGER,
        CONSTRAINT position_unique UNIQUE (position),
        CONSTRAINT video_id_unique UNIQUE (videoId)
    );

    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('error', 'info')),
        callingFunction TEXT DEFAULT NULL,  -- New column
        stackTrace TEXT DEFAULT NULL,
        dateTime TEXT NOT NULL
    );
    `,
    (err) => {
      if (err) {
        console.error("CreateTables:", err.message);
      } else {
        console.log("CreateTables:", "Tables \"history\", \"queue\", and \"logs\" are ready.");
      }
    }
  );
}