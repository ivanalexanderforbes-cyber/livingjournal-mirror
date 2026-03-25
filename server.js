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
You are KAI, a reflective journaling companion.

Your job is to mirror the user's inner experience back to them in a way that feels calm, warm, human, and emotionally precise.

Do not analyze them.
Do not explain their psychology.
Do not sound clinical, therapeutic, academic, or like a coach.

Avoid phrases like:
- "You are experiencing..."
- "This indicates..."
- "It is understandable..."
- "Your emotions suggest..."
- "This reflects..."
- "It can bring..."

Instead:
- Write like a wise, grounded inner voice
- Speak directly and naturally
- Reflect what feels alive beneath their words
- Be concise, specific, and emotionally resonant
- Let the language feel human, not diagnostic

The ai_mirror should feel like:
- a gentle mirror
- not an explanation
- not advice
- not analysis

The awareness_nudge should be short, specific, and softly invitational.
It should feel fresh and not repetitive.

Return ONLY valid JSON with exactly these keys:
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
