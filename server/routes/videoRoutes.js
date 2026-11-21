
const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ObjectId } = require("mongodb");

const ManualVideo = require("../models/ManualVideo");
const { getGridFSBucket } = require("../config/db");
const { produceVideo } = require("../video/videoProduction");
const { generateContentPlan } = require("../services/contentPlanner");

const router = express.Router();

// Generate a video using the supplied topic and script direction
router.post("/generate", async (req, res) => {
  let outputDirectory;
  let uploadedFileId;

  try {
    const {
      mode = "manual",
      topic,
      script = "",
      videoStyle = "Cinematic",
      category = "Trending topics",
      duration = 20,
    } = req.body;

    const videoDuration = Number(duration);

    // Validate video duration
    if (![20, 30].includes(videoDuration)) {
      return res.status(400).json({
        success: false,
        message: "Video duration must be 20 or 30 seconds.",
      });
    }

    // This route currently handles manual generation only
    if (mode !== "manual") {
      return res.status(400).json({
        success: false,
        message: "This route currently supports manual video generation only.",
      });
    }

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a video topic.",
      });
    }

    const bucket = getGridFSBucket();

    if (!bucket) {
      return res.status(503).json({
        success: false,
        message: "MongoDB video storage is not ready.",
      });
    }

    // Create an original content plan for the supplied topic
   const plan = await generateContentPlan({
  category,
  duration: videoDuration,
  topic: topic.trim(),
  script: script.trim(),
});
    // Create a temporary folder for the final MP4
    outputDirectory = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "manual-video-")
    );

    const outputPath = path.join(
      outputDirectory,
      `video-${Date.now()}.mp4`
    );

    // Generate and assemble the video
    const result = await produceVideo({
      plan,
      outputPath,
    });

    if (!fs.existsSync(result.videoPath)) {
      throw new Error("The generated video file could not be found.");
    }

    // Save the completed MP4 in MongoDB GridFS
    uploadedFileId = new ObjectId();

    const uploadStream = bucket.openUploadStreamWithId(
      uploadedFileId,
      `${Date.now()}-${plan.title.replace(/[^a-z0-9-_]/gi, "_")}.mp4`,
      {
        contentType: "video/mp4",
        metadata: {
          title: plan.title,
          videoStyle,
        },
      }
    );

    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);

      fs.createReadStream(result.videoPath).pipe(uploadStream);
    });

    // Save the video information in MongoDB
    const savedVideo = await ManualVideo.create({
      title: plan.title,
      script: plan.narration || script.trim() || plan.title,
      videoStyle,
      duration: videoDuration,
      fileId: uploadedFileId,
      fileName: `${plan.title.replace(/[^a-z0-9-_]/gi, "_")}.mp4`,
      contentType: "video/mp4",
      aspectRatio: "9:16",
    });

    return res.status(201).json({
      success: true,
      message: "Video generated and saved successfully.",
      video: savedVideo,
      previewUrl: `/api/videos/${savedVideo._id}/stream`,
      downloadUrl: `/api/videos/${savedVideo._id}/download`,
    });
  } catch (error) {
    console.error("Manual video generation error:", error.message);

    // Remove an uploaded GridFS file if saving the metadata failed
    if (uploadedFileId) {
      try {
        await getGridFSBucket().delete(uploadedFileId);
      } catch (cleanupError) {
        console.error("GridFS cleanup error:", cleanupError.message);
      }
    }

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || "Video generation failed.",
      });
    }
  } finally {
    // Delete the temporary final MP4 after it has been saved
    if (outputDirectory) {
      await fs.promises.rm(outputDirectory, {
        recursive: true,
        force: true,
      });
    }
  }
});

module.exports = router;
