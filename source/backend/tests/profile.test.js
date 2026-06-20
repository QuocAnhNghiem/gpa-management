const request = require('supertest');
const app = require('../app');

describe('Profile update validation', () => {
  let accessToken;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Profile Tester',
        email: 'profile@example.com',
        password: 'password123',
      });

    accessToken = res.body.accessToken;
  });

  it('rejects invalid notification alert times', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        notificationSettings: {
          alertTime: '25:90',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/HH:mm/);
  });

  it('rejects invalid grade customization colors', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        gradeCustomization: {
          year1: {
            color: 'blue',
          },
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/mã màu hex/);
  });

  it('rejects malformed goals payloads', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        goals: {
          year1: [{ id: 'x', text: 'Hoàn thành đồ án', done: false }],
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/goals\.year1\[0\]\.id/);
  });
});
