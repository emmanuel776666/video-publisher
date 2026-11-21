
const { google } = require("googleapis");

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

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

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

module.exports = {
  getYouTubeAuthorizationUrl,
  exchangeYouTubeCode,
};
