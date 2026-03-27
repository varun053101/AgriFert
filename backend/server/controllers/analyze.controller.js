const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const mlService = require("../services/ml.service");
const Prediction = require("../models/Prediction");

/**
 * Crop-specific baseline yields used to convert yieldImprovement (%) to
 * an absolute gain in bushels per acre.
 *
 * Formula:
 *   bushelsPerAcre = Math.round((yieldImprovement / 100) * BASELINE_YIELD_BU_ACRE[cropType])
 *
 * Baselines are Indian national average yields (FAOSTAT / ICAR data):
 *   Wheat    : ~3.5 t/ha  → 3500 ÷ 2.47 acres/ha ÷ 27.2 kg/bushel ≈ 52 bu/acre
 *   Paddy    : ~2.7 t/ha  → 2700 ÷ 2.47 ÷ 20.4 kg/bushel           ≈ 54 bu/acre
 *   Maize    : ~3.3 t/ha  → 3300 ÷ 2.47 ÷ 25.4 kg/bushel           ≈ 53 bu/acre
 *   Cotton   : measured in bales/acre  → null (not applicable)
 *   Sugarcane: measured in tonnes/acre → null (not applicable)
 */
const BASELINE_YIELD_BU_ACRE = {
  Wheat:     52,
  Paddy:     54,
  Maize:     53,
  Cotton:    null,
  Sugarcane: null,
};

// POST /api/analyze
const analyze = asyncHandler(async (req, res) => {
  const {
    soilType, cropType,
    temperature, humidity, moisture,
    nitrogen, potassium, phosphorous,
  } = req.body;

  // Call the ML microservice
  const { output, modelVersion, processingMs } = await mlService.getPrediction({
    soilType, cropType,
    temperature, humidity, moisture,
    nitrogen, potassium, phosphorous,
  });

  // Persist the prediction record
  const prediction = await Prediction.create({
    userId: req.user._id,
    input: { soilType, cropType, temperature, humidity, moisture, nitrogen, potassium, phosphorous },
    output,
    modelVersion,
    processingMs,
  });

  // Absolute yield gain: (improvement % / 100) × crop baseline (bu/acre)
  const baseline = BASELINE_YIELD_BU_ACRE[cropType] ?? null;
  const bushelsPerAcre = (output.yieldImprovement && baseline !== null)
    ? Math.round((output.yieldImprovement / 100) * baseline)
    : null;

  successResponse(res, 201, "Analysis complete", {
    predictionId: prediction._id,
    fertilizer: {
      name:         output.fertilizerName,
      quantity: {
        nitrogen:   output.nitrogenQty,
        phosphorus: output.phosphorusQty,
        potassium:  output.potassiumQty,
      },
      totalQuantity: output.totalQty,
      unit:          "kg per acre",
    },
    yieldImprovement: {
      percentage:    output.yieldImprovement,
      bushelsPerAcre,
    },
    soilHealthTips:  output.soilHealthTips,
    modelConfidence: output.modelConfidence,
    processingMs,
  });
});

// GET /api/analyze/history  — current user's own prediction history
const getHistory = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [predictions, total] = await Promise.all([
    Prediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prediction.countDocuments({ userId: req.user._id }),
  ]);

  successResponse(res, 200, "History fetched", {
    predictions,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/analyze/:id  — single prediction detail
const getPrediction = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findOne({
    _id:    req.params.id,
    userId: req.user._id, // users can only fetch their own
  }).lean();

  if (!prediction) {
    const AppError = require("../utils/AppError");
    throw new AppError("Prediction not found.", 404);
  }

  successResponse(res, 200, "Prediction fetched", { prediction });
});

module.exports = { analyze, getHistory, getPrediction };
