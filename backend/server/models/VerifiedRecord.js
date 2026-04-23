const mongoose = require("mongoose");

/**
 * VerifiedRecord
 * --------------
 * Stores admin-confirmed outcomes for predictions.
 * These records feed back into model retraining (continuous learning).
 *
 * Auto-deletion:
 *   Unverified predictions are NOT stored here — this collection only holds
 *   verified records. The TTL for *unverified* predictions (i.e. Prediction
 *   documents with no corresponding VerifiedRecord) is handled by a scheduled
 *   cleanup job in the Node server, controlled by UNVERIFIED_TTL_DAYS.
 */
const verifiedRecordSchema = new mongoose.Schema(
  {
    // Reference to the original prediction
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
      required: true,
      unique: true, // one verification per prediction
    },

    // The farmer who made the prediction
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The admin who clicked "Verify"
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    verifiedAt: {
      type: Date,
      default: Date.now,
    },

    // Optional note the admin can attach (e.g. "Farmer confirmed good yield")
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },

    // Flagged true after this record has been consumed by a retrain run
    usedInRetrain: {
      type: Boolean,
      default: false,
    },

    // Denormalised prediction input — stored here so retrain export
    // needs no DB join (fast bulk read)
    input: {
      soilType:    { type: String, required: true },
      cropType:    { type: String, required: true },
      temperature: { type: Number, required: true },
      humidity:    { type: Number, required: true },
      moisture:    { type: Number, required: true },
      nitrogen:    { type: Number, required: true },
      phosphorous: { type: Number, required: true },
      potassium:   { type: Number, required: true },
    },

    // Denormalised output — the fertilizer that was recommended (and verified as correct)
    output: {
      fertilizerName: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

// Fast lookup: "which predictions have NOT been used in retrain yet?"
verifiedRecordSchema.index({ usedInRetrain: 1, verifiedAt: -1 });
// Fast lookup: total verified count by user
verifiedRecordSchema.index({ userId: 1 });

module.exports = mongoose.model("VerifiedRecord", verifiedRecordSchema);
