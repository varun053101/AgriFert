const router = require("express").Router();
const { getProfile, getProfileHistory } = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth");

// All user routes require authentication
router.use(authenticate);

router.get("/profile",         getProfile);
router.get("/profile/history", getProfileHistory);

module.exports = router;
