import { Request, Response } from "express";
import { YoutubeAPI } from "../../../services/youtube";
import { AxiosResponse } from "axios";
import { z } from "zod";


// const typeEnum = z.enum(["video", "channel", "playlist"]);


const getYoutubeSearchResults_Query = z.object({
  q: z.string(),
  type: z
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
  const request = getYoutubeSearchResults_Query.safeParse(req.query);

  if (!request.success) {
    console.error("getYoutubeSearchResults", "Zod Error", request.error.message);
    res.status(400).json({ message: "Invalid history request body." });
    return;
  }


  let searchRes: AxiosResponse<YTSearch.VideoResult>;
  let detailsRes: AxiosResponse<YTVideos.ContentDetailsAndStatisticsResult>;

  try {
    searchRes = await YoutubeAPI.searchVideos(request.data.q, [request.data.type], request.data.regionCode, request.data.pageSize, request.data.pageToken);

    if (searchRes.status !== 200) {
      res.status(400).send({ message: "Failed to get search from youtube API" });
      return;
    }
    const videoIds = searchRes.data.items.map(i => i.id.videoId);

    detailsRes = await YoutubeAPI.getVideosContentDetailsStatistics(videoIds.toString());

    if (detailsRes.status !== 200) {
      res.status(detailsRes.status).send({ message: "Failed to get content details from youtube API" });
      return;
    }
  } catch (error) {
    console.error("YouTube API Error:", error);
    res.status(400).send({ message: "Failed to get search from youtube API" });
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

  const resData: SearchResultPage = {
    nextPageToken: searchRes.data.nextPageToken,
    prevPageToken: searchRes.data.prevPageToken,
    resultsPerPage: searchRes.data.pageInfo.resultsPerPage,
    totalResults: searchRes.data.pageInfo.totalResults,
    videos: filteredVideos
  }
  res.status(200).json(resData);
}