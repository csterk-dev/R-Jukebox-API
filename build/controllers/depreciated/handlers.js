"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const youtube_1 = require("../../services/youtube");
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
    const detailsRes = await youtube_1.YoutubeAPI.getVideosContentDetails(ids);
    if (detailsRes.status !== 200) {
        res.status(detailsRes.status).send({ message: "Failed to get results from youtube API" });
        return;
    }
    const videoContentDetails = detailsRes.data.items;
    res.status(200).json(videoContentDetails);
}
