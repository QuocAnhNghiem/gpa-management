const { body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({ field: err.path, message: err.msg })) 
    });
  }
  next();
};

exports.registerValidation = [
  body('email')
    .isEmail().withMessage('Địa chỉ Email không hợp lệ')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải chứa ít nhất 6 ký tự'),
  body('name')
    .notEmpty().withMessage('Họ và tên không được để trống')
    .trim()
    .escape()
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu')
];

exports.updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải chứa ít nhất 6 ký tự')
];

