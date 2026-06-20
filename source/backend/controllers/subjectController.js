const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const ALLOWED_SUBJECT_FIELDS = [
  'code',
  'name',
  'credits',
  'year',
  'semester',
  'targetGrade',
  'scoreComponents',
];

function pickAllowedSubjectFields(payload = {}) {
  const next = {};
  ALLOWED_SUBJECT_FIELDS.forEach((key) => {
    if (payload[key] !== undefined) next[key] = payload[key];
  });
  return next;
}

function validateManualSubjectPayload(payload = {}) {
  if (payload.credits !== undefined) {
    const credits = Number(payload.credits);
    if (!Number.isFinite(credits) || credits < 1) {
      const error = new Error('Số tín chỉ phải lớn hơn hoặc bằng 1');
      error.statusCode = 400;
      throw error;
    }
  }
}

exports.getSubjects = async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    // Ép kiểu để query string không thể truyền object operator ($gt, $ne...) vào Mongo
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.semester) filter.semester = String(req.query.semester);

    const subjects = await Subject.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) { next(error); }
};

exports.createSubject = async (req, res, next) => {
  try {
    validateManualSubjectPayload(req.body);
    // Tự động gán gradingScale từ user hiện tại
    const subject = await Subject.create({
      ...pickAllowedSubjectFields(req.body),
      userId: req.user.id,
      gradingScale: req.user.gradingScale || 'scale20',
    });
    res.status(201).json({ success: true, data: subject });
  } catch (error) { next(error); }
};

exports.updateSubject = async (req, res, next) => {
  try {
    validateManualSubjectPayload(req.body);
    let subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    if (subject.userId.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Không có quyền' });

    const previousName = subject.name;
    const previousCode = subject.code;
    subject = Object.assign(subject, pickAllowedSubjectFields(req.body));
    await subject.save(); // Gọi Pre-save trigger tính toán điểm hệ 20 và điểm chữ

    await Attendance.updateMany(
      {
        userId: req.user.id,
        $or: [
          { subjectId: subject._id },
          ...(previousCode ? [{ subjectCode: previousCode }] : []),
          { subjectName: previousName },
        ],
      },
      {
        $set: {
          subjectId: subject._id,
          subjectCode: subject.code || '',
          subjectName: subject.name,
        },
      },
    );

    res.status(200).json({ success: true, data: subject });
  } catch (error) { next(error); }
};

// Q7: Cascade confirm — trả hasAttendance để Frontend hỏi người dùng
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user.id });
    if (!subject) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    const attendanceFilter = {
      userId: req.user.id,
      $or: [
        { subjectId: subject._id },
        ...(subject.code ? [{ subjectCode: subject.code }] : []),
        { subjectName: subject.name },
      ],
    };
    const hasAttendance = await Attendance.exists(attendanceFilter);
    let deletedAttendanceCount = 0;

    if (req.query.deleteAttendance === 'true') {
      const attendanceDeleteResult = await Attendance.deleteMany(attendanceFilter);
      deletedAttendanceCount = attendanceDeleteResult.deletedCount || 0;
    }

    // Xóa subject
    await Subject.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {
        hasAttendance: Boolean(hasAttendance),
        deletedAttendanceCount,
        subjectName: subject.name,
      },
    });
  } catch (error) { next(error); }
};
