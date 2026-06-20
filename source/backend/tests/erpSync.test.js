const request = require('supertest');
const app = require('../app');
const Schedule = require('../models/Schedule');
const Subject = require('../models/Subject');
const User = require('../models/User');

describe('USTH ERP Sync API', () => {
  let accessToken;
  let user;

  const duplicatedTimetablePayload = {
    source: 'usth_erp',
    page: 'timetable',
    subjects: [],
    schedules: [
      {
        courseCode: '252ICT2009.L2',
        name: 'Công nghệ phần mềm',
        date: '2026-06-02',
        startTime: '13:00',
        endTime: '15:45',
        room: '2H-8 (Hội trường tầng 8)',
        instructor: 'Kiều Quốc Việt',
        lessonType: 'Lý thuyết',
      },
      {
        courseCode: '252ICT2009.L2',
        name: 'Công nghệ phần mềm',
        date: '2026-06-02',
        startTime: '13:00',
        endTime: '15:45',
        room: '2H-8 (Hội trường tầng 8)',
        instructor: 'Kiều Quốc Việt',
        lessonType: 'Lý thuyết',
      },
    ],
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'testsecret';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'ERP Student',
        email: 'erp-student@example.com',
        password: 'password123',
      });

    accessToken = res.body.accessToken;
    user = await User.findOne({ email: 'erp-student@example.com' });
  });

  it('deduplicates repeated timetable events before preview and sync', async () => {
    const previewRes = await request(app)
      .post('/api/integrations/usth-erp/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(duplicatedTimetablePayload);

    expect(previewRes.statusCode).toBe(200);
    expect(previewRes.body.data.summary.schedules.create).toBe(1);

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(duplicatedTimetablePayload);

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.data.summary.schedules.create).toBe(1);
    expect(await Schedule.countDocuments()).toBe(1);

    const secondPreviewRes = await request(app)
      .post('/api/integrations/usth-erp/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(duplicatedTimetablePayload);

    expect(secondPreviewRes.statusCode).toBe(200);
    expect(secondPreviewRes.body.data.summary.schedules.create).toBe(0);
    expect(secondPreviewRes.body.data.summary.schedules.unchanged).toBe(1);
  });

  it('cleans up old duplicated timetable events when syncing again', async () => {
    const oldDuplicate = {
      userId: user._id,
      courseCode: '252ICT2009.L2',
      type: 'class',
      name: 'Công nghệ phần mềm',
      startTime: '13:00',
      endTime: '15:45',
      room: '2H-8 (Hội trường tầng 8)',
      instructor: 'Kiều Quốc Việt',
      specificDate: '2026-06-02',
      day: 'Thứ 3',
    };

    await Schedule.create(oldDuplicate);
    await Schedule.create(oldDuplicate);
    expect(await Schedule.countDocuments()).toBe(2);

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(duplicatedTimetablePayload);

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.data.summary.schedules.create).toBe(0);
    expect(syncRes.body.data.summary.schedules.unchanged).toBe(1);
    expect(await Schedule.countDocuments()).toBe(1);
  });

  it('persists transcript scores when syncing ERP grades', async () => {
    const transcriptPayload = {
      source: 'usth_erp',
      page: 'personal-transcript',
      subjects: [
        {
          code: 'ICT2.005',
          name: 'Dai cuong ve cac he co so du lieu',
          credits: 3,
          semesterCode: '20251',
          score20: 18.1,
          ectsGrade: 'A+',
          validation: 'Da hoan thanh / Yes',
        },
      ],
      schedules: [],
    };

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(transcriptPayload);

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.data.summary.subjects.create).toBe(1);

    const subject = await Subject.findOne({ userId: user._id, code: 'ICT2.005' }).lean();
    expect(subject).not.toBeNull();
    expect(subject.finalScore).toBe(18.1);
    expect(subject.scoreLetter).toBe('A+');
    expect(subject.isPassed).toBe(true);
  });

  it('updates existing ERP subjects that were previously synced without numeric scores', async () => {
    await Subject.create({
      userId: user._id,
      code: 'ICT2.005',
      name: 'Dai cuong ve cac he co so du lieu',
      credits: 3,
      year: 2,
      semester: 'Kỳ 1',
      gradingScale: 'scale20',
      finalScore: null,
      scoreLetter: 'A+',
      classification: 'Đã hoàn thành',
      isPassed: true,
      scoreComponents: [],
    });

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'personal-transcript',
        subjects: [
          {
            code: 'BIO1.001',
            name: 'Sinh hoc te bao',
            credits: 4,
            semesterCode: '20241',
            score20: 13.9,
            ectsGrade: 'B',
            validation: 'Da hoan thanh / Yes',
          },
          {
            code: 'ICT2.005',
            name: 'Dai cuong ve cac he co so du lieu',
            credits: 3,
            semesterCode: '20251',
            score20: 18.1,
            ectsGrade: 'A+',
            validation: 'Da hoan thanh / Yes',
          },
        ],
        schedules: [],
      });

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.data.summary.subjects.update).toBe(1);

    const subject = await Subject.findOne({ userId: user._id, code: 'ICT2.005' }).lean();
    expect(subject.finalScore).toBe(18.1);
    expect(subject.scoreLetter).toBe('A+');
    expect(subject.isPassed).toBe(true);
  });

  it('rejects transcript payloads that do not contain any numeric score', async () => {
    const transcriptPayload = {
      source: 'usth_erp',
      page: 'personal-transcript',
      subjects: [
        {
          code: 'BIO1.001',
          name: 'Sinh hoc te bao',
          credits: 4,
          semesterCode: '20241',
          score20: null,
          ectsGrade: 'B',
          validation: 'Da hoan thanh / Yes',
        },
      ],
      schedules: [],
    };

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(transcriptPayload);

    expect(syncRes.statusCode).toBe(422);
    expect(syncRes.body.success).toBe(false);
    expect(await Subject.countDocuments({ userId: user._id, code: 'BIO1.001' })).toBe(0);
  });

  it('ignores conditional courses because they are not part of GPA', async () => {
    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'personal-transcript',
        subjects: [
          {
            code: 'BIO1.001',
            name: 'Sinh hoc te bao',
            credits: 4,
            semesterCode: '20241',
            score20: 13.9,
            ectsGrade: 'B',
            validation: 'Da hoan thanh / Yes',
          },
          {
            code: 'ENG0.001',
            name: 'English Conditional Course',
            credits: 0,
            semesterCode: '20241',
            score20: 15,
            ectsGrade: 'B+',
            validation: 'Da hoan thanh / Yes',
            section: 'conditional_course',
            isConditionalCourse: true,
          },
        ],
        schedules: [],
      });

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.data.summary.subjects.create).toBe(1);
    expect(await Subject.countDocuments({ userId: user._id, code: 'BIO1.001' })).toBe(1);
    expect(await Subject.countDocuments({ userId: user._id, code: 'ENG0.001' })).toBe(0);
  });

  it('removes conditional courses that were previously synced by mistake', async () => {
    // Simulate legacy bad data that existed before Subject.credits required min 1.
    await Subject.collection.insertOne({
      userId: user._id,
      code: 'ENG0.001',
      name: 'English Conditional Course',
      credits: 0,
      year: 1,
      semester: 'Kỳ 1',
      gradingScale: 'scale20',
      finalScore: 15,
      scoreLetter: 'B+',
      classification: 'Đã hoàn thành',
      isPassed: true,
      scoreComponents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'personal-transcript',
        subjects: [
          {
            code: 'BIO1.001',
            name: 'Sinh hoc te bao',
            credits: 4,
            semesterCode: '20241',
            score20: 13.9,
            ectsGrade: 'B',
            validation: 'Da hoan thanh / Yes',
          },
        ],
        excludedSubjects: [
          {
            code: 'ENG0.001',
            name: 'English Conditional Course',
            credits: 0,
            semesterCode: '20241',
            score20: 15,
            ectsGrade: 'B+',
            validation: 'Da hoan thanh / Yes',
            section: 'conditional_course',
            isConditionalCourse: true,
          },
        ],
        schedules: [],
      });

    expect(syncRes.statusCode).toBe(200);
    expect(await Subject.countDocuments({ userId: user._id, code: 'ENG0.001' })).toBe(0);
  });
});
