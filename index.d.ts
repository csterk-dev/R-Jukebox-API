
declare interface GetVideosContentDetailsResult {
  kind: string,
  etag: string,
  pageInfo: {
    totalResults: number,
    resultsPerPage: number
  },
  items: GetVideosContentDetailsItem[]
}


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
    projection: string // default is "rectangular"
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
    thumbnails: {
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
    },
    channelTitle: string,
    liveBroadcastContent: string,
    /** Use `publishedAt` instead. */
    publishTime: string
  }
}