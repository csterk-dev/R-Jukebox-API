/**
 * API Get Videos ContentDetails return structure.
 */
declare interface GetVideosContentDetailsResult {
  kind: string,
  etag: string,
  pageInfo: {
    totalResults: number,
    resultsPerPage: number
  },
  items: GetVideosContentDetailsItem[]
}

/**
 * API Search Video return structure.
 */
declare interface SearchVideoResult {
  kind: string,
  etag: string,
  nextPageToken: string,
  regionCode: string,
  pageInfo: {
    totalResults: number,
    resultsPerPage: number
  },
  items: SearchVideoItem[]
}

/**
 * Type used for the item array return from the GET /videos&part=contentDetails youtube endpoint.
 */
declare interface GetVideosContentDetailsItem {
  kind: string,
  etag: string,
  id: string,
  contentDetails: {
    /** E.g. "PT1H1M4S" = 1 hour, 1 mins, 4 secs */
    duration: string,
    dimension: string,
    definition: string,
    caption: false,
    licensedContent: boolean,
    regionRestriction: {
      blocked: string[]
    },
    contentRating: {},
    // projection default is "rectangular"
    projection: string
  }
}

/**
 * Type used for the item array returned from the GET /search&type=video youtube endpoint.
 */
declare interface SearchVideoItem {
  kind: string,
  etag: string,
  id: {
    kind: string,
    videoId: string
  },
  snippet: {
    publishedAt: string,
    channelId: string,
    title: string,
    description: string,
    thumbnails: Thumbnails,
    channelTitle: string,
    liveBroadcastContent: string,
    /** Use `publishedAt` instead. */
    publishTime: string
  }
}

/**
 * Structure of the thumbnail object within the youtube video snippet
 */
type Thumbnails = {
  default: {
    url: string,
    width: number,
    height: number
  },
  medium: {
    url: string
    width: number,
    height: number
  },
  high: {
    url: string,
    width: number,
    height: number
  }
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


declare interface HistoryVideo extends Video {
  playedAt: string;
  playedDate: string;
}

/** Ensure cleint and server match. */
type QueueRequest = {
  clientId: string;
  video: Video
 }

/** Ensure cleint and server match. */
 type QueueAcknowledgement = {
  success: boolean;
  errorMessage?: string;
 }


/** Ensure cleint and server match. */
 type InfoAcknowledgment = {
  title: string;
  description?: string;
 }