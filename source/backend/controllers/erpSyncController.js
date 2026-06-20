const Subject = require('../models/Subject');
const Schedule = require('../models/Schedule');
const IntegrationSyncLog = require('../models/IntegrationSyncLog');
const { getSubjectGrade } = require('../utils/gradeConfig');

const SOURCE = 'usth_erp';
const DAY_NAMES = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase();
}

function normalizeSearchText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function isConditionalRawSubject(raw = {}) {
  if (raw.isConditionalCourse === true) return true;
  if (normalizeKey(raw.section) === 'conditional_course') return true;

  const text = normalizeSearchText([
    raw.section,
    raw.group,
    raw.category,
    raw.name,
    raw.title,
  ].filter(Boolean).join(' '));

  return text.includes('hoc phan dieu kien') || text.includes('conditional course');
}

function getRawGpaSubjects(payload = {}) {
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  return subjects.filter(subject => !isConditionalRawSubject(subject));
}

function getRawConditionalSubjects(payload = {}) {
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  const excludedSubjects = Array.isArray(payload.excludedSubjects) ? payload.excludedSubjects : [];
  return [
    ...excludedSubjects,
    ...subjects.filter(isConditionalRawSubject),
  ];
}

function classifyScore(score20, fallbackLetter = '') {
  if (score20 === null || score20 === undefined || score20 === '') {
    return { score20: null, scoreLetter: fallbackLetter || '', classification: '', isPassed: false };
  }
  const score = Number(score20);
  if (!Number.isFinite(score)) {
    return { score20: null, scoreLetter: fallbackLetter || '', classification: '', isPassed: false };
  }
  if (fallbackLetter) {
    return { score20: score, scoreLetter: fallbackLetter, classification: score >= 10 ? 'Đã hoàn thành' : 'Không đạt', isPassed: score >= 10 };
  }
  const grade = getSubjectGrade(score, 'scale20');
  return {
    score20: score,
    scoreLetter: grade.letter,
    classification: score >= 10 ? 'Đã hoàn thành' : 'Không đạt',
    isPassed: score >= 10,
  };
}

function buildSemesterYearMap(subjects) {
  const academicYears = [...new Set(subjects
    .map(s => cleanText(s.semesterCode).slice(0, 4))
    .filter(Boolean))]
    .sort();

  return academicYears.reduce((acc, yearCode, index) => {
    acc[yearCode] = Math.min(index + 1, 4);
    return acc;
  }, {});
}

function mapSemester(semesterCode, yearMap) {
  const code = cleanText(semesterCode);
  const academicYear = code.slice(0, 4);
  const term = code.slice(-1);
  return {
    year: yearMap[academicYear] || 1,
    semester: term === '2' ? 'Kỳ 2' : 'Kỳ 1',
  };
}

function normalizeSubject(raw, yearMap) {
  const code = cleanText(raw.code || raw.courseCode);
  const name = cleanText(raw.name || raw.title);
  const semesterCode = cleanText(raw.semesterCode || raw.semester);
  const credits = Number(raw.credits);
  const score = raw.score20 === null || raw.score20 === undefined || raw.score20 === ''
    ? null
    : Number(raw.score20);
  const mapped = mapSemester(semesterCode, yearMap);
  const scoreMeta = classifyScore(Number.isFinite(score) ? score : null, cleanText(raw.ectsGrade || raw.scoreLetter));

  return {
    code,
    name,
    credits: Number.isFinite(credits) ? credits : 0,
    semesterCode,
    year: mapped.year,
    semester: mapped.semester,
    score20: scoreMeta.score20,
    scoreLetter: scoreMeta.scoreLetter,
    classification: scoreMeta.classification,
    isPassed: scoreMeta.isPassed,
    validation: cleanText(raw.validation),
  };
}

function getSubjectKey(subject) {
  return `${normalizeKey(subject.code || subject.name)}::${subject.year}::${normalizeKey(subject.semester)}`;
}

function getDayFromDate(dateStr) {
  if (!dateStr) return undefined;
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_NAMES[date.getDay()];
}

