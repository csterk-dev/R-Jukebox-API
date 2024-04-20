"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleGetContentDetails = exports.HandleSearchVideos = void 0;
const youtube_1 = require("../services/youtube");
/**
 * Returns the first 20 search results from the youtube API unless the `limit` param has been supplied.
 *
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 *
 * @returns {SearchVideoResult} The `SearchVideoResult` from the api.
 */
async function HandleSearchVideos(req, res) {
    const { val, limit } = req.query;
    if (!val) {
        res.status(400).json({ message: "No search value provided" });
        return;
    }
    let parsedLimit = 20;
    if (limit && limit !== "undefined") {
        parsedLimit = parseInt(limit);
    }
    const ytResponse = await youtube_1.YoutubeAPI.searchVideos(val, parsedLimit);
    if (ytResponse.status !== 200) {
        res.status(400).send({ message: "Failed to get results from youtube API" });
        return;
    }
    const videoSnippets = ytResponse.data.items;
    res.status(200).json(videoSnippets);
}
exports.HandleSearchVideos = HandleSearchVideos;
/**
 * Returns the first 20 search results from the youtube API unless the `limit` param has been supplied.
 *
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 *
 * @returns {SearchVideoResult} The `SearchVideoResult` from the api.
 */
async function HandleGetContentDetails(req, res) {
    const { ids } = req.query;
    if (!ids) {
        res.status(400).json({ message: "No video ids were provided" });
        return;
    }
    const ytResponse = await youtube_1.YoutubeAPI.getVideosContentDetails(ids);
    if (ytResponse.status !== 200) {
        res.status(ytResponse.status).send({ message: "Failed to get results from youtube API" });
        return;
    }
    const videoContentDetails = ytResponse.data.items;
    res.status(200).json(videoContentDetails);
}
exports.HandleGetContentDetails = HandleGetContentDetails;
