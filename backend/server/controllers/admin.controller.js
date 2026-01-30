const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const statsService = require("../services/stats.service");
const User = require("../models/User");

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
  user.refreshToken = null; // immediately invalidate any active session
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, "User deactivated successfully");
});

module.exports = { getStats, getPredictions, getUsers, deactivateUser };
