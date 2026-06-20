const request = require('supertest');
const app = require('../app');

describe('Attendance API validation', () => {
  let accessToken;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attendance Tester',
        email: 'attendance@example.com',
        password: 'password123',
      });

    accessToken = res.body.accessToken;
  });

  it('rejects invalid attendance config values', async () => {
    const res = await request(app)
      .put('/api/attendance/config')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subjectName: 'Lập trình web',
        totalSessions: 0,
        maxAbsencesAllowed: 3,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects max absences larger than total sessions', async () => {
    const res = await request(app)
      .put('/api/attendance/config')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subjectName: 'Cơ sở dữ liệu',
        totalSessions: 10,
        maxAbsencesAllowed: 11,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/maxAbsencesAllowed/);
  });

  it('rejects invalid attendance dates', async () => {
    const res = await request(app)
      .post('/api/attendance/toggle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subjectName: 'Mạng máy tính',
        date: '2026-13-40',
        isAbsent: true,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/YYYY-MM-DD/);
  });
});
