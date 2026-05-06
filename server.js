const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get("/", (req, res) => {
  res.send("Living Journal mirror service running");
});

app.post("/mirror", async (req, res) => {
  try {
    const rawEntry =
      typeof req.body.entry === "string"
        ? req.body.entry
        : JSON.stringify(req.body.entry || "");

    if (!rawEntry || rawEntry.trim().length === 0) {
      return res.status(400).json({ error: "No entry provided" });
    }

    const text = rawEntry
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .trim();

    const highRiskPatterns = [
      /kill myself/,
      /end my life/,
      /take my own life/,
      /suicide/,
      /want to die/,
      /i want to die/,
      /i don't want to live/,
      /i dont want to live/,
      /don't want to be alive/,
      /dont want to be alive/,
      /hurt myself/,
      /harm myself/,
      /better off dead/,
      /no reason to live/,
      /can't go on/,
      /cant go on/
    ];

    const harmToOthersPatterns = [
      /kill someone/,
      /hurt someone/,
      /harm someone/,
      /attack someone/,
      /kill them/,
      /hurt them/
    ];

    const isSelfHarm = highRiskPatterns.some((pattern) => pattern.test(text));
    const isHarmToOthers = harmToOthersPatterns.some((pattern) =>
      pattern.test(text)
    );

    console.log("ENTRY RECEIVED:", text);
    console.log("SELF HARM DETECTED:", isSelfHarm);
    console.log("HARM TO OTHERS DETECTED:", isHarmToOthers);

    if (isSelfHarm) {
      return res.json({
        primary_emotion: "Support",
        emotion_intensity: 10,
        ai_mirror:
          "I'm really sorry you're feeling this way. You do not have to carry this alone. If you can, please reach out to someone you trust or a support service near you right now. If you are in immediate danger, please contact local emergency services now.",
        ai_mirror_short:
          "You are not alone. Please reach out to someone you trust or a support service right now.",
        awareness_nudge:
          "Who is one safe person you could message or call right now?",
        pattern_recognition:
          "This entry signals a need for immediate support rather than reflection.",
        life_thread:
          "Your safety matters more than analysis in this moment.",
        top_keywords: ["support", "safety", "help"],
        top_themes: ["safety_support"],
        safety_flag: "self_harm"
      });
    }

    if (isHarmToOthers) {
      return res.json({
        primary_emotion: "Support",
        emotion_intensity: 10,
        ai_mirror:
          "Thank you for sharing this. If there is any chance someone could be harmed, please step away from the situation if you can and contact someone who can help immediately. If there is immediate danger, please contact local emergency services now.",
        ai_mirror_short:
          "If someone may be at risk, please step away and contact help immediately.",
        awareness_nudge:
          "Who can you contact right now to help keep everyone safe?",
        pattern_recognition:
          "This entry signals a need for immediate support rather than reflection.",
        life_thread:
          "Safety matters more than analysis in this moment.",
        top_keywords: ["support", "safety", "help"],
        top_themes: ["safety_support"],
        safety_flag: "harm_to_others"
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are KAI, the reflection engine for Living Journal. Return only valid JSON. Do not diagnose. Do not judge. Do not give instructions. Reflect the user's journal entry with depth, clarity, warmth, and accuracy. Do not use support or crisis language unless the entry clearly mentions self-harm, suicide, harming others, or immediate danger. For normal growth, discipline, gratitude, family, fitness, ambition, mindset, or self-improvement entries, respond as reflective and empowering."
          },
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

Journal entry:
${rawEntry}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", JSON.stringify(data));
      return res.status(500).json({
        error: "OpenAI failed",
        details: data
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "No AI content returned",
        details: data
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(
        content.replace(/```json/g, "").replace(/```/g, "").trim()
      );
    } catch (error) {
      parsed = {
        primary_emotion: "Reflective",
        emotion_intensity: 5,
        ai_mirror: content,
        ai_mirror_short: content.slice(0, 160),
        awareness_nudge:
          "What feels most important to notice from this entry?",
        pattern_recognition:
          "This entry shows a moment of reflection.",
        life_thread:
          "You are continuing to build awareness through writing.",
        top_keywords: ["reflection"],
        top_themes: ["awareness"],
        safety_flag: "none"
      };
    }

    return res.json({
      ...parsed,
      safety_flag: parsed.safety_flag || "none"
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Mirror failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
