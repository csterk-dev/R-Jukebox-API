"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandleSearchVideos = void 0;
const youtube_1 = require("../services/youtube");
/**
 * Returns the first 20 search results and their content detaisl from the youtube API.
 *
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 *
 * @returns {Video} The the formatted results from the api.
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
    /*
     * TODO
     * Implement backend caching to sql lite instance:
     * - Hash the search query -> use as PK
     *    - Store search results and timestamp of when it was searched
     */
    const searchRes = await youtube_1.YoutubeAPI.searchVideos(val, parsedLimit);
    if (searchRes.status !== 200) {
        res.status(400).send({ message: "Failed to get search from youtube API" });
        return;
    }
    const videoIds = searchRes.data.items.map(i => i.id.videoId);
    const detailsRes = await youtube_1.YoutubeAPI.getVideosContentDetails(videoIds.toString());
    if (detailsRes.status !== 200) {
        res.status(detailsRes.status).send({ message: "Failed to get content details from youtube API" });
        return;
    }
    const combinedResults = detailsRes.data.items.map(detailsItem => {
        const video = searchRes.data.items.find(searchItem => searchItem.id.videoId == detailsItem.id);
        if (!video)
            return undefined;
        return {
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            duration: detailsItem.contentDetails.duration,
            publishedAt: video.snippet.publishedAt,
            thumbnails: video.snippet.thumbnails,
            title: video.snippet.title,
            videoId: video.id.videoId
        };
    });
    // Filter out undefined entries before sending the response
    const filteredResults = combinedResults.filter(result => result !== undefined);
    res.status(200).json(filteredResults);
}
exports.HandleSearchVideos = HandleSearchVideos;
