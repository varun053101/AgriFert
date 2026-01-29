const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const mlService = require("../services/ml.service");
const Prediction = require("../models/Prediction");

// POST /api/analyze
const analyze = asyncHandler(async (req, res) => {
  const {
    soilType, cropType,
    temperature, humidity, moisture,
    nitrogen, potassium, phosphorous,
    state, district, coordinates,
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
    input: {
      soilType,
      cropType,
      temperature, humidity, moisture,
      nitrogen, potassium, phosphorous,
      state:       state       || null,
      district:    district    || null,
      coordinates: coordinates || undefined,
    },
    output,
    modelVersion,
    processingMs,
  });

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
      unit:          output.unit,
    },
    yieldImprovement: {
      percentage:    output.yieldImprovement,
      bushelsPerAcre: output.yieldImprovement
        ? Math.round(output.yieldImprovement * 1.68) // approx conversion
        : null,
    },
    soilHealthTips:   output.soilHealthTips,
    modelConfidence:  output.modelConfidence,
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
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
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
