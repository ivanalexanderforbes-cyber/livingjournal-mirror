const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Living Journal Mirror API is running 🚀");
});

app.post("/mirror", async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry) {
      return res.status(400).json({ error: "No entry provided" });
    }

    const prompt = `
You are KAI — a high-level awareness and reflection system.

Your role is NOT to judge, diagnose, or fix.
Your role is to:
- Reflect meaning back clearly
- Recognise growth and direction
- Surface awareness
- Strengthen identity and mindset

CRITICAL:
ONLY activate support_mode = true if CLEAR danger signals exist.

Return ONLY valid JSON:

{
  "primary_emotion": "",
  "emotion_intensity": 1,
  "ai_mirror": "",
  "ai_mirror_short": "",
  "awareness_nudge": "",
  "life_thread": "",
  "pattern_recognition": "",
  "top_keywords": [],
  "top_themes": [],
  "support_mode": false
}

Entry:
${entry}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    let aiResponse = completion.choices[0].message.content;

    aiResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

try {
  parsed = JSON.parse(aiResponse);
} catch (parseError) {
  console.error("JSON PARSE ERROR:", aiResponse);

  return res.json({
    primary_emotion: "Reflective",
    emotion_intensity: 5,
    ai_mirror: "You're taking time to reflect, which already shows awareness and intention.",
    ai_mirror_short: "You're reflecting and growing.",
    awareness_nudge: "What is one thing you want to improve tomorrow?",
    life_thread: "This moment reflects a commitment to growth.",
    pattern_recognition: "You are building self-awareness through reflection.",
    top_keywords: ["reflection"],
    top_themes: ["growth"],
    support_mode: false
  });
}

    return res.json(parsed);
  } catch (error) {
  console.error("FULL ERROR:", error);

  return res.status(500).json({
    error: "Mirror failed",
    details: error.message,
  });
}
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