function normalizeSchedule(raw) {
  const name = cleanText(raw.name || raw.courseTitle || raw.title);
  const date = cleanText(raw.date || raw.specificDate);
  const startTime = cleanText(raw.startTime);
  const endTime = cleanText(raw.endTime);
  const courseCode = cleanText(raw.courseCode || raw.code);
  const room = cleanText(raw.room);
  const instructor = cleanText(raw.instructor);
  const typeHint = `${courseCode} ${name}`.toLowerCase();

  return {
    name,
    type: typeHint.includes('exam') ? 'exam' : 'class',
    color: typeHint.includes('exam') ? '#EF4444' : '#3B82F6',
    day: getDayFromDate(date),
    specificDate: date,
    startTime,
    endTime,
    room,
    instructor,
    priority: typeHint.includes('exam') ? 'high' : 'medium',
    isCompleted: false,
    courseCode,
    lessonType: cleanText(raw.lessonType),
  };
}

function getScheduleKey(schedule) {
  return [
    normalizeKey(schedule.courseCode || schedule.name),
    schedule.specificDate,
    schedule.startTime,
    schedule.endTime,
  ].join('::');
}

function dedupeByKey(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()];
}

async function cleanupDuplicateSchedules(userId) {
  const schedules = await Schedule.find({ userId }).sort({ createdAt: 1 });
  const seen = new Set();
  const duplicateIds = [];

  schedules.forEach((schedule) => {
    const key = getScheduleKey(schedule);
    if (seen.has(key)) {
      duplicateIds.push(schedule._id);
      return;
    }
    seen.add(key);
  });

  if (duplicateIds.length > 0) {
    await Schedule.deleteMany({ _id: { $in: duplicateIds }, userId });
  }

  return duplicateIds.length;
}

function overlaps(a, b) {
  return a.specificDate &&
    a.specificDate === b.specificDate &&
    a.startTime < b.endTime &&
    a.endTime > b.startTime;
}

function emptyDiff() {
  return {
    subjects: { create: [], update: [], unchanged: [], conflicts: [] },
    schedules: { create: [], update: [], unchanged: [], conflicts: [] },
  };
}

function summarizeDiff(diff) {
  return {
    subjects: {
      create: diff.subjects.create.length,
      update: diff.subjects.update.length,
      unchanged: diff.subjects.unchanged.length,
      conflicts: diff.subjects.conflicts.length,
    },
    schedules: {
      create: diff.schedules.create.length,
      update: diff.schedules.update.length,
      unchanged: diff.schedules.unchanged.length,
      conflicts: diff.schedules.conflicts.length,
    },
  };
}

function getTranscriptScaleError(userScale, hasSubjects) {
  if (!hasSubjects) return null;
  if ((userScale || 'scale20') === 'scale20') return null;
  return 'Đồng bộ bảng điểm ERP chỉ hỗ trợ khi tài khoản đang ở thang 20. Hãy đổi hệ trước khi đồng bộ bảng điểm.';
}

function getTranscriptScoreError(payload) {
  const subjects = getRawGpaSubjects(payload);
  if (subjects.length === 0) return null;

  const scoredCount = subjects.filter((subject) => {
    const value = subject?.score20;
    if (value === null || value === undefined || value === '') return false;
    const score = Number(value);
    return Number.isFinite(score) && score >= 0 && score <= 20;
  }).length;

  if (scoredCount > 0) return null;
  return 'Không tìm thấy điểm số trong payload bảng điểm ERP. Hãy reload extension và quét lại trang bảng điểm trước khi đồng bộ.';
}

