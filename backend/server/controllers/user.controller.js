const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const Prediction = require("../models/Prediction");

// GET /api/users/profile
// Returns the authenticated user's profile + aggregated stats
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [stats] = await Prediction.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgYieldImprovement: { $avg: "$output.yieldImprovement" },
        avgModelConfidence: { $avg: "$output.modelConfidence" },
      },
    },
    {
      $project: {
        _id: 0,
        totalAnalyses: 1,
        avgYieldImprovement: { $round: ["$avgYieldImprovement", 1] },
        avgModelConfidence: { $round: ["$avgModelConfidence", 3] },
      },
    },
  ]);

  // Most-used fertilizer for this user
  const [topFertilizer] = await Prediction.aggregate([
    { $match: { userId } },
    { $group: { _id: "$output.fertilizerName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, name: "$_id", count: 1 } },
  ]);

  // Most-used crop for this user
  const [topCrop] = await Prediction.aggregate([
    { $match: { userId } },
    { $group: { _id: "$input.cropType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, name: "$_id", count: 1 } },
  ]);

  successResponse(res, 200, "Profile fetched", {
    user: req.user,
    stats: {
      totalAnalyses: stats?.totalAnalyses ?? 0,
      avgYieldImprovement: stats?.avgYieldImprovement ?? 0,
      avgModelConfidence: stats?.avgModelConfidence ?? 0,
      topFertilizer: topFertilizer?.name ?? null,
      topCrop: topCrop?.name ?? null,
    },
  });
});

// GET /api/users/profile/history?page=1&limit=10
// Returns paginated prediction history for the authenticated user
const getProfileHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const skip  = (page - 1) * limit;

  const [predictions, total] = await Promise.all([
    Prediction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prediction.countDocuments({ userId }),
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

module.exports = { getProfile, getProfileHistory };
