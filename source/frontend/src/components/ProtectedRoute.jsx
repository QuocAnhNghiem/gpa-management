import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500">Đang tải...</div>;
  }
  
  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    if (nextPath !== '/login' && nextPath !== '/onboarding') {
      sessionStorage.setItem('postLoginRedirect', nextPath);
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return children;
}
