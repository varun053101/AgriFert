/**
 * maintenanceMiddleware.js
 * -------------------------
 * Returns 503 for all non-admin, non-auth requests while a model
 * retrain is in progress. Admins can always access the app.
 */

const { isInMaintenance, getStatus } = require("../utils/maintenanceMode");

const maintenanceMiddleware = (req, res, next) => {
  if (!isInMaintenance()) return next();

  // Always let through: auth routes (login still works), admin routes, health
  const allowed = ["/api/auth", "/api/admin", "/health"];
  const isAllowed = allowed.some((prefix) => req.path.startsWith(prefix));
  if (isAllowed) return next();

  const { startedAt } = getStatus();
  return res.status(503).json({
    success: false,
    maintenance: true,
    message:
      "AgriFert is temporarily under maintenance while the AI model is being retrained. Please try again in a few minutes.",
    startedAt,
  });
};

module.exports = maintenanceMiddleware;
