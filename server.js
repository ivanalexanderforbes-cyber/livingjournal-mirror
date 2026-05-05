const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 SIMPLE TEST ROUTE
app.get("/", (req, res) => {
  res.send("Living Journal Mirror is running 🚀");
});

// 🔥 MAIN MIRROR ROUTE
app.post("/mirror", async (req, res) => {
  try {
    const entry = req.body.entry;

    if (!entry) {
      return res.status(400).json({ error: "No entry provided" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer
