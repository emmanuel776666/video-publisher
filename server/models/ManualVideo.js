
const mongoose = require("mongoose");

const manualVideoSchema = new mongoose.Schema(
  {
    // Name of the video project
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Original script supplied by the user
    script: {
      type: String,
      required: true,
    },

    // Video appearance or generation style
    videoStyle: {
      type: String,
      default: "Cinematic",
    },

    // Requested video duration
    duration: {
      type: Number,
      required: true,
    },

    // GridFS ID of the actual MP4 file
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // File information
    fileName: {
      type: String,
      required: true,
    },

    contentType: {
      type: String,
      default: "video/mp4",
    },

    // Video orientation
    aspectRatio: {
      type: String,
      default: "9:16",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ManualVideo", manualVideoSchema);
