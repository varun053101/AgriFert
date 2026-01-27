/**
 * gemini.service.js
 * Calls the Gemini REST API directly via axios (v1beta endpoint).
 * Key is read lazily inside the function so dotenv is guaranteed loaded.
 */

const axios = require("axios");

// Confirmed working: gemini-2.5-flash on v1beta
const MODEL = "gemini-2.5-flash";
const BASE   = "https://generativelanguage.googleapis.com/v1beta/models";

const FALLBACK_TIPS = [
  "Apply organic compost before planting to improve soil structure and water retention.",
  "Consider crop rotation with legumes to naturally replenish nitrogen levels.",
  "Test soil nutrients every season to track depletion and adjust fertilizer doses.",
  "Use mulching to prevent soil erosion and retain moisture during dry periods.",
  "Split fertilizer applications: half at sowing, half at top-dressing stage.",
];

/**
 * Generate 5 concise, context-specific soil health tips via Gemini.
 */
const generateSoilTips = async (ctx) => {
  // Read key lazily — ensures dotenv has already populated process.env
  const key = process.env.GEMINI_API_KEY;

  if (!key || key === "your_gemini_api_key_here") {
    console.warn("[Gemini] GEMINI_API_KEY not set — using fallback tips.");
    return FALLBACK_TIPS;
  }

  const {
    fertilizerName, cropType, soilType,
    nitrogen, phosphorous, potassium,
    moisture, temperature, humidity,
  } = ctx;

  const prompt = `You are an expert agronomist advising an Indian farmer.
Given the following details, provide exactly 5 short, practical soil health tips (one per line, no numbering, no bullet symbols, no extra blank lines):

- Crop: ${cropType}
- Soil type: ${soilType}
- Recommended fertilizer: ${fertilizerName}
- Soil NPK (kg/ha): N=${nitrogen}, P=${phosphorous}, K=${potassium}
- Soil moisture: ${moisture}%
- Temperature: ${temperature}°C, Humidity: ${humidity}%

Requirements:
- Each tip must be ONE sentence (max 20 words).
- Tips must be directly relevant to this specific crop, soil type, and fertilizer.
- No greetings, no numbering, no bullet symbols — exactly 5 lines of plain text.`;

  const url  = `${BASE}/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
  };

  try {
    console.log(`[Gemini] Generating tips with ${MODEL}...`);
    const { data } = await axios.post(url, body, { timeout: 12000 });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Empty response from Gemini");

    const tips = text
      .split("\n")
      .map((line) => line.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
      .filter((line) => line.length > 10)
      .slice(0, 5);

    if (tips.length < 3) throw new Error(`Only ${tips.length} tips returned`);

    console.log(`[Gemini] ${tips.length} tips generated.`);
    return tips;
  } catch (err) {
    const detail = err.response?.data?.error?.message ?? err.message;
    console.error(`[Gemini] Failed: ${detail?.slice(0, 120)}`);
    return FALLBACK_TIPS;
  }
};

module.exports = { generateSoilTips };
