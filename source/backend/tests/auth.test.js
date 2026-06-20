const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Auth API', () => {
  let userPayload;

  const extractCookieValue = (cookies, cookieName) => {
    const targetCookie = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
    const match = targetCookie?.match(new RegExp(`${cookieName}=([^;]+)`));
    return match ? match[1] : null;
  };

  const getCsrfHeaders = (cookies) => {
    const csrfToken = extractCookieValue(cookies, 'csrfToken');
    return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
    process.env.JWT_EXPIRE = '15m';
    process.env.JWT_REFRESH_EXPIRE = '7d';

    userPayload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(userPayload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
      expect(cookies.some((cookie) => cookie.includes('csrfToken='))).toBe(true);
    });

    it('should fail if email already exists', async () => {
      await request(app).post('/api/auth/register').send(userPayload);
      const res = await request(app).post('/api/auth/register').send(userPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(userPayload);
    });

    it('should login user and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userPayload.email, password: userPayload.password });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userPayload.email, password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject password login for google-only accounts', async () => {
      await User.create({
        name: 'Google User',
        email: 'google@example.com',
        googleId: 'google-id-1',
        avatar: '',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'google@example.com', password: 'password123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh (JWT Rotation & Reuse Detection)', () => {
    let oldRefreshToken;
    let cookies;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send(userPayload);
      cookies = res.headers['set-cookie'];
      oldRefreshToken = extractCookieValue(cookies, 'refreshToken');
    });

    it('should refresh token successfully', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .set(getCsrfHeaders(cookies));

      expect(res.statusCode).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      const newCookies = res.headers['set-cookie'];
      const newRefreshToken = extractCookieValue(newCookies, 'refreshToken');
      expect(newRefreshToken).not.toBe(oldRefreshToken);
    });

    it('should include grading scale data in the refreshed auth payload', async () => {
      await User.findOneAndUpdate(
        { email: userPayload.email },
        { gradingScale: 'scale4', targetGpa: 3.2 },
        { returnDocument: 'after' },
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .set(getCsrfHeaders(cookies));

      expect(res.statusCode).toBe(200);
      expect(res.body.user.gradingScale).toBe('scale4');
      expect(res.body.user.targetGpa).toBe(3.2);
    });

    it('should detect token reuse and revoke family', async () => {
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .set(getCsrfHeaders(cookies));
      expect(firstRefresh.statusCode).toBe(200);

      const secondRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .set(getCsrfHeaders(cookies));

      expect(secondRefresh.statusCode).toBe(401);

      const user = await User.findOne({ email: userPayload.email });
      expect(user.refreshTokens.length).toBe(0);
    });

    it('should reject refresh without csrf token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let cookies;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send(userPayload);
      cookies = res.headers['set-cookie'];
    });

    it('should clear cookies on logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .set(getCsrfHeaders(cookies));

      expect(res.statusCode).toBe(200);
      const newCookies = res.headers['set-cookie'];
      expect(newCookies.some((cookie) => cookie.includes('refreshToken=;'))).toBe(true);
      expect(newCookies.some((cookie) => cookie.includes('csrfToken=;'))).toBe(true);
    });

    it('should reject logout without csrf token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/extension-token', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/auth/extension-token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should create an extension token for an authenticated user', async () => {
      const registerRes = await request(app).post('/api/auth/register').send(userPayload);

      const res = await request(app)
        .post('/api/auth/extension-token')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.expiresIn).toBe('7d');
    });
  });
});
