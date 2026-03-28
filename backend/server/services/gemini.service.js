/**
 * gemini.service.js
 * Calls the Gemini REST API directly via axios (v1beta endpoint).
 * Key is read lazily inside the function so dotenv is guaranteed loaded.
 *
 * IMPORTANT — gemini-2.5-flash is a THINKING model.
 * The API response contains one or more parts with { thought: true } (the
 * internal reasoning trace) followed by the real answer part(s).
 * Naively reading parts[0].text returns the thought blob — a single wall of
 * text — so splitting by "\n" yields only 1 usable line.
 * We fix this by skipping all thought parts and joining only the real answer.
 */

const axios = require("axios");

const MODEL = "gemini-2.5-flash";
const BASE  = "https://generativelanguage.googleapis.com/v1beta/models";

const FALLBACK_TIPS = [
  "Apply organic compost before planting to improve soil structure and water retention.",
  "Consider crop rotation with legumes to naturally replenish nitrogen levels.",
  "Test soil nutrients every season to track depletion and adjust fertilizer doses.",
  "Use mulching to prevent soil erosion and retain moisture during dry periods.",
  "Split fertilizer applications: half at sowing, half at top-dressing stage.",
];

/**
 * Extract the visible answer text from a Gemini response.
 * Skips any parts marked { thought: true } (thinking-model trace).
 */
const extractAnswerText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought)          // skip internal reasoning parts
    .map((p) => p.text ?? "")
    .join("\n")
    .trim() || null;
};

/**
 * Generate 5 concise, context-specific soil health tips via Gemini.
 */
const generateSoilTips = async (ctx) => {
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

  // Strict output format — numbered lines make parsing reliable even if the
  // model adds a preamble, and we strip the numbers in post-processing.
  const prompt = `You are an expert agronomist advising an Indian farmer.
Given the following details, write exactly 5 practical soil health tips.

Crop: ${cropType}
Soil type: ${soilType}
Recommended fertilizer: ${fertilizerName}
Soil NPK (kg/ha): N=${nitrogen}, P=${phosphorous}, K=${potassium}
Soil moisture: ${moisture}%
Temperature: ${temperature}°C, Humidity: ${humidity}%

STRICT OUTPUT FORMAT — reply with ONLY these 5 lines, nothing else:
1. <tip one sentence max 18 words>
2. <tip one sentence max 18 words>
3. <tip one sentence max 18 words>
4. <tip one sentence max 18 words>
5. <tip one sentence max 18 words>`;

  const url  = `${BASE}/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:     0.4,    // lower = more consistent formatting
      maxOutputTokens: 800,    // enough room for 5 sentences + thinking budget
    },
  };

  try {
    console.log(`[Gemini] Generating tips with ${MODEL}...`);
    const { data } = await axios.post(url, body, { timeout: 25000 });

    const text = extractAnswerText(data);
    if (!text) throw new Error("Empty response from Gemini");

    // Strip leading "1. / 2. / Tip 1:" style labels, blank lines, etc.
    const tips = text
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^(Tip\s*\d+\s*[:.\-\)]*|[\d]+[.\)]\s*)/i, "")
          .trim()
      )
      .filter((line) => line.length >= 8)
      .slice(0, 5);

    if (tips.length < 3) throw new Error(`Only ${tips.length} tips returned`);

    console.log(`[Gemini] ${tips.length} tips generated.`);
    return tips;
  } catch (err) {
    const detail = err.response?.data?.error?.message ?? err.message;
    console.error(`[Gemini] Failed: ${detail?.slice(0, 200)}`);
    return FALLBACK_TIPS;
  }
};

module.exports = { generateSoilTips };
