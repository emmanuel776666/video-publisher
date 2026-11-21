
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

// This will hold our GridFS storage bucket
let gridFSBucket = null;

// Connect to MongoDB and prepare GridFS
const connectDB = async () => {
  try {
    // Connect to the Video Publisher database
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "video_publisher",
    });

    console.log("MongoDB connected successfully.");

    // Get the active MongoDB database
    const database = mongoose.connection.db;

    // Prepare GridFS for storing manual MP4 videos
    gridFSBucket = new GridFSBucket(database, {
      bucketName: "manualVideos",
    });

    console.log("GridFS storage is ready.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Allow other files to access the GridFS bucket
const getGridFSBucket = () => gridFSBucket;

module.exports = {
  connectDB,
  getGridFSBucket,
};
