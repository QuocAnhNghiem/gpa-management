const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("./config/passport"); // Import Passport configuration
const { mongoSanitize, xssClean } = require("./middlewares/sanitize");
const {
  getAllowedExtensionOrigins,
  isProductionEnv,
  isTestEnv,
} = require("./config/env");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
app.set("trust proxy", 1);

// --- 🛡️ BẢO MẬT & MIDDLEWARE ---
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
      const allowedExtensionOrigins = getAllowedExtensionOrigins();
      const isAllowedChromeExtension =
        origin &&
        origin.startsWith("chrome-extension://") &&
        (allowedExtensionOrigins.includes(origin) || (!isProductionEnv() && !isTestEnv()));

      if (!origin || origin === allowedOrigin || isAllowedChromeExtension) {
        return callback(null, true);
      }
      const corsError = new Error("CORS origin không được phép");
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Tăng limit lên 1000 cho dev, 100 cho prod
  message: {
    success: false,
    message: "Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút!",
  },
});
app.use("/api", limiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

app.use(mongoSanitize);
app.use(xssClean);

// --- 🌐 CẤU HÌNH ROUTES ---
app.get("/healthz", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.get("/readyz", (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? "ready" : "not-ready",
    dbState: mongoose.connection.readyState,
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to GPA Management Backend API!" });
});

if (!isProductionEnv() && !isTestEnv()) {
  console.log("📍 Loading routes...");
}
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/vocabulary", require("./routes/vocabularyRoutes"));
app.use("/api/integrations", require("./routes/erpSyncRoutes"));
if (!isProductionEnv() && !isTestEnv()) {
  console.log("✅ All routes loaded");
}

// Test route to verify Google routes are loaded
app.get("/test/routes", (req, res, next) => {
  if (process.env.ENABLE_TEST_ROUTES !== "true") {
    return next();
  }

  return res.json({
    success: true,
    message: "Routes are loaded successfully",
    availableRoutes: [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/refresh",
      "/api/auth/extension-token",
      "/api/auth/google",
      "/api/auth/google/callback",
      "/api/integrations/usth-erp/preview",
      "/api/integrations/usth-erp/sync",
      "/api/integrations/usth-erp/history",
    ],
  });
});

const frontendDistPath = path.join(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

// Xử lý lỗi 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route không tồn tại" });
});

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res
      .status(400)
      .json({ success: false, message: "Dữ liệu không hợp lệ", errors });
  }
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Giá trị không hợp lệ cho trường '${err.path}'`,
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "trường";
    return res
      .status(409)
      .json({ success: false, message: `Giá trị '${field}' đã tồn tại` });
  }
  if (err.name === "MulterError") {
    return res
      .status(400)
      .json({ success: false, message: "Tải file thất bại: " + err.message });
  }

  console.error(err.stack || err);
  const statusCode = err.statusCode || 500;
  const message =
    isProductionEnv() && statusCode >= 500
      ? "Đã xảy ra lỗi máy chủ"
      : err.message || "Lỗi Server Internal";

  res.status(statusCode).json({
    success: false,
    message,
  });
});

module.exports = app;
