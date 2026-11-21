
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

const ManualVideo = require("../models/ManualVideo");
const { getGridFSBucket } = require("../config/db");

const router = express.Router();

// Keep the uploaded file temporarily in memory.
// It will be transferred into MongoDB GridFS.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 500 * 1024 * 1024, // Maximum 500 MB
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "video/mp4") {
      return callback(new Error("Only MP4 video files are allowed."));
    }

    callback(null, true);
  },
});

// Upload a manually created video
router.post("/upload", upload.single("video"), async (req, res) => {
  let uploadedFileId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an MP4 video.",
      });
    }

    const { title, script, videoStyle, duration } = req.body;

    if (!title || !script || !duration) {
      return res.status(400).json({
        success: false,
        message: "Title, script and duration are required.",
      });
    }

    const bucket = getGridFSBucket();

    if (!bucket) {
      return res.status(503).json({
        success: false,
        message: "Video storage is not ready.",
      });
    }

    // Create a unique file ID for GridFS
    uploadedFileId = new ObjectId();

    // Create a stream that uploads the MP4 to GridFS
    const uploadStream = bucket.openUploadStreamWithId(
      uploadedFileId,
      req.file.originalname,
      {
        contentType: "video/mp4",
        metadata: {
          title,
          videoStyle: videoStyle || "Cinematic",
        },
      }
    );

    // Transfer the file into GridFS
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);

      uploadStream.end(req.file.buffer);
    });

    // Save the video's information in MongoDB
    const video = await ManualVideo.create({
      title,
      script,
      videoStyle: videoStyle || "Cinematic",
      duration: Number(duration),
      fileId: uploadedFileId,
      fileName: req.file.originalname,
      contentType: "video/mp4",
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded and saved successfully.",
      video,
    });
  } catch (error) {
    console.error("Video upload error:", error.message);

    // Remove the GridFS file if saving its information fails
    if (uploadedFileId) {
      try {
        await getGridFSBucket().delete(uploadedFileId);
      } catch (deleteError) {
        console.error("GridFS cleanup error:", deleteError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload video.",
    });
  }
});

// Get all saved manual videos
router.get("/", async (req, res) => {
  try {
    const videos = await ManualVideo.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error("Fetch videos error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not retrieve saved videos.",
    });
  }
});


// Stream a saved video with browser seeking support
router.get("/:id/stream", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID.",
      });
    }

    const video = await ManualVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

    const bucket = getGridFSBucket();

    if (!bucket) {
      return res.status(503).json({
        success: false,
        message: "Video storage is not ready.",
      });
    }

    const fileId = new ObjectId(video.fileId);
    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      return res.status(404).json({
        success: false,
        message: "Video file not found in storage.",
      });
    }

    const file = files[0];
    const fileSize = file.length;
    const range = req.headers.range;

    // No range requested: send the complete video
    if (!range) {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
      });

      return bucket.openDownloadStream(fileId).pipe(res);
    }

    // Only one byte range is supported per request
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match) {
      res.set("Content-Range", `bytes */${fileSize}`);
      return res.status(416).end();
    }

    let start;
    let end;

    if (match[1] === "") {
      // Suffix range, e.g. bytes=-500
      const suffixLength = Number(match[2]);

      if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
        res.set("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : fileSize - 1;
      end = Math.min(end, fileSize - 1);
    }

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start
    ) {
      res.set("Content-Range", `bytes */${fileSize}`);
      return res.status(416).end();
    }

    const contentLength = end - start + 1;

    res.writeHead(206, {
      "Content-Type": "video/mp4",
      "Content-Length": contentLength,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
    });

    // GridFS uses an exclusive end position
    const stream = bucket.openDownloadStream(fileId, {
      start,
      end: end + 1,
    });

    stream.on("error", (error) => {
      console.error("Video stream error:", error.message);

      if (!res.headersSent) {
        res.status(500).end("Could not stream video.");
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Video preview error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not preview video.",
      });
    }
  }
});


// Download a saved MP4 video
router.get("/:id/download", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID.",
      });
    }

    const video = await ManualVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

    const bucket = getGridFSBucket();
    const fileId = new ObjectId(video.fileId);

    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      return res.status(404).json({
        success: false,
        message: "Video file not found in storage.",
      });
    }

    res.set({
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(video.fileName)}"`,
    });

    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on("error", (error) => {
      console.error("Video download error:", error.message);

      if (!res.headersSent) {
        res.status(500).end("Could not download video.");
      } else {
        res.destroy(error);
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Video download error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not download video.",
      });
    }
  }
});

// Delete a saved manual video
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID.",
      });
    }

    const video = await ManualVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

    const bucket = getGridFSBucket();

    // Delete the MP4 file from GridFS
    await bucket.delete(new ObjectId(video.fileId));

    // Delete the video's database information
    await ManualVideo.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Video deleted successfully.",
    });
  } catch (error) {
    console.error("Video deletion error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete video.",
    });
  }
});

module.exports = router;
