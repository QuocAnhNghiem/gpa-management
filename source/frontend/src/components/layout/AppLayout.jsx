import { Bell, GameController, StackSimple } from '@phosphor-icons/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSchedules } from '../../api/scheduleService';
import { API_BASE_URL } from '../../api/apiClient';

const BACKEND = API_BASE_URL;

const VIETNAMESE_DAY_LABELS = [
  'Chủ nhật thảnh thơi',
  'Thứ hai bền nhịp',
  'Thứ ba tập trung',
  'Thứ tư tăng tốc',
  'Thứ năm chắc tay',
  'Thứ sáu về đích',
  'Thứ bảy thư thả',
];

function DashboardGreeting({ name }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="app-balanced-title flex flex-wrap items-center gap-2 text-[clamp(1.05rem,1.6vw,1.55rem)] font-black leading-none text-[var(--app-text-main)]">
        <span aria-hidden="true">👋</span>
        <span>Chào lại,</span>
        <strong className="font-black text-slate-950">{name || 'Sinh viên'}</strong>
      </div>
      <p className="app-pretty-copy text-[12px] font-semibold text-[var(--app-text-soft)]">
        Cố gắng hôm nay, tự hào ngày mai!
        <span className="ml-1" aria-hidden="true">💪</span>
      </p>
    </div>
  );
}

function StatusPill({ count }) {
  const dayLabel = VIETNAMESE_DAY_LABELS[new Date().getDay()];

  return (
    <div className="app-status-pill max-w-full overflow-hidden px-3.5 py-2.5">
      <span className="app-icon-badge h-9 w-9 shrink-0 text-[var(--app-purple)]">
        <GameController size={18} weight="duotone" />
      </span>
      <div className="min-w-0 text-[12px] font-bold text-[var(--app-text-main)]">
        <span className="truncate text-[#df7d1c]">{dayLabel}</span>
        <span className="mx-2.5 text-[var(--app-text-muted)]">|</span>
        <span className="text-[var(--app-text-main)]">
          Hôm nay bạn có
          <span className="mx-2 inline-flex min-w-6 items-center justify-center rounded-xl bg-[#ff5f81] px-2 py-0.5 text-[10px] font-black text-white">
            {count}
          </span>
          tiết học tiếp theo
        </span>
        <span className="ml-2 inline-flex align-middle text-[var(--app-purple)]">
          <StackSimple size={15} weight="duotone" />
        </span>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [todaySchedulesCount, setTodaySchedulesCount] = useState(0);

  const fetchTodaySchedules = async () => {
    try {
      const res = await getSchedules();
      if (res.data) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const todayEvents = res.data.filter((event) => event.specificDate === todayStr);
        setTodaySchedulesCount(todayEvents.length);
      }
    } catch (error) {
      console.error('Failed to fetch schedules in AppLayout', error);
    }
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  useEffect(() => {
    fetchTodaySchedules();
    const handleProfileUpdated = () => {
      refreshUser().catch(() => {});
    };

    window.addEventListener('scheduleUpdated', fetchTodaySchedules);
    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => {
      window.removeEventListener('scheduleUpdated', fetchTodaySchedules);
      window.removeEventListener('profileUpdated', handleProfileUpdated);
    };
  }, [refreshUser]);

  const avatarSrc = user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : `${BACKEND}${user.avatar}`)
    : null;

  const isDashboard = location.pathname === '/dashboard';

  const headerLead = useMemo(() => {
    if (isDashboard) {
      return <DashboardGreeting name={user?.name} />;
    }
    return <StatusPill count={todaySchedulesCount} />;
  }, [isDashboard, todaySchedulesCount, user?.name]);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden lg:h-[100dvh] lg:overflow-hidden">
      <div className="flex min-h-[100dvh] flex-col gap-4 px-4 py-4 md:flex-row lg:h-full lg:min-h-0 lg:gap-[18px] lg:px-5 lg:py-5">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:min-h-0 lg:overflow-hidden">
          <header className="app-shell-card relative flex min-h-[70px] items-center justify-between overflow-hidden rounded-[28px] px-4 py-2.5 sm:px-5 lg:px-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  'radial-gradient(circle at 14% 12%, rgba(217, 208, 255, 0.65), transparent 22rem), radial-gradient(circle at 88% 14%, rgba(255, 237, 193, 0.6), transparent 16rem)',
              }}
            />

            <div className="relative z-10 min-w-0 flex-1 pr-4">
              {headerLead}
            </div>

            <div className="relative z-10 flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => showToast('warning', 'Tính năng thông báo đang được phát triển')}
                className="app-soft-card relative flex h-11 w-11 items-center justify-center rounded-[18px] text-[var(--app-text-soft)] hover:-translate-y-0.5 hover:text-[var(--app-purple)]"
                aria-label="Thông báo"
                title="Thông báo"
              >
                <Bell size={18} weight="regular" />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5d63]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="app-soft-card flex min-w-[212px] items-center gap-3 rounded-[20px] px-3 py-2 text-left hover:-translate-y-0.5 max-sm:min-w-0 max-sm:px-3"
                aria-label="Mở hồ sơ cá nhân"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,#4d9b2c,#3f8128)] text-sm font-black text-white shadow-[0_10px_18px_rgba(80,140,42,0.22)]">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
                  )}
                </div>

                <div className="min-w-0 max-sm:hidden">
                  <p className="truncate text-[14px] font-black text-[var(--app-text-main)]">{user?.name || 'Sinh viên'}</p>
                  <p className="mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#26b96b]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#26b96b]" />
                    Trực tuyến
                  </p>
                </div>
              </button>
            </div>
          </header>

          <main className="flex-1 lg:min-h-0 lg:overflow-hidden">
            <div className="pb-1 lg:h-full lg:overflow-hidden">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
