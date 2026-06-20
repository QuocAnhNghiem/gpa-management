const { randomUUID } = require('crypto');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getS3Config } = require('../config/env');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_FOLDERS = new Set(['avatars', 'images', 'notes', 'misc']);

function createStorageError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeOriginalName(filename = '') {
  const extension = path.extname(filename).toLowerCase();
  return extension.replace(/[^.\w-]/g, '');
}

function normalizeFolder(folder) {
  const normalizedFolder = String(folder || 'misc').replace(/^\/+|\/+$/g, '');

  if (!ALLOWED_FOLDERS.has(normalizedFolder)) {
    throw createStorageError('Thư mục upload không hợp lệ');
  }

  return normalizedFolder;
}

function assertAllowedImageType(mimeType) {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw createStorageError('Định dạng file không hỗ trợ, vui lòng tải lên file JPEG, PNG hoặc WEBP');
  }
}

function buildObjectKey(folder, originalName, userId = '') {
  const { uploadPrefix } = getS3Config();
  const extension = sanitizeOriginalName(originalName) || '.bin';
  const normalizedFolder = normalizeFolder(folder);
  const normalizedUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${uploadPrefix}/${normalizedFolder}/${normalizedUserId}/${Date.now()}-${randomUUID()}${extension}`;
}

function getPublicFileUrl(key) {
  const { bucket, publicBaseUrl, region } = getS3Config();

  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/+$/g, '')}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBufferToS3({ buffer, mimeType, folder, originalName }) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Không có dữ liệu file để tải lên');
  }

  assertAllowedImageType(mimeType);

  const { bucket } = getS3Config();
  if (!bucket) {
    const error = new Error('S3 chưa được cấu hình trên máy chủ');
    error.statusCode = 503;
    throw error;
  }

  const s3Client = new S3Client({
    region: getS3Config().region || undefined,
  });

  const key = buildObjectKey(folder, originalName);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    key,
    url: getPublicFileUrl(key),
  };
}

async function createPresignedUploadUrl({ mimeType, folder, originalName, userId }) {
  assertAllowedImageType(mimeType);

  const { bucket, region, presignedUrlExpiresIn } = getS3Config();
  if (!bucket) {
    throw createStorageError('S3 chưa được cấu hình trên máy chủ', 503);
  }

  const s3Client = new S3Client({
    region: region || undefined,
  });

  const key = buildObjectKey(folder, originalName, userId);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const expiresIn = Number.isFinite(presignedUrlExpiresIn)
    ? Math.min(Math.max(presignedUrlExpiresIn, 60), 900)
    : 300;

  return {
    key,
    publicUrl: getPublicFileUrl(key),
    uploadUrl: await getSignedUrl(s3Client, command, { expiresIn }),
    expiresIn,
  };
}

module.exports = {
  createPresignedUploadUrl,
  uploadBufferToS3,
};
