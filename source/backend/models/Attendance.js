const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  subjectCode: { type: String, default: '', trim: true },
  subjectName: { type: String, required: true, trim: true }, // Khóa liên kết mềm với Schedule
  
  // Cấu hình môn học
  totalSessions: { type: Number, default: 15 }, // Tổng số buổi học trong kỳ
  maxAbsencesAllowed: { type: Number, default: 3 }, // Số buổi vắng tối đa cho phép
  
  // Lưu chính xác các ngày đã vắng mặt (YYYY-MM-DD)
  absentDates: [{ type: String }], 
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
