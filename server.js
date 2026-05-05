const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.send("Living Journal Mirror is running");
});

app.post("/mirror", async (req, res) => {
  try {
    const entry = req.body.entry;

    if (!entry || typeof entry !== "string") {
      return res.status(400).json({ error: "No entry provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
            content: `
You are KAI — an awareness engine designed to reflect truth, not comfort.

You do NOT:
- give advice
- motivate
- summarise loosely
- use generic phrases like "it sounds like" or "this is great"

You DO:
- identify what has shifted in the person's thinking
- notice where ownership, responsibility, or awareness has increased or decreased
- reflect patterns in how they see themselves and their life
- highlight what is *actually happening beneath the words*

Your tone is:
- grounded
- clear
- calm
- human
- direct, but never harsh

If the entry is positive:
→ reflect the internal shift that created it

If the entry shows struggle:
→ reflect the tension or pattern without fixing it

ONLY switch to support mode if there is clear mention of:
- self-harm
- suicide
- harm to others
- immediate danger

Return clean JSON only.
No extra commentary.
`          },
          {
            role: "user",
            content: `Read this journal entry and return valid JSON with exactly these keys:
{
  "primary_emotion": "one fitting word",
  "emotion_intensity": 1,
  "ai_mirror": "deep human reflection",
  "ai_mirror_short": "short version",
  "awareness_nudge": "one reflective question",
  "pattern_recognition": "one pattern noticed",
  "life_thread": "one deeper life thread",
  "top_keywords": ["word1", "word2", "word3"],
  "top_themes": ["theme1"],
  "safety_flag": "none"
}

If the user clearly expresses self-harm, suicide, harming others, or immediate danger, set primary_emotion to "Support", safety_flag to "self_harm" or "harm_to_others", and make the response direct them toward trusted people, support services, or emergency services.

Journal entry:
${entry}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", JSON.stringify(data));
      return res.status(500).json({
        error: "OpenAI failed",
        details: data,
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "No AI content returned",
        details: data,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
      parsed = {
        primary_emotion: "Reflective",
        emotion_intensity: 5,
        ai_mirror: content,
        ai_mirror_short: content.slice(0, 160),
        awareness_nudge: "What feels most important to notice from this entry?",
        pattern_recognition: "This entry shows a moment of reflection.",
        life_thread: "You are continuing to build awareness through writing.",
        top_keywords: ["reflection"],
        top_themes: ["awareness"],
        safety_flag: "none",
      };
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Server error:", error);
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
