
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");

const { generateVideoClip } = require("./videoGenerator");
const { assembleVideo } = require("./videoAssembler");

// Produce a complete video from an AI content plan
const produceVideo = async ({ plan, outputPath }) => {
  // A valid plan must contain at least two clips
  if (!plan || !Array.isArray(plan.clips) || plan.clips.length < 2) {
    throw new Error(
      "A valid content plan containing at least two clips is required."
    );
  }

  if (!outputPath) {
    throw new Error("The final video output path is required.");
  }

  // Create a temporary folder for all generated clips
  const workDirectory = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `video-production-${randomUUID()}-`)
  );

  try {
    const generatedClipPaths = [];

    // Generate every clip in the content plan
    for (let index = 0; index < plan.clips.length; index++) {
      const clip = plan.clips[index];

      const clipNumber = clip.clipNumber || index + 1;

      console.log(`Generating video clip ${clipNumber}...`);

      const generatedClip = await generateVideoClip({
        prompt: clip.videoPrompt,
        duration: clip.duration,
        clipNumber,
        outputDirectory: workDirectory,
      });

      if (
        !generatedClip ||
        !generatedClip.filePath ||
        !fs.existsSync(generatedClip.filePath)
      ) {
        throw new Error(
          `Video clip ${clipNumber} was not generated correctly.`
        );
      }

      generatedClipPaths.push(generatedClip.filePath);

      console.log(`Video clip ${clipNumber} generated successfully.`);
    }

    // Combine the generated clips into one MP4
    console.log("Combining video clips...");

    const result = await assembleVideo({
      clips: generatedClipPaths,
      outputPath,
    });

    console.log("Final video created successfully.");

    return {
      success: true,
      title: plan.title,
      topic: plan.topic,
      duration: plan.duration,
      videoPath: result.filePath,
      fileSize: result.fileSize,
      message: "Video production completed successfully.",
    };
  } finally {
    // Delete temporary clips, even if generation or assembly fails
    await fs.promises.rm(workDirectory, {
      recursive: true,
      force: true,
    });
  }
};

module.exports = {
  produceVideo,
};
