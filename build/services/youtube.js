"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeAPI = void 0;
const constants_1 = require("../constants");
const axios_1 = __importDefault(require("axios"));
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CLIENT = axios_1.default.create({
    baseURL: constants_1.YOUTUBE_API_URL,
    headers: {
        "content-type": "application/json"
    },
    responseType: "json"
});
exports.YoutubeAPI = {
    /**
     * Returns a list of video snippets that match the search query.
     *
     * @param query The search query.
     * @param maxResults Total number of results returned per page.
     *
     * @remarks Quota cost = `100 credits`.
     */
    async searchVideos(query, maxResults) {
        return await YOUTUBE_CLIENT.get(`/search?key=${YOUTUBE_API_KEY}&q=${query}&type=video&part=snippet&maxResults=${maxResults}`);
    },
    /**
     * Returns a the content details of the provided video Ids.
     * @param videoIds String array of video IDs
     *
     * @remarks Quota cost = `1 credit.`
     */
    async getVideosContentDetails(videoIds) {
        return await YOUTUBE_CLIENT.get(`/videos?key=${YOUTUBE_API_KEY}&part=contentDetails&id=${videoIds}`);
    }
};
