const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getGoogleLoginUrl = () => {
  return `${BACKEND_URL}/api/auth/google`;
};

export const loginWithGoogle = () => {
  window.location.href = getGoogleLoginUrl();
};
