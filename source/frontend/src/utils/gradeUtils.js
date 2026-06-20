/**
 * Cấu hình đa thang điểm (Hệ 20 & Hệ 4) — Frontend mirror
 * Mỗi hệ hoàn toàn độc lập — KHÔNG quy đổi qua lại.
 */

export const GRADE_CONFIGS = {
  scale20: {
    maxScore: 20,
    step: 0.50,
    passThreshold: 10.00,
    label: 'Thang 20',
    shortLabel: '/ 20',
    description: 'Phổ biến tại Đại học Bách Khoa, USTH, hệ Pháp',
    defaultTargetGpa: 14.00,

    // Bảng 1: Điểm từng môn → Điểm chữ
    subjectGrades: [
      { min: 18.00, max: 20.00, letter: 'A+', label: 'Đạt', color: '#059669' },
      { min: 16.00, max: 17.99, letter: 'A',  label: 'Đạt', color: '#059669' },
      { min: 14.00, max: 15.99, letter: 'B+', label: 'Đạt', color: '#3182ce' },
      { min: 13.00, max: 13.99, letter: 'B',  label: 'Đạt', color: '#6366f1' },
      { min: 12.00, max: 12.99, letter: 'C+', label: 'Đạt', color: '#d97706' },
      { min: 11.00, max: 11.99, letter: 'C',  label: 'Đạt', color: '#ea580c' },
      { min: 10.00, max: 10.99, letter: 'D',  label: 'Đạt', color: '#64748b' },
      { min: 0.00,  max: 9.99,  letter: 'F',  label: 'Không đạt', color: '#dc2626' },
    ],

    // Bảng 2: Xếp loại GPA tổng kết
    gpaClassification: [
      { min: 17.00, max: 20.00, label: 'Xuất sắc',       color: '#059669' },
      { min: 15.00, max: 16.99, label: 'Giỏi',           color: '#3182ce' },
      { min: 13.00, max: 14.99, label: 'Khá',            color: '#6366f1' },
      { min: 12.00, max: 12.99, label: 'Trung bình khá', color: '#d97706' },
      { min: 10.00, max: 11.99, label: 'Trung bình',     color: '#64748b' },
      { min: 0.00,  max: 9.99,  label: 'Không đạt',      color: '#dc2626' },
    ],

    // Bảng hiển thị Onboarding/Settings
    displayTable: [
      { range: '18.00 – 20.00', letter: 'A+', label: 'Đạt', color: 'text-emerald-600' },
      { range: '16.00 – 17.99', letter: 'A',  label: 'Đạt', color: 'text-emerald-600' },
      { range: '14.00 – 15.99', letter: 'B+', label: 'Đạt', color: 'text-blue-600' },
      { range: '13.00 – 13.99', letter: 'B',  label: 'Đạt', color: 'text-indigo-600' },
      { range: '12.00 – 12.99', letter: 'C+', label: 'Đạt', color: 'text-amber-600' },
      { range: '11.00 – 11.99', letter: 'C',  label: 'Đạt', color: 'text-orange-600' },
      { range: '10.00 – 10.99', letter: 'D',  label: 'Đạt', color: 'text-slate-500' },
      { range: '0.00 – 9.99',   letter: 'F',  label: 'Không đạt', color: 'text-red-700' },
    ],
    displayGpaTable: [
      { range: '17.00 – 20.00', label: 'Xuất sắc',       color: 'text-emerald-600' },
      { range: '15.00 – 16.99', label: 'Giỏi',           color: 'text-blue-600' },
      { range: '13.00 – 14.99', label: 'Khá',            color: 'text-indigo-600' },
      { range: '12.00 – 12.99', label: 'Trung bình khá', color: 'text-amber-600' },
      { range: '10.00 – 11.99', label: 'Trung bình',     color: 'text-slate-600' },
      { range: '< 10.00',       label: 'Không đạt',      color: 'text-red-700' },
    ],
  },

  scale4: {
    maxScore: 4,
    step: 0.10,
    passThreshold: 1.00,
    label: 'Thang 4',
    shortLabel: '/ 4',
    description: 'Phổ biến tại phần lớn các trường ĐH Việt Nam',
    defaultTargetGpa: 3.00,

    // Bảng 3: Điểm từng môn → Điểm chữ
    subjectGrades: [
      { min: 4.00, max: 4.00, letter: 'A',  label: 'Đạt', color: '#059669' },
      { min: 3.50, max: 3.99, letter: 'B+', label: 'Đạt', color: '#3182ce' },
      { min: 3.00, max: 3.49, letter: 'B',  label: 'Đạt', color: '#6366f1' },
      { min: 2.50, max: 2.99, letter: 'C+', label: 'Đạt', color: '#d97706' },
      { min: 2.00, max: 2.49, letter: 'C',  label: 'Đạt', color: '#64748b' },
      { min: 1.50, max: 1.99, letter: 'D+', label: 'Đạt', color: '#ea580c' },
      { min: 1.00, max: 1.49, letter: 'D',  label: 'Đạt', color: '#ef4444' },
      { min: 0.00, max: 0.99, letter: 'F',  label: 'Không đạt', color: '#dc2626' },
    ],

    // Bảng 4: Xếp loại GPA tổng kết
    gpaClassification: [
      { min: 3.60, max: 4.00, label: 'Xuất sắc',   color: '#059669' },
      { min: 3.20, max: 3.59, label: 'Giỏi',       color: '#3182ce' },
      { min: 2.50, max: 3.19, label: 'Khá',        color: '#6366f1' },
      { min: 2.00, max: 2.49, label: 'Trung bình', color: '#d97706' },
      { min: 0.00, max: 1.99, label: 'Yếu',        color: '#dc2626' },
    ],

    // Bảng hiển thị Onboarding/Settings
    displayTable: [
      { range: '4.00',         letter: 'A',  label: 'Đạt', color: 'text-emerald-600' },
      { range: '3.50 – 3.99',  letter: 'B+', label: 'Đạt', color: 'text-blue-600' },
      { range: '3.00 – 3.49',  letter: 'B',  label: 'Đạt', color: 'text-indigo-600' },
      { range: '2.50 – 2.99',  letter: 'C+', label: 'Đạt', color: 'text-amber-600' },
      { range: '2.00 – 2.49',  letter: 'C',  label: 'Đạt', color: 'text-slate-600' },
      { range: '1.50 – 1.99',  letter: 'D+', label: 'Đạt', color: 'text-orange-600' },
      { range: '1.00 – 1.49',  letter: 'D',  label: 'Đạt', color: 'text-rose-500' },
      { range: '0.00 – 0.99',  letter: 'F',  label: 'Không đạt', color: 'text-red-700' },
    ],
    displayGpaTable: [
      { range: '3.60 – 4.00', label: 'Xuất sắc',   color: 'text-emerald-600' },
      { range: '3.20 – 3.59', label: 'Giỏi',       color: 'text-blue-600' },
      { range: '2.50 – 3.19', label: 'Khá',        color: 'text-indigo-600' },
      { range: '2.00 – 2.49', label: 'Trung bình', color: 'text-amber-600' },
      { range: '0.00 – 1.99', label: 'Yếu',        color: 'text-red-700' },
    ],
  },
};

