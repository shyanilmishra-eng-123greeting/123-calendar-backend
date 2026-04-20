require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ==============================
// ✅ Twilio Setup
// ==============================
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ==============================
// ✅ WhatsApp Route
// ==============================
app.post("/send-whatsapp", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.json({ success: false, error: "Phone and message required" });
  }

  try {
    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${phone}`,
      body: message,
    });

    res.json({ success: true, sid: response.sid });
  } catch (err) {
    console.error("Twilio Error:", err.message);
    res.json({ success: false, error: err.message });
  }
});

// ==============================
// ✅ GROQ AI ROUTE
// ==============================
app.post("/ai-refine", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ success: false, error: "Message required" });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Improve this greeting message. Return only improved text."
          },
          {
            role: "user",
            content: message
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    const data = response.data;

    // 🔍 DEBUG (see real response)
    console.log("GROQ RESPONSE:", JSON.stringify(data, null, 2));

    let text = "";

    if (data.choices && data.choices.length > 0) {
      if (data.choices[0].message) {
        text = data.choices[0].message.content;
      }
    }

    if (!text) {
      text = "No AI response returned.";
    }

    res.json({ success: true, text });

  } catch (err) {
    console.error("GROQ ERROR:", err.response?.data || err.message);
    res.json({
      success: false,
      error: err.response?.data?.error?.message || err.message
    });
  }
});

// ==============================
// ✅ Health Check
// ==============================
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ==============================
// ✅ Start Server
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});