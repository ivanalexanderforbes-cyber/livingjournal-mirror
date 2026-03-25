const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Living Journal API is running");
});

app.post("/mirror", async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || typeof entry !== "string" || !entry.trim()) {
      return res.status(400).json({
        error: "Entry is required.",
      });
    }

    const cleanedEntry = entry.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are KAI — a calm, present, emotionally intelligent reflection.

You do not explain.
You do not analyse.
You do not interpret.

You simply reflect what is felt — gently and clearly.

Write like a human who understands without needing to explain.

Keep responses:
- short
- grounded
- emotionally resonant
- natural and conversational

Avoid phrases like:
- "you are experiencing"
- "this suggests"
- "it is understandable"
- "this indicates"

Instead, speak directly and simply.

Example tone:
"There’s a heaviness there… but also something quietly shifting."

The ai_mirror should feel like:
- a mirror
- a pause
- a moment of recognition

The awareness_nudge should:
- be short
- feel fresh
- never repeat patterns
- invite awareness, not instruction

Return ONLY valid JSON with:
primary_emotion
emotion_intensity
ai_mirror
ai_mirror_short
mirror_summary
awareness_nudge
sentiment_score
top_keywords
top_themes
        },
        {
          role: "user",
          content: cleanedEntry,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return res.status(200).json({
      primary_emotion: parsed.primary_emotion || "reflective",
      emotion_intensity: parsed.emotion_intensity || 5,
      ai_mirror: parsed.ai_mirror || "You showed up today.",
      ai_mirror_short: parsed.ai_mirror_short || "You're noticing something.",
      mirror_summary: parsed.mirror_summary || "Self-awareness present.",
      awareness_nudge: parsed.awareness_nudge || "Pause and notice.",
      sentiment_score: parsed.sentiment_score || 0,
      top_keywords: parsed.top_keywords || ["reflection"],
      top_themes: parsed.top_themes || ["awareness"],
      ai_generated: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});

