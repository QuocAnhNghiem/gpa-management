const User = require('../models/User');
const Subject = require('../models/Subject');
const { getConfig } = require('../utils/gradeConfig');
const {
  createPresignedUploadUrl,
  uploadBufferToS3,
} = require('../services/storageService');

const PROFILE_YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const GOAL_LIMIT_PER_YEAR = 12;
const ACHIEVEMENT_LIMIT_PER_YEAR = 20;
const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_LONG_TEXT_LENGTH = 280;
const MAX_URL_LENGTH = 500;

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toPlainObject(value) {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
}

function assertAllowedKeys(payload, allowedKeys, fieldName) {
  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw createBadRequest(`${fieldName} chứa trường không hợp lệ: ${unknownKeys.join(', ')}`);
  }
}

function sanitizeTrimmedString(value, fieldName, maxLength = MAX_SHORT_TEXT_LENGTH) {
  if (typeof value !== 'string') {
    throw createBadRequest(`${fieldName} phải là chuỗi`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw createBadRequest(`${fieldName} không được vượt quá ${maxLength} ký tự`);
  }

  return trimmed;
}

function sanitizeOptionalBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw createBadRequest(`${fieldName} phải là true hoặc false`);
  }

  return value;
}

function sanitizeOptionalColor(value, fieldName) {
  const normalized = sanitizeTrimmedString(value, fieldName, 16);
  if (!normalized) return '';

  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
    throw createBadRequest(`${fieldName} phải là mã màu hex hợp lệ`);
  }

  return normalized;
}

function sanitizeOptionalAssetPath(value, fieldName) {
  const normalized = sanitizeTrimmedString(value, fieldName, MAX_URL_LENGTH);
  if (!normalized) return '';

  if (!normalized.startsWith('/') && !/^https?:\/\//.test(normalized)) {
    throw createBadRequest(`${fieldName} phải là đường dẫn nội bộ hoặc URL http/https`);
  }

  return normalized;
}

function sanitizeAlertTime(value) {
  const normalized = sanitizeTrimmedString(value, 'notificationSettings.alertTime', 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw createBadRequest('notificationSettings.alertTime phải theo định dạng HH:mm');
  }

  return normalized;
}

function sanitizeGoals(currentGoals, payload) {
  if (!isPlainObject(payload)) {
    throw createBadRequest('goals phải là object');
  }

  assertAllowedKeys(payload, PROFILE_YEAR_KEYS, 'goals');
  const nextGoals = { ...toPlainObject(currentGoals) };

  Object.entries(payload).forEach(([yearKey, goals]) => {
    if (!Array.isArray(goals)) {
      throw createBadRequest(`goals.${yearKey} phải là mảng`);
    }

    if (goals.length > GOAL_LIMIT_PER_YEAR) {
      throw createBadRequest(`goals.${yearKey} không được vượt quá ${GOAL_LIMIT_PER_YEAR} mục`);
    }

    nextGoals[yearKey] = goals.map((goal, index) => {
      if (!isPlainObject(goal)) {
        throw createBadRequest(`goals.${yearKey}[${index}] không hợp lệ`);
      }

      assertAllowedKeys(goal, ['id', 'text', 'done'], `goals.${yearKey}[${index}]`);
      const goalId = Number(goal.id);

      if (!Number.isInteger(goalId) || goalId < 0) {
        throw createBadRequest(`goals.${yearKey}[${index}].id không hợp lệ`);
      }

      return {
        id: goalId,
        text: sanitizeTrimmedString(goal.text ?? '', `goals.${yearKey}[${index}].text`),
        done: sanitizeOptionalBoolean(goal.done ?? false, `goals.${yearKey}[${index}].done`),
      };
    });
  });

  return nextGoals;
}

function sanitizeAchievements(currentAchievements, payload) {
  if (!isPlainObject(payload)) {
    throw createBadRequest('achievements phải là object');
  }

  assertAllowedKeys(payload, PROFILE_YEAR_KEYS, 'achievements');
  const nextAchievements = { ...toPlainObject(currentAchievements) };

  Object.entries(payload).forEach(([yearKey, achievements]) => {
    if (!Array.isArray(achievements)) {
      throw createBadRequest(`achievements.${yearKey} phải là mảng`);
    }

    if (achievements.length > ACHIEVEMENT_LIMIT_PER_YEAR) {
      throw createBadRequest(
        `achievements.${yearKey} không được vượt quá ${ACHIEVEMENT_LIMIT_PER_YEAR} mục`,
      );
    }

    nextAchievements[yearKey] = achievements.map((item, index) =>
      sanitizeTrimmedString(item ?? '', `achievements.${yearKey}[${index}]`, MAX_SHORT_TEXT_LENGTH),
    );
  });

  return nextAchievements;
}

