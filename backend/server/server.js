require("dotenv").config();
require("./config/env"); // crash early if any required env var is missing

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimiter");
const Prediction = require("./models/Prediction");
const VerifiedRecord = require("./models/VerifiedRecord");
const maintenanceMiddleware = require("./middleware/maintenanceMiddleware");
const { getStatus } = require("./utils/maintenanceMode");

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl in dev)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── NoSQL Injection Prevention ────────────────────────────────────────────────
// Strips keys that start with $ or contain . from req.body, req.query, req.params
app.use(mongoSanitize());

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(logger);

// ── Global Rate Limit ─────────────────────────────────────────────────────────
app.use("/api", globalLimiter);

// ── Maintenance Mode (checked before routes, exempt: /api/auth, /api/admin, /health) ──
app.use(maintenanceMiddleware);

// ── App Status (public — used by frontend to detect maintenance) ──────────────
app.get("/api/status", (req, res) => {
  res.json({ success: true, data: getStatus() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth.routes"));
app.use("/api/users",   require("./routes/user.routes"));
app.use("/api/analyze", require("./routes/analyze.routes"));
app.use("/api/weather", require("./routes/weather.routes"));
app.use("/api/admin",   require("./routes/admin.routes"));

// ── Health Check (no auth, no rate limit) ────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env:    process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.all("*", (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} (${process.env.NODE_ENV})`);
});

// Graceful shutdown on unhandled errors / signals
process.on("unhandledRejection", (err) => {
  console.error("[UNHANDLED REJECTION]", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("[SIGTERM] Shutting down gracefully...");
  server.close(() => process.exit(0));
});

// ── Daily Cleanup: delete unverified predictions older than TTL ───────────────
const TTL_DAYS = parseInt(process.env.UNVERIFIED_TTL_DAYS) || 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const runCleanup = async () => {
  try {
    const cutoff = new Date(Date.now() - TTL_DAYS * MS_PER_DAY);

    // Find IDs of predictions that HAVE been verified (keep these forever)
    const verifiedIds = await VerifiedRecord.distinct("predictionId");

    // Delete unverified predictions older than the TTL
    const result = await Prediction.deleteMany({
      _id:       { $nin: verifiedIds },
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      console.log(
        `[CLEANUP] Deleted ${result.deletedCount} unverified prediction(s) older than ${TTL_DAYS} days.`
      );
    }
  } catch (err) {
    console.error("[CLEANUP] Error during unverified prediction cleanup:", err.message);
  }
};

// Run once at startup (after a short delay) then every 24 h
setTimeout(runCleanup, 10_000);
setInterval(runCleanup, MS_PER_DAY);

module.exports = app;
