import { Request, Response } from "express";
import { YoutubeAPI } from "../services/youtube";


/**
 * Returns the first 20 search results from the youtube API unless the `limit` param has been supplied.
 * 
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 * 
 * @returns {SearchVideoResult} The `SearchVideoResult` from the api.
 */
export async function HandleSearchVideos(req: Request, res: Response) {
  const { val, limit } = req.query as { val: string; limit?: string };

  if (!val) {
    res.status(400).json({ message: "No search value provided" });
    return;
  }

  let parsedLimit = 20;
  if (typeof limit === "string") parsedLimit = parseInt(limit);

  const ytResponse = await YoutubeAPI.searchVideos(val, parsedLimit);

  if (ytResponse.status !== 200) {
    res.status(500).json({ message: "Failed to get results from youtube API" });
    return;
  }

  const videoSnippets: SearchVideoResult = ytResponse.data.items;

  res.status(200).json(videoSnippets);
}


/**
 * Returns the first 20 search results from the youtube API unless the `limit` param has been supplied.
 * 
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 * 
 * @returns {SearchVideoResult} The `SearchVideoResult` from the api.
 */
export async function HandleGetContentDetails(req: Request, res: Response) {
  const { videoIds } = req.query as { videoIds: string; limit?: string };

  if (!videoIds) {
    res.status(400).json({ message: "No video ids were provided" });
    return;
  }


  const ytResponse = await YoutubeAPI.getVideosContentDetails(videoIds);

  if (ytResponse.status !== 200) {
    res.status(500).json({ message: "Failed to get results from youtube API" });
    return;
  }

  const videoContentDetails: GetVideosContentDetailsResult = ytResponse.data.items;

  res.status(200).json(videoContentDetails);
}