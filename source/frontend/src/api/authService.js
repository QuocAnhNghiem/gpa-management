import { apiClient, setAccessToken, API_BASE_URL, getCsrfHeaders } from './apiClient';

export const login = async (email, password) => {
  const response = await apiClient('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đăng nhập thất bại');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
};

export const register = async (name, email, password) => {
  const response = await apiClient('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đăng ký thất bại');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
};

export const logout = async () => {
  const response = await apiClient('/auth/logout', {
    method: 'POST',
    headers: getCsrfHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đăng xuất thất bại');
  }
  setAccessToken(null); // Clear memory token
  return data;
};

export const updatePassword = async (currentPassword, newPassword) => {
  const response = await apiClient('/auth/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đổi mật khẩu thất bại');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
};

export const createExtensionToken = async () => {
  const response = await apiClient('/auth/extension-token', {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể tạo token extension');
  }
  return data;
};

// Lưu promise để tránh gọi API refresh nhiều lần cùng lúc (đặc biệt trong React 18 Strict Mode)
let refreshPromise = null;

export const checkAuthStatus = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: getCsrfHeaders(),
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.message || 'Chưa đăng nhập');
      }
      return data;
    }).finally(() => {
      refreshPromise = null;
    });
  }

  const data = await refreshPromise;

  if (!data.success) {
    throw new Error(data.message || 'Chưa đăng nhập');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
};
