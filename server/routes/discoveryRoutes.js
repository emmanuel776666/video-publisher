

const express = require("express");
const router = express.Router();

const {
  discoverPopularVideos,
} = require("../services/youtubeDiscovery");

const {
  analyzeTrendingVideos,
} = require("../services/trendAnalyzer");

// Discover popular videos from YouTube
router.get("/youtube", async (req, res) => {
  try {
    const result = await discoverPopularVideos();

    res.json(result);
  } catch (error) {
    console.error("YouTube discovery error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Let Gemini analyse discovered videos and select an original idea
router.get("/ideas", async (req, res) => {
  try {
    const discovery = await discoverPopularVideos();

    if (!discovery.videos.length) {
      return res.status(404).json({
        success: false,
        message: "No videos were found for trend analysis.",
      });
    }

    const analysis = await analyzeTrendingVideos(
      discovery.videos
    );

    res.json({
      success: true,
      message: "Worldwide trend analysis completed.",
      discovery: {
        marketsChecked: discovery.marketsChecked,
        videosAnalysed: Math.min(discovery.videos.length, 20),
      },
      analysis,
    });
  } catch (error) {
    console.error("Trend analysis error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
