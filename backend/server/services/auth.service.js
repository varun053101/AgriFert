const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

  return { accessToken, refreshToken };
};

const registerUser = async ({ name, email, password, adminKey }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError("An account with this email already exists.", 409);

  const role = adminKey && adminKey === process.env.ADMIN_SECRET_KEY ? "admin" : "user";

  const user = await User.create({
    name,
    email,
    passwordHash: password, // pre-save hook hashes it
    role,
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store hashed refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
  // Explicitly select passwordHash since it has select: false
  const user = await User.findOne({ email }).select("+passwordHash +refreshToken");
  if (!user || !user.isActive) throw new AppError("Invalid email or password.", 401);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError("Invalid email or password.", 401);

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Strip sensitive fields before returning
  const safeUser = user.toJSON();
  return { user: safeUser, accessToken, refreshToken };
};

const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) throw new AppError("Refresh token required.", 400);

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new AppError("Refresh token has been revoked. Please log in again.", 401);
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser };
