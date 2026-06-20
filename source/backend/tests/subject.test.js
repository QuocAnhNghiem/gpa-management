const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Subjects API (Thang 20)', () => {
  let accessToken;
  let cookies;
  let user;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_EXPIRE = '15m';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Student',
        email: 'student@example.com',
        password: 'password123'
      });
    
    accessToken = res.body.accessToken;
    cookies = res.headers['set-cookie'];
    user = await User.findOne({ email: 'student@example.com' });
  });

  describe('POST /api/subjects', () => {
    it('should create a new subject and calculate final score on 20-point scale', async () => {
      const subjectData = {
        name: 'Toán cao cấp',
        code: 'MAT101',
        credits: 3,
        year: 1,
        semester: 'Học kỳ 1',
        scoreComponents: [
          { name: 'attendance', weight: 0.1, score: 20 },
          { name: 'midterm', weight: 0.4, score: 15 },
          { name: 'final', weight: 0.5, score: 18 }
        ]
      };

      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(subjectData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score20).toBe(17);
      expect(res.body.data.classification).toBe('Đạt');
      expect(res.body.data.isPassed).toBe(true);
    });

    it('should calculate failing grade correctly on 20-point scale (< 10)', async () => {
      const subjectData = {
        name: 'Lập trình C',
        code: 'IT101',
        credits: 3,
        year: 1,
        semester: 'Học kỳ 1',
        scoreComponents: [
          { name: 'midterm', weight: 0.5, score: 8 },
          { name: 'final', weight: 0.5, score: 9 }
        ]
      };

      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(subjectData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.score20).toBe(8.5);
      expect(res.body.data.classification).toBe('Không đạt');
      expect(res.body.data.isPassed).toBe(false);
    });

    it('rejects subjects with zero credits', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Môn lỗi',
          code: 'ERR100',
          credits: 0,
          year: 1,
          semester: 'Học kỳ 1',
          scoreComponents: [],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/subjects', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'S1', code: 'S1', credits: 2, year: 1, semester: 'K1', scoreComponents: [] });
      
      await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'S2', code: 'S2', credits: 3, year: 1, semester: 'K2', scoreComponents: [] });
    });

    it('should retrieve all subjects for the user', async () => {
      const res = await request(app)
        .get('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('DELETE /api/subjects/:id', () => {
    let subjectId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'S3', code: 'S3', credits: 2, year: 1, semester: 'K1', scoreComponents: [] });
      subjectId = res.body.data._id;
    });

    it('should delete a subject', async () => {
      const res = await request(app)
        .delete(`/api/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const getRes = await request(app)
        .get(`/api/subjects`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.body.data.length).toBe(0);
    });
  });
});
