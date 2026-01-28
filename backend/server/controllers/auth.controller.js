const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const authService = require("../services/auth.service");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, adminKey } = req.body;
  const { user, accessToken, refreshToken } = await authService.registerUser({
    name, email, password, adminKey,
  });

  successResponse(res, 201, "Account created successfully", {
    user,
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

  successResponse(res, 200, "Login successful", {
    user,
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken: incomingToken } = req.body;
  const { accessToken, refreshToken } = await authService.refreshAccessToken(incomingToken);

  successResponse(res, 200, "Token refreshed", { accessToken, refreshToken });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  successResponse(res, 200, "Logged out successfully");
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is already attached by authenticate middleware (no sensitive fields)
  successResponse(res, 200, "User fetched", { user: req.user });
});

module.exports = { register, login, refresh, logout, getMe };
