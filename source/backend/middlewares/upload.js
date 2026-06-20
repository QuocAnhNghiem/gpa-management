const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Chấp nhận ảnh JPEG, PNG, WEBP
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(new Error('Định dạng file không hỗ trợ, vui lòng tải lên file JPEG, PNG hoặc WEBP'), false);
  }
};

const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Giới hạn 5MB
  },
  fileFilter,
});

module.exports = uploadAvatar;
