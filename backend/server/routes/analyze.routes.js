const router = require("express").Router();
const { analyze, getHistory, getPrediction } = require("../controllers/analyze.controller");
const { authenticate } = require("../middleware/auth");
const { analyzeLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { analyzeSchema } = require("../validators/analyze.validator");

// All analyze routes require authentication
router.use(authenticate);

router.post("/",         analyzeLimiter, validate(analyzeSchema), analyze);
router.get("/history",                                             getHistory);
router.get("/:id",                                                 getPrediction);

module.exports = router;
