// frontend/src/api/apiClient.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;
const LEGACY_AUTH_KEYS = [
  'accessToken',
  'userId',
  'userName',
  'userEmail',
  'userAvatar',
  'onboardingCompleted',
  'token',
];

let accessToken = null;

export const getCookieValue = (name) => {
  if (typeof document === 'undefined') return '';

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

export const getCsrfHeaders = () => {
  const csrfToken = getCookieValue('csrfToken');
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
};

export const clearLegacyAuthStorage = () => {
  if (typeof window === 'undefined') return;
  LEGACY_AUTH_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

clearLegacyAuthStorage();

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

export const parseApiResponse = async (response, fallbackMessage = 'Có lỗi xảy ra') => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.errors?.[0]?.message || fallbackMessage);
  }

  return data;
};

// Lưu promise refresh token để tránh gọi nhiều lần cùng lúc
let refreshTokenPromise = null;

// Hàm tự định nghĩa fetch interceptor
export const apiClient = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response = await fetch(`${API_URL}${url}`, config);

  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
    try {
      if (!refreshTokenPromise) {
        refreshTokenPromise = fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: getCsrfHeaders(),
        }).then(res => {
          if (!res.ok) throw new Error("Refresh failed");
          return res.json();
        }).catch(() => null).finally(() => {
          refreshTokenPromise = null;
        });
      }
      
      const refreshData = await refreshTokenPromise;
      
      if (refreshData && refreshData.success) {
        setAccessToken(refreshData.accessToken);
        
        headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
        const retryConfig = {
          ...config,
          headers
        };
        response = await fetch(`${API_URL}${url}`, retryConfig);
      } else {
        setAccessToken(null);
        window.dispatchEvent(new Event('auth-unauthorized'));
      }
    } catch (error) {
      console.error('Lỗi khi refresh token:', error);
      setAccessToken(null);
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }

  return response;
};
