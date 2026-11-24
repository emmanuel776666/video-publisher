const { google } = require("googleapis");
const crypto = require("crypto");

const YouTubeConnection = require("../models/YouTubeConnection");

// Create the Google OAuth client using environment variables.
const createYouTubeOAuthClient = () => {
  const {
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI,
  } = process.env;

  if (
    !YOUTUBE_CLIENT_ID ||
    !YOUTUBE_CLIENT_SECRET ||
    !YOUTUBE_REDIRECT_URI
  ) {
    throw new Error("YouTube OAuth environment variables are missing.");
  }

  return new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
  );
};

// Permissions requested from Google.
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

// Generate an encryption key from a secret environment variable.
// The actual key is never stored in MongoDB.
const getEncryptionKey = () => {
  const secret = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error(
      "YOUTUBE_TOKEN_ENCRYPTION_KEY is missing or too short."
    );
  }

  // Convert the secret into a 32-byte key for AES-256.
  return crypto.createHash("sha256").update(secret).digest();
};

// Encrypt the refresh token before storing it.
const encryptRefreshToken = (refreshToken) => {
  const key = getEncryptionKey();

  // A new random IV is generated for every encryption.
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(refreshToken, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedRefreshToken: encrypted,
    encryptionIv: iv.toString("hex"),
    encryptionAuthTag: cipher.getAuthTag().toString("hex"),
  };
};

// Decrypt the refresh token when the application needs it.
const decryptRefreshToken = (connection) => {
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(connection.encryptionIv, "hex")
  );

  decipher.setAuthTag(
    Buffer.from(connection.encryptionAuthTag, "hex")
  );

  let decrypted = decipher.update(
    connection.encryptedRefreshToken,
    "hex",
    "utf8"
  );

  decrypted += decipher.final("utf8");

  return decrypted;
};

// Build Google's authorization URL.
const getYouTubeAuthorizationUrl = (state) => {
  const oauth2Client = createYouTubeOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: YOUTUBE_SCOPES,
    state,
  });
};

// Exchange Google's authorization code for tokens.
const exchangeYouTubeCode = async (code) => {
  const oauth2Client = createYouTubeOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke the previous app permission and authorize again."
    );
  }

  oauth2Client.setCredentials(tokens);

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  const response = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
  });

  const channel = response.data.items?.[0];

  if (!channel) {
    throw new Error("No YouTube channel was found for this Google account.");
  }

  return {
    refreshToken: tokens.refresh_token,
    channelId: channel.id,
    channelTitle: channel.snippet.title,
  };
};

// Encrypt and save the connection in MongoDB.
const saveYouTubeConnection = async (connection) => {
  const encrypted = encryptRefreshToken(connection.refreshToken);

  await YouTubeConnection.findOneAndUpdate(
    { connectionName: "primary" },
    {
      $set: {
        ...encrypted,
        channelId: connection.channelId,
        channelTitle: connection.channelTitle,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );
};

// Read the saved connection and decrypt its refresh token.
// Keep this function inside the backend; never expose its result to the frontend.
const getYouTubeConnection = async () => {
  const connection = await YouTubeConnection.findOne({
    connectionName: "primary",
  });

  if (!connection) {
    return null;
  }

  return {
    refreshToken: decryptRefreshToken(connection),
    channelId: connection.channelId,
    channelTitle: connection.channelTitle,
  };
};

module.exports = {
  getYouTubeAuthorizationUrl,
  exchangeYouTubeCode,
  saveYouTubeConnection,
  getYouTubeConnection,
};