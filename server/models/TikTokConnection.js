const mongoose = require("mongoose");

const tiktokConnectionSchema = new mongoose.Schema(
  {
    connectionName: {
      type: String,
      default: "primary",
      unique: true,
      required: true,
    },

    encryptedAccessToken: {
      type: String,
      required: true,
    },

    accessTokenIv: {
      type: String,
      required: true,
    },

    accessTokenAuthTag: {
      type: String,
      required: true,
    },

    encryptedRefreshToken: {
      type: String,
      required: true,
    },

    refreshTokenIv: {
      type: String,
      required: true,
    },

    refreshTokenAuthTag: {
      type: String,
      required: true,
    },

    openId: {
      type: String,
      required: true,
    },

    scopes: {
      type: String,
      default: "",
    },

    accessTokenExpiresAt: {
      type: Date,
      required: true,
    },

    refreshTokenExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TikTokConnection",
  tiktokConnectionSchema
);