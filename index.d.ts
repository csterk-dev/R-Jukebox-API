
type BaseYTReponse<ItemType> = {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  },
  items: ItemType[];
}

type BaseYTSnippet = {

}

declare namespace YTVideos {
  /** Combined YT API response type for both statistics and contentDetails parts. */
  declare interface ContentDetailsAndStatisticsResult extends BaseYTReponse<ContentDetailsAndStatistics> { }

  declare interface ContentDetailsAndStatisticsItem {
    kind: string;
    etag: string;
    id: string;
    contentDetails: {
      /** E.g. "PT1H1M4S" = 1 hour, 1 mins, 4 secs */
      duration: string;
      dimension: string;
      definition: string;
      caption: false;
      licensedContent: boolean;
      regionRestriction: {
        blocked: string[];
        allowed: string[];
      },
      contentRating: {},
      // projection default is "rectangular"
      projection: "rectangular";
    },
    statistics: {
      viewCount: string;
      likeCount: string;
      favoriteCount: string;
      commentCount: string;
    }
  }
}


declare namespace YTSearch {

  /** YT API search Video return structure. */
  declare interface VideoResult {
    kind: string;
    etag: string;
    prevPageToken?: string;
    nextPageToken?: string;
    regionCode: string;
    pageInfo: {
      totalResults: number;
      resultsPerPage: number;
    },
    items: SnippetItem[];
  }

  declare interface SnippetItem {
    kind: string;
    etag: string;
    id: {
      kind: string;
      videoId: string;
    },
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: Thumbnails;
      channelTitle: string;
      liveBroadcastContent: string;
      /** Use `publishedAt` instead. */
      publishTime: string;
    }
  }
}

/** The returned formatted videos for the current search term. */
declare interface SearchResult {
  prevPageToken: string | undefined;
  nextPageToken: string | undefined;
  totalResults: number;
  resultsPerPage: number;
  videos: Video[];
}

/**
 * Video type used as the collated data structure from the various results.
 */
declare interface Video {
  channelId: string;
  channelTitle: string;
  duration: string;
  publishedAt: string;
  thumbnails: Thumbnails;
  title: string;
  videoId: string;
}


type Thumbnails = {
  default: {
    url: string;
    width: number;
    height: number;
  },
  medium: {
    url: string;
    width: number;
    height: number;
  },
  high: {
    url: string;
    width: number;
    height: number;
  }
}

declare interface HistoryVideo extends Video {
  playedAt: string;
  playedDate: string;
}


type BaseRequest = {
  clientId?: string;
}


type VideoRequest = BaseRequest & {
  video: Video;
}


type PlayPauseRequest = BaseRequest & {
  isPlaying: boolean;
}


type UpdatePlayerVolumeRequest = BaseRequest & {
  volumeLevel: number;
}


type UpdatePlayerTimestampRequest = BaseRequest & {
  timestamp: number;
}


type RemoveQueueItemRequest = BaseRequest & {
  videoId: Video["videoId"]
}


type WSAcknowledgement = {
  success: boolean;
  errorMessage?: string;
}


type ConditionalAcknowledgement<T extends boolean>
  = WSAcknowledgement
  & (T extends true
    // If success is true, exclude stackTrace and callingFunction
    ? { success: true }
    // If success is false, include them
    : { success: false } & Pick<NewEntryLog, "callingFunction" | "stackTrace">
  );

type DbActionAcknowledgement = ConditionalAcknowledgement<boolean>;

type PuppeteerActionAcknowledgement = ConditionalAcknowledgement<boolean>;

type NewEntryLog = {
  type: "error" | "info";
  /** Name of the function that called and caught the error. Useful for nested util functions. */
  callingFunction: string;
  /** Stack trace or error message. */
  stackTrace: string | null;
}

type EntryLog = NewEntryLog & {
  dateTime: string;
  id: number;
}