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

const uploadImage = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10 // Giới hạn 10MB cho ảnh
  },
  fileFilter,
});

module.exports = uploadImage;
