"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlePauseVideo = exports.HandlePlayVideo = void 0;
const constants_1 = require("../../constants");
/**
 * Attempts to find the supplied `videoId` and resume playing.
 * If no matching `videoId` is found, the function will attempt to close any previous youtube pages in the browser,
 * and open a new browser with the supplied `videoId`.
 *
 * @param req Express request parm containing the `videoId` to play.
 * @param res Express response parm.
 * @param browser The current puppeteer browser instance.
 */
async function HandlePlayVideo(req, res, browser) {
    const { videoId } = req.body;
    console.log("HandlePlay: Incoming video id", videoId);
    if (!videoId) {
        console.log("No video ID providered");
        res.status(400).json({ message: "No video ID provided" });
        return;
    }
    try {
        const pages = await browser.pages();
        let currentPage;
        /*
         * Close any youtube pages that are not already active with the requested videoId.
         * If the requested videoId is already active, set it to the current page.
         */
        if (pages.length > 0) {
            await Promise.all(pages.map(async (page) => {
                const currentUrl = page.url();
                if (currentUrl.includes("youtube.com") && currentUrl.includes(`?v=${videoId}`)) {
                    currentPage = page;
                    console.log("Page with existing videoId found");
                }
                else if (currentUrl.includes("youtube.com")) {
                    await page.close();
                    console.log(`Closed existing YouTube page: ${currentUrl}`);
                }
            }));
        }
        if (!currentPage) {
            // Open a new tab and navigate to the URL
            const url = `${constants_1.YOUTUBE_BROWSER_WATCH_PAGE_URL}${videoId}`;
            currentPage = await browser.newPage();
            await currentPage.goto(url);
        }
        try {
            const playBtnSelector = ".ytp-play-button";
            const playButton = await currentPage.waitForSelector(playBtnSelector, {
                visible: true,
                // Attempt to find the selector for 10seconds 
                timeout: 10000
            }).catch(() => null);
            // If the play button returns null, then the video is unavailable.
            if (!playButton) {
                console.log("Video unavailable");
                res.status(404).send({ message: "Video unavailable" });
                return;
            }
            /*
             * By default the video should auto start.
             * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
             */
            const outerHTML = await playButton.getProperty("outerHTML");
            const htmlJsonButton = await outerHTML.jsonValue();
            // eslint-disable-next-line quotes
            if (htmlJsonButton.includes(`data-title-no-tooltip="Play"`)) {
                await currentPage.keyboard.press("k");
                console.log("Video started");
                res.status(200).send({ message: "Video started" });
                return;
            }
            console.log("Video already paused");
            res.status(200).send({ message: "Video already playing" });
        }
        catch (err) {
            console.log("Something went wrong finding the youtube video");
            console.log(err);
            res.status(500).send({ message: "Something went wrong finding the youtube video" });
        }
    }
    catch (err) {
        console.log(`An error occured: ${err}`);
        res.status(500).send({ message: "Internal server error" });
    }
}
exports.HandlePlayVideo = HandlePlayVideo;
/**
 * Attempts to find the supplied `videoId` and pause playing.
 * If no matching `videoId` is found, the function will return HTTP status 404.
 *
 * @param req Express request parm containing the `videoId` to pause.
 * @param res Express response parm.
 * @param browser The current puppeteer browser instance.
 */
async function HandlePauseVideo(req, res, browser) {
    const { videoId } = req.body;
    console.log("HandlePause: Incoming video id", videoId);
    if (!videoId) {
        console.log("No video ID providered");
        res.status(400).json({ message: "No video ID provided" });
        return;
    }
    try {
        const pages = await browser.pages();
        let currentPage;
        /*
         * Search through all the currently open pages for a page matching the provided videoId.
         */
        if (pages.length > 0) {
            pages.map(page => {
                const currentUrl = page.url();
                if (currentUrl.includes("youtube.com") && currentUrl.includes(`?v=${videoId}`)) {
                    currentPage = page;
                    console.log("Page with existing videoId found");
                }
            });
        }
        else {
            console.log("No current pages");
            res.status(404).send({ message: "No current pages" });
            return;
        }
        if (!currentPage) {
            console.log("No video found");
            res.status(404).send({ message: "No video found" });
            return;
        }
        try {
            const playBtnSelector = ".ytp-play-button";
            const playButton = await currentPage.waitForSelector(playBtnSelector, {
                visible: true,
                // Attempt to find the selector for 10seconds 
                timeout: 10000
            }).catch(() => null);
            // If the play button returns null, then the video is unavailable.
            if (!playButton) {
                console.log("Video unavailble");
                res.status(404).send({ message: "Video unavailable" });
                return;
            }
            /*
             * By default the video should auto start.
             * But in the cases where it doesn't, we'll determine its state and attempt start it if required.
             */
            const outerHTML = await playButton.getProperty("outerHTML");
            const htmlJsonButton = await outerHTML.jsonValue();
            // eslint-disable-next-line quotes
            if (htmlJsonButton.includes(`data-title-no-tooltip="Pause"`)) {
                await currentPage.keyboard.press("k");
                console.log("Video paused");
                res.status(200).send({ message: "Video paused" });
                return;
            }
            console.log("Video already paused");
            res.status(200).send({ message: "Video already paused" });
        }
        catch (err) {
            console.log(err);
            console.log("Something went wrong pausing the youtube video");
            res.status(500).send({ message: "Something went wrong pausing the youtube video" });
        }
    }
    catch (err) {
        console.log(`An error occured: ${err}`);
        res.status(500).send({ message: "Internal server error" });
    }
}
exports.HandlePauseVideo = HandlePauseVideo;
