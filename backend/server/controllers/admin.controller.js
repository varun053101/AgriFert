const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const statsService = require("../services/stats.service");
const retrainService = require("../services/retrain.service");
const User = require("../models/User");
const Prediction = require("../models/Prediction");
const VerifiedRecord = require("../models/VerifiedRecord");

const RETRAIN_THRESHOLD = () => parseInt(process.env.RETRAIN_THRESHOLD) || 50;

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getAdminStats();
  successResponse(res, 200, "Admin stats fetched", stats);
});

// GET /api/admin/predictions?page=1&limit=20&cropType=rice
const getPredictions = asyncHandler(async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page)  || 1);
  const limit    = Math.min(100, parseInt(req.query.limit) || 20);
  const cropType = req.query.cropType || null;
  const sortBy   = req.query.sortBy || "createdAt";
  const order    = req.query.order  || "desc";

  const result = await statsService.getPredictionHistory({ page, limit, cropType, sortBy, order });
  successResponse(res, 200, "Predictions fetched", result);
});

// GET /api/admin/users?page=1&limit=20
const getUsers = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .select("-passwordHash -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  successResponse(res, 200, "Users fetched", {
    users,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// PATCH /api/admin/users/:id/deactivate
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);

  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError("You cannot deactivate your own account.", 400);
  }

  user.isActive = false;
  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, "User deactivated successfully");
});

// ── Continuous Learning ────────────────────────────────────────────────────────

// GET /api/admin/verifications?page=1&limit=20
// Returns unverified predictions with user info for the admin to review
const getPendingVerifications = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  // Find IDs of already-verified predictions
  const verifiedIds = await VerifiedRecord.distinct("predictionId");

  const filter = { _id: { $nin: verifiedIds } };

  const [predictions, total] = await Promise.all([
    Prediction.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prediction.countDocuments(filter),
  ]);

  successResponse(res, 200, "Pending verifications fetched", {
    predictions,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/admin/verifications/:predictionId/verify
// Admin marks a prediction as verified (correct recommendation confirmed)
const verifyPrediction = asyncHandler(async (req, res) => {
  const { predictionId } = req.params;
  const { note } = req.body;

  // Load the prediction
  const prediction = await Prediction.findById(predictionId).populate("userId", "name email");
  if (!prediction) throw new AppError("Prediction not found.", 404);

  // Prevent double-verification
  const existing = await VerifiedRecord.findOne({ predictionId });
  if (existing) throw new AppError("This prediction has already been verified.", 409);

  // Create verified record with denormalised data
  const verified = await VerifiedRecord.create({
    predictionId,
    userId:     prediction.userId._id,
    verifiedBy: req.user._id,
    note:       note || undefined,
    input: {
      soilType:    prediction.input.soilType,
      cropType:    prediction.input.cropType,
      temperature: prediction.input.temperature,
      humidity:    prediction.input.humidity,
      moisture:    prediction.input.moisture,
      nitrogen:    prediction.input.nitrogen,
      phosphorous: prediction.input.phosphorous,
      potassium:   prediction.input.potassium,
    },
    output: {
      fertilizerName: prediction.output.fertilizerName,
    },
  });

  successResponse(res, 201, "Prediction verified successfully", { verified });

  // ── Async retrain check (non-blocking — response already sent) ──────────────
  const sinceLastRetrain = await VerifiedRecord.countDocuments({ usedInRetrain: false });
  if (sinceLastRetrain >= RETRAIN_THRESHOLD()) {
    console.log(`[RETRAIN] Threshold reached (${sinceLastRetrain}/${RETRAIN_THRESHOLD()}) — triggering retrain.`);
    retrainService.triggerRetrain().catch((err) => {
      console.error("[RETRAIN] Failed:", err.message);
    });
  }
});

module.exports = {
  getStats,
  getPredictions,
  getUsers,
  deactivateUser,
  getPendingVerifications,
  verifyPrediction,
};
