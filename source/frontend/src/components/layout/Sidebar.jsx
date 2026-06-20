import {
  ArrowsClockwise,
  BookBookmark,
  BookOpen,
  CalendarDots,
  Gear,
  House,
  NotePencil,
  SignOut,
  UserCircle,
} from '@phosphor-icons/react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DASHBOARD_STICKERS } from '../../constants/dashboardStickers';

const navItems = [
  { to: '/dashboard', icon: House, label: 'Tổng quan' },
  { to: '/grades', icon: BookOpen, label: 'Bảng điểm' },
  { to: '/schedule', icon: CalendarDots, label: 'Lịch học' },
  { to: '/notes', icon: NotePencil, label: 'Ghi chú' },
  { to: '/vocabulary', icon: BookBookmark, label: 'Từ vựng' },
  { to: '/erp-sync', icon: ArrowsClockwise, label: 'Đồng bộ ERP' },
];

const bottomItems = [
  { to: '/profile', icon: UserCircle, label: 'Hồ sơ' },
  { to: '/settings', icon: Gear, label: 'Cài đặt' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logoutContext } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutContext();
      showToast('success', 'Đăng xuất thành công');
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <aside className="hidden min-h-0 w-[100px] hover:w-[260px] shrink-0 md:block group relative z-[100] transition-all duration-300 ease-in-out">
      <div
        className="app-shell-card-strong relative flex h-full min-h-[calc(100dvh-2.5rem)] w-full flex-col overflow-hidden rounded-[36px] px-3 group-hover:px-4 py-5 transition-all duration-300 ease-in-out"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(249,245,255,0.94) 48%, rgba(246,241,255,0.95) 100%)',
          boxShadow: '0 38px 98px rgba(177,160,231,0.2), 0 12px 32px rgba(214,203,248,0.2), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -1px 0 rgba(225,216,248,0.45)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-85"
          style={{
            background: 'radial-gradient(circle at 20% 14%, rgba(229,220,255,0.6), transparent 18rem), radial-gradient(circle at 78% 12%, rgba(255,243,210,0.28), transparent 15rem)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-2 pt-2 text-center">
          <div className="relative flex items-center justify-center transition-all duration-300 w-[3.5rem] h-[3.5rem] group-hover:h-[7.4rem] group-hover:w-[7.4rem]">
            <img
              src={DASHBOARD_STICKERS.logo}
              alt="GPA Master"
              className="relative z-10 h-[120%] w-[120%] object-contain scale-110 drop-shadow-xl"
            />
          </div>

          <div className="flex flex-col group-hover:flex-row items-center group-hover:items-baseline justify-center gap-0.5 group-hover:gap-1.5 text-[14px] group-hover:text-[26px] leading-none tracking-[-0.03em] overflow-hidden whitespace-nowrap transition-all duration-300 mt-2 group-hover:mt-3">
            <span className="font-black text-[#2e265c]">GPA</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Master</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded-full border border-indigo-100/50 bg-indigo-50/60 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm whitespace-nowrap overflow-hidden transition-all duration-300 max-h-0 opacity-0 group-hover:max-h-[40px] group-hover:opacity-100 group-hover:mt-3">
            <span aria-hidden="true" className="text-amber-400 text-xs">✨</span>
            <p className="text-[10px] font-bold text-indigo-700/80">
              Học tập thông minh mỗi ngày
            </p>
          </div>
        </div>

        <nav className="relative z-10 mt-6 flex flex-1 flex-col gap-2.5">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <div className="mt-auto border-t border-[rgba(215,206,245,0.78)] pt-5" />

          {bottomItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex h-[3.25rem] w-full items-center justify-start gap-3 rounded-[20px] pl-[18px] pr-4 text-[#ff5d5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_16px_24px_rgba(255,92,92,0.04)] hover:bg-[rgba(255,244,246,0.88)] transition-all overflow-hidden whitespace-nowrap"
            title="Đăng xuất"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              <SignOut size={22} weight="regular" />
            </span>
            <span className="text-[15px] font-semibold w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300">Đăng xuất</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}

function SidebarLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) => [
        'group/link flex h-[3.25rem] items-center justify-start gap-3 rounded-[20px] pl-[18px] pr-4 text-[15px] transition-all duration-300 overflow-hidden whitespace-nowrap w-full',
        isActive
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(246,239,255,0.98))] text-[var(--app-purple)] shadow-[0_22px_34px_rgba(167,149,230,0.17),0_6px_14px_rgba(213,203,248,0.18),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(214,203,249,0.44)]'
          : 'text-[var(--app-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] hover:bg-[rgba(255,255,255,0.82)] hover:shadow-[0_16px_26px_rgba(176,160,229,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] hover:text-[var(--app-text-main)]',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300',
              isActive
                ? 'border-[rgba(205,189,255,0.9)] bg-[rgba(245,239,255,0.95)] text-[var(--app-purple)]'
                : 'border-[rgba(227,220,249,0.9)] bg-[rgba(255,255,255,0.74)] text-[var(--app-text-soft)] group-hover/link:text-[var(--app-purple)]',
            ].join(' ')}
          >
            <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
          </span>
          <span className={`${isActive ? 'font-black' : 'font-semibold'} w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
