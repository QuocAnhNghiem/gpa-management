const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['class', 'deadline', 'exam'], default: 'class' },
  name: { type: String, required: [true, 'Tên sự kiện là bắt buộc'], trim: true },
  courseCode: { type: String, default: '', trim: true },
  lessonType: { type: String, default: '', trim: true },
  color: { type: String, default: '#3B82F6' },
  day: { type: String, enum: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'] },
  startTime: { type: String, required: [true, 'Thời gian bắt đầu là bắt buộc'] }, // Ví dụ: "07:00"
  endTime: { type: String, required: [true, 'Thời gian kết thúc là bắt buộc'] }, // Ví dụ: "09:30"
  room: { type: String, default: '' },
  instructor: { type: String, default: '' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  specificDate: { type: String, default: '' }, // YYYY-MM-DD cho mọi sự kiện
  isCompleted: { type: Boolean, default: false } // Đánh dấu hoàn thành deadline/thi
}, { timestamps: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
