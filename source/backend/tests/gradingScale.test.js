const request = require('supertest');
const app = require('../app');
const Schedule = require('../models/Schedule');
const Subject = require('../models/Subject');
const User = require('../models/User');

describe('Grading Scale Logic', () => {
  let accessToken;
  let user;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'testsecret';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Scale User',
        email: 'scale-user@example.com',
        password: 'password123',
      });

    accessToken = res.body.accessToken;
    user = await User.findOne({ email: 'scale-user@example.com' });
  });

  it('creates new subjects in scale4 using the user grading scale', async () => {
    await User.findByIdAndUpdate(user._id, { gradingScale: 'scale4' });

    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Discrete Mathematics',
        code: 'MAT201',
        credits: 3,
        year: 2,
        semester: 'Kỳ 1',
        scoreComponents: [
          { name: 'midterm', weight: 0.5, score: 3.0 },
          { name: 'final', weight: 0.5, score: 4.0 },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.gradingScale).toBe('scale4');
    expect(res.body.data.finalScore).toBe(3.5);
    expect(res.body.data.scoreLetter).toBe('B+');
    expect(res.body.data.isPassed).toBe(true);
  });

  it('does not allow existing subjects to silently change grading scale', async () => {
    const createRes = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Linear Algebra',
        code: 'MAT101',
        credits: 3,
        year: 1,
        semester: 'Kỳ 1',
        scoreComponents: [
          { name: 'midterm', weight: 0.5, score: 12 },
          { name: 'final', weight: 0.5, score: 14 },
        ],
      });

    await User.findByIdAndUpdate(user._id, { gradingScale: 'scale4' });

    const updateRes = await request(app)
      .put(`/api/subjects/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        gradingScale: 'scale4',
        scoreComponents: [
          { name: 'quiz', weight: 1, score: 3.5 },
        ],
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.gradingScale).toBe('scale20');
    expect(updateRes.body.data.finalScore).toBe(3.5);
    expect(updateRes.body.data.scoreLetter).toBe('F');
  });

  it('rejects switching user grading scale after scores already exist', async () => {
    const createRes = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Programming 1',
        code: 'ICT101',
        credits: 4,
        year: 1,
        semester: 'Kỳ 1',
        scoreComponents: [
          { name: 'midterm', weight: 0.4, score: 15 },
          { name: 'final', weight: 0.6, score: 16 },
        ],
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.finalScore).toBe(15.6);

    const toScale4 = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ gradingScale: 'scale4' });

    expect(toScale4.statusCode).toBe(409);
    expect(toScale4.body.success).toBe(false);
    expect(toScale4.body.message).toMatch(/Không thể đổi thang điểm/);

    const unchangedSubject = await Subject.findById(createRes.body.data._id).lean();
    expect(unchangedSubject.gradingScale).toBe('scale20');
    expect(unchangedSubject.finalScore).toBe(15.6);
    expect(unchangedSubject.scoreComponents).toHaveLength(2);

    const unchangedUser = await User.findById(user._id).lean();
    expect(unchangedUser.gradingScale).toBe('scale20');
  });

  it('rejects ERP transcript sync for scale4 users', async () => {
    await User.findByIdAndUpdate(user._id, { gradingScale: 'scale4', targetGpa: 3.2 });

    const previewRes = await request(app)
      .post('/api/integrations/usth-erp/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'personal-transcript',
        subjects: [
          {
            code: 'FR2.001',
            name: 'Tieng Phap 2.1',
            credits: 4,
            semesterCode: '20251',
            score20: 14,
            ectsGrade: 'B+',
            validation: 'Da hoan thanh',
          },
        ],
        schedules: [],
      });

    expect(previewRes.statusCode).toBe(409);
    expect(previewRes.body.success).toBe(false);

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'personal-transcript',
        subjects: [
          {
            code: 'FR2.001',
            name: 'Tieng Phap 2.1',
            credits: 4,
            semesterCode: '20251',
            score20: 14,
            ectsGrade: 'B+',
            validation: 'Da hoan thanh',
          },
        ],
        schedules: [],
      });

    expect(syncRes.statusCode).toBe(409);
    expect(await Subject.countDocuments({ userId: user._id, code: 'FR2.001' })).toBe(0);
  });

  it('still allows ERP timetable sync for scale4 users', async () => {
    await User.findByIdAndUpdate(user._id, { gradingScale: 'scale4', targetGpa: 3.2 });

    const syncRes = await request(app)
      .post('/api/integrations/usth-erp/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'usth_erp',
        page: 'timetable',
        subjects: [],
        schedules: [
          {
            courseCode: 'ICT2009',
            name: 'Cong nghe phan mem',
            specificDate: '2026-06-01',
            startTime: '09:25',
            endTime: '12:10',
            room: '2C-306',
            instructor: 'Do Lan Anh',
            lessonType: 'Ly thuyet',
          },
        ],
      });

    expect(syncRes.statusCode).toBe(200);
    expect(await Schedule.countDocuments({ userId: user._id, courseCode: 'ICT2009' })).toBe(1);
  });
});
