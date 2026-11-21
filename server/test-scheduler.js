
require("dotenv").config();

const { connectDB } = require("./config/db");
const AutoPublisherSettings = require("./models/AutoPublisherSettings");
const { runDailyPublisher } = require("./scheduler/dailyScheduler");

const testScheduler = async () => {
  try {
    await connectDB();

    // Keep automatic publishing paused during this test
    await AutoPublisherSettings.findOneAndUpdate(
      { settingsKey: "main" },
      { $set: { enabled: false } },
      { upsert: true, returnDocument: "after" }
    );

    console.log("\nRunning scheduler test...\n");

    await runDailyPublisher();

    console.log("\nScheduler test finished.");
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

testScheduler();
