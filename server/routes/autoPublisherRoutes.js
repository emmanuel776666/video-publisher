
const express = require("express");
const router = express.Router();

const PublishingLog = require("../models/PublishingLog");
const AutoPublisherSettings = require("../models/AutoPublisherSettings");

// Allowed content categories
const allowedCategories = [
  "Trending topics",
  "Finance and business",
  "Technology and AI",
  "Stories and life lessons",
  "Science and discoveries",
];

// Get the settings document.
// If it does not exist yet, create it with the default values.
const getSettings = async () => {
  let settings = await AutoPublisherSettings.findOne({
    settingsKey: "main",
  });

  if (!settings) {
    settings = await AutoPublisherSettings.create({
      settingsKey: "main",
    });
  }

  return settings;
};

// GET: Retrieve automatic publishing settings
router.get("/settings", async (req, res) => {
  try {
    const settings = await getSettings();

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get settings error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not retrieve publishing settings.",
    });
  }
});

// PUT: Update automatic publishing settings
router.put("/settings", async (req, res) => {
  try {
    const { enabled, category, duration } = req.body;

    const settings = await getSettings();

    // Validate the enabled value
    if (typeof enabled !== "undefined") {
      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Enabled must be true or false.",
        });
      }

      settings.enabled = enabled;
    }

    // Validate the selected category
    if (typeof category !== "undefined") {
      if (!allowedCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid content category.",
        });
      }

      settings.category = category;
    }

    // Validate the video duration
    if (typeof duration !== "undefined") {
      const selectedDuration = Number(duration);

      if (![20, 30].includes(selectedDuration)) {
        return res.status(400).json({
          success: false,
          message: "Duration must be 20 or 30 seconds.",
        });
      }

      settings.duration = selectedDuration;
    }

    // Keep the publishing schedule fixed
    settings.publishingTime = "12:00";
    settings.timezone = "Africa/Lagos";

    await settings.save();

    res.json({
      success: true,
      message: "Publishing settings saved to MongoDB.",
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not save publishing settings.",
    });
  }
});

// POST: Pause automatic publishing
router.post("/pause", async (req, res) => {
  try {
    const settings = await getSettings();

    settings.enabled = false;

    await settings.save();

    res.json({
      success: true,
      message: "Automatic publishing paused.",
      settings,
    });
  } catch (error) {
    console.error("Pause publisher error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not pause automatic publishing.",
    });
  }
});

// GET: Retrieve publishing history
router.get("/history", async (req, res) => {
  try {
    const logs = await PublishingLog.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Publishing history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not retrieve publishing history.",
    });
  }
});

module.exports = router;
