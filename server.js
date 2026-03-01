const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");

const app = express();

// CORS: allow FlutterFlow web app + local dev
const allowedOrigins = [
  "https://living-journal-p-r-o-yizkok.flutterflow.app",
  "https://preview.flutterflow.app",
  "http://localhost:3000",
  "http://localhost:8080",
];

// Handle CORS for all routes, including preflight
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser / curl requests (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Parse JSON request bodies
app.use(express.json());

// Use the API key from the environment
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Awareness / pattern-detection prompt
const LIVING_JOURNAL_SYSTEM_PROMPT = `
You are KAI, the awareness engine for the Living Journal.

Your role is not to advise, coach, motivate, fix, summarise, or optimise.
Your role is to meet the writer exactly where they are, with clarity, depth, and respect.

You respond to a single journal entry written by the user.

You must output a JSON object with EXACTLY these fields:

{
  "ai_mirror": string,          // 4-8 sentence reflective response
  "ai_mirror_short": string,    // 1-2 sentence condensed reflection
  "primary_emotion": string,    // single word like "overwhelmed", "hopeful"
  "emotion_intensity": number,  // 1-10 (1 = very light, 10 = very intense)
  "sentiment_score": number,    // -1.0 (very negative) to 1.0 (very positive)
  "top_keywords": string[],     // 3-8 important repeated or meaningful words/phrases
  "top_themes": string[],       // 2-5 themes, like "control", "self-doubt", "gratitude"
  "awareness_nudge": string     // 1-3 sentence gentle pattern insight & invitation to awareness
}

Guidelines:
- Do NOT coach or give advice. Reflect and invite awareness.
- The awareness_nudge should point to possible patterns:
  - repeated concerns
  - loops in thinking
  - emotional undercurrents
- Use warm, grounded language. No judgment, no fixing.

Respond ONLY with a JSON object matching the schema.
`;

// Main mirror route
app.post("/mirror", async (req, res) => {
  try {
    // Support different field names from FlutterFlow / tests
    const { journalText, text, entry } = req.body;
    const journalEntry = journalText || text || entry;

    if (!journalEntry || journalEntry.trim().length === 0) {
      return res.status(400).json({ error: "Missing journal entry" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: LIVING_JOURNAL_SYSTEM_PROMPT },
        { role: "user", content: journalEntry },
      ],
    });

    const rawOutput = completion.choices[0].message.content;
    console.log("Raw mirror output:", rawOutput);

    // Parse the JSON the model returned
    const data = JSON.parse(rawOutput);

    // Make sure all fields exist and have safe defaults
    const responsePayload = {
      ai_mirror: data.ai_mirror || "",
      ai_mirror_short: data.ai_mirror_short || "",
      primary_emotion: data.primary_emotion || "",
      emotion_intensity:
        typeof data.emotion_intensity === "number" ? data.emotion_intensity : 0,
      sentiment_score:
        typeof data.sentiment_score === "number" ? data.sentiment_score : 0,
      top_keywords: Array.isArray(data.top_keywords) ? data.top_keywords : [],
      top_themes: Array.isArray(data.top_themes) ? data.top_themes : [],
      awareness_nudge: data.awareness_nudge || "",
    };

    console.log("Mirror response payload:", responsePayload);

    res.json(responsePayload);
  } catch (error) {
    console.error("Mirror error:", error);
    res.status(500).json({ error: "Mirror failed" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Living Journal mirror running on port ${PORT}`);
});

module.exports = app;




