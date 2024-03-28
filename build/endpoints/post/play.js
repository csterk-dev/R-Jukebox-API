"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayVideo = void 0;
/**
 * Play Video Route - Opens the provided URL in the browser.
 * Will attempt to find any currently open 'Youtube.com' pages to play the request video and close them prior to playing, otherwise will create a new page and play.
 */
function PlayVideo(app, browser) {
    app.post("/play", (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { url } = req.body;
        try {
            const pages = yield browser.pages();
            // Check if there are any existing YouTube pages and close them, then open a new page
            if (pages.length > 0) {
                // Check through the tabs and close any YouTube page
                yield Promise.all(pages.map((page) => __awaiter(this, void 0, void 0, function* () {
                    const currentUrl = page.url();
                    if (currentUrl.includes("youtube.com")) {
                        yield page.close();
                        console.log(`Closed existing YouTube page: ${currentUrl}`);
                    }
                })));
            }
            // Open a new tab and navigate to the URL
            const page = yield browser.newPage();
            yield page.goto(url);
            console.log(`Opened browser with URL: ${url}`);
            res.json({ status: "success" });
        }
        catch (error) {
            console.error(`Error opening browser: ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    }));
}
exports.PlayVideo = PlayVideo;
