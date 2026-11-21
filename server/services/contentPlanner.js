
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Generate a structured video plan using Gemini
const generateContentPlan = async ({
  category = "Trending topics",
  duration = 20,
  topic = "",
  script = "",
  trendAnalysis = null,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Add GEMINI_API_KEY to your server .env file."
    );
  }

  const model =
    process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash";

  const videoDuration = Number(duration);

  if (![20, 30].includes(videoDuration)) {
    throw new Error("Video duration must be 20 or 30 seconds.");
  }

  // Use 10-second clips for the production plan
  const clipDuration = 10;
  const numberOfClips = videoDuration / clipDuration;

  const selectedCategory =
    trendAnalysis?.selectedCategory || category;

  const manualTopic = topic.trim();
  const manualScript = script.trim();

  // Prepare instructions based on the generation mode
  let contentDirection;

  if (manualTopic) {
    contentDirection = `
MANUAL VIDEO MODE:

The user supplied this topic:
${manualTopic}

${manualScript ? `The user also supplied this script or story direction:\n${manualScript}` : "The user has not supplied a complete script."}

Use the user's topic as the main subject.
If a script was supplied, preserve its main meaning and important details.
You may improve its wording and structure for short-form video.
Do not replace the user's topic with an unrelated idea.
`;
  } else if (trendAnalysis) {
    contentDirection = `
TREND ANALYSIS:

Selected topic: ${trendAnalysis.selectedTopic || "Not provided"}
Suggested title: ${trendAnalysis.videoTitle || "Not provided"}
Opening hook: ${trendAnalysis.hook || "Not provided"}
Trend summary: ${trendAnalysis.trendSummary || "Not provided"}
Why selected: ${trendAnalysis.whySelected || "Not provided"}
Originality angle: ${trendAnalysis.originalityAngle || "Not provided"}
Script direction: ${trendAnalysis.scriptDirection || "Not provided"}

Reference videos:
${JSON.stringify(trendAnalysis.referenceVideos || [], null, 2)}

Use the trend analysis as inspiration for an ORIGINAL video.
Do not copy the reference videos.
`;
  } else {
    contentDirection = `
No manual topic or trend analysis was supplied.

Create an interesting, original topic suitable for the category.
Do not claim that the topic is currently trending without evidence.
`;
  }

  const prompt = `
You are a professional worldwide short-form video writer,
storyteller and AI video production planner.

YOUR TASK:

Create a complete, engaging and original short-form video plan.

VIDEO SETTINGS:

Category: ${selectedCategory}
Total duration: ${videoDuration} seconds
Number of clips: ${numberOfClips}
Duration of each clip: ${clipDuration} seconds

The finished video is intended for:
- Facebook
- YouTube Shorts
- TikTok

${contentDirection}

CONTENT REQUIREMENTS:

1. Create an attention-grabbing title.
2. Choose a clear and interesting topic.
3. Write a powerful opening hook.
4. Write one complete narration script.
5. Divide the narration naturally into exactly ${numberOfClips} clips.
6. Give every clip its own narration.
7. Give every clip a detailed visual description.
8. Give every clip a detailed AI video generation prompt.
9. Make the final clip provide a satisfying ending or payoff.

VIDEO QUALITY REQUIREMENTS:

- Capture attention within the first two seconds.
- Keep the story easy to understand.
- Give viewers a reason to watch until the end.
- Use natural, conversational narration.
- Use realistic cinematic visuals unless animation or another style better suits the subject.
- Describe camera movement, setting, lighting, characters, actions and visual style.
- Maintain consistent characters, clothing, locations and visual details throughout.
- Make each clip continue naturally from the previous clip.
- Avoid unnecessary scene changes.
- Do not use copyrighted characters.
- Do not copy another creator's exact story, script, dialogue or visuals.
- Do not invent news or unsupported factual claims.
- Make the narration for all clips combine into the complete narration script.
- Each clip must be exactly ${clipDuration} seconds.

Return ONLY valid JSON using this structure.
Do not include Markdown fences or explanations.

{
  "title": "Original video title",
  "topic": "Video topic",
  "category": "${selectedCategory}",
  "hook": "Opening hook",
  "narration": "Complete narration script",
  "duration": ${videoDuration},
  "clips": [
    {
      "clipNumber": 1,
      "duration": 10,
      "narration": "First clip narration",
      "visualDescription": "First scene description",
      "videoPrompt": "Detailed video generation prompt"
    }
  ]
}

The clips array must contain exactly ${numberOfClips} clips.
Number them consecutively, starting at 1.
`;

  // Send the request to Gemini
  const response = await fetch(
    `${GEMINI_API_URL}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(120000),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Gemini content planning error:", result);

    throw new Error(
      result.error?.message ||
      "Gemini could not generate the content plan."
    );
  }

  // Extract Gemini's generated text
  const generatedText =
    result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  if (!generatedText) {
    throw new Error("Gemini returned an empty content plan.");
  }

  // Convert the returned JSON text into an object
  let plan;

  try {
    plan = JSON.parse(generatedText);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  // Validate the generated video plan
  if (
    !plan.title ||
    !plan.topic ||
    !plan.hook ||
    !plan.narration ||
    !Array.isArray(plan.clips) ||
    plan.clips.length !== numberOfClips ||
    plan.clips.some(
      (clip, index) =>
        clip.clipNumber !== index + 1 ||
        !clip.videoPrompt ||
        !clip.visualDescription ||
        !clip.narration ||
        Number(clip.duration) !== clipDuration
    )
  ) {
    throw new Error("Gemini returned an incomplete video plan.");
  }

  // Keep the requested video settings consistent
  plan.duration = videoDuration;
  plan.category = selectedCategory;

  return plan;
};

module.exports = {
  generateContentPlan,
};
