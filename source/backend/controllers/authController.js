const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { EXTENSION_TOKEN_PURPOSE } = require("../middlewares/authMiddleware");
const { generateCsrfToken, getCsrfCookieOptions } = require("../utils/csrf");

const MAX_REFRESH_TOKENS = 5;

// Hàm tạo Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15m", // Sống ngắn
  });
};

const generateExtensionToken = (id) => {
  return jwt.sign({ id, purpose: EXTENSION_TOKEN_PURPOSE }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Hàm tạo Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id, rnd: Math.random().toString() },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d", // Sống dài
    },
  );
};

const hasCompletedOnboarding = (user) => Boolean(
  user.onboardingCompleted || (user.mssv && user.major),
);

const buildAuthUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  onboardingCompleted: hasCompletedOnboarding(user),
  gradingScale: user.gradingScale || 'scale20',
  targetGpa: user.targetGpa,
  notificationSettings: user.notificationSettings || {},
});

const buildRefreshCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const buildRefreshCookieOptions = () => ({
  ...buildRefreshCookieBaseOptions(),
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

function normalizeRefreshTokens(refreshTokens = []) {
  return refreshTokens.slice(-MAX_REFRESH_TOKENS);
}

function setAuthCookies(res, refreshToken) {
  const csrfToken = generateCsrfToken();

  res.cookie("refreshToken", refreshToken, buildRefreshCookieOptions());
  res.cookie("csrfToken", csrfToken, getCsrfCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie("refreshToken", buildRefreshCookieBaseOptions());
  res.clearCookie("csrfToken", getCsrfCookieOptions());
}

// Hàm gửi token và thiết lập Secure HTTP-Only Cookie
const sendAuthResponse = async (
  user,
  statusCode,
  res,
  oldRefreshToken = null,
) => {
  const accessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // Nếu là rotation (có oldRefreshToken), xoá token cũ đi
  let newRefreshTokens = user.refreshTokens || [];
  if (oldRefreshToken) {
    newRefreshTokens = newRefreshTokens.filter((rt) => rt !== oldRefreshToken);
  }

  // Push token mới
  newRefreshTokens.push(newRefreshToken);
  user.refreshTokens = normalizeRefreshTokens(newRefreshTokens);
  await user.save();

  setAuthCookies(res, newRefreshToken);

  res
    .status(statusCode)
    .json({
      success: true,
      accessToken, // AT trả về JSON để lưu trên Memory (chống XSS)
      user: buildAuthUserPayload(user),
    });
};

// @desc    Đăng ký user mới
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, mssv, major, userClass } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được đăng ký" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mssv: mssv || "",
      major: major || "",
      class: userClass || "",
      refreshTokens: [],
    });

    await sendAuthResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Email hoặc mật khẩu không chính xác",
        });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đăng nhập bằng Google. Vui lòng tiếp tục với Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Email hoặc mật khẩu không chính xác",
        });
    }

    await sendAuthResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng xuất
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Nếu có token gửi lên, ta xoá nó khỏi DB
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter(
            (rt) => rt !== refreshToken,
          );
          await user.save();
        }
      } catch (err) {
        // Token lỗi/hết hạn thì bỏ qua bước xoá trong DB
      }
    }

    // Xoá cookie
    clearAuthCookies(res);

    res.status(200).json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Không có refresh token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
    } catch (err) {
      // Hết hạn hoặc invalid
      return res
        .status(401)
        .json({
          success: false,
          message: "Refresh token không hợp lệ hoặc đã hết hạn",
        });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    // TOKEN REUSE DETECTION:
    // Nếu RT được gửi lên không có trong danh sách RT của user (tức là nó đã được xài rồi)
    if (!user.refreshTokens.includes(oldRefreshToken)) {
      // Phat hien bị trộm token -> Xoá sạch toàn bộ refresh tokens
      user.refreshTokens = [];
      await user.save();
      clearAuthCookies(res);
      return res
        .status(401)
        .json({
          success: false,
          message: "Phát hiện hành vi trộm token. Yêu cầu đăng nhập lại!",
        });
    }

    // Nếu hợp lệ -> cấp mới
    await sendAuthResponse(user, 200, res, oldRefreshToken);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật mật khẩu
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản Google không hỗ trợ đổi mật khẩu cục bộ",
      });
    }

    const isMatch = await bcrypt.compare(
      req.body.currentPassword,
      user.password,
    );
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Mật khẩu hiện tại không chính xác" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.newPassword, salt);
    // Khi đổi mật khẩu, đăng xuất toàn bộ thiết bị
    user.refreshTokens = [];
    await user.save();

    await sendAuthResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo token cho Chrome Extension từ phiên đăng nhập hiện tại
// @route   POST /api/auth/extension-token
// @access  Private
exports.createExtensionToken = async (req, res, next) => {
  try {
    const token = generateExtensionToken(req.user.id);
    res.status(200).json({
      success: true,
      token,
      expiresIn: "7d",
      message: "Đã tạo token extension",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Xác thực Google thất bại" });
    }

    const newRefreshToken = generateRefreshToken(user._id);

    // Lưu refresh token vào DB
    let newRefreshTokens = user.refreshTokens || [];
    newRefreshTokens.push(newRefreshToken);
    user.refreshTokens = normalizeRefreshTokens(newRefreshTokens);
    await user.save();
    setAuthCookies(res, newRefreshToken);

    // Redirect về frontend và để frontend khôi phục phiên bằng refresh cookie
    const redirectUrl = `${process.env.FRONTEND_URL}/login?googleAuth=1`;

    res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
};
