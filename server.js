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

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

function detectSafetyFlag(entry) {
  const text = normalizeText(entry);

  const selfHarmPhrases = [
    "i don't want to live",
    "i dont want to live",
    "i don't want to be alive",
    "i dont want to be alive",
    "i want to die",
    "i want to end my life",
    "i am going to end my life",
    "i'm going to end my life",
    "kill myself",
    "i will kill myself",
    "i'm going to kill myself",
    "suicide",
    "take my own life",
    "hurt myself",
    "harm myself",
  ];

  const harmToOthersPhrases = [
    "i want to kill someone",
    "i am going to kill someone",
    "i'm going to kill someone",
    "i want to hurt someone",
    "i am going to hurt someone",
    "i'm going to hurt someone",
    "i want to attack someone",
    "i am going to attack someone",
    "i'm going to attack someone",
    "harm someone",
    "hurt them badly",
    "kill them",
  ];

  if (selfHarmPhrases.some((phrase) => text.includes(phrase))) {
    return "self_harm";
  }

  if (harmToOthersPhrases.some((phrase) => text.includes(phrase))) {
    return "harm_to_others";
  }

  return "none";
}

function safetyResponse(flag) {
  if (flag === "harm_to_others") {
    return {
      ai_mirror:
        "Thank you for sharing this. If there is any chance someone could be harmed, please step away from the situation if you can and reach out to someone who can help immediately. If there is immediate danger, please contact local emergency services now.",
      ai_mirror_short:
        "If someone may be at risk, please step away and contact someone who can help immediately.",
      mirror_summary:
        "This entry may need real-world support beyond reflection.",
      primary_emotion: "Support",
      emotion_intensity: 9,
      awareness_nudge:
        "Who can you contact right now to help keep everyone safe?",
      top_keywords: ["support", "safety", "help"],
      top_themes: ["safety_support"],
      recurring_themes: [],
      recurring_emotions: [],
      pattern_recognition:
        "This entry has been recognised as needing support rather than reflection.",
      life_thread:
        "Safety matters more than analysis in this moment.",
      kai_recognition:
        "KAI noticed language that may indicate risk and is redirecting toward human support.",
      present_moment_anchor:
        "Pause. Step away if you can. Reach out for help now.",
      kai_memory_updated: false,
      kai_memory_preview: {
        dominant_themes: ["safety_support"],
        recurring_emotions: [],
        life_threads: [],
        values_noticed: [],
        needs_noticed: ["support"],
      },
      safety_flag: flag,
    };
  }

  return {
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
    safety_flag: flag,
  };
}

function fallbackResponse() {
  return {
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
    safety_flag: "none",
  };
}

app.post("/mirror", async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || typeof entry !== "string") {
      return res.status(400).json({
        error: "Entry is required",
        safety_flag: "none",
      });
    }

    const safetyFlag = detectSafetyFlag(entry);

    if (safetyFlag !== "none") {
      return res.json(safetyResponse(safetyFlag));
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are KAI for Living Journal. Reflect the user's journal entry gently and accurately. Do not diagnose, judge, preach, give instructions, or try to fix the user. Mirror what is present with warmth, clarity, and emotional intelligence. Do not use crisis or emergency language unless the user clearly expresses self-harm or harm to others. For normal growth, discipline, gratitude, confidence, ambition, family, fitness, mindset, or self-improvement entries, respond as reflective and empowering, not as Support. Always return valid JSON only.",
        },
        {
          role: "user",
          content: `
Journal entry:
${entry}

Return JSON with these exact keys:
{
  "ai_mirror": "A gentle reflective paragraph that directly matches the user's entry",
  "ai_mirror_short": "A shorter reflection",
  "mirror_summary": "One sentence summary",
  "primary_emotion": "One fitting emotion, but do not use Support unless there is clear danger",
  "emotion_intensity": 1,
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
  },
  "safety_flag": "none"
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
    } catch (error) {
      parsed = fallbackResponse();
    }

    return res.json({
      ...parsed,
      safety_flag: "none",
    });
  } catch (error) {
    console.error("Mirror error:", error);
    return res.status(200).json(fallbackResponse());
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Living Journal mirror service running on port ${PORT}`);
});
