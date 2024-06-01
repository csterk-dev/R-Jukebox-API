import { checkForEndOfVideo, playVideo, togglePlayingState } from "../services/puppeteer";
import { PLAYER_URL, SOCKET_EVENT_KEYS, SYSTEM_VOLUME_DEFAULT } from "../constants";
import { Socket, Server as WsServer } from "socket.io";
import { Browser, Page } from "puppeteer";


/*
 * The current video state
 */
let currentVideo: Video | undefined;
let currentVideoTime: number | undefined;
let isPlaying: boolean = false;
let systemVolume: number | undefined = SYSTEM_VOLUME_DEFAULT;
let checkVideoInterval: NodeJS.Timeout | undefined;


/**
 * Handles all socket events.
 * 
 * @param socket The current socket instance.
 * @param io The current socket server.
 */
export function handleSocketConnection(browser: Browser | undefined, io: WsServer, socket: Socket,) {

  /**
   * Send the current state of the player to the newly connect client.
   */
  socket.on(SOCKET_EVENT_KEYS.getInitialState, (incomingClientId) => {
    setTimeout(() => {
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
      io.to(incomingClientId).emit(SOCKET_EVENT_KEYS.systemVolume, systemVolume);
    }, 200);
  });

  /**
   * Endpoint to set the current video that is playing.
   */
  socket.on(SOCKET_EVENT_KEYS.setCurrentVideo, async (incomingVideo) => {
    if (browser) {
      console.log("Socket:", "Setting currentVideo", incomingVideo.videoId);

      const exitCode = await playVideo(browser, io, incomingVideo.videoId);
      if (exitCode === 1) return;

      currentVideo = incomingVideo;
      isPlaying = true;

      io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
      io.emit(SOCKET_EVENT_KEYS.isPlaying, true);

      // Start checking for the end of the video
      if (currentVideo) {
        startCheckForEndOfVideo(browser, io, currentVideo.videoId);
      }
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, "No browser found. Refresh and try again.");
    }
  });

  /**
   * Endpoint to toggle the video playing state.
   */
  socket.on(SOCKET_EVENT_KEYS.setIsPlaying, async (incomingIsPlaying: boolean) => {
    if (browser && currentVideo) {
      console.log("Socket: Setting isPlaying", incomingIsPlaying);

      const exitCode = await togglePlayingState(browser, io, currentVideo.videoId, incomingIsPlaying);
      if (exitCode === 1) return;

      isPlaying = incomingIsPlaying;

      io.emit(SOCKET_EVENT_KEYS.isPlaying, isPlaying);
    } else {
      io.emit(SOCKET_EVENT_KEYS.error, "No browser or current video found");
    }
  });

  /**
   * Endpoint to update the system volume.
   */
  socket.on(SOCKET_EVENT_KEYS.setSystemVolume, async (incomingSystemVol: number) => {
    if (systemVolume !== incomingSystemVol) {
      console.log("Socket:", "Setting systemVol", incomingSystemVol);

      // TODO
      systemVolume = incomingSystemVol;

      io.emit(SOCKET_EVENT_KEYS.systemVolume, systemVolume);
    }
  });
}



/**
 * Function that checks the current time and duration while the current video is playing to determine if the video has ended.
 * 
 * @param browser The current puppeteer browser instance.
 * @param io The current server.
 */
async function startCheckForEndOfVideo(browser: Browser, io: WsServer, videoId: string) {
  let currentPage: Page | undefined;

  try {
    const pages = await browser.pages();
    /*
     * Search through all the currently open pages for a page matching the provided videoId.
     */
    if (pages.length > 0) {
      pages.map(page => {
        const currentUrl = page.url();
        if (currentUrl.includes(PLAYER_URL) && currentUrl.includes(videoId)) {
          currentPage = page;
          console.log("StartCheckForEndOfVideo:", "videoId found.");
        }
      })
    }

    if (!currentPage) {
      console.log("StartCheckForEndOfVideo", "Cannot find current video.");
      io.emit(SOCKET_EVENT_KEYS.error, "Cannot find current video.");
      return;
    }

  } catch (err: any) {
    console.log("StartCheckForEndOfVideo:", "An error occured accessing the browser.\n", err);
    io.emit(SOCKET_EVENT_KEYS.error, "An error occured accessing the browser.");
  }


  if (checkVideoInterval) clearInterval(checkVideoInterval);

  checkVideoInterval = setInterval(async () => {
    if (currentPage && currentVideo && isPlaying) {
      const timeState = await checkForEndOfVideo(currentPage, io);
      if (typeof timeState !== "number") {
        if (timeState.hasEnded) {
          currentVideo = undefined;
          isPlaying = false;
          currentVideoTime = 0;
          clearInterval(checkVideoInterval);
          io.emit(SOCKET_EVENT_KEYS.currentVideo, currentVideo);
          io.emit(SOCKET_EVENT_KEYS.isPlaying, false);

        } else {
          currentVideoTime = timeState.currentTime;
          io.emit(SOCKET_EVENT_KEYS.currentVideoTime, currentVideoTime);
        }
      }
    }
  }, 5000);
}