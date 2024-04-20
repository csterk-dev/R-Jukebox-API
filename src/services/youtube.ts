import { YOUTUBE_API_URL } from "../constants";
import axios from "axios";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;



const YOUTUBE_CLIENT = axios.create({
  baseURL: YOUTUBE_API_URL,
  headers: {
    "content-type": "application/json"
  },
  responseType: "json"
});


export const YoutubeAPI = {
  /**
   * Returns a list of video snippets that match the search query. 
   * 
   * @param query The search query.
   * @param maxResults Total number of results returned per page.
   * 
   * @remarks Quota cost = `100 credits`.
   */
  async searchVideos(query: string, maxResults: number) {
    return await YOUTUBE_CLIENT.get(`/search?key=${YOUTUBE_API_KEY}&q=${query}&type=video&part=snippet&maxResults=${maxResults}`);
  },

  /**
   * Returns a the content details of the provided video Ids. 
   * @param videoIds String array of video IDs
   * 
   * @remarks Quota cost = `1 credit.`
   */
  async getVideosContentDetails(videoIds: string) {
    return await YOUTUBE_CLIENT.get(`/videos?key=${YOUTUBE_API_KEY}&part=contentDetails&id=${videoIds}`);
  }
}