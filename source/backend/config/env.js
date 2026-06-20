const CORE_REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const GOOGLE_REQUIRED_ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
const STORAGE_REQUIRED_ENV = ['AWS_REGION'];

function isProductionEnv(env = process.env) {
  return env.NODE_ENV === 'production';
}

function isTestEnv(env = process.env) {
  return env.NODE_ENV === 'test' || Boolean(env.JEST_WORKER_ID);
}

function isGoogleOAuthEnabled(env = process.env) {
  return String(env.GOOGLE_OAUTH_ENABLED || 'true').toLowerCase() !== 'false';
}

function validateStartupEnv(env = process.env) {
  const missing = CORE_REQUIRED_ENV.filter((key) => !String(env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  if (isProductionEnv(env)) {
    const missingGoogleEnv = GOOGLE_REQUIRED_ENV.filter((key) => !String(env[key] || '').trim());
    if (isGoogleOAuthEnabled(env) && missingGoogleEnv.length > 0) {
      throw new Error(`Missing required Google OAuth env: ${missingGoogleEnv.join(', ')}`);
    }

    const missingStorageEnv = STORAGE_REQUIRED_ENV.filter((key) => !String(env[key] || '').trim());
    if (missingStorageEnv.length > 0) {
      throw new Error(`Missing required storage env: ${missingStorageEnv.join(', ')}`);
    }

    if (!String(env.S3_BUCKET_NAME || env.S3_UPLOAD_BUCKET || '').trim()) {
      throw new Error('Missing required storage env: S3_BUCKET_NAME or S3_UPLOAD_BUCKET');
    }

    if (String(env.JWT_SECRET || '').length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }

    if (!String(env.FRONTEND_URL || '').startsWith('https://')) {
      throw new Error('FRONTEND_URL must use HTTPS in production');
    }

    if (isGoogleOAuthEnabled(env) && env.GOOGLE_CALLBACK_URL && !String(env.GOOGLE_CALLBACK_URL).startsWith('https://')) {
      throw new Error('GOOGLE_CALLBACK_URL must use HTTPS in production');
    }

    if (env.ENABLE_TEST_ROUTES === 'true') {
      throw new Error('ENABLE_TEST_ROUTES must not be true in production');
    }

    const invalidExtensionOrigins = getAllowedExtensionOrigins(env).filter(
      (origin) => !/^chrome-extension:\/\/[a-p]{32}$/.test(origin),
    );
    if (invalidExtensionOrigins.length > 0) {
      throw new Error(`Invalid CHROME_EXTENSION_ORIGIN value: ${invalidExtensionOrigins.join(', ')}`);
    }
  }
}

function getAllowedExtensionOrigins(env = process.env) {
  const envValue = env.CHROME_EXTENSION_ORIGINS || env.CHROME_EXTENSION_ORIGIN || '';

  return envValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getS3Config(env = process.env) {
  return {
    region: env.AWS_REGION || '',
    bucket: env.S3_BUCKET_NAME || env.S3_UPLOAD_BUCKET || '',
    publicBaseUrl: env.S3_PUBLIC_BASE_URL || '',
    uploadPrefix: (env.S3_UPLOAD_PREFIX || 'uploads').replace(/^\/+|\/+$/g, ''),
    presignedUrlExpiresIn: Number(env.S3_PRESIGNED_URL_EXPIRES_IN || 300),
  };
}

module.exports = {
  getAllowedExtensionOrigins,
  getS3Config,
  isGoogleOAuthEnabled,
  isProductionEnv,
  isTestEnv,
  validateStartupEnv,
};
