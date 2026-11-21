
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  getYouTubeAuthorizationUrl,
  exchangeYouTubeCode,
} = require("../services/youtubeAuth");

const router = express.Router();

// Temporary state storage for the local OAuth flow.
const pendingStates = new Set();

const tokenFile = path.join(
  __dirname,
  "..",
  ".youtube-tokens.json"
);

// Start YouTube authorization.
router.get("/auth", (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString("hex");

    pendingStates.add(state);

    const authorizationUrl = getYouTubeAuthorizationUrl(state);

    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("YouTube authorization error:", error.message);
    res.status(500).send("Could not start YouTube authorization.");
  }
});

// Google redirects here after authorization.
router.get("/oauth2callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(
        `YouTube authorization was not completed: ${error}`
      );
    }

    if (!code || !state || !pendingStates.has(state)) {
      return res.status(400).send(
        "Invalid or expired YouTube authorization request."
      );
    }

    pendingStates.delete(state);

    const connection = await exchangeYouTubeCode(code);

    // Save credentials locally. This file must never be committed.
    await fs.promises.writeFile(
      tokenFile,
      JSON.stringify(connection, null, 2),
      { mode: 0o600 }
    );

    console.log("YouTube connection successful.");
    console.log("Channel:", connection.channelTitle);
    console.log("Channel ID:", connection.channelId);

    res.send(`
      <h2>YouTube connected successfully!</h2>
      <p>Channel: ${connection.channelTitle}</p>
      <p>You can close this browser tab and return to Video Publisher.</p>
    `);
  } catch (error) {
    console.error("YouTube callback error:", error.message);

    res.status(500).send(
      "YouTube connection failed. Check your backend terminal."
    );
  }
});

module.exports = router;
