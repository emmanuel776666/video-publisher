
const fs = require("fs");
const path = require("path");

// Generate one video clip using the Gemini Interactions REST API.
const generateVideoClip = async ({
  prompt,
  duration,
  clipNumber,
  outputDirectory,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("A video generation prompt is required.");
  }

  if (
    !Number.isInteger(Number(duration)) ||
    Number(duration) < 3 ||
    Number(duration) > 15
  ) {
    throw new Error("Clip duration must be between 3 and 15 seconds.");
  }

  if (!outputDirectory) {
    throw new Error("A temporary output directory is required.");
  }

  const model =
    process.env.GEMINI_VIDEO_MODEL ||
    "gemini-omni-1.2-flash";

  const resolution =
    process.env.GEMINI_VIDEO_RESOLUTION || "720p";

  const aspectRatio =
    process.env.GEMINI_VIDEO_ASPECT_RATIO || "9:16";

  await fs.promises.mkdir(outputDirectory, {
    recursive: true,
  });

  console.log(`Requesting Gemini video clip ${clipNumber}...`);

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            type: "text",
            text: `${prompt}

Create an original ${duration}-second vertical video.
Use a ${aspectRatio} aspect ratio.
Keep the scene visually consistent and suitable for social media.`,
          },
        ],
        response_format: {
          type: "video",
          delivery: "inline",
          duration: `${duration}s`,
          resolution,
          aspect_ratio: aspectRatio,
        },
      }),
      signal: AbortSignal.timeout(600000),
    }
  );

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Google returned an unreadable response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    console.error("Gemini API error:", result);

    throw new Error(
      result.error?.message ||
      `Video generation failed with HTTP ${response.status}.`
    );
  }

  const videoOutput = (result.steps || [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .find((item) => item.type === "video");

  if (!videoOutput || !videoOutput.data) {
    console.error(
      "Video output structure:",
      JSON.stringify(result.steps || [], null, 2)
    );

    throw new Error(
      "Google returned no inline video data. Check the terminal output."
    );
  }

  const outputPath = path.join(
    outputDirectory,
    `clip-${clipNumber}.mp4`
  );

  await fs.promises.writeFile(
    outputPath,
    Buffer.from(videoOutput.data, "base64")
  );

  const stats = await fs.promises.stat(outputPath);

  if (stats.size === 0) {
    throw new Error(`Generated clip ${clipNumber} is empty.`);
  }

  console.log(`Clip ${clipNumber} saved successfully.`);

  return {
    success: true,
    filePath: outputPath,
    fileSize: stats.size,
  };
};

module.exports = {
  generateVideoClip,
};
