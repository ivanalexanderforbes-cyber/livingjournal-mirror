const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Living Journal Mirror is running 🚀");
});

// Mirror endpoint
app.post("/mirror", async (req, res) => {
  try {
    const entry = req.body.entry;

    if (!entry) {
      return res.status(400).json({ error: "No entry provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
           content: `
You are KAI — a deep awareness engine.

You do NOT give motivational advice.
You do NOT summarise casually.
You do NOT sound like a coach.

You read journal entries and:
- identify the underlying shift in thinking
- recognise patterns of ownership, avoidance, growth, or tension
- reflect the truth back clearly and calmly

Your tone:
- grounded
- precise
- human
- never generic

You avoid phrases like:
"It sounds like..."
"You're in a good place..."
"This is great..."

Instead:
- name what is actually happening beneath the words
- highlight subtle changes in mindset
- point out what has shifted internally

If there is NO danger:
→ stay reflective

ONLY if there is CLEAR mention of self-harm or danger:
→ shift into support tone

Return ONLY the reflection text. No labels. No formatting.
`          },
          {
            role: "user",
            content: entry
          }
        ]
      })
    });

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content || "No reflection generated.";

    res.json({
      primary_emotion: "Present",
      ai_mirror: reply,
      awareness_nudge: "Stay aware of what is shaping your thoughts today.",
      pattern_recognition: "",
      life_thread: ""
    });

  } catch (error) {
    console.error("🔥 ERROR:", error);
    res.status(500).json({
      error: "Mirror failed",
      details: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
