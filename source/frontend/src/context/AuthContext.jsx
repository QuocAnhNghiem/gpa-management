import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, logout as logoutApi } from '../api/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục phiên làm việc (Silent login qua cookie)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await checkAuthStatus();
        if (data.success && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
        }
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Lắng nghe sự kiện token hết hạn/lỗi từ apiClient (nếu refresh token cũng tèo)
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const loginContext = useCallback((userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await checkAuthStatus();
    if (data.success && data.user) {
      setIsAuthenticated(true);
      setUser(data.user);
    }
    return data;
  }, []);

  const logoutContext = useCallback(async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, loginContext, logoutContext, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
