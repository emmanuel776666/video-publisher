const express = require("express");
const crypto = require("crypto");

const {
  getTikTokAuthorizationUrl,
  exchangeTikTokCode,
  saveTikTokConnection,
} = require("../services/tiktokAuth");

const router = express.Router();

// Temporary storage for OAuth state values.
const pendingStates = new Set();

// Start TikTok authorization.
router.get("/auth/tiktok", (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString("hex");

    pendingStates.add(state);

    const authorizationUrl =
      getTikTokAuthorizationUrl(state);

    res.redirect(authorizationUrl);
  } catch (error) {
    console.error("TikTok authorization error:", error.message);

    res.status(500).send(
      "Could not start TikTok authorization."
    );
  }
});

// TikTok sends the user back here after authorization.
router.get("/auth/tiktok/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error("TikTok authorization was declined:", error);

      return res.status(400).send(
        "TikTok authorization was not completed."
      );
    }

    if (!code || !state || !pendingStates.has(state)) {
      return res.status(400).send(
        "Invalid or expired TikTok authorization request."
      );
    }

    // A state value can only be used once.
    pendingStates.delete(state);

    // Exchange authorization code for access and refresh tokens.
    const tokens = await exchangeTikTokCode(code);

    // Encrypt and store the tokens in MongoDB.
    await saveTikTokConnection(tokens);

    console.log("TikTok account connected successfully.");
    console.log("TikTok Open ID:", tokens.open_id);
    console.log("Granted scopes:", tokens.scope);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TikTok Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2>TikTok connected successfully!</h2>
          <p>Your TikTok account authorization has been saved securely.</p>
          <p>You can close this browser tab and return to Video Publisher.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("TikTok callback error:", error.message);

    res.status(500).send(
      "TikTok connection failed. Check the backend logs."
    );
  }
});

module.exports = router;