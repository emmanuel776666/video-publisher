
const YOUTUBE_API =
  "https://www.googleapis.com/youtube/v3";

// Markets used to approximate worldwide discovery
const REGIONS = ["US", "GB", "IN", "NG", "AU"];

// Search across different popular video formats
const SEARCH_TOPICS = [
  "funny cartoon animation comedy",
  "emotional short stories rich and poor life lessons",
  "amazing facts science technology AI discoveries",
];

// Find recent popular videos across several markets
const searchPopularVideos = async (region, query, publishedAfter) => {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    order: "viewCount",
    publishedAfter,
    videoDuration: "short",
    maxResults: "10",
    regionCode: region,
    key: process.env.YOUTUBE_API_KEY,
  });

  const response = await fetch(
    `${YOUTUBE_API}/search?${params}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "YouTube video search failed."
    );
  }

  return (data.items || [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
      region,
      searchTopic: query,
    }));
};

// Retrieve public statistics for discovered videos
const getVideoStatistics = async (videoIds) => {
  if (!videoIds.length) return [];

  const params = new URLSearchParams({
    part: "statistics,contentDetails",
    id: videoIds.join(","),
    key: process.env.YOUTUBE_API_KEY,
  });

  const response = await fetch(
    `${YOUTUBE_API}/videos?${params}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Could not retrieve video statistics."
    );
  }

  return data.items || [];
};

// Discover and rank promising video ideas
const discoverPopularVideos = async () => {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error(
      "YouTube API key is missing. Add YOUTUBE_API_KEY to your server .env file."
    );
  }

  // Look at videos published within the last 7 days
  const publishedAfter = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Search each topic in each selected market
  const searchJobs = [];

  for (const region of REGIONS) {
    for (const topic of SEARCH_TOPICS) {
      searchJobs.push(
        searchPopularVideos(region, topic, publishedAfter)
      );
    }
  }

  const searchResults = await Promise.all(searchJobs);
  const allVideos = searchResults.flat();

  // Remove duplicate video IDs
  const uniqueVideos = [
    ...new Map(
      allVideos.map((video) => [video.videoId, video])
    ).values(),
  ];

  if (!uniqueVideos.length) {
    return {
      success: true,
      count: 0,
      videos: [],
      message: "No matching recent videos were found.",
    };
  }

  // YouTube accepts up to 50 video IDs in one request
  const statistics = await getVideoStatistics(
    uniqueVideos.map((video) => video.videoId)
  );

  const statisticsMap = new Map(
    statistics.map((video) => [video.id, video])
  );

  const rankedVideos = uniqueVideos
    .map((video) => {
      const stats = statisticsMap.get(video.videoId);

      if (!stats) return null;

      const views = Number(stats.statistics?.viewCount || 0);
      const likes = Number(stats.statistics?.likeCount || 0);
      const comments = Number(stats.statistics?.commentCount || 0);

      const ageHours = Math.max(
        1,
        (Date.now() - new Date(video.publishedAt).getTime()) /
          (1000 * 60 * 60)
      );

      const viewsPerDay = views / (ageHours / 24);
      const likeRate = views > 0 ? likes / views : 0;

      // A simple ranking signal, not a guarantee of virality
      const score =
        viewsPerDay * (1 + likeRate * 10);

      return {
        ...video,
        views,
        likes,
        comments,
        viewsPerDay: Math.round(viewsPerDay),
        likeRate: Number((likeRate * 100).toFixed(2)),
        score: Math.round(score),
        duration: stats.contentDetails?.duration || null,
        videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return {
    success: true,
    audience: "Worldwide market sample",
    marketsChecked: REGIONS,
    searchWindow: "Last 7 days",
    count: rankedVideos.length,
    videos: rankedVideos.slice(0, 30),
  };
};

module.exports = { discoverPopularVideos };