function sanitizeNotificationSettings(currentSettings, payload) {
  if (!isPlainObject(payload)) {
    throw createBadRequest('notificationSettings phải là object');
  }

  assertAllowedKeys(
    payload,
    ['emailAlerts', 'alertTime', 'deadlineAlerts', 'attendanceWarnings'],
    'notificationSettings',
  );

  const nextSettings = { ...toPlainObject(currentSettings) };

  if (payload.emailAlerts !== undefined) {
    nextSettings.emailAlerts = sanitizeOptionalBoolean(
      payload.emailAlerts,
      'notificationSettings.emailAlerts',
    );
  }
  if (payload.alertTime !== undefined) {
    nextSettings.alertTime = sanitizeAlertTime(payload.alertTime);
  }
  if (payload.deadlineAlerts !== undefined) {
    nextSettings.deadlineAlerts = sanitizeOptionalBoolean(
      payload.deadlineAlerts,
      'notificationSettings.deadlineAlerts',
    );
  }
  if (payload.attendanceWarnings !== undefined) {
    nextSettings.attendanceWarnings = sanitizeOptionalBoolean(
      payload.attendanceWarnings,
      'notificationSettings.attendanceWarnings',
    );
  }

  return nextSettings;
}

function sanitizeGradeCustomization(currentCustomization, payload) {
  if (!isPlainObject(payload)) {
    throw createBadRequest('gradeCustomization phải là object');
  }

  assertAllowedKeys(payload, PROFILE_YEAR_KEYS, 'gradeCustomization');
  const nextCustomization = { ...toPlainObject(currentCustomization) };

  Object.entries(payload).forEach(([yearKey, settings]) => {
    if (!isPlainObject(settings)) {
      throw createBadRequest(`gradeCustomization.${yearKey} phải là object`);
    }

    assertAllowedKeys(
      settings,
      ['color', 'imageUrl', 'slogan', 'subQuote', 'sticker'],
      `gradeCustomization.${yearKey}`,
    );

    nextCustomization[yearKey] = {
      ...(isPlainObject(nextCustomization[yearKey]) ? nextCustomization[yearKey] : {}),
      ...(settings.color !== undefined
        ? { color: sanitizeOptionalColor(settings.color, `gradeCustomization.${yearKey}.color`) }
        : {}),
      ...(settings.imageUrl !== undefined
        ? {
            imageUrl: sanitizeOptionalAssetPath(
              settings.imageUrl,
              `gradeCustomization.${yearKey}.imageUrl`,
            ),
          }
        : {}),
      ...(settings.slogan !== undefined
        ? {
            slogan: sanitizeTrimmedString(
              settings.slogan,
              `gradeCustomization.${yearKey}.slogan`,
              MAX_LONG_TEXT_LENGTH,
            ),
          }
        : {}),
      ...(settings.subQuote !== undefined
        ? {
            subQuote: sanitizeTrimmedString(
              settings.subQuote,
              `gradeCustomization.${yearKey}.subQuote`,
              MAX_SHORT_TEXT_LENGTH,
            ),
          }
        : {}),
      ...(settings.sticker !== undefined
        ? {
            sticker: sanitizeOptionalAssetPath(
              settings.sticker,
              `gradeCustomization.${yearKey}.sticker`,
            ),
          }
        : {}),
    };
  });

  return nextCustomization;
}

async function hasAnyRecordedScores(userId) {
  const subjectWithScores = await Subject.exists({
    userId,
    $or: [
      { finalScore: { $ne: null } },
      { 'scoreComponents.0': { $exists: true } },
    ],
  });

  return Boolean(subjectWithScores);
}

// @desc    Lấy thông tin profile hiện tại
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    
    // Đồng bộ hoá tín chỉ: Tính số tín chỉ đã học qua từ hệ thống (không ghi đè tín chỉ thủ công)
    const subjects = await Subject.find({ userId: req.user.id });
    const autoCompletedCredits = subjects.filter(s => s.isPassed).reduce((acc, s) => acc + (s.credits || 0), 0);
    user.gainedCredits = autoCompletedCredits;
    // Đảm bảo completedCredits trả về là tổng tín chỉ thực tế (gồm cả tự động và thủ công)
    user.completedCredits = (user.completedCredits || 0) + autoCompletedCredits;

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Các field người dùng được phép tự cập nhật (chống mass-assignment)
const ALLOWED_PROFILE_FIELDS = [
  'name', 'mssv', 'major', 'class', 'university', 'program',
  'currentSemester', 'status', 'targetGpa', 'gradingScale',
  'theme', 'onboardingCompleted', 'totalRequiredCredits', 'gradeCustomization',
  'notificationSettings', 'completedCredits', 'goals', 'achievements'
];

