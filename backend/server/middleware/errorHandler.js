const { errorResponse } = require("../utils/response");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the full error in dev; only log stack in prod for unexpected errors
  if (process.env.NODE_ENV === "development") {
    console.error("[ERROR]", err);
  } else if (!err.isOperational) {
    console.error("[UNEXPECTED ERROR]", err);
  }

  // Mongoose – invalid ObjectId
  if (err.name === "CastError") {
    return errorResponse(res, 400, "Invalid resource ID format");
  }

  // Mongoose – duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return errorResponse(res, 409, `${field} already exists`);
  }

  // Mongoose – validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, 422, "Validation failed", messages);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, 401, "Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, 401, "Token expired");
  }

  // Operational errors we threw ourselves (AppError)
  if (err.isOperational) {
    return errorResponse(res, err.statusCode, err.message);
  }

  // Unknown / programmer errors – don't leak internals
  return errorResponse(res, 500, "Something went wrong. Please try again later.");
};

module.exports = errorHandler;
