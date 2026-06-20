import { apiClient, parseApiResponse } from './apiClient';

export const getProfile = async () => {
  const response = await apiClient('/users/me');
  return parseApiResponse(response, 'Không thể tải hồ sơ');
};

export const updateProfile = async (profileData) => {
  const response = await apiClient('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  return parseApiResponse(response, 'Không thể cập nhật hồ sơ');
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await apiClient('/users/me', {
    method: 'PUT',
    body: formData
    // Không set Content-Type để browser tự quản lý boundary cho FormData
  });
  return parseApiResponse(response, 'Không thể tải ảnh đại diện');
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await apiClient('/users/upload-image', {
    method: 'POST',
    body: formData
  });
  return parseApiResponse(response, 'Lỗi khi tải ảnh lên');
};

export const createPresignedUpload = async ({ filename, contentType, folder }) => {
  const response = await apiClient('/users/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType, folder }),
  });
  return parseApiResponse(response, 'Không thể tạo URL tải ảnh lên');
};

export const uploadFileToPresignedUrl = async (file, uploadUrl) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Không thể tải file trực tiếp lên S3');
  }

  return response;
};

export const uploadImageDirectToS3 = async (file, folder = 'images') => {
  const presignResponse = await createPresignedUpload({
    filename: file.name,
    contentType: file.type,
    folder,
  });

  await uploadFileToPresignedUrl(file, presignResponse.data.uploadUrl);

  return {
    success: true,
    key: presignResponse.data.key,
    url: presignResponse.data.publicUrl,
  };
};
