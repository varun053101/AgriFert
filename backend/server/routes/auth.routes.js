const router = require("express").Router();
const { register, login, refresh, logout, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema, refreshSchema } = require("../validators/auth.validator");

// Public
router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login",    loginLimiter,    validate(loginSchema),    login);
router.post("/refresh",                  validate(refreshSchema),   refresh);

// Protected
router.post("/logout", authenticate, logout);
router.get("/me",      authenticate, getMe);

module.exports = router;
