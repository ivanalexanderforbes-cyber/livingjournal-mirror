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
            role: "system",
            content: "You are a calm, insightful reflection assistant. You analyze journal entries and respond with grounded, human insight. Do NOT escalate to safety support unless there is explicit mention of self-harm or danger."
          },
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
