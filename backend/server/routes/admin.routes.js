const router = require("express").Router();
const { getStats, getPredictions, getUsers, deactivateUser } = require("../controllers/admin.controller");
const { authenticate, authorizeAdmin } = require("../middleware/auth");

// All admin routes: must be logged in AND have role=admin
router.use(authenticate, authorizeAdmin);

router.get("/stats",               getStats);
router.get("/predictions",         getPredictions);
router.get("/users",               getUsers);
router.patch("/users/:id/deactivate", deactivateUser);

module.exports = router;
