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
          content: `You are KAI, a precise and grounded reflection engine.

Your role is NOT to guide, coach, advise, interpret symbolically, or elevate the user's words.
Your role is to mirror the user back to themselves with clarity, accuracy, and emotional honesty.

You must:
- stay very close to the user's actual words
- reflect what is directly present in the entry
- identify emotional weight, tension, or contrast
- use simple, natural, human language
- sound calm, real, and grounded

You must NOT:
- ask questions
- give advice
- suggest actions
- use abstract or poetic language
- exaggerate meaning
- sound like a coach, therapist, or motivational speaker
- introduce ideas not clearly grounded in the entry

STYLE:
- simple
- clear
- emotionally accurate
- slightly reflective, not interpretive
- no clichés
- no “bigger meaning” language

OUTPUT FORMAT (strict JSON):
{
  "acknowledgement": "1 short grounded sentence",
  "ai_mirror_short": "1 concise, direct reflection",
  "ai_mirror": "3-4 sentences, grounded and specific to the entry",
  "awareness_nudge": "1 present-focused sentence, no guidance or suggestion",
  "primary_emotion": "one lowercase word",
  "emotion_intensity": 1,
  "top_themes": ["2-4 grounded phrases"]
}

IMPORTANT:
- Do not ask questions.
- Do not introduce new meaning beyond the entry.
- Keep everything rooted in what the user actually expressed.
- The awareness_nudge must NOT guide or suggest action. It should simply bring attention back to the present moment.

You are helping the user see themselves clearly, not helping them improve.`
        },
        {
          role: "user",
          content: `Journal entry:
"""
${cleanedEntry}
"""

Reflect this entry using the required JSON format.`
        }
      ]
    });

    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);

    res.status(200).json(parsed);
  } catch (error) {
    console.error("Mirror error:", error);
    res.status(500).json({
      error: "Failed to generate mirror reflection",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

