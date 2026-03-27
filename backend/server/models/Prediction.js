const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    input: {
      soilType:    { type: String, trim: true },  // e.g. "Black", "Sandy"
      cropType:    { type: String, trim: true },  // e.g. "Wheat", "Paddy"
      temperature: { type: Number, required: true },
      humidity:    { type: Number, required: true, min: 0, max: 100 },
      moisture:    { type: Number, required: true, min: 0, max: 100 },
      nitrogen:    { type: Number, required: true, min: 0 },
      potassium:   { type: Number, required: true, min: 0 },
      phosphorous: { type: Number, required: true, min: 0 }, // matches model column spelling
    },
    output: {
      fertilizerName:   { type: String, required: true },
      nitrogenQty:      { type: Number },
      phosphorusQty:    { type: Number },
      potassiumQty:     { type: Number },
      totalQty:         { type: Number },
      yieldImprovement: { type: Number }, // percentage
      soilHealthTips:   [{ type: String }],
      modelConfidence:  { type: Number },
    },
    modelVersion: { type: String },
    processingMs: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

// Indexes for admin stats aggregation queries
predictionSchema.index({ userId: 1, createdAt: -1 });
predictionSchema.index({ "input.cropType": 1 });
predictionSchema.index({ "input.soilType": 1 });
predictionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
