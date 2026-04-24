const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Firebase setup
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
privateKey: process.env.FIREBASE_PRIVATE_KEY
  ?.replace(/^"|"$/g, "")
  .replace(/\\n/g, "\n"),    }),
  });
}

const db = admin.firestore();

const JOURNAL_COLLECTION = "LivingJournal";
const MEMORY_COLLECTION = "KaiMemory";

app.get("/", (req, res) => {
  res.send("Living Journal KAI server is running.");
});

function safeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function cleanString(value) {
  if (typeof value === "string") return value.trim();
  return "";
}

function buildRecentEntriesContext(previousEntries = []) {
  if (!previousEntries.length) {
    return "No previous journal entries available yet.";
  }

  return previousEntries
    .slice(0, 10)
    .map((entry, index) => {
      const createdAt =
        entry.createdAt && entry.createdAt.toDate
          ? entry.createdAt.toDate().toISOString()
          : entry.createdAt || "Unknown";

      return `
Recent Entry ${index + 1}:
Date: ${createdAt}
Text: ${cleanString(entry.text).slice(0, 700) || "No entry text available"}
Summary: ${entry.mirror_summary || entry.ai_mirror_short || "No summary"}
Emotion: ${entry.primary_emotion || "Unknown"}
Intensity: ${entry.emotion_intensity || "Unknown"}
Themes: ${safeArray(entry.top_themes).join(", ") || "None"}
Keywords: ${safeArray(entry.top_keywords).join(", ") || "None"}
`;
    })
    .join("\n");
}

function buildMemoryContext(memory = null) {
  if (!memory) {
    return "No long-term KAI memory exists yet for this user.";
  }

  return `
Long-Term KAI Memory Profile:
Dominant themes: ${safeArray(memory.dominant_themes).join(", ") || "None yet"}
Recurring emotions: ${safeArray(memory.recurring_emotions).join(", ") || "None yet"}
Important people: ${safeArray(memory.important_people).join(", ") || "None yet"}
Important places: ${safeArray(memory.important_places).join(", ") || "None yet"}
Repeated questions: ${safeArray(memory.repeated_questions).join(" | ") || "None yet"}
Life threads: ${safeArray(memory.life_threads).join(" | ") || "None yet"}
Values noticed: ${safeArray(memory.values_noticed).join(", ") || "None yet"}
Needs noticed: ${safeArray(memory.needs_noticed).join(", ") || "None yet"}
Avoided patterns: ${safeArray(memory.avoidant_or_tension_patterns).join(" | ") || "None yet"}
Last updated: ${memory.last_updated || "Unknown"}
`;
}

function uniqueLimitedArray(items = [], max = 12) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    if (!item || typeof item !== "string") continue;

    const cleaned = item.trim();
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) continue;

    seen.add(key);
    output.push(cleaned);

    if (output.length >= max) break;
  }

  return output;
}

function mergeMemoryArrays(oldItems = [], newItems = [], max = 12) {
  return uniqueLimitedArray([...safeArray(newItems), ...safeArray(oldItems)], max);
}

function normalizeIntensity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(1, Math.round(number)));
}

