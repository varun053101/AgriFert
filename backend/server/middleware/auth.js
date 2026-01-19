const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication required. Please log in.", 401);
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // throws on invalid/expired

  const user = await User.findById(decoded.id).select("-passwordHash -refreshToken");
  if (!user || !user.isActive) {
    throw new AppError("User no longer exists or has been deactivated.", 401);
  }

  req.user = user;
  next();
});

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    throw new AppError("Access denied. Admins only.", 403);
  }
  next();
};

module.exports = { authenticate, authorizeAdmin };
