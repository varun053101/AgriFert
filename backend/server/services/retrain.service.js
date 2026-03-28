/**
 * retrain.service.js
 * ------------------
 * Handles the Node → Flask continuous-learning retrain handshake.
 *
 * Flow:
 *  1. Fetch all VerifiedRecord where usedInRetrain = false
 *  2. Build a payload for Flask /retrain
 *  3. POST to Flask (fire-and-forget from the caller's perspective)
 *  4. On success: mark all those records usedInRetrain = true
 *  5. Return { success, newVersion, accuracy, recordsAdded }
 */

const axios = require("axios");
const VerifiedRecord = require("../models/VerifiedRecord");
const { setMaintenance } = require("../utils/maintenanceMode");

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL,
  timeout: 300_000,
  headers: { "X-Internal-API-Key": process.env.ML_SERVICE_API_KEY },
});

const triggerRetrain = async () => {
  const records = await VerifiedRecord.find({ usedInRetrain: false }).lean();
  if (records.length === 0) {
    console.log("[RETRAIN] No new verified records — skipping.");
    return null;
  }

  console.log(`[RETRAIN] Triggering retrain with ${records.length} verified records.`);

  // ── Enable maintenance mode (blocks non-admin user routes) ──────────────────
  setMaintenance(true);

  try {
    const payload = {
      records: records.map((r) => ({
        soil_type:       r.input.soilType,
        crop_type:       r.input.cropType,
        temperature:     r.input.temperature,
        humidity:        r.input.humidity,
        moisture:        r.input.moisture,
        nitrogen:        r.input.nitrogen,
        phosphorous:     r.input.phosphorous,
        potassium:       r.input.potassium,
        fertilizer_name: r.output.fertilizerName,
      })),
    };

    const { data } = await mlClient.post("/retrain", payload);

    // Mark records as consumed
    const ids = records.map((r) => r._id);
    await VerifiedRecord.updateMany({ _id: { $in: ids } }, { $set: { usedInRetrain: true } });

    console.log(
      `[RETRAIN] Done. Version: ${data.newVersion} | Accuracy: ${data.accuracy} | Added: ${data.recordsAdded}`
    );

    return {
      success:      true,
      newVersion:   data.newVersion,
      accuracy:     data.accuracy,
      recordsAdded: data.recordsAdded,
      trainedAt:    data.trainedAt,
    };
  } finally {
    // ── Always disable maintenance mode, even on error ───────────────────────
    setMaintenance(false);
  }
};

module.exports = { triggerRetrain };
