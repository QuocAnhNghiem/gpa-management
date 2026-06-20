import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as googleService from '../api/googleService';
import { checkAuthStatus } from '../api/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BrandLogo from '../components/ui/BrandLogo';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginContext } = useAuth();
  const { showToast } = useToast();

  // Xử lý Google callback từ URL query parameters
  useEffect(() => {
    let isMounted = true;

    const handleGoogleAuth = async () => {
      const searchParams = new URLSearchParams(location.search);
      const googleAuth = searchParams.get('googleAuth');

      if (googleAuth === '1') {
        try {
          const authStatus = await checkAuthStatus();
          if (!authStatus?.success || !authStatus.user) {
            throw new Error('Không thể khôi phục phiên đăng nhập Google');
          }

          if (!isMounted) return;
          loginContext(authStatus.user);
          showToast('success', 'Đăng nhập qua Google thành công!');
          const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
          sessionStorage.removeItem('postLoginRedirect');
          const nextPath = authStatus.user.onboardingCompleted
            ? postLoginRedirect || '/dashboard'
            : '/onboarding';
          navigate(nextPath, { replace: true });
        } catch (error) {
          if (!isMounted) return;
          showToast('error', error.message || 'Đăng nhập Google thất bại');
          navigate('/login', { replace: true });
        }
      }
    };

    handleGoogleAuth();

    return () => {
      isMounted = false;
    };
  }, [location.search, loginContext, navigate, showToast]);

  const handleGoogleLogin = () => {
    googleService.loginWithGoogle();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 lg:p-8 bg-[#eaebee]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1140px] min-h-[640px] flex rounded-[2.5rem] overflow-hidden transition-all"
        style={{ backgroundColor: 'var(--neu-bg)', boxShadow: '12px 12px 24px #c5cdd8, -12px -12px 24px #ffffff' }}
      >
        {/* Cột trái: Hình ảnh */}
        <div className="hidden lg:block lg:w-[45%] relative bg-white">
          <img 
            src="/assets/auth/auth-bg.jpg" 
            alt="Study motivation" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Cột phải: Form đăng nhập Google */}
        <div className="w-full lg:w-[55%] flex items-center justify-center p-8 lg:p-14 relative z-10">
          <div className="w-full max-w-[400px]">
            {/* Logo */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6 transition-transform hover:scale-105">
                <BrandLogo size={80} showText={false} shadow="inset 4px 4px 8px #c5cdd8, inset -4px -4px 8px #ffffff" />
              </div>
              <h1
                className="text-4xl font-black tracking-tight"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: '#1e293b' }}
              >
                Chào mừng bạn
              </h1>
              <p className="text-base mt-4 font-semibold leading-relaxed" style={{ color: '#64748b' }}>
                Hệ thống Quản lý GPA tối ưu dành riêng cho sinh viên Đại học.
                <br /> Đăng nhập với Google để tiếp tục lộ trình của bạn.
              </p>
            </div>

            {/* Nút đăng nhập Google to, nổi bật */}
            <div className="mt-12 flex flex-col items-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-slate-700 bg-[#eaebee] hover:-translate-y-1 transition-all group"
                style={{ boxShadow: '6px 6px 14px #c5cdd8, -6px -6px 14px #ffffff' }}
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-lg tracking-wide">Tiếp tục với Google</span>
              </button>
            </div>

            {/* Footer Text */}
            <div className="mt-14 text-center">
              <p className="text-xs font-semibold text-slate-400">
                Bằng việc tiếp tục, bạn đồng ý với Điều khoản và Chính sách bảo mật của chúng tôi.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
