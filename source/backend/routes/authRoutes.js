const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  register,
  login,
  logout,
  updatePassword,
  refresh,
  googleCallback,
  createExtensionToken,
} = require("../controllers/authController");
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  validate,
} = require("../middlewares/validators");
const { protect } = require("../middlewares/authMiddleware");
const { requireCsrfToken } = require("../utils/csrf");
const { isTestEnv } = require("../config/env");

function ensureGoogleAuthConfigured(req, res, next) {
  if (!passport.isGoogleAuthConfigured) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth chưa được cấu hình trên máy chủ",
    });
  }

  return next();
}

function ensureTestOnlyPasswordAuth(req, res, next) {
  if (isTestEnv()) {
    return next();
  }

  return res.status(404).json({
    success: false,
    message: "Password authentication đã bị vô hiệu hóa. Vui lòng đăng nhập bằng Google.",
  });
}

router.post("/register", ensureTestOnlyPasswordAuth, registerValidation, validate, register);
router.post("/login", ensureTestOnlyPasswordAuth, loginValidation, validate, login);
router.post("/logout", requireCsrfToken, logout);
router.post("/refresh", requireCsrfToken, refresh);
router.put(
  "/password",
  ensureTestOnlyPasswordAuth,
  protect,
  updatePasswordValidation,
  validate,
  updatePassword,
);
router.post("/extension-token", protect, createExtensionToken);

// Google OAuth Routes
router.get(
  "/google",
  ensureGoogleAuthConfigured,
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
  (req, res) => {
    // Passport will redirect to Google before reaching here
  },
);

router.get(
  "/google/callback",
  ensureGoogleAuthConfigured,
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL + "/login",
    session: false,
  }),
  googleCallback,
);

module.exports = router;
