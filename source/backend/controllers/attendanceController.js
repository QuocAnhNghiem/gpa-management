const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseIntegerField(value, fieldName, minValue) {
  if (!Number.isInteger(value) || value < minValue) {
    throw createBadRequest(`${fieldName} không hợp lệ`);
  }

  return value;
}

async function resolveSubjectIdentity(userId, payload = {}) {
  const subjectId = normalizeText(payload.subjectId);
  const subjectCode = normalizeText(payload.subjectCode);
  const subjectName = normalizeText(payload.subjectName);

  if (subjectId) {
    const subject = await Subject.findOne({ _id: subjectId, userId }).select('_id code name').lean();
    if (subject) {
      return {
        subjectId: subject._id,
        subjectCode: subject.code || subjectCode,
        subjectName: subject.name || subjectName,
      };
    }
  }

  if (subjectCode) {
    const subject = await Subject.findOne({ userId, code: subjectCode }).select('_id code name').lean();
    if (subject) {
      return {
        subjectId: subject._id,
        subjectCode: subject.code || subjectCode,
        subjectName: subject.name || subjectName,
      };
    }
  }

  return {
    subjectId: subjectId || null,
    subjectCode,
    subjectName,
  };
}

function buildAttendanceLookup(userId, identity = {}) {
  const clauses = [];

  if (identity.subjectId) clauses.push({ subjectId: identity.subjectId });
  if (identity.subjectCode) clauses.push({ subjectCode: identity.subjectCode });
  if (identity.subjectName) clauses.push({ subjectName: identity.subjectName });

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return { userId, ...clauses[0] };
  return { userId, $or: clauses };
}

async function findAttendance(userId, payload = {}) {
  const identity = await resolveSubjectIdentity(userId, payload);
  const lookup = buildAttendanceLookup(userId, identity);
  if (!lookup) return { attendance: null, identity };

  const attendance = await Attendance.findOne(lookup);
  return { attendance, identity };
}

// @desc    Lấy danh sách điểm danh
// @route   GET /api/attendance
// @access  Private
exports.getAttendances = async (req, res, next) => {
  try {
    const attendances = await Attendance.find({ userId: req.user.id });
    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật cấu hình điểm danh môn học
// @route   PUT /api/attendance/config
// @access  Private
exports.updateConfig = async (req, res, next) => {
  try {
    const { totalSessions, maxAbsencesAllowed } = req.body;
    const { attendance, identity } = await findAttendance(req.user.id, req.body);

    if (!identity.subjectName) {
      return res.status(400).json({ success: false, message: 'Thiếu subjectName hoặc subjectId hợp lệ' });
    }

    const nextTotalSessions = totalSessions ?? attendance?.totalSessions ?? 15;
    const nextMaxAbsencesAllowed = maxAbsencesAllowed ?? attendance?.maxAbsencesAllowed ?? 3;
    const validatedTotalSessions = parseIntegerField(nextTotalSessions, 'totalSessions', 1);
    const validatedMaxAbsencesAllowed = parseIntegerField(
      nextMaxAbsencesAllowed,
      'maxAbsencesAllowed',
      0,
    );

    if (validatedMaxAbsencesAllowed > validatedTotalSessions) {
      return res.status(400).json({
        success: false,
        message: 'maxAbsencesAllowed không được lớn hơn totalSessions',
      });
    }

    const nextPayload = {
      userId: req.user.id,
      subjectId: identity.subjectId || null,
      subjectCode: identity.subjectCode || '',
      subjectName: identity.subjectName,
      totalSessions: validatedTotalSessions,
      maxAbsencesAllowed: validatedMaxAbsencesAllowed,
    };

    let updatedAttendance;
    if (attendance) {
      Object.assign(attendance, nextPayload);
      updatedAttendance = await attendance.save();
    } else {
      updatedAttendance = await Attendance.create(nextPayload);
    }

    res.status(200).json({ success: true, data: updatedAttendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle (Bật/tắt) điểm danh một ngày cụ thể
// @route   POST /api/attendance/toggle
// @access  Private
exports.toggleAttendance = async (req, res, next) => {
  try {
    const { date, isAbsent } = req.body;
    const { attendance, identity } = await findAttendance(req.user.id, req.body);

    if (!identity.subjectName || !date) {
      return res.status(400).json({ success: false, message: 'Thiếu subjectName hoặc date' });
    }

    if (typeof isAbsent !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isAbsent không hợp lệ' });
    }

    if (!isValidIsoDate(date)) {
      return res.status(400).json({ success: false, message: 'date không hợp lệ, yêu cầu định dạng YYYY-MM-DD' });
    }

    let updatedAttendance;
    if (attendance) {
      if (isAbsent) {
        attendance.absentDates = Array.from(new Set([...(attendance.absentDates || []), date]));
      } else {
        attendance.absentDates = (attendance.absentDates || []).filter((item) => item !== date);
      }

      attendance.subjectId = identity.subjectId || attendance.subjectId || null;
      attendance.subjectCode = identity.subjectCode || attendance.subjectCode || '';
      attendance.subjectName = identity.subjectName;
      updatedAttendance = await attendance.save();
    } else {
      updatedAttendance = await Attendance.create({
        userId: req.user.id,
        subjectId: identity.subjectId || null,
        subjectCode: identity.subjectCode || '',
        subjectName: identity.subjectName,
        absentDates: isAbsent ? [date] : [],
      });
    }

    res.status(200).json({ success: true, data: updatedAttendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa dữ liệu điểm danh
// @route   DELETE /api/attendance/:id
// @access  Private
exports.deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu điểm danh' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
