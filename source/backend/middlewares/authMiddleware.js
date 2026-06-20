const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EXTENSION_TOKEN_PURPOSE = 'usth_erp_extension';

function extractBearerToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

async function authenticateBearer(req, res, next, { allowExtensionToken = false } = {}) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose && decoded.purpose !== EXTENSION_TOKEN_PURPOSE) {
      return res.status(403).json({ success: false, message: 'Token không hợp lệ cho chức năng này.' });
    }

    if (decoded.purpose === EXTENSION_TOKEN_PURPOSE && !allowExtensionToken) {
      return res.status(403).json({ success: false, message: 'Extension token không được phép gọi API này.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      // Token hợp lệ nhưng user đã bị xoá → tránh crash khi truy cập req.user.id sau này
      return res.status(401).json({ success: false, message: 'Tài khoản không còn tồn tại.' });
    }

    req.user = user;
    req.authTokenPurpose = decoded.purpose || 'web_access';
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

exports.protect = async (req, res, next) => {
  return authenticateBearer(req, res, next, { allowExtensionToken: false });
};

exports.protectWebOrExtension = async (req, res, next) => {
  return authenticateBearer(req, res, next, { allowExtensionToken: true });
};

exports.EXTENSION_TOKEN_PURPOSE = EXTENSION_TOKEN_PURPOSE;
