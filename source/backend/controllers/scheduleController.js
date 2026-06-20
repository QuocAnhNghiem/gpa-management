const Schedule = require('../models/Schedule');
const ALLOWED_SCHEDULE_FIELDS = [
  'type',
  'name',
  'courseCode',
  'lessonType',
  'color',
  'day',
  'startTime',
  'endTime',
  'room',
  'instructor',
  'priority',
  'specificDate',
  'isCompleted',
];

function pickAllowedScheduleFields(payload = {}) {
  const next = {};
  ALLOWED_SCHEDULE_FIELDS.forEach((key) => {
    if (payload[key] !== undefined) next[key] = payload[key];
  });
  return next;
}

// Validate giờ kết thúc phải sau giờ bắt đầu
function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return null;
  return endTime > startTime ? null : 'Giờ kết thúc phải sau giờ bắt đầu';
}

function getDayFromDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return days[date.getDay()];
}

// Kiểm tra xung đột lịch học cho một ngày cụ thể (trừ excludeId nếu update)
async function checkConflict(userId, specificDate, startTime, endTime, excludeId) {
  const day = getDayFromDate(specificDate);
  const query = {
    userId,
    $and: [
      { startTime: { $lt: endTime } },
      { endTime: { $gt: startTime } }
    ],
    $or: [
      { type: 'class', day: day },
      { type: { $in: ['deadline', 'exam'] }, specificDate: specificDate }
    ]
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Schedule.findOne(query);
}

exports.getSchedules = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id }).sort({ startTime: 1 });
    res.status(200).json({ success: true, count: schedules.length, data: schedules });
  } catch (error) { next(error); }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const schedulePayload = pickAllowedScheduleFields(req.body);
    const { specificDate, startTime, endTime, type } = schedulePayload;

    if (type === 'class' && specificDate) {
      schedulePayload.day = getDayFromDate(specificDate);
    }

    if (type !== 'deadline') {
      const timeErr = validateTimeRange(startTime, endTime);
      if (timeErr) return res.status(400).json({ success: false, message: timeErr });

      if (specificDate && startTime && endTime) {
        const conflict = await checkConflict(req.user.id, specificDate, startTime, endTime, null);
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Xung đột lịch: trùng giờ với "${conflict.name}" (${conflict.startTime} - ${conflict.endTime})`
          });
        }
      }
    }

    const schedule = await Schedule.create({ ...schedulePayload, userId: req.user.id });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) { next(error); }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const existing = await Schedule.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

    const schedulePayload = pickAllowedScheduleFields(req.body);
    const type = schedulePayload.type || existing.type;
    const startTime = schedulePayload.startTime || existing.startTime;
    const endTime   = schedulePayload.endTime   || existing.endTime;
    const specificDate = schedulePayload.specificDate || existing.specificDate;

    if (type === 'class' && specificDate) {
      schedulePayload.day = getDayFromDate(specificDate);
    }

    if (type !== 'deadline') {
      const timeErr = validateTimeRange(startTime, endTime);
      if (timeErr) return res.status(400).json({ success: false, message: timeErr });

      if (specificDate && startTime && endTime) {
        const conflict = await checkConflict(req.user.id, specificDate, startTime, endTime, existing._id);
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Xung đột lịch: trùng giờ với "${conflict.name}" (${conflict.startTime} - ${conflict.endTime})`
          });
        }
      }
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      schedulePayload,
      { new: true, runValidators: true },
    );
    res.status(200).json({ success: true, data: schedule });
  } catch (error) { next(error); }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};