async function buildDiff(userId, payload) {
  const diff = emptyDiff();
  const rawSubjects = getRawGpaSubjects(payload);
  const rawSchedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  const yearMap = buildSemesterYearMap(rawSubjects);
  const incomingSubjects = dedupeByKey(
    rawSubjects
      .map(raw => normalizeSubject(raw, yearMap))
      .filter(subject => subject.name && subject.credits >= 1),
    getSubjectKey,
  );
  const incomingSchedules = dedupeByKey(
    rawSchedules
      .map(normalizeSchedule)
      .filter(schedule => schedule.name && schedule.specificDate && schedule.startTime && schedule.endTime),
    getScheduleKey,
  );

  const existingSubjects = await Subject.find({ userId });
  const subjectMap = new Map(existingSubjects.map(subject => [getSubjectKey(subject), subject]));

  incomingSubjects.forEach(subject => {
    const existing = subjectMap.get(getSubjectKey(subject));
    if (!existing) {
      diff.subjects.create.push(subject);
      return;
    }

    if (existing.credits !== subject.credits && existing.score20 != null && subject.score20 != null) {
      diff.subjects.conflicts.push({ incoming: subject, existing, reason: 'Số tín chỉ khác dữ liệu hiện có' });
      return;
    }

    const needsUpdate =
      existing.name !== subject.name ||
      existing.credits !== subject.credits ||
      existing.score20 !== subject.score20 ||
      existing.scoreLetter !== subject.scoreLetter;

    if (needsUpdate) diff.subjects.update.push({ id: existing._id, incoming: subject, existing });
    else diff.subjects.unchanged.push(subject);
  });

  const existingSchedules = await Schedule.find({ userId });
  const scheduleMap = new Map(existingSchedules.map(schedule => [getScheduleKey(schedule), schedule]));

  incomingSchedules.forEach(schedule => {
    const existing = scheduleMap.get(getScheduleKey(schedule));
    if (existing) {
      const needsUpdate = existing.instructor !== schedule.instructor || existing.type !== schedule.type || existing.day !== schedule.day;
      if (needsUpdate) diff.schedules.update.push({ id: existing._id, incoming: schedule, existing });
      else diff.schedules.unchanged.push(schedule);
      return;
    }

    const conflict = [...existingSchedules, ...diff.schedules.create].find(item => overlaps(schedule, item));
    if (conflict) {
      diff.schedules.conflicts.push({ incoming: schedule, existing: conflict, reason: 'Trùng giờ với lịch hiện có' });
      return;
    }

    diff.schedules.create.push(schedule);
  });

  return diff;
}

async function deleteExcludedConditionalSubjects(userId, payload) {
  const rawSubjects = getRawConditionalSubjects(payload)
    .map(raw => ({
      code: cleanText(raw.code || raw.courseCode),
      name: cleanText(raw.name || raw.title),
    }))
    .filter(subject => subject.code || subject.name);

  const uniqueKeys = new Map(rawSubjects.map(subject => [`${subject.code}::${subject.name}`, subject]));
  const conditions = [...uniqueKeys.values()].map((subject) => {
    if (subject.code) return { code: subject.code };
    return { name: subject.name };
  });

  if (conditions.length === 0) return 0;

  const result = await Subject.deleteMany({
    userId,
    $or: conditions,
  });

  return result.deletedCount || 0;
}

function subjectToDoc(subject, userId) {
  const doc = {
    userId,
    name: subject.name,
    credits: subject.credits,
    year: subject.year,
    semester: subject.semester,
    gradingScale: 'scale20',
    finalScore: subject.score20,
    scoreLetter: subject.scoreLetter,
    classification: subject.classification,
    isPassed: subject.isPassed,
    scoreComponents: [],
  };

  if (subject.code) doc.code = subject.code;
  return doc;
}

function scheduleToDoc(schedule, userId) {
  return {
    userId,
    type: schedule.type,
    name: schedule.name,
    courseCode: schedule.courseCode,
    lessonType: schedule.lessonType,
    color: schedule.color,
    day: schedule.day,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    room: schedule.room,
    instructor: schedule.instructor,
    priority: schedule.priority,
    specificDate: schedule.specificDate,
    isCompleted: false,
  };
}

