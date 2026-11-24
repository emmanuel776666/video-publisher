const express = require("express");
const crypto = require("crypto");

const {
  getYouTubeAuthorizationUrl,
  exchangeYouTubeCode,
  saveYouTubeConnection,
} = require("../services/youtubeAuth");

const router = express.Router();

// Temporarily keep track of authorization requests.
// Google must return the same state before we accept the callback.
const pendingStates = new Set();

// Start YouTube authorization.
router.get("/auth", (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString("hex");

    pendingStates.add(state);

    const authorizationUrl = getYouTubeAuthorizationUrl(state);

    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("YouTube authorization error:", error.message);

    res.status(500).send(
      "Could not start YouTube authorization."
    );
  }
});

// Google redirects here after the user approves access.
router.get("/oauth2callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(
        "YouTube authorization was not completed."
      );
    }

    if (!code || !state || !pendingStates.has(state)) {
      return res.status(400).send(
        "Invalid or expired YouTube authorization request."
      );
    }

    // Accept this state only once.
    pendingStates.delete(state);

    // Exchange Google's authorization code.
    const connection = await exchangeYouTubeCode(code);

    // Encrypt the refresh token and save it in MongoDB.
    await saveYouTubeConnection(connection);

    console.log("YouTube connection saved successfully.");
    console.log("Channel:", connection.channelTitle);
    console.log("Channel ID:", connection.channelId);

    // Escape the channel title before inserting it into HTML.
    const safeChannelTitle = String(connection.channelTitle).replace(
      /[&<>"']/g,
      (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      }
    );

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>YouTube Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2>YouTube connected successfully!</h2>
          <p>Channel: ${safeChannelTitle}</p>
          <p>Your connection has been securely saved.</p>
          <p>You can close this browser tab and return to Video Publisher.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("YouTube callback error:", error.message);

    res.status(500).send(
      "YouTube connection failed. Check the backend logs."
    );
  }
});

module.exports = router;