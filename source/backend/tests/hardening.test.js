const request = require('supertest');
const app = require('../app');
const { validateStartupEnv } = require('../config/env');

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe('Backend hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalExtensionOrigin = process.env.CHROME_EXTENSION_ORIGIN;
  const originalExtensionOrigins = process.env.CHROME_EXTENSION_ORIGINS;
  const originalGoogleOAuthEnabled = process.env.GOOGLE_OAUTH_ENABLED;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalGoogleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

  beforeEach(() => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    delete process.env.CHROME_EXTENSION_ORIGIN;
    delete process.env.CHROME_EXTENSION_ORIGINS;
  });

  afterEach(() => {
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('FRONTEND_URL', originalFrontendUrl);
    restoreEnv('CHROME_EXTENSION_ORIGIN', originalExtensionOrigin);
    restoreEnv('CHROME_EXTENSION_ORIGINS', originalExtensionOrigins);
    restoreEnv('GOOGLE_OAUTH_ENABLED', originalGoogleOAuthEnabled);
    restoreEnv('GOOGLE_CLIENT_ID', originalGoogleClientId);
    restoreEnv('GOOGLE_CLIENT_SECRET', originalGoogleClientSecret);
    restoreEnv('GOOGLE_CALLBACK_URL', originalGoogleCallbackUrl);
  });

  it('does not expose /test/routes while running tests', async () => {
    const res = await request(app).get('/test/routes');

    expect(res.body.availableRoutes).toBeUndefined();
    expect(res.text).not.toContain('/api/auth/google/callback');
  });

  it('exposes liveness and readiness probes', async () => {
    const [healthRes, readyRes] = await Promise.all([
      request(app).get('/healthz'),
      request(app).get('/readyz'),
    ]);

    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body.status).toBe('ok');
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.body.status).toBe('ready');
  });

  it('rejects Google auth route when OAuth env is missing', async () => {
    const res = await request(app).get('/api/auth/google');

    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('allows production startup validation when Google OAuth is explicitly disabled', () => {
    expect(() =>
      validateStartupEnv({
        NODE_ENV: 'production',
        GOOGLE_OAUTH_ENABLED: 'false',
        MONGO_URI: 'mongodb://localhost:27017/gpa',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'https://app.example.com',
        AWS_REGION: 'ap-southeast-1',
        S3_BUCKET_NAME: 'example-bucket',
        ENABLE_TEST_ROUTES: 'false',
      }),
    ).not.toThrow();
  });

  it('requires Google OAuth env in production when Google OAuth is enabled', () => {
    expect(() =>
      validateStartupEnv({
        NODE_ENV: 'production',
        GOOGLE_OAUTH_ENABLED: 'true',
        MONGO_URI: 'mongodb://localhost:27017/gpa',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'https://app.example.com',
        AWS_REGION: 'ap-southeast-1',
        S3_BUCKET_NAME: 'example-bucket',
        ENABLE_TEST_ROUTES: 'false',
      }),
    ).toThrow('Missing required Google OAuth env');
  });

  it('rejects arbitrary Chrome extension origins in production', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .get('/')
      .set('Origin', 'chrome-extension://random-extension-id');

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows explicitly whitelisted Chrome extension origins in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CHROME_EXTENSION_ORIGIN = 'chrome-extension://trusted-extension-id';

    const res = await request(app)
      .get('/')
      .set('Origin', 'chrome-extension://trusted-extension-id');

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('chrome-extension://trusted-extension-id');
  });
});
