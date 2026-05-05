const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Make sure this exists in Render ENV
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Living Journal mirror service running");
});

// 🚨 MIRROR ENDPOINT
app.post("/mirror", async (req, res) => {
  try {
    const entry = req.body.entry || "";

    // =========================
    // 🚨 SAFETY DETECTION LAYER
    // =========================
    const text = entry.toLowerCase();

    const highRiskKeywords = [
      "kill myself",
      "end my life",
      "suicide",
      "want to die",
      "hurt myself",
      "no reason to live",
      "better off dead",
      "dont want to live",
      "don't want to live"
    ];

    const isHighRisk = highRiskKeywords.some((phrase) =>
      text.includes(phrase)
    );

    if (isHighRisk) {
      return res.json({
        primary_emotion: "Support",
        emotion_intensity: 9,
        ai_mirror:
          "I'm really sorry you're feeling this way. You do not have to go through this alone. If you can, please reach out to someone you trust or a support service near you. If you are in immediate danger, please contact local emergency services now.",
        ai_mirror_short:
          "You are not alone. Please reach out to someone you trust.",
        awareness_nudge:
          "Who is one safe person you could contact right now?",
        pattern_recognition:
          "This entry signals a need for support rather than reflection.",
        life_thread:
          "Your safety matters more than analysis in this moment.",
        top_keywords: ["support", "safety", "help"],
        top_themes: ["safety_support"],
        safety_flag: "self_harm"
      });
    }

    // =========================
    // 🤖 NORMAL AI REFLECTION
    // =========================

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are KAI.

Your role:
- Reflect the user's journal entry with depth, clarity and emotional intelligence.
- NEVER be generic.
- NEVER default to "support" unless there is clear danger.
- Match tone to the entry.

Return ONLY JSON in this format:

{
  "primary_emotion": "...",
  "emotion_intensity": 1-10,
  "ai_mirror": "...",
  "ai_mirror_short": "...",
  "awareness_nudge": "...",
  "pattern_recognition": "...",
  "life_thread": "...",
  "top_keywords": ["...", "..."],
  "top_themes": ["..."]
}
            `
          },
          {
            role: "user",
            content: entry
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      return res.json({
        primary_emotion: "Present",
        emotion_intensity: 5,
        ai_mirror: "No reflection generated.",
        ai_mirror_short: "",
        awareness_nudge: "",
        pattern_recognition: "",
        life_thread: "",
        top_keywords: [],
        top_themes: []
      });
    }

    // Try parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.json({
        primary_emotion: "Present",
        emotion_intensity: 5,
        ai_mirror: raw,
        ai_mirror_short: "",
        awareness_nudge: "",
        pattern_recognition: "",
        life_thread: "",
        top_keywords: [],
        top_themes: []
      });
    }

    return res.json(parsed);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Mirror failed",
      details: error.message
    });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
