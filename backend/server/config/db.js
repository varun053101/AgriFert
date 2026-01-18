const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    console.log(`[DB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => console.warn("[DB] Disconnected"));

module.exports = connectDB;
