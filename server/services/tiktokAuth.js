const crypto = require("crypto");
const TikTokConnection = require("../models/TikTokConnection");

const TIKTOK_AUTHORIZE_URL =
  "https://www.tiktok.com/v2/auth/authorize/";

const TIKTOK_TOKEN_URL =
  "https://open.tiktokapis.com/v2/oauth/token/";

const getTikTokConfig = () => {
  const {
    TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET,
    TIKTOK_REDIRECT_URI,
  } = process.env;

  if (
    !TIKTOK_CLIENT_KEY ||
    !TIKTOK_CLIENT_SECRET ||
    !TIKTOK_REDIRECT_URI
  ) {
    throw new Error("TikTok environment variables are missing.");
  }

  return {
    clientKey: TIKTOK_CLIENT_KEY,
    clientSecret: TIKTOK_CLIENT_SECRET,
    redirectUri: TIKTOK_REDIRECT_URI,
  };
};

// Use the same encryption key already configured for YouTube.
const getEncryptionKey = () => {
  const secret = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error("Token encryption key is missing.");
  }

  return crypto.createHash("sha256").update(secret).digest();
};

// Encrypt a token with AES-256-GCM.
const encryptToken = (token) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
};

// Decrypt a previously encrypted token.
const decryptToken = (encrypted, iv, authTag) => {
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Build the TikTok authorization URL.
const getTikTokAuthorizationUrl = (state) => {
  const { clientKey, redirectUri } = getTikTokConfig();

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: "user.info.basic,video.upload,video.publish",
    redirect_uri: redirectUri,
    state,
  });

  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
};

// Exchange the authorization code for TikTok tokens.
const exchangeTikTokCode = async (code) => {
  const { clientKey, clientSecret, redirectUri } =
    getTikTokConfig();

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  const result = await response.json();

  // TikTok OAuth token responses use top-level fields.
  // Log diagnostic information without exposing credentials.
  console.log("TikTok token endpoint response:", {
    httpStatus: response.status,
    hasAccessToken: Boolean(result.access_token),
    hasRefreshToken: Boolean(result.refresh_token),
    hasOpenId: Boolean(result.open_id),
    error: result.error || null,
    errorDescription: result.error_description || null,
    logId: result.log_id || null,
  });

  if (
    !response.ok ||
    result.error ||
    !result.access_token ||
    !result.refresh_token ||
    !result.open_id
  ) {
    throw new Error(
      result.error_description ||
      result.error ||
      "TikTok returned an incomplete token response."
    );
  }

  return result;
};

// Refresh TikTok credentials when the access token is expired
// or is about to expire.
const refreshTikTokAccessToken = async () => {
  const { clientKey, clientSecret } = getTikTokConfig();

  const connection = await TikTokConnection.findOne({
    connectionName: "primary",
  });

  if (!connection) {
    throw new Error("No TikTok account is connected.");
  }

  const currentAccessExpiry = new Date(
    connection.accessTokenExpiresAt
  ).getTime();

  // Keep a five-minute safety window.
  if (currentAccessExpiry > Date.now() + 5 * 60 * 1000) {
    return getTikTokConnection();
  }

  const refreshToken = decryptToken(
    connection.encryptedRefreshToken,
    connection.refreshTokenIv,
    connection.refreshTokenAuthTag
  );

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  const result = await response.json();

  if (
    !response.ok ||
    result.error ||
    !result.access_token ||
    !result.refresh_token
  ) {
    console.error("TikTok token refresh failed:", {
      status: response.status,
      error: result.error || null,
      description: result.error_description || null,
      logId: result.log_id || null,
    });

    throw new Error("Could not refresh TikTok authorization.");
  }

  // Save both new tokens because TikTok can rotate the refresh token.
  await saveTikTokConnection({
    ...result,
    open_id: result.open_id || connection.openId,
    scope: result.scope || connection.scopes,
  });

  return getTikTokConnection();
};

// Retrieve the connected creator's current TikTok posting settings.
const getTikTokCreatorInfo = async () => {
  const connection = await refreshTikTokAccessToken();

  if (!connection) {
    throw new Error("No TikTok account is connected.");
  }

  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({}),
    }
  );

  const result = await response.json();

  if (!response.ok || result.error?.code !== "ok") {
    console.error("TikTok creator info request failed:", {
      status: response.status,
      error: result.error?.code || null,
      message: result.error?.message || null,
      logId: result.error?.log_id || null,
    });

    throw new Error(
      result.error?.message ||
      "Could not retrieve TikTok creator information."
    );
  }

  return result.data;
};

// Encrypt and save TikTok credentials in MongoDB.
const saveTikTokConnection = async (tokens) => {
  const accessToken = encryptToken(tokens.access_token);
  const refreshToken = encryptToken(tokens.refresh_token);

  const now = Date.now();

  await TikTokConnection.findOneAndUpdate(
    { connectionName: "primary" },
    {
      $set: {
        encryptedAccessToken: accessToken.encrypted,
        accessTokenIv: accessToken.iv,
        accessTokenAuthTag: accessToken.authTag,

        encryptedRefreshToken: refreshToken.encrypted,
        refreshTokenIv: refreshToken.iv,
        refreshTokenAuthTag: refreshToken.authTag,

        openId: tokens.open_id,
        scopes: tokens.scope || "",

        accessTokenExpiresAt: new Date(
          now + Number(tokens.expires_in) * 1000
        ),

        refreshTokenExpiresAt: new Date(
          now + Number(tokens.refresh_expires_in) * 1000
        ),
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );
};

// Retrieve decrypted credentials for backend services only.
const getTikTokConnection = async () => {
  const connection = await TikTokConnection.findOne({
    connectionName: "primary",
  });

  if (!connection) {
    return null;
  }

  return {
    accessToken: decryptToken(
      connection.encryptedAccessToken,
      connection.accessTokenIv,
      connection.accessTokenAuthTag
    ),

    refreshToken: decryptToken(
      connection.encryptedRefreshToken,
      connection.refreshTokenIv,
      connection.refreshTokenAuthTag
    ),

    openId: connection.openId,
    scopes: connection.scopes,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    refreshTokenExpiresAt: connection.refreshTokenExpiresAt,
  };
};

module.exports = {
  getTikTokAuthorizationUrl,
  exchangeTikTokCode,
  saveTikTokConnection,
  getTikTokConnection,
  refreshTikTokAccessToken,
  getTikTokCreatorInfo,
};