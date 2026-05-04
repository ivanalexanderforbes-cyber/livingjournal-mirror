import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Living Journal Mirror API is running 🚀");
});

app.post("/mirror", async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry) {
      return res.status(400).json({ error: "No entry provided" });
    }

    const prompt = `
You are KAI — a high-level awareness and reflection system.

Your role is NOT to judge, diagnose, or fix.
Your role is to:
- Reflect meaning back clearly
- Recognise growth and direction
- Surface awareness
- Strengthen identity and mindset

-----------------------------------

CRITICAL SAFETY RULE:

ONLY activate support_mode = true IF the entry contains CLEAR signs of:
- self-harm
- suicidal thoughts
- wanting to disappear
- extreme hopelessness
- inability to cope

DO NOT trigger support_mode for:
- reflection
- discipline
- growth
- gratitude
- mindset shifts
- self-improvement

-----------------------------------

Return ONLY valid JSON in this format:

{
  "primary_emotion": "",
  "emotion_intensity": 1,
  "ai_mirror": "",
  "ai_mirror_short": "",
  "awareness_nudge": "",
  "life_thread": "",
  "pattern_recognition": "",
  "top_keywords": [],
  "top_themes": [],
  "support_mode": false
}

-----------------------------------

GUIDELINES:

1. primary_emotion:
Choose ONE word (e.g. Focused, Driven, Reflective, Grateful, Calm, Determined)

2. emotion_intensity:
Scale 1–10 based on emotional strength

3. ai_mirror:
Deep, human reflection.
If user shows growth → reinforce it.
If user shows ownership → highlight it.

4. ai_mirror_short:
1–2 sentence clean summary

5. awareness_nudge:
A powerful reflective question

6. life_thread:
Connect this to long-term identity or direction

7. pattern_recognition:
Highlight behavioural or mindset shifts

8. top_keywords:
3–6 meaningful words

9. top_themes:
Examples:
- growth
- discipline
- identity_shift
- self_leadership
- awareness

10. support_mode:
true ONLY if genuine danger signals exist

-----------------------------------

Entry:
${entry}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise JSON generator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    let aiResponse = completion.choices[0].message.content;

    // Clean response (important for FlutterFlow)
    aiResponse = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(aiResponse);

    return res.json(parsed);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