async function createSyncLog(userId, logData) {
  const log = await IntegrationSyncLog.create({
    userId,
    source: SOURCE,
    ...logData,
  });

  try {
    const logs = await IntegrationSyncLog.find({ userId, source: SOURCE })
      .sort({ createdAt: -1 })
      .select('_id');
    if (logs.length > 10) {
      const idsToDelete = logs.slice(10).map(l => l._id);
      await IntegrationSyncLog.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('Failed to prune sync logs:', err);
  }

  return log;
}

exports.previewUsthErpSync = async (req, res, next) => {
  try {
    const transcriptScoreError = getTranscriptScoreError(req.body || {});
    if (transcriptScoreError) {
      await IntegrationSyncLog.create({
        userId: req.user.id,
        source: SOURCE,
        status: 'failed',
        summary: summarizeDiff(emptyDiff()),
        errorMessages: [transcriptScoreError],
      });
      return res.status(422).json({ success: false, message: transcriptScoreError });
    }

    const transcriptScaleError = getTranscriptScaleError(
      req.user.gradingScale,
      getRawGpaSubjects(req.body).length > 0,
    );

    if (transcriptScaleError) {
      await createSyncLog(req.user.id, {
        status: 'failed',
        summary: summarizeDiff(emptyDiff()),
        errorMessages: [transcriptScaleError],
      });
      return res.status(409).json({ success: false, message: transcriptScaleError });
    }

    const diff = await buildDiff(req.user.id, req.body || {});
    await createSyncLog(req.user.id, {
      status: 'previewed',
      summary: summarizeDiff(diff),
    });
    res.status(200).json({ success: true, data: { diff, summary: summarizeDiff(diff) } });
  } catch (error) {
    next(error);
  }
};

exports.syncUsthErp = async (req, res, next) => {
  try {
    const transcriptScoreError = getTranscriptScoreError(req.body || {});
    if (transcriptScoreError) {
      await IntegrationSyncLog.create({
        userId: req.user.id,
        source: SOURCE,
        status: 'failed',
        summary: summarizeDiff(emptyDiff()),
        errorMessages: [transcriptScoreError],
      });
      return res.status(422).json({ success: false, message: transcriptScoreError });
    }

    const transcriptScaleError = getTranscriptScaleError(
      req.user.gradingScale,
      getRawGpaSubjects(req.body).length > 0,
    );

    if (transcriptScaleError) {
      await createSyncLog(req.user.id, {
        status: 'failed',
        summary: summarizeDiff(emptyDiff()),
        errorMessages: [transcriptScaleError],
      });
      return res.status(409).json({ success: false, message: transcriptScaleError });
    }

    if (Array.isArray(req.body?.schedules) && req.body.schedules.length > 0) {
      await cleanupDuplicateSchedules(req.user.id);
    }

    const diff = await buildDiff(req.user.id, req.body || {});
    await deleteExcludedConditionalSubjects(req.user.id, req.body || {});

    for (const subject of diff.subjects.create) {
      await Subject.create(subjectToDoc(subject, req.user.id));
    }

    for (const item of diff.subjects.update) {
      const subject = await Subject.findOne({ _id: item.id, userId: req.user.id });
      if (!subject) continue;
      Object.assign(subject, subjectToDoc(item.incoming, req.user.id));
      await subject.save();
    }

    for (const schedule of diff.schedules.create) {
      await Schedule.create(scheduleToDoc(schedule, req.user.id));
    }

    for (const item of diff.schedules.update) {
      await Schedule.findOneAndUpdate(
        { _id: item.id, userId: req.user.id },
        scheduleToDoc(item.incoming, req.user.id),
        { returnDocument: 'after', runValidators: true },
      );
    }

    const summary = summarizeDiff(diff);
    await createSyncLog(req.user.id, {
      status: 'synced',
      summary,
    });

    res.status(200).json({ success: true, data: { diff, summary } });
  } catch (error) {
    await createSyncLog(req.user.id, {
      status: 'failed',
      errorMessages: [error.message],
    }).catch(() => {});
    next(error);
  }
};

exports.getUsthErpHistory = async (req, res, next) => {
  try {
    const logs = await IntegrationSyncLog.find({ userId: req.user.id, source: SOURCE })
      .sort({ createdAt: -1 })
      .limit(10);
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};
