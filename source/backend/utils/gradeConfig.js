/**
 * Cấu hình đa thang điểm (Hệ 20 & Hệ 4)
 * Mỗi hệ hoàn toàn độc lập — KHÔNG quy đổi qua lại.
 */

const GRADE_CONFIGS = {
  scale20: {
    maxScore: 20,
    step: 0.50,
    passThreshold: 10.00,
    label: 'Thang 20',
    defaultTargetGpa: 14.00,

    // Bảng 1: Điểm từng môn → Điểm chữ
    subjectGrades: [
      { min: 18.00, max: 20.00, letter: 'A+', label: 'Đạt' },
      { min: 16.00, max: 17.99, letter: 'A',  label: 'Đạt' },
      { min: 14.00, max: 15.99, letter: 'B+', label: 'Đạt' },
      { min: 13.00, max: 13.99, letter: 'B',  label: 'Đạt' },
      { min: 12.00, max: 12.99, letter: 'C+', label: 'Đạt' },
      { min: 11.00, max: 11.99, letter: 'C',  label: 'Đạt' },
      { min: 10.00, max: 10.99, letter: 'D',  label: 'Đạt' },
      { min: 0.00,  max: 9.99,  letter: 'F',  label: 'Không đạt' },
    ],

    // Bảng 2: Xếp loại GPA tổng kết
    gpaClassification: [
      { min: 17.00, max: 20.00, label: 'Xuất sắc' },
      { min: 15.00, max: 16.99, label: 'Giỏi' },
      { min: 13.00, max: 14.99, label: 'Khá' },
      { min: 12.00, max: 12.99, label: 'Trung bình khá' },
      { min: 10.00, max: 11.99, label: 'Trung bình' },
      { min: 0.00,  max: 9.99,  label: 'Không đạt' },
    ],
  },

  scale4: {
    maxScore: 4,
    step: 0.10,
    passThreshold: 1.00,
    label: 'Thang 4',
    defaultTargetGpa: 3.00,

    // Bảng 3: Điểm từng môn → Điểm chữ
    subjectGrades: [
      { min: 4.00, max: 4.00, letter: 'A',  label: 'Đạt' },
      { min: 3.50, max: 3.99, letter: 'B+', label: 'Đạt' },
      { min: 3.00, max: 3.49, letter: 'B',  label: 'Đạt' },
      { min: 2.50, max: 2.99, letter: 'C+', label: 'Đạt' },
      { min: 2.00, max: 2.49, letter: 'C',  label: 'Đạt' },
      { min: 1.50, max: 1.99, letter: 'D+', label: 'Đạt' },
      { min: 1.00, max: 1.49, letter: 'D',  label: 'Đạt' },
      { min: 0.00, max: 0.99, letter: 'F',  label: 'Không đạt' },
    ],

    // Bảng 4: Xếp loại GPA tổng kết
    gpaClassification: [
      { min: 3.60, max: 4.00, label: 'Xuất sắc' },
      { min: 3.20, max: 3.59, label: 'Giỏi' },
      { min: 2.50, max: 3.19, label: 'Khá' },
      { min: 2.00, max: 2.49, label: 'Trung bình' },
      { min: 0.00, max: 1.99, label: 'Yếu' },
    ],
  },
};

/**
 * Lấy config theo tên thang điểm
 * @param {'scale20'|'scale4'} scale
 * @returns {object}
 */
function getConfig(scale) {
  return GRADE_CONFIGS[scale] || GRADE_CONFIGS.scale20;
}

function roundScore(score) {
  return Math.round(Number(score) * 100) / 100;
}

function convertScore(score, fromScale, toScale) {
  if (score === null || score === undefined || score === '') return null;

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;

  const sourceScale = getConfig(fromScale);
  const targetScale = getConfig(toScale);

  if (sourceScale === targetScale) return roundScore(numericScore);
  return roundScore((numericScore / sourceScale.maxScore) * targetScale.maxScore);
}

/**
 * Tra cứu điểm chữ & phân loại cho 1 môn
 * @param {number} score - Điểm tổng kết môn
 * @param {'scale20'|'scale4'} scale
 * @returns {{ letter: string, label: string }}
 */
function getSubjectGrade(score, scale) {
  const config = getConfig(scale);
  if (score === null || score === undefined) {
    return { letter: '', label: '' };
  }
  const rounded = Math.round(score * 100) / 100;
  for (const tier of config.subjectGrades) {
    if (rounded >= tier.min && rounded <= tier.max) {
      return { letter: tier.letter, label: tier.label };
    }
  }
  // Fallback: tier cuối cùng (F / Kém)
  const last = config.subjectGrades[config.subjectGrades.length - 1];
  return { letter: last.letter, label: last.label };
}

/**
 * Tra cứu xếp loại GPA tổng kết
 * @param {number} gpa
 * @param {'scale20'|'scale4'} scale
 * @returns {string} label xếp loại
 */
function getGpaClassification(gpa, scale) {
  const config = getConfig(scale);
  if (gpa === null || gpa === undefined) return '';
  const rounded = Math.round(gpa * 100) / 100;
  for (const tier of config.gpaClassification) {
    if (rounded >= tier.min && rounded <= tier.max) {
      return tier.label;
    }
  }
  const last = config.gpaClassification[config.gpaClassification.length - 1];
  return last.label;
}

module.exports = { GRADE_CONFIGS, getConfig, getSubjectGrade, getGpaClassification, convertScore };
