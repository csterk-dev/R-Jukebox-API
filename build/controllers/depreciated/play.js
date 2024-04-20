"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
/**
 * Play Video Route - Opens the provided youtube videoId in the browser, if it is not already active.
 * If it is active, it will attempt resume the video.
 */
function Play(app, browser) {
    app.post("/play", async (req, res) => {
        const { videoId } = req.body;
        if (!videoId) {
            return res.status(400).json({ message: "No video ID provided" });
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
                    res.status(200).send({ message: "Video started" });
                    return;
                }
                res.status(200).send({ message: "Video already playing" });
            }
            catch (err) {
                console.log(err);
                res.status(500).send({ message: "Something went wrong finding the youtube video" });
            }
        }
        catch (err) {
            console.error(`An error occured: ${err}`);
            res.status(500).send({ message: "Internal server error" });
        }
    });
}
