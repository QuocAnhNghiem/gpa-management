const express = require('express');
const router = express.Router();
const {
  createPresignedUploadController,
  getMe,
  updateMe,
  uploadImageController,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const uploadAvatar = require('../middlewares/upload');
const uploadImage = require('../middlewares/uploadImage');

router.use(protect); // Bắt buộc đăng nhập cho mọi route phía dưới

router.get('/me', getMe);
router.put('/me', uploadAvatar.single('avatar'), updateMe);
router.post('/uploads/presign', createPresignedUploadController);
router.post('/upload-image', uploadImage.single('image'), uploadImageController);

module.exports = router;
