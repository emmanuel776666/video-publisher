
// Backend server address
const API_BASE_URL = "http://localhost:5000";

// Reusable function for making API requests
const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
};

// Get automatic publishing settings
export const getAutoSettings = () => {
  return request("/api/auto-publisher/settings");
};

// Update automatic publishing settings
export const updateAutoSettings = (settings) => {
  return request("/api/auto-publisher/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
};

// Pause automatic publishing
export const pauseAutoPublisher = () => {
  return request("/api/auto-publisher/pause", {
    method: "POST",
  });
};

// Get saved manual videos
export const getMyVideos = () => {
  return request("/api/videos");
};


// Generate a manual video through the backend
export const generateManualVideo = (videoDetails) =>
  request("/api/video/generate", {
    method: "POST",
    body: JSON.stringify(videoDetails),
  });
