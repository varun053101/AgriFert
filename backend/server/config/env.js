const required = [
  "MONGODB_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "ML_SERVICE_URL",
  "ML_SERVICE_API_KEY",
  "WEATHER_API_KEY",
  "WEATHER_API_BASE",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables:\n  ${missing.join("\n  ")}`);
  console.error("Copy .env.example to .env and fill in all values.");
  process.exit(1);
}
