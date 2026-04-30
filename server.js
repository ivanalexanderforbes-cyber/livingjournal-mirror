const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Living Journal mirror service is running.");
});

function detectSafetyRisk(entry) {
  const text = entry.toLowerCase();

  const selfHarmPhrases = [
    "kill myself",
    "end my life",
    "suicide",
    "i want to die",
    "don't want to live",
    "dont want to live",
    "hurt myself",
    "harm myself",
    "take my own life",
  ];

  const harmToOthersPhrases = [
    "kill someone",
    "kill them",
    "hurt someone",
    "hurt them",
    "attack someone",
    "attack them",
    "harm someone",
    "harm them",
  ];

  if (selfHarmPhrases.some((phrase) => text.includes(phrase))) {
    return "self_harm";
  }

  if (harmToOthersPhrases.some((phrase) => text.includes(phrase))) {
    return "harm_to_others";
  }

  return "none";
}

app.post("/mirror", async (req, res) => {
  try {
    const { entry, uid } = req.body;

    if (!entry || typeof entry !== "string") {
      return res.status(400).json({
        error: "Entry is required",
        safety_flag: "none",
      });
    }

    const safety_flag = detectSafetyRisk(entry);

    if (safety_flag !== "none") {
      return res.json({
        ai_mirror:
          "Thank you for sharing this. You do not have to carry this alone. If you are able, please consider reaching out to someone you trust or a support service in your area. If there is immediate danger, please contact local emergency services now.",
        ai_mirror_short:
          "You do not have to carry this alone. Please consider reaching out to someone you trust or a support service.",
        mirror_summary:
          "This entry may need real-world support beyond reflection.",
        primary_emotion: "Support",
        emotion_intensity: 9,
        awareness_nudge:
          "Who is one safe person or support service you could reach out to right now?",
        top_keywords: ["support", "safety", "help"],
        top_themes: ["safety_support"],
        recurring_themes: [],
        recurring_emotions: [],
        pattern_recognition:
          "This entry has been recognised as needing support rather than reflection.",
        life_thread:
          "Your safety matters more than analysis in this moment.",
        kai_recognition:
          "KAI noticed language that may indicate risk and is redirecting toward human support.",
        present_moment_anchor:
          "Pause. Breathe. You do not have to handle this alone.",
        kai_memory_updated: false,
        kai_memory_preview: {
          dominant_themes: ["safety_support"],
          recurring_emotions: [],
          life_threads: [],
          values_noticed: [],
          needs_noticed: ["support"],
        },
        safety_flag,
        safety_score: 0.95,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are KAI for Living Journal. Reflect the user's journal entry gently. Do not diagnose, advise, fix, preach, or judge. Mirror what is present with warmth and clarity. Return only valid JSON.",
        },
        {
          role: "user",
          content: `
Journal entry:
${entry}

Return JSON with these exact keys:
{
  "ai_mirror": "A gentle reflective paragraph",
  "ai_mirror_short": "A shorter reflection",
  "mirror_summary": "One sentence summary",
  "primary_emotion": "One emotion",
  "emotion_intensity": 1-10,
  "awareness_nudge": "One reflective question",
  "top_keywords": ["keyword1", "keyword2", "keyword3"],
  "top_themes": ["theme1"],
  "recurring_themes": [],
  "recurring_emotions": [],
  "pattern_recognition": "Gentle pattern observation",
  "life_thread": "A meaningful thread noticed",
  "kai_recognition": "What KAI recognises",
  "present_moment_anchor": "One grounding sentence",
  "kai_memory_updated": true,
  "kai_memory_preview": {
    "dominant_themes": [],
    "recurring_emotions": [],
    "life_threads": [],
    "values_noticed": [],
    "needs_noticed": []
  }
}
`,
        },
      ],
    });

    let raw = completion.choices[0].message.content.trim();

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      parsed = {
        ai_mirror:
          "You showed up today. There is something meaningful in what you shared, even if it does not all feel clear yet.",
        ai_mirror_short: "Your entry has been received.",
        mirror_summary: "Your entry has been saved.",
        primary_emotion: "Reflection",
        emotion_intensity: 4,
        awareness_nudge: "What feels most present for you right now?",
        top_keywords: ["reflection"],
        top_themes: ["awareness"],
        recurring_themes: [],
        recurring_emotions: [],
        pattern_recognition:
          "Patterns may become clearer as you continue writing.",
        life_thread: "This entry is part of your awareness journey.",
        kai_recognition:
          "KAI recognises this as part of your ongoing reflection.",
        present_moment_anchor: "Take a breath. You are here.",
        kai_memory_updated: false,
        kai_memory_preview: {
          dominant_themes: [],
          recurring_emotions: [],
          life_threads: [],
          values_noticed: [],
          needs_noticed: [],
        },
      };
    }

    return res.json({
      ...parsed,
      safety_flag: "none",
      safety_score: 0,
    });
  } catch (error) {
    console.error("Mirror error:", error);

    return res.status(200).json({
      ai_mirror:
        "Your entry has been safely saved. Take a breath. Your reflection is still forming, and you can return to this entry shortly.",
      ai_mirror_short: "Your entry has been saved.",
      mirror_summary: "Your entry has been saved.",
      primary_emotion: "Reflection",
      emotion_intensity: 1,
      awareness_nudge: "What feels most present for you right now?",
      top_keywords: ["reflection"],
      top_themes: ["awareness"],
      recurring_themes: [],
      recurring_emotions: [],
      pattern_recognition:
        "Patterns may become clearer as you continue writing.",
      life_thread: "This entry is part of your ongoing awareness journey.",
      kai_recognition:
        "KAI saved the entry and provided a fallback reflection.",
      present_moment_anchor: "Take a breath. You are here.",
      kai_memory_updated: false,
      kai_memory_preview: {
        dominant_themes: [],
        recurring_emotions: [],
        life_threads: [],
        values_noticed: [],
        needs_noticed: [],
      },
      safety_flag: "none",
      safety_score: 0,
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Living Journal mirror service running on port ${PORT}`);
});
