/**
 * Custom sanitization middleware tương thích Express v5
 * Thay thế xss-clean và express-mongo-sanitize (không tương thích Express v5)
 */

// Loại bỏ các ký tự nguy hiểm cho NoSQL Injection
function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Chỉ loại bỏ ký tự $ ở đầu chuỗi (ngăn NoSQL operator injection)
    // KHÔNG xoá dấu "." vì nó hợp lệ trong email, URL, v.v.
    return value.replace(/^\$/, '');
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value);
  }
  return value;
}

function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue);
  }
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    // Xóa key bắt đầu bằng $ (ngăn $gt, $ne, $or injection)
    if (key.startsWith('$')) continue;
    sanitized[key] = sanitizeValue(obj[key]);
  }
  return sanitized;
}

// Loại bỏ HTML/script tags cơ bản (XSS prevention)
function stripXSS(value) {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) return value.map(stripXSS);
    const cleaned = {};
    for (const key of Object.keys(value)) {
      cleaned[key] = stripXSS(value[key]);
    }
    return cleaned;
  }
  return value;
}

// Middleware: Chống NoSQL Injection (thay thế express-mongo-sanitize)
exports.mongoSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  // Express v5: req.query là getter-only, không thể ghi đè trực tiếp
  // Chỉ sanitize body và params
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

// Middleware: Chống XSS (thay thế xss-clean)
exports.xssClean = (req, res, next) => {
  if (req.body) req.body = stripXSS(req.body);
  next();
};
