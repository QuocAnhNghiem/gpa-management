const mongoose = require('mongoose');
const { getConfig, getSubjectGrade } = require('../utils/gradeConfig');

const SubjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, trim: true, default: '' },
  name: { type: String, required: [true, 'Tên môn học là bắt buộc'], trim: true },
  credits: { type: Number, required: [true, 'Số tín chỉ là bắt buộc'], min: 1 },
  year: { type: Number, required: true, enum: [1, 2, 3, 4] },
  semester: { type: String, required: true },
  targetGrade: { type: String, default: '' }, // Mục tiêu điểm số chữ (VD: A+, B)
  gradingScale: {
    type: String,
    enum: ['scale20', 'scale4'],
    default: 'scale20',
  },
  scoreComponents: [{
    name: { type: String, required: true },
    weight: { type: Number, required: true, min: 0, max: 1 },
    score: { type: Number, default: null, min: 0 }
    // max không hard-code, validate động theo gradingScale trong pre('save')
  }],
  finalScore: { type: Number, default: null },
  scoreLetter: { type: String, default: '' },
  classification: { type: String, default: '' },
  isPassed: { type: Boolean, default: false }
}, { timestamps: true });

// Backward compatibility: virtual getter cho code cũ đọc score20
SubjectSchema.virtual('score20').get(function () {
  return this.finalScore;
});

// Đảm bảo virtuals xuất hiện khi convert sang JSON/Object
SubjectSchema.set('toJSON', { virtuals: true });
SubjectSchema.set('toObject', { virtuals: true });

// Tự động tính điểm tổng kết và quy đổi trước khi lưu
SubjectSchema.pre('save', function () {
  const config = getConfig(this.gradingScale);

  if (this.scoreComponents && this.scoreComponents.length > 0) {
    let totalScore = 0;
    let totalWeight = 0;
    let allScoresEntered = true;

    this.scoreComponents.forEach(comp => {
      totalWeight += comp.weight;

      if (comp.score === null || comp.score === undefined) {
        allScoresEntered = false;
      } else {
        // Validate max score theo thang điểm
        if (comp.score > config.maxScore) {
          throw new Error(
            `Điểm thành phần "${comp.name}" (${comp.score}) vượt quá giới hạn ${config.label} (max = ${config.maxScore})`
          );
        }
        totalScore += (comp.score * comp.weight);
      }
    });

    // Tổng trọng số phải bằng 100% (1.0)
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Tổng trọng số các thành phần phải bằng 100% (hiện tại ${Math.round(totalWeight * 100)}%)`);
    }

    if (allScoresEntered) {
      this.finalScore = Math.round(totalScore * 100) / 100;

      // Tra cứu điểm chữ & phân loại từ gradeConfig
      const grade = getSubjectGrade(this.finalScore, this.gradingScale);
      this.scoreLetter = grade.letter;
      this.classification = grade.label;

      // Đậu/rớt theo ngưỡng của thang
      this.isPassed = this.finalScore >= config.passThreshold;
    }
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);
