import { useState, useEffect } from 'react';
import { Bell, User, Sun, Moon } from 'lucide-react';
import { getProfile } from '../../api/userService';
import { getSchedules } from '../../api/scheduleService';
import { API_BASE_URL } from '../../api/apiClient';
import { useNavigate } from 'react-router-dom';

const getGreetingText = (name, count) => {
  const days = [
    'Chủ nhật thảnh thơi ☕',
    'Thứ hai tràn đầy năng lượng 🚀',
    'Thứ ba tập trung cao độ 🧠',
    'Thứ tư bứt phá giới hạn 🔥',
    'Thứ năm kiên trì nỗ lực 💪',
    'Thứ sáu tăng tốc về đích 🏁',
    'Thứ bảy thư thả cuối tuần ☀️'
  ];
  
  const todayDay = new Date().getDay();
  const dayGreeting = days[todayDay];
  const firstName = name.trim().split(/\s+/).pop() || 'bạn';

  if (count === 0) {
    return `Chào ${firstName}, ${dayGreeting}! Hôm nay bạn không có tiết học nào, hãy tận hưởng nhé.`;
  }
  return `Chào ${firstName}, ${dayGreeting}! Hôm nay bạn có ${count} tiết học tiếp theo.`;
};

export default function Header() {
  const [userName, setUserName] = useState('Sinh viên');
  const [avatar, setAvatar] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [todaySchedulesCount, setTodaySchedulesCount] = useState(0);
  const navigate = useNavigate();

  const fetchUserAndSchedules = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const profileRes = await getProfile(token);
      if (profileRes.data) {
        setUserName(profileRes.data.name || 'Sinh viên');
        setAvatar(profileRes.data.avatar);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const scheduleRes = await getSchedules();
      if (scheduleRes.data) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const todayEvents = scheduleRes.data.filter(ev => ev.specificDate === todayStr);
        setTodaySchedulesCount(todayEvents.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUserAndSchedules();

    window.addEventListener('profileUpdated', fetchUserAndSchedules);
    window.addEventListener('scheduleUpdated', fetchUserAndSchedules);
    
    return () => {
      window.removeEventListener('profileUpdated', fetchUserAndSchedules);
      window.removeEventListener('scheduleUpdated', fetchUserAndSchedules);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <header
      className="w-full flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#adc5cf',
      }}
    >
      {/* Dynamic Greeting Message */}
      <div className="flex-1 min-w-0 pr-4">
        <p 
          className="text-sm font-bold text-slate-700 dark:text-zinc-300 truncate"
          style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
          {getGreetingText(userName, todaySchedulesCount)}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors relative"
          aria-label="Đổi giao diện"
        >
          {isDarkMode ? <Sun size={20} className="text-zinc-400" /> : <Moon size={20} style={{ color: '#1e3d59' }} />}
        </button>

        <button
          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors relative"
          aria-label="Thông báo"
        >
          <Bell size={20} className="text-slate-800 dark:text-zinc-400" />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#ff6b6b' }}
          />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Tài khoản"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: '#d6e8f7' }}
          >
            {avatar ? (
              <img src={avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={18} style={{ color: '#1e3d59' }} />
            )}
          </div>
          <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">
            {userName}
          </span>
        </button>
      </div>
    </header>
  );
}