async function getRecentEntries(uid) {
  const snapshot = await db
    .collection(JOURNAL_COLLECTION)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function getKaiMemory(uid) {
  const memoryRef = db.collection(MEMORY_COLLECTION).doc(uid);
  const memorySnap = await memoryRef.get();

  if (!memorySnap.exists) {
    return {
      ref: memoryRef,
      data: null,
    };
  }

  return {
    ref: memoryRef,
    data: memorySnap.data(),
  };
}

async function generateReflection({ entry, recentEntriesContext, memoryContext }) {
  const systemPrompt = `
You are KAI, the reflective awareness engine inside Living Journal.

You are not a therapist, doctor, coach, or advisor.
You do not diagnose, treat, prescribe, correct, manipulate, shame, or tell the user what to do.

Your role is to:
- Listen deeply.
- Reflect gently.
- Recognise recurring themes.
- Help the user see their own thoughts clearly.
- Keep important thoughts alive without forcing meaning.
- Support presence, awareness, and self-recognition.

Tone:
- Warm
- Calm
- Grounded
- Human
- Gentle
- Non-clinical
- Non-judgmental

Important language rules:
- Use "I notice", "It seems", "This may be", "There may be", "This has appeared before".
- Avoid certainty when identifying patterns.
- Never say "you always", "you are", "this means you have", or anything diagnostic.
- Never make medical, mental health, or psychological claims.
- Never push advice.
- Never tell the user what they must do.

Your job is to create a reflection that feels like the user has been heard and remembered.

Return ONLY valid JSON.
`;

  const userPrompt = `
Current journal entry:
"${entry}"

Recent journal context:
${recentEntriesContext}

Long-term KAI memory context:
${memoryContext}

Generate a Living Journal response in this exact JSON format:

{
  "ai_mirror": "A warm, deep reflection of the current entry. Include gentle recognition of recurring patterns if relevant, but do not force a pattern.",
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
  "present_moment_anchor": "A short grounding sentence that helps the user return to now.",

  "memory_update": {
    "dominant_themes": ["theme1", "theme2"],
    "recurring_emotions": ["emotion1", "emotion2"],
    "important_people": ["person1"],
    "important_places": ["place1"],
    "repeated_questions": ["question1"],
    "life_threads": ["thread1"],
    "values_noticed": ["value1"],
    "needs_noticed": ["need1"],
    "avoidant_or_tension_patterns": ["pattern1"],
    "memory_note": "A short private note summarising what KAI should remember gently for future reflections."
  }
}

Rules:
- emotion_intensity must be a number from 1 to 10.
- If there is not enough previous context, say this is an early reflection rather than inventing a pattern.
- recurring_themes and recurring_emotions may be empty arrays.
- important_people and important_places should only include clear names/places the user directly mentioned.
- Do not infer sensitive personal attributes.
- Keep memory_update gentle, useful, and non-diagnostic.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function updateKaiMemory({ uid, existingMemory, aiResponse }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const memoryUpdate = aiResponse.memory_update || {};

  const updatedMemory = {
    uid,

    dominant_themes: mergeMemoryArrays(
      existingMemory?.dominant_themes,
      memoryUpdate.dominant_themes,
      15
    ),

    recurring_emotions: mergeMemoryArrays(
      existingMemory?.recurring_emotions,
      memoryUpdate.recurring_emotions,
      12
    ),

    important_people: mergeMemoryArrays(
      existingMemory?.important_people,
      memoryUpdate.important_people,
      12
    ),

    important_places: mergeMemoryArrays(
      existingMemory?.important_places,
      memoryUpdate.important_places,
      12
    ),

    repeated_questions: mergeMemoryArrays(
      existingMemory?.repeated_questions,
      memoryUpdate.repeated_questions,
      12
    ),

    life_threads: mergeMemoryArrays(
      existingMemory?.life_threads,
      memoryUpdate.life_threads,
      12
    ),

    values_noticed: mergeMemoryArrays(
      existingMemory?.values_noticed,
      memoryUpdate.values_noticed,
      12
    ),

    needs_noticed: mergeMemoryArrays(
      existingMemory?.needs_noticed,
      memoryUpdate.needs_noticed,
      12
    ),

    avoidant_or_tension_patterns: mergeMemoryArrays(
      existingMemory?.avoidant_or_tension_patterns,
      memoryUpdate.avoidant_or_tension_patterns,
      12
    ),

    memory_note: cleanString(memoryUpdate.memory_note) || existingMemory?.memory_note || "",

    last_primary_emotion: cleanString(aiResponse.primary_emotion),
    last_emotion_intensity: normalizeIntensity(aiResponse.emotion_intensity),
    last_life_thread: cleanString(aiResponse.life_thread),
    last_pattern_recognition: cleanString(aiResponse.pattern_recognition),

    updated_entry_count: admin.firestore.FieldValue.increment(1),
    last_updated: now,
  };

  await db
    .collection(MEMORY_COLLECTION)
    .doc(uid)
    .set(updatedMemory, { merge: true });

  return updatedMemory;
}

app.post("/mirror", async (req, res) => {
  try {
    const { entry, uid } = req.body;

    if (!entry || typeof entry !== "string") {
      return res.status(400).json({
        error: "Missing journal entry.",
      });
    }

    if (!uid || typeof uid !== "string") {
      return res.status(400).json({
        error: "Missing user uid.",
      });
    }

    const recentEntries = await getRecentEntries(uid);
    const recentEntriesContext = buildRecentEntriesContext(recentEntries);

    const memoryResult = await getKaiMemory(uid);
    const memoryContext = buildMemoryContext(memoryResult.data);

    const aiResponse = await generateReflection({
      entry,
      recentEntriesContext,
      memoryContext,
    });

    const updatedMemory = await updateKaiMemory({
      uid,
      existingMemory: memoryResult.data,
      aiResponse,
    });

    return res.json({
      ai_mirror: cleanString(aiResponse.ai_mirror),
      ai_mirror_short: cleanString(aiResponse.ai_mirror_short),
      mirror_summary: cleanString(aiResponse.mirror_summary),
      primary_emotion: cleanString(aiResponse.primary_emotion),
      emotion_intensity: normalizeIntensity(aiResponse.emotion_intensity),
      awareness_nudge: cleanString(aiResponse.awareness_nudge),
      top_keywords: safeArray(aiResponse.top_keywords),
      top_themes: safeArray(aiResponse.top_themes),

      recurring_themes: safeArray(aiResponse.recurring_themes),
      recurring_emotions: safeArray(aiResponse.recurring_emotions),
      pattern_recognition: cleanString(aiResponse.pattern_recognition),
      life_thread: cleanString(aiResponse.life_thread),
      kai_recognition: cleanString(aiResponse.kai_recognition),
      present_moment_anchor: cleanString(aiResponse.present_moment_anchor),

      kai_memory_updated: true,
      kai_memory_preview: {
        dominant_themes: updatedMemory.dominant_themes || [],
        recurring_emotions: updatedMemory.recurring_emotions || [],
        life_threads: updatedMemory.life_threads || [],
        values_noticed: updatedMemory.values_noticed || [],
        needs_noticed: updatedMemory.needs_noticed || [],
      },
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
