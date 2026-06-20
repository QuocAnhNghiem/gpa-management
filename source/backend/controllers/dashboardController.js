const Subject = require('../models/Subject');
const Schedule = require('../models/Schedule');
const { getConfig, getGpaClassification, convertScore } = require('../utils/gradeConfig');

// Helper: Lấy thời điểm hiện tại ở múi giờ VN (UTC+7)
function getNowVN() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

// @desc    Lấy dữ liệu tổng quan cho Dashboard
// @route   GET /api/dashboard/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const userScale = req.user.gradingScale || 'scale20';
    const config = getConfig(userScale);

    // 1. Lấy danh sách môn học
    const subjects = await Subject.find({ userId: req.user.id });

    // 2. Tính GPA (weighted average) — nhóm theo gradingScale
    let totalGPA = 0, totalCredits = 0, autoCompletedCredits = 0;
    subjects.forEach(s => {
      const score = s.finalScore !== null && s.finalScore !== undefined
        ? s.finalScore
        : (s.score20 !== null && s.score20 !== undefined ? s.score20 : null); // backward compat
      if (score !== null && s.credits) {
        const sScale = s.gradingScale || 'scale20';
        const normalizedScore = convertScore(score, sScale, userScale);
        totalGPA += (normalizedScore * s.credits);
        totalCredits += s.credits;
      }
      if (s.isPassed && s.credits) {
        autoCompletedCredits += s.credits;
      }
    });
    const currentGPA = totalCredits > 0 ? (totalGPA / totalCredits).toFixed(2) : 0;

    // 3. Trả các môn đã có điểm để Frontend lọc theo ngưỡng động
    const riskThresholds = {
      scale20: { danger: 8.0, warning: 10.0 },
      scale4:  { danger: 1.0, warning: 2.0 },
    };
    const thresholds = riskThresholds[userScale] || riskThresholds.scale20;

    const riskSubjects = subjects
      .filter(s => {
        const score = s.finalScore ?? s.score20;
        return score !== null && score !== undefined;
      })
      .map(s => {
        const score = s.finalScore ?? s.score20;
        const sScale = s.gradingScale || 'scale20';
        const normalizedScore = convertScore(score, sScale, userScale);
        return {
          name: s.name,
          credits: s.credits,
          gpa: score,
          gradingScale: sScale,
          status: normalizedScore < thresholds.danger ? 'Nguy hiểm' : 'Cảnh báo'
        };
      });

    // 4. Lấy lịch trong ngày hôm nay (theo múi giờ VN)
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const vnNow = getNowVN();
    const todayStr = days[vnNow.getUTCDay()];
    const todayDate = vnNow.toISOString().split('T')[0];

    const todaySchedules = await Schedule.find({
      userId: req.user.id,
      $or: [
        { type: 'class', day: todayStr },
        { type: { $in: ['deadline', 'exam'] }, specificDate: todayDate }
      ]
    }).sort({ startTime: 1 });

    // 5. Attendance summary (Removed)
    let totalAbsent = 0;

    // 6. Upcoming deadlines (7 ngày tới, từ hôm nay theo VN timezone)
    const today = new Date(todayDate + 'T00:00:00Z');
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Schedule.find({
      userId: req.user.id,
      type: { $in: ['deadline', 'exam'] },
      specificDate: {
        $gte: todayDate,
        $lte: nextWeek.toISOString().split('T')[0]
      }
    }).sort({ specificDate: 1 });

    // 7. Chart data — GPA xu hướng theo học kỳ
    const semesterMap = new Map();
    subjects.forEach(s => {
      const score = s.finalScore ?? s.score20;
      if (score == null || !s.credits) return;
      const key = `Năm ${s.year} - ${s.semester}`;
      const current = semesterMap.get(key) || { total: 0, credits: 0, year: s.year, semester: s.semester };
      const sScale = s.gradingScale || 'scale20';
      const normalizedScore = convertScore(score, sScale, userScale);

      current.total += normalizedScore * s.credits;
      current.credits += s.credits;
      semesterMap.set(key, current);
    });

    const chartData = [...semesterMap.values()]
      .sort((a, b) => a.year - b.year || String(a.semester).localeCompare(String(b.semester)))
      .map(item => ({
        ky: `Y${item.year} ${item.semester}`,
        gpa: Number((item.total / item.credits).toFixed(2)),
        target: req.user.targetGpa || 0,
      }));

    // 8. Xếp loại GPA
    const gpaClassificationLabel = getGpaClassification(parseFloat(currentGPA), userScale);

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          currentSemester: req.user.currentSemester,
          gradeCustomization: req.user.gradeCustomization,
          gradingScale: userScale,
        },
        academics: {
          totalSubjects: subjects.length,
          currentGPA: parseFloat(currentGPA),
          targetGPA: req.user.targetGpa,
          gpaClassification: gpaClassificationLabel,
          maxScore: config.maxScore,
          completedCredits: parseInt(req.user.completedCredits || 0) + autoCompletedCredits,
          totalRequiredCredits: req.user.totalRequiredCredits || 155,
          riskSubjects,
          chartData
        },
        attendance: {
          totalAbsent,
          isViolating: false
        },
        schedule: {
          todayCount: todaySchedules.length,
          todaySchedules,
          upcomingDeadlines
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
