import { Request, Response } from "express";
import { YoutubeAPI } from "../../../services/youtube";
import { AxiosResponse } from "axios";
import { z } from "zod";


// const typeEnum = z.enum(["video", "channel", "playlist"]);


const getYoutubeSearchResults_Query = z.object({
  q: z.string(),
  type: z
    // .string()
    .enum(["video"]),
  // .optional()
  // .default("video")
  // .transform(val => val.split(","))
  // .refine(
  //   arr => arr.every((item) => typeEnum.safeParse(item).success),
  //   { message: "Invalid type parameter. Allowed: video, channel, playlist" }
  // )
  // // ensures it's a tuple of enums, not string[]
  // .transform(arr => arr as [z.infer<typeof typeEnum>, ...z.infer<typeof typeEnum>[]]),
  regionCode: z.string().default("AU"),
  pageSize: z.coerce
    .number()
    .min(1)
    .max(50)
    .default(20),
  pageToken: z.string().optional()
});


/**
 * Returns the first 20 search results and their content details from the youtube API.
 * 
 * @param req Express request query parms containing the `searchQuery` and limit number.
 * @param res Express response parm.
 * @param next Express next function.
 * 
 * @returns {Video} The the formatted results from the api.
 */
export async function getYoutubeSearchResults(req: Request, res: Response) {
  // const { val, limit } = req.query as { val: string; limit?: string };
  const result = getYoutubeSearchResults_Query.safeParse(req.query);

  if (!result.success) {
    console.error("getYoutubeSearchResults", "Zod Error", result.error.message);
    res.status(400).json({ message: "Invalid history request body." });
    return;
  }


  const searchRes: AxiosResponse<YTSearch.VideoResult> = await YoutubeAPI.searchVideos(result.data.q, [result.data.type], result.data.regionCode, result.data.pageSize, result.data.pageToken);

  if (searchRes.status !== 200) {
    res.status(400).send({ message: "Failed to get search from youtube API" });
    return;
  }
  const videoIds = searchRes.data.items.map(i => i.id.videoId);

  const detailsRes: AxiosResponse<YTVideos.ContentDetailsAndStatisticsResult> = await YoutubeAPI.getVideosContentDetailsStatistics(videoIds.toString());

  if (detailsRes.status !== 200) {
    res.status(detailsRes.status).send({ message: "Failed to get content details from youtube API" });
    return;
  }

  const combinedResults: (Video | undefined)[] = detailsRes.data.items.map(detailsItem => {
    const video = searchRes.data.items.find(searchItem => searchItem.id.videoId == detailsItem.id);
    if (!video) return undefined;
    return {
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      duration: detailsItem.contentDetails.duration,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails,
      title: video.snippet.title,
      videoId: video.id.videoId
    }
  });

  // Filter out undefined entries before sending the response
  const filteredVideos: Video[] = combinedResults.filter(v => v !== undefined) as Video[];

  const resData: SearchResult = {
    nextPageToken: searchRes.data.nextPageToken,
    prevPageToken: searchRes.data.prevPageToken,
    resultsPerPage: searchRes.data.pageInfo.resultsPerPage,
    totalResults: searchRes.data.pageInfo.totalResults,
    videos: filteredVideos
  }
  res.status(200).json(resData);
}