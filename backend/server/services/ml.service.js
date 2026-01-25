const axios = require("axios");
const AppError = require("../utils/AppError");
const { generateSoilTips } = require("./gemini.service");

// Axios instance for internal Node ↔ Flask calls only
const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Internal-API-Key": process.env.ML_SERVICE_API_KEY,
  },
});

/**
 * Maps every fertilizer label the model can return to its NPK breakdown.
 * These are the standard 10 fertilizers used in Indian agriculture ML datasets.
 */
const FERTILIZER_DETAILS = {
  "Urea":     { nitrogenQty: 46, phosphorusQty: 0,  potassiumQty: 0,  totalQty: 46 },
  "DAP":      { nitrogenQty: 18, phosphorusQty: 46, potassiumQty: 0,  totalQty: 64 },
  "MOP":      { nitrogenQty: 0,  phosphorusQty: 0,  potassiumQty: 60, totalQty: 60 },
  "SSP":      { nitrogenQty: 0,  phosphorusQty: 16, potassiumQty: 0,  totalQty: 16 },
  "NPK":      { nitrogenQty: 20, phosphorusQty: 20, potassiumQty: 20, totalQty: 60 },
  "14-35-14": { nitrogenQty: 14, phosphorusQty: 35, potassiumQty: 14, totalQty: 63 },
  "28-28":    { nitrogenQty: 28, phosphorusQty: 28, potassiumQty: 0,  totalQty: 56 },
  "17-17-17": { nitrogenQty: 17, phosphorusQty: 17, potassiumQty: 17, totalQty: 51 },
  "20-20":    { nitrogenQty: 20, phosphorusQty: 20, potassiumQty: 0,  totalQty: 40 },
  "10-26-26": { nitrogenQty: 10, phosphorusQty: 26, potassiumQty: 26, totalQty: 62 },
};

/**
 * Compute a dynamic yield-improvement percentage from model confidence + soil state.
 * Range: ~10 – 35%, unique per prediction.
 */
const computeYieldImprovement = ({ confidence = 0.75, nitrogen, phosphorous, potassium, moisture, temperature }) => {
  // Confidence contribution: 0.5 → 14%, 0.95 → 28%
  const confScore = Math.round((confidence || 0.75) * 30);

  // NPK balance bonus: reward even distribution (max +4%)
  const npkAvg = (nitrogen + phosphorous + potassium) / 3 || 1;
  const spread = (
    Math.abs(nitrogen - npkAvg) +
    Math.abs(phosphorous - npkAvg) +
    Math.abs(potassium - npkAvg)
  ) / npkAvg;
  const npkBonus = Math.max(0, Math.round(4 - spread));

  // Optimal moisture (30–60%) and temperature (20–35°C) each add 1%
  const moistureBonus  = moisture >= 30 && moisture <= 60 ? 1 : 0;
  const tempBonus      = temperature >= 20 && temperature <= 35 ? 1 : 0;

  return Math.min(35, Math.max(10, confScore + npkBonus + moistureBonus + tempBonus));
};

/**
 * Calls the Flask ML microservice.
 * Model features (in training order):
 *   Temperature, Humidity, Moisture, Soil Type, Crop Type,
 *   Nitrogen, Phosphorous, Potassium
 */
const getPrediction = async (inputData) => {
  const start = Date.now();

  let mlResponse;
  try {
    mlResponse = await mlClient.post("/predict", {
      temperature:  inputData.temperature,
      humidity:     inputData.humidity,
      moisture:     inputData.moisture,
      soil_type:    inputData.soilType,    // Flask encoder expects title-case string
      crop_type:    inputData.cropType,
      nitrogen:     inputData.nitrogen,
      potassium:    inputData.potassium,
      phosphorous:  inputData.phosphorous, // matches model's column spelling
    });
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new AppError(
        "ML service is not running. Start it with: cd ml_service && python app.py",
        503
      );
    }
    if (err.code === "ETIMEDOUT") {
      throw new AppError("ML service timed out. Please try again.", 503);
    }
    if (err.response?.status === 400) {
      throw new AppError(`ML service rejected input: ${err.response.data?.error}`, 400);
    }
    throw new AppError("Prediction failed. Please try again.", 500);
  }

  const processingMs = Date.now() - start;
  const { fertilizerName, confidence, modelVersion } = mlResponse.data;

  const soilHealthTips = await generateSoilTips({
    fertilizerName,
    cropType:    inputData.cropType,
    soilType:    inputData.soilType,
    nitrogen:    inputData.nitrogen,
    phosphorous: inputData.phosphorous,
    potassium:   inputData.potassium,
    moisture:    inputData.moisture,
    temperature: inputData.temperature,
    humidity:    inputData.humidity,
  });

  const details = FERTILIZER_DETAILS[fertilizerName] || {
    nitrogenQty: null, phosphorusQty: null, potassiumQty: null,
    totalQty: null,
  };

  const yieldImprovement = computeYieldImprovement({
    confidence,
    nitrogen:    inputData.nitrogen,
    phosphorous: inputData.phosphorous,
    potassium:   inputData.potassium,
    moisture:    inputData.moisture,
    temperature: inputData.temperature,
  });

  return {
    output: {
      fertilizerName,
      ...details,
      unit: "kg per acre",
      yieldImprovement,
      soilHealthTips,
      modelConfidence: confidence ?? null,
    },
    modelVersion: modelVersion || "1.0.0",
    processingMs,
  };
};

module.exports = { getPrediction };
