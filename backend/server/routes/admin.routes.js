const router = require("express").Router();
const {
  getStats,
  getPredictions,
  getUsers,
  deactivateUser,
  getPendingVerifications,
  verifyPrediction,
} = require("../controllers/admin.controller");
const { authenticate, authorizeAdmin } = require("../middleware/auth");

router.use(authenticate, authorizeAdmin);

router.get("/stats",                               getStats);
router.get("/predictions",                         getPredictions);
router.get("/users",                               getUsers);
router.patch("/users/:id/deactivate",              deactivateUser);

// Continuous Learning
router.get("/verifications",                       getPendingVerifications);
router.post("/verifications/:predictionId/verify", verifyPrediction);

module.exports = router;

