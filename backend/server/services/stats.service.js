const axios = require("axios");
const Prediction = require("../models/Prediction");
const User = require("../models/User");

// Axios instance for internal Node ↔ Flask calls
const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL,
  timeout: 5000,
  headers: { "X-Internal-API-Key": process.env.ML_SERVICE_API_KEY },
});

/**
 * Fetch real model accuracy from the Flask /metrics endpoint.
 * Falls back gracefully if the service is unavailable or metrics.json
 * hasn't been generated yet (i.e. model hasn't been trained).
 */
const fetchMLMetrics = async () => {
  try {
    const { data } = await mlClient.get("/metrics");
    return {
      modelVersion: data.modelVersion ?? null,
      accuracy:     data.accuracy != null ? Math.round(data.accuracy * 100 * 10) / 10 : null,
      lastUpdate:   data.trainedAt ?? null,
      predictions:  null, // filled from DB below
    };
  } catch {
    return null; // Flask down or metrics.json missing
  }
};

/**
 * Returns all stats needed by the admin dashboard in a single call.
 * Uses parallel aggregation queries for speed.
 */
const getAdminStats = async () => {
  const [
    totalSubmissions,
    totalUsers,
    cropDistribution,
    fertilizerUsage,
    averageSoilMetrics,
    yieldTrends,
  ] = await Promise.all([
    // 1. Total prediction count
    Prediction.countDocuments(),

    // 2. Total registered users
    User.countDocuments({ isActive: true }),

    // 3. Crop distribution (top 6)
    Prediction.aggregate([
      { $group: { _id: "$input.cropType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, name: "$_id", value: "$count" } },
    ]),

    // 4. Most-used fertilizers (top 5)
    Prediction.aggregate([
      { $group: { _id: "$output.fertilizerName", usage: { $sum: 1 } } },
      { $sort: { usage: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$_id", usage: 1 } },
    ]),

    // 5. Average input metrics across all predictions
    Prediction.aggregate([
      {
        $group: {
          _id: null,
          avgTemp:     { $avg: "$input.temperature" },
          avgHumidity: { $avg: "$input.humidity" },
          avgMoisture: { $avg: "$input.moisture" },
          avgN:        { $avg: "$input.nitrogen" },
          avgP:        { $avg: "$input.phosphorous" },
          avgK:        { $avg: "$input.potassium" },
          avgYield:    { $avg: "$output.yieldImprovement" },
        },
      },
      {
        $project: {
          _id: 0,
          averageTemperature: { $round: ["$avgTemp", 1] },
          averageHumidity:    { $round: ["$avgHumidity", 1] },
          averageMoisture:    { $round: ["$avgMoisture", 1] },
          averageNPK: {
            n: { $round: ["$avgN", 1] },
            p: { $round: ["$avgP", 1] },
            k: { $round: ["$avgK", 1] },
          },
          averageYieldImprovement: { $round: ["$avgYield", 1] },
        },
      },
    ]),

    // 6. Monthly yield trend (last 6 months)
    Prediction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          avgYield: { $avg: "$output.yieldImprovement" },
          count:    { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id.month",
            ],
          },
          yield: { $round: ["$avgYield", 1] },
          count: 1,
        },
      },
    ]),
  ]);

  // Fetch real accuracy from Flask ML service (not averaged from old DB records)
  const liveMLMetrics = await fetchMLMetrics();

  const metrics = averageSoilMetrics[0] || {
    averageTemperature: 0,
    averageHumidity: 0,
    averageMoisture: 0,
    averageNPK: { n: 0, p: 0, k: 0 },
    averageYieldImprovement: 0,
  };

  return {
    totalSubmissions,
    totalUsers,
    cropDistribution,
    fertilizerUsage,
    yieldTrends,
    modelMetrics: liveMLMetrics
      ? { ...liveMLMetrics, predictions: totalSubmissions }
      : { predictions: totalSubmissions, accuracy: null, lastUpdate: null, modelVersion: null },
    ...metrics,
  };
};

/**
 * Returns paginated prediction history (used by admin table view).
 */
const getPredictionHistory = async ({ page = 1, limit = 20, cropType, sortBy = "createdAt", order = "desc" }) => {
  const filter = {};
  if (cropType) filter["input.cropType"] = cropType.toLowerCase();

  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  const [predictions, total] = await Promise.all([
    Prediction.find(filter)
      .populate("userId", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prediction.countDocuments(filter),
  ]);

  return {
    predictions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = { getAdminStats, getPredictionHistory };
