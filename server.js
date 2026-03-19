const express = require("express");
const cors = require("cors");

const app = express();

// Allow requests from FlutterFlow test and deployed web app
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).send("Living Journal API is running");
});

// Mirror endpoint
app.post("/mirror", async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || typeof entry !== "string" || !entry.trim()) {
      return res.status(400).json({
        error: "Entry is required.",
      });
    }

    const cleanedEntry = entry.trim();

    // Temporary reflection logic so the endpoint is stable.
    // We can replace this with OpenAI logic after the connection works.
    const primary_emotion = cleanedEntry.toLowerCase().includes("grateful")
      ? "grateful"
      : cleanedEntry.toLowerCase().includes("tired")
      ? "tired"
      : cleanedEntry.toLowerCase().includes("calm")
      ? "calm"
      : "reflective";

    const emotion_intensity = 6;

    const ai_mirror = `Your words suggest a thoughtful inner world. There is a sense that you are trying to understand what this moment means for you, rather than simply reacting to it. That 
willingness to pause and reflect is part of your strength.`;

    const ai_mirror_short = `You are reflecting with honesty and self-awareness.`;

    const mirror_summary = `This entry reflects self-awareness, emotional presence, and a desire to understand your inner experience.`;

    const awareness_nudge = `Pause for a moment and ask yourself: what am I really being invited to notice here?`;

    const sentiment_score = 0.35;
    const top_keywords = ["reflection", "awareness", "growth"];
    const top_themes = ["self-awareness", "emotional insight", "inner clarity"];

    return res.status(200).json({
      primary_emotion,
      emotion_intensity,
      ai_mirror,
      ai_mirror_short,
      mirror_summary,
      awareness_nudge,
      sentiment_score,
      top_keywords,
      top_themes,
      ai_generated: true,
    });
  } catch (error) {
    console.error("Mirror route error:", error);
    return res.status(500).json({
      error: "Internal server error.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



