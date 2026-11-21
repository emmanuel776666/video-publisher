
const cron = require("node-cron");

const AutoPublisherSettings = require("../models/AutoPublisherSettings");
const PublishingLog = require("../models/PublishingLog");

// Get today's date in Nigeria's timezone as YYYY-MM-DD
const getNigeriaDate = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}`;
};

// Convert 12:00 PM Nigeria time into a JavaScript Date.
// Nigeria is UTC+1, so noon in Lagos is 11:00 UTC.
const getScheduledDate = (dateString) => {
  return new Date(`${dateString}T11:00:00.000Z`);
};

// This function runs once when the scheduled time arrives
const runDailyPublisher = async () => {
  const nigeriaDate = getNigeriaDate();

  console.log(`Daily publisher check for ${nigeriaDate}`);

  try {
    // Load saved automatic publishing settings
    const settings = await AutoPublisherSettings.findOne({
      settingsKey: "main",
    });

    // Do nothing if settings do not exist or publishing is disabled
    if (!settings || !settings.enabled) {
      console.log("Auto Publisher is paused. No work scheduled.");
      return;
    }

    // Unique key prevents a second record for the same date
    const runKey = nigeriaDate;

    const existingLog = await PublishingLog.findOne({
      runKey,
    });

    if (existingLog) {
      console.log("Today's publishing record already exists.");
      return;
    }

    // Create one daily publishing record
    const newLog = await PublishingLog.create({
      runKey,
      topic: "Awaiting daily trending topic discovery",
      category: settings.category,
      scheduledFor: getScheduledDate(nigeriaDate),
      status: "pending",
    });

    console.log("Daily publishing record created.");
    console.log(`Record ID: ${newLog._id}`);
    console.log(`Category: ${settings.category}`);
    console.log(`Video duration: ${settings.duration} seconds`);
    console.log("Waiting for the AI generation pipeline.");
  } catch (error) {
    // A duplicate-key error means another callback already created today's record
    if (error.code === 11000) {
      console.log("Today's publishing record already exists.");
      return;
    }

    console.error("Daily publisher error:", error.message);
  }
};

// Start the daily scheduler
const startDailyScheduler = () => {
  cron.schedule(
    "0 12 * * *",
    async () => {
      await runDailyPublisher();
    },
    {
      timezone: "Africa/Lagos",
    }
  );

  console.log("Daily scheduler started.");
  console.log("Scheduled time: 12:00 PM Africa/Lagos.");
};

module.exports = {
  startDailyScheduler,
  runDailyPublisher,
};
