const mongoose = require("mongoose");

const youtubeConnectionSchema = new mongoose.Schema(
  {
    // We keep one YouTube connection for this application.
    connectionName: {
      type: String,
      default: "primary",
      unique: true,
      required: true,
    },

    // The refresh token is encrypted before it reaches this model.
    encryptedRefreshToken: {
      type: String,
      required: true,
    },

    encryptionIv: {
      type: String,
      required: true,
    },

    encryptionAuthTag: {
      type: String,
      required: true,
    },

    channelId: {
      type: String,
      required: true,
    },

    channelTitle: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "YouTubeConnection",
  youtubeConnectionSchema
);