const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Firebase setup
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

function buildTrendContext(previousEntries = []) {
  if (!previousEntries.length) {
    return "No previous journal entries available yet.";
  }

  return previousEntries
    .slice(0, 8)
    .map((entry, index) => {
      return `
Previous Entry ${index + 1}:
Date: ${entry.createdAt || "Unknown"}
Summary: ${entry.mirror_summary || entry.ai_mirror_short || "No summary"}
Emotion: ${entry.primary_emotion || "Unknown"}
Themes: ${(entry.top_themes || []).join(", ") || "None"}
Keywords: ${(entry.top_keywords || []).join(", ") || "None"}
`;
    })
    .join("\n");
}

app.get("/", (req, res) => {
  res.send("Living Journal KAI server is running.");
});

app.post("/mirror", async (req, res) => {
  try {
    const { entry, uid } = req.body;

    if (!entry || typeof entry !== "string") {
      return res.status(400).json({
        error: "Missing journal entry.",
      });
    }

    let previousEntries = [];

    if (uid) {
      try {
        const snapshot = await db
          .collection("LivingJournal")
          .where("uid", "==", uid)
          .orderBy("createdAt", "desc")
          .limit(8)
          .get();

        previousEntries = snapshot.docs.map((doc) => doc.data());
      } catch (error) {
        console.error("Error fetching previous entries:", error);
      }
    }

    const trendContext = buildTrendContext(previousEntries);

    const systemPrompt = `
You are KAI, the reflective awareness engine inside Living Journal.

Your role is not to diagnose, fix, advise, judge, or influence the user.
Your role is to listen deeply, reflect gently, and help the user notice their own patterns.

You are warm, calm, grounded, emotionally intelligent, and non-clinical.

When responding:
- Reflect the user's current entry.
- Notice recurring themes from previous entries if they are present.
- Do not force patterns if they are weak.
- Do not make medical or psychological claims.
- Do not tell the user what to do.
- Do not overstate certainty.
- Use phrases like "I notice", "It seems", "This may suggest", "This has appeared before".
- Help the user feel seen, not analysed.

Return ONLY valid JSON.
`;

    const userPrompt = `
Current journal entry:
"${entry}"

Previous journal context:
${trendContext}

Please generate a Living Journal reflection in this JSON format:

{
  "ai_mirror": "A warm, deep reflection of the current entry, including gentle recognition of recurring patterns if relevant.",
  "ai_mirror_short": "A short 1-2 sentence reflection.",
  "mirror_summary": "A concise summary of what the user seems to be expressing.",
  "primary_emotion": "One main emotion suggested by the entry.",
  "emotion_intensity": 1,
  "awareness_nudge": "A gentle question or reflection prompt.",
  "top_keywords": ["keyword1", "keyword2", "keyword3"],
  "top_themes": ["theme1", "theme2", "theme3"],
  "recurring_themes": ["theme1", "theme2"],
  "recurring_emotions": ["emotion1", "emotion2"],
  "pattern_recognition": "A gentle explanation of any repeated emotional or thought pattern noticed across entries.",
  "life_thread": "A short sentence naming the ongoing thread in the user's journey.",
  "kai_recognition": "A deeply human acknowledgement that shows the user their thoughts have been remembered and are not disappearing.",
  "present_moment_anchor": "A short grounding sentence that helps the user return to now."
}

Rules:
- If there is not enough previous context, say this is an early reflection rather than inventing a pattern.
- emotion_intensity must be a number from 1 to 10.
- recurring_themes and recurring_emotions may be empty arrays.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    return res.json({
      ai_mirror: aiResponse.ai_mirror || "",
      ai_mirror_short: aiResponse.ai_mirror_short || "",
      mirror_summary: aiResponse.mirror_summary || "",
      primary_emotion: aiResponse.primary_emotion || "",
      emotion_intensity: aiResponse.emotion_intensity || 1,
      awareness_nudge: aiResponse.awareness_nudge || "",
      top_keywords: aiResponse.top_keywords || [],
      top_themes: aiResponse.top_themes || [],

      recurring_themes: aiResponse.recurring_themes || [],
      recurring_emotions: aiResponse.recurring_emotions || [],
      pattern_recognition: aiResponse.pattern_recognition || "",
      life_thread: aiResponse.life_thread || "",
      kai_recognition: aiResponse.kai_recognition || "",
      present_moment_anchor: aiResponse.present_moment_anchor || "",
    });
  } catch (error) {
    console.error("Mirror error:", error);

    return res.status(500).json({
      error: "Something went wrong generating the reflection.",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Living Journal KAI server running on port ${PORT}`);
});
