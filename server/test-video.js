
require("dotenv").config();

const path = require("path");
const { generateVideoClip } = require("./video/videoGenerator");

async function testVideo() {
  try {
    console.log("Starting Gemini video test...");

    const result = await generateVideoClip({
      prompt:
        "A cinematic lighthouse standing beside a stormy ocean at sunset. Waves crash against the rocks, dramatic clouds move across the sky, realistic lighting and smooth camera movement.",
      duration: 5,
      clipNumber: 1,
      outputDirectory: path.join(__dirname, "test-output"),
    });

    console.log("\nVIDEO GENERATED SUCCESSFULLY!");
    console.log("File:", result.filePath);
    console.log("Size:", result.fileSize, "bytes");
  } catch (error) {
    console.error("\nVIDEO TEST FAILED:");
    console.error(error.message);
  }
}

testVideo();
