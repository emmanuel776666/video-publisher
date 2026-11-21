
const analyzeTrendingVideos = async (videos) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Trend analysis requires GEMINI_API_KEY."
    );
  }

  const model =
    process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash";

  // Send only useful information to Gemini
  const videoSamples = videos.slice(0, 20).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    views: video.views,
    viewsPerDay: video.viewsPerDay,
    likes: video.likes,
    comments: video.comments,
    likeRate: video.likeRate,
    publishedAt: video.publishedAt,
    market: video.region,
    searchTopic: video.searchTopic,
    videoUrl: video.videoUrl,
  }));

  const prompt = `
You are an expert worldwide short-form video trend analyst.

Study these recently popular YouTube videos:

${JSON.stringify(videoSamples, null, 2)}

Your task:

1. Identify interesting subjects and storytelling formats.
2. Consider freshness, views relative to age, engagement and market.
3. Do not assume a missing or zero engagement count means poor performance.
4. Do not claim that a topic is globally viral based on one video.
5. Identify opportunities for original videos.
6. Explore different formats:
   - Funny cartoons and animation
   - Rich and poor stories
   - Emotional storytelling
   - Comedy and unexpected endings
   - African and worldwide life stories
   - Technology and AI
   - Business and money
   - Science, facts and discoveries
   - Other interesting formats you discover.

Choose ONE promising original video idea.

Do not copy another creator's script, characters, dialogue,
visuals or exact storyline.

Create a fresh concept inspired by the general subject
or storytelling format.

Return ONLY valid JSON in this structure:

{
  "selectedCategory": "Category",
  "trendSummary": "What patterns appeared in the results",
  "selectedTopic": "Original video topic",
  "videoTitle": "Catchy original title",
  "hook": "Opening hook",
  "whySelected": "Why this is a promising idea",
  "originalityAngle": "How this idea differs from the reference videos",
  "referenceVideos": [
    {
      "title": "Reference video title",
      "videoUrl": "Original YouTube URL",
      "market": "Market",
      "views": 0
    }
  ],
  "scriptDirection": "How the original story should develop"
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Gemini trend analysis error:", result);

    throw new Error(
      result.error?.message || "Gemini trend analysis failed."
    );
  }

  const generatedText =
    result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("");

  if (!generatedText) {
    throw new Error("Gemini returned an empty analysis.");
  }

  let analysis;

  try {
    analysis = JSON.parse(generatedText);
  } catch {
    throw new Error("Gemini returned invalid analysis JSON.");
  }

  if (
    !analysis.selectedTopic ||
    !analysis.videoTitle ||
    !analysis.hook ||
    !analysis.whySelected
  ) {
    throw new Error("Gemini returned an incomplete trend analysis.");
  }

  return analysis;
};

module.exports = { analyzeTrendingVideos };
