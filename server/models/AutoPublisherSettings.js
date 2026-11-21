
const mongoose = require("mongoose");

const autoPublisherSettingsSchema = new mongoose.Schema(
  {
    // We only need one settings document for this application
    settingsKey: {
      type: String,
      default: "main",
      unique: true,
    },

    // Whether automatic publishing is enabled
    enabled: {
      type: Boolean,
      default: false,
    },

    // Selected content category
    category: {
      type: String,
      default: "Trending topics",
    },

    // Automatic video duration in seconds
    duration: {
      type: Number,
      enum: [20, 30],
      default: 30,
    },

    // Fixed daily publishing time
    publishingTime: {
      type: String,
      default: "12:00",
    },

    // Nigeria's timezone
    timezone: {
      type: String,
      default: "Africa/Lagos",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AutoPublisherSettings",
  autoPublisherSettingsSchema
);
