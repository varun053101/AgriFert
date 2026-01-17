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

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth.routes"));
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

module.exports = app;