// @desc    Cập nhật thông tin profile
// @route   PUT /api/users/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const fieldsToUpdate = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (req.body[key] !== undefined) {
        switch (key) {
          case 'gradeCustomization':
            fieldsToUpdate[key] = sanitizeGradeCustomization(currentUser[key], req.body[key]);
            break;
          case 'notificationSettings':
            fieldsToUpdate[key] = sanitizeNotificationSettings(currentUser[key], req.body[key]);
            break;
          case 'goals':
            fieldsToUpdate[key] = sanitizeGoals(currentUser[key], req.body[key]);
            break;
          case 'achievements':
            fieldsToUpdate[key] = sanitizeAchievements(currentUser[key], req.body[key]);
            break;
          default:
            fieldsToUpdate[key] = req.body[key];
        }
      }
    }

    if (fieldsToUpdate.totalRequiredCredits !== undefined) {
      const totalRequiredCredits = Number(fieldsToUpdate.totalRequiredCredits);
      if (!Number.isFinite(totalRequiredCredits) || totalRequiredCredits < 1) {
        return res.status(400).json({
          success: false,
          message: 'totalRequiredCredits không hợp lệ',
        });
      }

      fieldsToUpdate.totalRequiredCredits = Math.min(300, Math.round(totalRequiredCredits));
    }

    const oldScale = currentUser.gradingScale || 'scale20';
    const requestedScale = fieldsToUpdate.gradingScale;
    const scaleChanged = requestedScale && requestedScale !== oldScale;

    if (scaleChanged) {
      if (await hasAnyRecordedScores(req.user.id)) {
        return res.status(409).json({
          success: false,
          message: 'Không thể đổi thang điểm vì bạn đã có dữ liệu điểm. Hãy xóa hoặc làm trống điểm các môn trước khi chuyển thang.',
        });
      }

      const newConfig = getConfig(requestedScale);
      fieldsToUpdate.targetGpa = newConfig.defaultTargetGpa;
    } else if (fieldsToUpdate.targetGpa !== undefined) {
      const activeScale = requestedScale || oldScale;
      const activeConfig = getConfig(activeScale);
      let targetGpa = parseFloat(fieldsToUpdate.targetGpa);

      if (!Number.isFinite(targetGpa)) {
        fieldsToUpdate.targetGpa = currentUser.targetGpa ?? activeConfig.defaultTargetGpa;
      } else {
        if (targetGpa > activeConfig.maxScore) targetGpa = activeConfig.maxScore;
        if (targetGpa < 0) targetGpa = 0;
        fieldsToUpdate.targetGpa = Math.round(targetGpa * 100) / 100;
      }
    }

    // Nếu có cập nhật completedCredits, tính toán phần tín chỉ thủ công bằng cách trừ đi phần tự động
    if (req.body.completedCredits !== undefined) {
      const subjects = await Subject.find({ userId: req.user.id });
      const autoCompletedCredits = subjects.filter(s => s.isPassed).reduce((acc, s) => acc + (s.credits || 0), 0);
      const totalSent = Number(req.body.completedCredits);
      if (!Number.isFinite(totalSent) || totalSent < 0) {
        return res.status(400).json({ success: false, message: 'completedCredits không hợp lệ' });
      }

      const effectiveTotalRequiredCredits =
        fieldsToUpdate.totalRequiredCredits ?? currentUser.totalRequiredCredits ?? 155;
      const clampedTotalCredits = Math.min(Math.round(totalSent), effectiveTotalRequiredCredits);
      fieldsToUpdate.completedCredits = Math.max(0, clampedTotalCredits - autoCompletedCredits);
    }

    // Nếu có upload file avatar
    if (req.file) {
      const uploadedAvatar = await uploadBufferToS3({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        folder: 'avatars',
        originalName: req.file.originalname,
      });
      fieldsToUpdate.avatar = uploadedAvatar.url;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      returnDocument: 'after',
      runValidators: true
    }).select('-password').lean();

    if (scaleChanged) {
      try {
        await Subject.updateMany(
          { userId: req.user.id },
          {
            $set: {
              gradingScale: requestedScale,
              finalScore: null,
              scoreLetter: '',
              classification: '',
              isPassed: false,
            },
          },
        );
      } catch (error) {
        await User.findByIdAndUpdate(
          req.user.id,
          {
            gradingScale: currentUser.gradingScale,
            targetGpa: currentUser.targetGpa,
          },
          { runValidators: true },
        );
        throw error;
      }
    }

    if (updatedUser) {
      const subjects = await Subject.find({ userId: req.user.id });
      const autoCompletedCredits = subjects.filter(s => s.isPassed).reduce((acc, s) => acc + (s.credits || 0), 0);
      updatedUser.completedCredits = (updatedUser.completedCredits || 0) + autoCompletedCredits;
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload ảnh (cover image)
// @route   POST /api/users/upload-image
// @access  Private
exports.uploadImageController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }
    const uploadedImage = await uploadBufferToS3({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      folder: 'images',
      originalName: req.file.originalname,
    });
    res.status(200).json({ success: true, url: uploadedImage.url });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a short-lived S3 presigned URL for direct browser uploads
// @route   POST /api/users/uploads/presign
// @access  Private
exports.createPresignedUploadController = async (req, res, next) => {
  try {
    const { filename, contentType, folder } = req.body || {};

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, message: 'filename là bắt buộc' });
    }

    if (!contentType || typeof contentType !== 'string') {
      return res.status(400).json({ success: false, message: 'contentType là bắt buộc' });
    }

    const presignedUpload = await createPresignedUploadUrl({
      mimeType: contentType,
      folder,
      originalName: filename,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: presignedUpload,
    });
  } catch (error) {
    next(error);
  }
};