// =================== HELPER FUNCTIONS ===================

/**
 * Lấy config theo tên thang điểm
 */
export function getConfig(scale) {
  return GRADE_CONFIGS[scale] || GRADE_CONFIGS.scale20;
}

function roundScore(score) {
  return Math.round(Number(score) * 100) / 100;
}

export function convertScore(score, fromScale, toScale) {
  if (score === null || score === undefined || score === '') return null;

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;

  const source = getConfig(fromScale);
  const target = getConfig(toScale);

  if (source === target) return roundScore(numericScore);
  return roundScore((numericScore / source.maxScore) * target.maxScore);
}

/**
 * Tra cứu điểm chữ & phân loại cho 1 môn
 */
export function getSubjectGrade(score, scale) {
  const config = getConfig(scale);
  if (score === null || score === undefined) {
    return { letter: '-', label: '-', color: '#94a3b8' };
  }
  const rounded = Math.round(score * 100) / 100;
  for (const tier of config.subjectGrades) {
    if (rounded >= tier.min && rounded <= tier.max) {
      return { letter: tier.letter, label: tier.label, color: tier.color };
    }
  }
  const last = config.subjectGrades[config.subjectGrades.length - 1];
  return { letter: last.letter, label: last.label, color: last.color };
}

/**
 * Tra cứu xếp loại GPA tổng kết
 */
export function getGpaClassification(gpa, scale) {
  const config = getConfig(scale);
  if (gpa === null || gpa === undefined) return { label: '-', color: '#94a3b8' };
  const rounded = Math.round(gpa * 100) / 100;
  for (const tier of config.gpaClassification) {
    if (rounded >= tier.min && rounded <= tier.max) {
      return { label: tier.label, color: tier.color };
    }
  }
  const last = config.gpaClassification[config.gpaClassification.length - 1];
  return { label: last.label, color: last.color };
}

/**
 * Lấy max score theo thang
 */
export function getMaxScore(scale) {
  return getConfig(scale).maxScore;
}

/**
 * Lấy label hiển thị (VD: "/ 20" hoặc "/ 4")
 */
export function getMaxLabel(scale) {
  return getConfig(scale).shortLabel;
}

/**
 * Lấy ngưỡng qua môn
 */
export function getPassThreshold(scale) {
  return getConfig(scale).passThreshold;
}

export function getDefaultRiskThreshold(scale) {
  return scale === 'scale4' ? 2.0 : 10.0;
}

/**
 * Format điểm hiển thị (VD: "14.50 / 20" hoặc "3.50 / 4")
 */
export function formatScore(score, scale) {
  if (score === null || score === undefined) return '—';
  return `${Number(score).toFixed(2)} ${getMaxLabel(scale)}`;
}

/**
 * Lấy gợi ý xếp loại cho mức GPA mục tiêu (dùng trong slider)
 */
export function getTargetGpaHint(targetGpa, scale) {
  const cls = getGpaClassification(targetGpa, scale);
  return cls.label;
}
