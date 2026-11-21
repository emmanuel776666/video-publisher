
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const { startDailyScheduler } = require("./scheduler/dailyScheduler");

// Import database models
const ManualVideo = require("./models/ManualVideo");
const PublishingLog = require("./models/PublishingLog");
const autoPublisherRoutes = require("./routes/autoPublisherRoutes");
// Import video routes
const manualVideoRoutes = require("./routes/manualVideoRoutes");
const contentPlanRoutes = require("./routes/contentPlanRoutes");
const discoveryRoutes = require("./routes/discoveryRoutes");
const videoRoutes = require("./routes/videoRoutes");
const youtubeAuthRoutes = require("./routes/youtubeAuthRoutes");

const app = express();

// Frontend connection
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Middleware
app.use(express.json());

// Manual video routes
app.use("/api/videos", manualVideoRoutes);

// Automatic publishing routes
app.use("/api/auto-publisher", autoPublisherRoutes);
// AI content planning routes
app.use("/api/content-plan", contentPlanRoutes);
// YouTube trend discovery routes
app.use("/api/discovery", discoveryRoutes);
app.use("/api/video", videoRoutes);
app.use("/", youtubeAuthRoutes);

// Homepage
app.get("/", (req, res) => {
  res.send("Video Publisher API is running.");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Video Publisher backend is working.",
    status: "Online",
  });
});

// Handle upload errors, including Multer file-size errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  res.status(err instanceof require("multer").MulterError ? 400 : 500).json({
    success: false,
    message: err.message || "Something went wrong.",
  });
});

// Start the server after connecting to MongoDB
const startServer = async () => {
  await connectDB();

  // Start the daily publishing scheduler
  startDailyScheduler();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Video Publisher server running on port ${PORT}`);
  });
};

startServer();
