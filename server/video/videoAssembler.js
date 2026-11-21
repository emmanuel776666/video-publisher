
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

const ffmpegPath = require("ffmpeg-static");

// Escape file paths for FFmpeg's concat list format
const escapeFFmpegPath = (filePath) => {
  return path.resolve(filePath).replace(/'/g, "'\\''");
};

// Join generated video clips into one MP4
const assembleVideo = async ({ clips, outputPath }) => {
  if (!Array.isArray(clips) || clips.length < 2) {
    throw new Error("At least two video clips are required.");
  }

  if (!outputPath) {
    throw new Error("An output file path is required.");
  }

  if (!ffmpegPath) {
    throw new Error("FFmpeg executable could not be found.");
  }

  // Confirm that every clip exists
  for (const clip of clips) {
    if (!clip || !fs.existsSync(clip)) {
      throw new Error(`Video clip was not found: ${clip}`);
    }
  }

  // Make sure the output folder exists
  const absoluteOutputPath = path.resolve(outputPath);

  await fs.promises.mkdir(
    path.dirname(absoluteOutputPath),
    { recursive: true }
  );

  // Create a temporary FFmpeg input list
  const listPath = path.join(
    os.tmpdir(),
    `video-list-${randomUUID()}.txt`
  );

  const listContent = clips
    .map((clip) => `file '${escapeFFmpegPath(clip)}'`)
    .join("\n");

  await fs.promises.writeFile(listPath, listContent, "utf8");

  try {
    // Run FFmpeg and combine the clips
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-movflags", "+faststart",
        absoluteOutputPath,
      ]);

      let errorOutput = "";

      ffmpeg.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on("error", (error) => {
        reject(error);
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `FFmpeg failed with code ${code}: ${errorOutput.slice(-2000)}`
            )
          );
        }
      });
    });

    // Confirm that the finished video exists
    if (!fs.existsSync(absoluteOutputPath)) {
      throw new Error("FFmpeg did not create the final MP4 file.");
    }

    const fileStats = await fs.promises.stat(absoluteOutputPath);

    if (fileStats.size === 0) {
      throw new Error("The generated MP4 file is empty.");
    }

    return {
      success: true,
      filePath: absoluteOutputPath,
      fileSize: fileStats.size,
      message: "Video clips successfully combined.",
    };
  } finally {
    // Remove the temporary input list
    await fs.promises.unlink(listPath).catch(() => {});
  }
};

module.exports = {
  assembleVideo,
};
