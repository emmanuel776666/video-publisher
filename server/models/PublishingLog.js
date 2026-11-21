
const mongoose = require("mongoose");

const publishingLogSchema = new mongoose.Schema(
  {
    // Unique identifier for each scheduled day, e.g. 2026-11-10
    runKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    topic: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: "Trending topics",
    },

    script: {
      type: String,
      default: "",
    },

    scheduledFor: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "partial", "failed"],
      default: "pending",
    },

    platforms: {
      facebook: {
        status: {
          type: String,
          enum: ["pending", "published", "failed", "skipped"],
          default: "pending",
        },
        postId: String,
        error: String,
        publishedAt: Date,
      },

      youtube: {
        status: {
          type: String,
          enum: ["pending", "published", "failed", "skipped"],
          default: "pending",
        },
        postId: String,
        error: String,
        publishedAt: Date,
      },

      tiktok: {
        status: {
          type: String,
          enum: ["pending", "published", "failed", "skipped"],
          default: "pending",
        },
        postId: String,
        error: String,
        publishedAt: Date,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PublishingLog", publishingLogSchema);
