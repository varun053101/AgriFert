const rateLimit = require("express-rate-limit");
const { errorResponse } = require("../utils/response");

const makeHandler = (message) => (req, res) => errorResponse(res, 429, message);

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: parseInt(process.env.LOGIN_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler("Too many login attempts. Please try again in 5 minutes."),
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.REGISTER_LIMIT_MAX) || 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler("Too many registration attempts. Please try again in 10 minutes."),
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.ANALYZE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler("Too many analysis requests. Please slow down."),
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler("Too many requests from this IP."),
});

module.exports = { loginLimiter, registerLimiter, analyzeLimiter, globalLimiter };
