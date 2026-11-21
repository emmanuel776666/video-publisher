
const express = require("express");
const router = express.Router();

const AutoPublisherSettings = require("../models/AutoPublisherSettings");

const {
  generateContentPlan,
} = require("../services/contentPlanner");

const {
  discoverPopularVideos,
} = require("../services/youtubeDiscovery");

const {
  analyzeTrendingVideos,
} = require("../services/trendAnalyzer");

// Generate an AI video content plan
router.post("/generate", async (req, res) => {
  try {
    const settings = await AutoPublisherSettings.findOne({
      settingsKey: "main",
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Publishing settings were not found.",
      });
    }

    const {
      mode = "automatic",
      topic,
      category,
      duration,
    } = req.body;

    // Use the requested duration or the saved setting
    const videoDuration = duration || settings.duration;

    // Validate duration
    if (![20, 30].includes(Number(videoDuration))) {
      return res.status(400).json({
        success: false,
        message: "Video duration must be 20 or 30 seconds.",
      });
    }

    let trendAnalysis = null;
    let selectedCategory = category || settings.category;

    // AUTOMATIC MODE:
    // Discover popular videos and let Gemini select an original idea
    if (mode === "automatic") {
      const discovery = await discoverPopularVideos();

      if (!discovery.videos || discovery.videos.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No recent videos were found for trend analysis.",
        });
      }

      trendAnalysis = await analyzeTrendingVideos(
        discovery.videos
      );

      selectedCategory =
        trendAnalysis.selectedCategory || "Trending topics";
    }

    // MANUAL MODE:
    // The user supplies their own topic
    else if (mode === "manual") {
      if (!topic || !topic.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a topic for your video.",
        });
      }

      trendAnalysis = {
        selectedCategory,
        selectedTopic: topic.trim(),
        videoTitle: topic.trim(),
        hook: "",
        trendSummary: "",
        whySelected: "Topic supplied by the user.",
        originalityAngle: "Create an original treatment of the user's topic.",
        scriptDirection: "Develop the supplied topic into an engaging short video.",
        referenceVideos: [],
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid generation mode. Use automatic or manual.",
      });
    }

    // Generate the full script and video prompts
    const plan = await generateContentPlan({
      category: selectedCategory,
      duration: Number(videoDuration),
      trendAnalysis,
    });

    res.json({
      success: true,
      message: "Video content plan generated successfully.",
      mode,
      plan,
    });
  } catch (error) {
    console.error("Content plan error:", error.message);

    const status =
      error.message.includes("API key is not configured") ||
      error.message.includes("API key is missing")
        ? 503
        : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

