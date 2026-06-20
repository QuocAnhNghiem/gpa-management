import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, GraduationCap, Ruler, ChartBar, Warning, Sparkle, Medal, Target } from '@phosphor-icons/react';
import { updateProfile } from '../api/userService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getConfig } from '../utils/gradeUtils';

const SETTING_STICKERS = {
  cloud: '/assets/settings/cloud-sticker.png',
  plant: '/assets/settings/plant-sticker.png',
  star: '/assets/settings/star-sticker.png',
};

const neuR = '0 26px 58px rgba(183, 166, 236, 0.14), inset 0 1px 0 rgba(255,255,255,0.84)';
const neuI = 'inset 0 1px 1px rgba(255,255,255,0.78), inset 0 -1px 0 rgba(205,193,245,0.34)';

const scaleOptions = [
  {
    key: 'scale20',
    icon: <Medal size={24} weight="fill" color="#7a5cff" />,
    title: 'Thang 20',
    desc: 'Đại học Khoa học và Công nghệ Hà Nội (USTH), hệ Pháp',
    accent: '#7a5cff',
    bg: 'linear-gradient(180deg, rgba(241,236,255,0.96), rgba(233,226,255,0.92))',
  },
  {
    key: 'scale4',
    icon: <Target size={24} weight="fill" color="#5a94ff" />,
    title: 'Thang 4 (GPA)',
    desc: 'Phần lớn các trường ĐH Việt Nam',
    accent: '#5a94ff',
    bg: 'linear-gradient(180deg, rgba(237,246,255,0.96), rgba(228,240,255,0.92))',
  },
];

const ToggleSwitch = ({ checked, onChange, color = '#7a5cff', disabled = false }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative h-7 w-12 rounded-full p-0.5 transition-all duration-300 focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:-translate-y-0.5'}`}
    style={{
      backgroundColor: checked ? color : 'rgba(202, 209, 232, 0.9)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.55), 0 10px 20px rgba(168,156,226,0.15)',
    }}
  >
    <span
      className="block h-6 w-6 rounded-full bg-white shadow-[0_8px_18px_rgba(120,107,206,0.16)] transition-transform duration-300"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0px)' }}
    />
  </button>
);

function SectionHeader({ icon, title, subtitle, tone = '#7a5cff' }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="app-icon-badge h-[3.25rem] w-[3.25rem] rounded-[20px]"
        style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.98), ${tone}18)` }}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-[1.48rem] font-black tracking-[-0.04em] text-[var(--app-text-main)]">{title}</h2>
        <p className="text-[13px] font-semibold text-[var(--app-text-soft)]">{subtitle}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const { user, loginContext } = useAuth();

  const [selectedScale, setSelectedScale] = useState(user?.gradingScale || 'scale20');
  const [savingScale, setSavingScale] = useState(false);
  const currentConfig = getConfig(selectedScale);
  const hasChanged = selectedScale !== (user?.gradingScale || 'scale20');

  const [notifications, setNotifications] = useState({
    emailAlerts: user?.notificationSettings?.emailAlerts ?? true,
    alertTime: user?.notificationSettings?.alertTime || '20:00',
    deadlineAlerts: user?.notificationSettings?.deadlineAlerts ?? true,
    attendanceWarnings: user?.notificationSettings?.attendanceWarnings ?? true,
  });

  const [activeTab, setActiveTab] = useState('academic');

  const handleSaveScale = async () => {
    setSavingScale(true);
    try {
      const res = await updateProfile({ gradingScale: selectedScale, targetGpa: currentConfig.defaultTargetGpa });
      if (res.success) {
        loginContext(res.data);
        showToast('success', `Đã chuyển sang ${currentConfig.label}.`);
      }
    } catch (error) {
      showToast('error', error.message || 'Lỗi lưu thang điểm');
    } finally {
      setSavingScale(false);
    }
  };

  const toggleNotification = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      const res = await updateProfile({ notificationSettings: updated });
      if (res.success) {
        loginContext(res.data);
        showToast('success', 'Đã lưu cấu hình thông báo');
      }
    } catch {
      showToast('error', 'Lỗi lưu cấu hình thông báo');
    }
  };

  const handleTimeChange = async (event) => {
    const updated = { ...notifications, alertTime: event.target.value };
    setNotifications(updated);
    try {
      const res = await updateProfile({ notificationSettings: updated });
      if (res.success) loginContext(res.data);
    } catch {
      showToast('error', 'Lỗi lưu giờ nhận thông báo');
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-2 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="app-sticker-stage">
          <img
            src="/assets/settings/icon.png"
            alt="Setting Sticker"
            className="h-24 w-24 object-contain drop-shadow-xl"
            aria-hidden="true"
          />
        </div>
        <div>
          <h1 className="text-[clamp(1.75rem,3.2vw,2.45rem)] font-black tracking-[-0.05em] text-[var(--app-text-main)]">
            Cài đặt hệ thống
          </h1>
          <p className="text-[13px] font-semibold text-[var(--app-text-soft)]">
            Tinh chỉnh thang điểm và thông báo theo cách bạn học.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[196px_minmax(0,1fr)]">
        <aside className="app-shell-card-strong relative overflow-hidden rounded-[32px] p-3.5 lg:min-h-0">
          <nav className="flex flex-col gap-3">
            {[
              { key: 'academic', label: 'Học thuật', Icon: GraduationCap, tone: '#7a5cff' },
              { key: 'notifications', label: 'Thông báo', Icon: Bell, tone: '#5a94ff' },
            ].map(({ key, label, Icon, tone }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-3 rounded-[22px] px-3.5 py-3.5 text-left ${isActive ? 'bg-[rgba(255,255,255,0.94)]' : 'bg-[rgba(255,255,255,0.58)] hover:bg-[rgba(255,255,255,0.82)]'}`}
                  style={{
                    boxShadow: isActive ? neuR : '0 14px 28px rgba(183, 166, 236, 0.1)',
                    border: isActive ? `1px solid ${tone}55` : '1px solid rgba(226,219,248,0.82)',
                  }}
                >
                  <span
                    className="app-icon-badge h-10 w-10 rounded-[17px]"
                    style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.98), ${tone}16)` }}
                  >
                    <Icon size={18} weight={isActive ? 'fill' : 'regular'} color={tone} />
                  </span>
                  <span className={`text-[16px] ${isActive ? 'font-black' : 'font-semibold'}`} style={{ color: isActive ? tone : 'var(--app-text-soft)' }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="pointer-events-none mt-10 flex justify-center xl:absolute xl:-bottom-[15px] xl:left-0 xl:right-0">
            <div className="app-sticker-stage">
              <img
                src={SETTING_STICKERS.plant}
                alt="Plant Sticker"
                className="h-44 w-44 object-contain opacity-95 drop-shadow-2xl hover:scale-105 transition-transform"
                aria-hidden="true"
              />
            </div>
          </div>
        </aside>

        <div className="app-shell-card-strong relative overflow-hidden rounded-[34px] lg:min-h-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-75"
            style={{
              background:
                'radial-gradient(circle at top right, rgba(232, 223, 255, 0.55), transparent 18rem), radial-gradient(circle at bottom left, rgba(255, 243, 213, 0.26), transparent 22rem)',
            }}
          />

          <AnimatePresence mode="wait">
            {activeTab === 'academic' && (
              <motion.section
                key="academic"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.24 }}
                className="relative z-10 p-5 pr-4 md:p-6 md:pr-5 lg:h-full lg:overflow-y-auto"
              >
                <SectionHeader
                  icon={<GraduationCap size={26} weight="fill" color="#7a5cff" />}
                  title="Thang điểm"
                  subtitle="Chọn hệ thống thang điểm phù hợp với trường của bạn"
                />

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {scaleOptions.map((option) => {
                    const isActive = selectedScale === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedScale(option.key)}
                        className="relative overflow-hidden rounded-[24px] p-3 text-left hover:-translate-y-0.5"
                        style={{
                          background: isActive ? option.bg : 'rgba(255,255,255,0.72)',
                          boxShadow: neuR,
                          border: isActive ? `2px solid ${option.accent}` : '1px solid rgba(226,219,248,0.88)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="app-icon-badge h-12 w-12 rounded-[16px]" style={{ background: option.bg, boxShadow: neuI }}>
                            {option.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-[1.05rem] font-black tracking-[-0.03em] text-[var(--app-text-main)]">{option.title}</h3>
                            <p className="mt-0.5 text-[13px] font-semibold text-[var(--app-text-soft)]">{option.desc}</p>
                          </div>

                          <div className="shrink-0">
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-full border"
                              style={{
                                background: isActive ? option.accent : 'rgba(255,255,255,0.84)',
                                borderColor: isActive ? option.accent : 'rgba(218,211,244,0.9)',
                                boxShadow: isActive ? `0 18px 28px ${option.accent}35` : 'none',
                              }}
                            >
                              <CheckCircle size={20} weight="fill" color={isActive ? '#ffffff' : '#d8cff5'} />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {hasChanged && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-[24px] border border-[rgba(255,198,98,0.45)] bg-[rgba(255,247,225,0.92)] p-4 shadow-[0_18px_34px_rgba(255,195,86,0.08)]"
                    >
                      <div className="flex gap-3">
                        <Warning size={22} weight="fill" color="#df8d1e" className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-[#a86611]">Lưu ý khi đổi thang điểm</p>
                          <p className="mt-1 text-sm font-semibold leading-relaxed text-[#b27a2d]">
                            Hệ thống sẽ chặn đổi thang nếu bạn đã có dữ liệu điểm. Hãy chỉ chuyển thang khi bảng điểm còn trống hoặc chưa nhập điểm.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="app-shell-card relative mt-4 rounded-[24px] p-4 md:p-5">
                  <div className="relative mb-4 flex items-center justify-center gap-3 text-center">
                    <Sparkle size={18} weight="fill" color="#9b78ff" />
                    <h3 className="text-[1.3rem] font-black uppercase tracking-[0.04em] text-[#6f52f5]">
                      Tham chiếu ({currentConfig.label})
                    </h3>
                    <Sparkle size={18} weight="fill" color="#9b78ff" />

                    <img
                      src={SETTING_STICKERS.star}
                      alt="Star Sticker"
                      className="absolute -right-6 -top-12 h-32 w-32 object-contain drop-shadow-2xl hover:rotate-12 transition-transform duration-500 pointer-events-none"
                    />
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-[20px] border border-[rgba(228,220,248,0.9)] bg-white/76 p-3 shadow-[0_16px_30px_rgba(182,167,230,0.08)]">
                      <p className="mb-3 flex items-center gap-2 text-[14px] font-black uppercase tracking-[0.04em] text-[#6f52f5]">
                        <Ruler size={16} weight="fill" />
                        Điểm môn
                      </p>
                      <div className="space-y-1.5">
                        {currentConfig.displayTable.map((item, index) => (
                          <div key={index} className="flex items-center justify-between rounded-[14px] border border-[rgba(236,229,250,0.92)] bg-white/84 px-4 py-2 text-[14px] font-black text-[var(--app-text-main)]">
                            <span>{item.range}</span>
                            <span className={item.color}>{item.letter}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[rgba(228,220,248,0.9)] bg-white/76 p-3 shadow-[0_16px_30px_rgba(182,167,230,0.08)]">
                      <p className="mb-3 flex items-center gap-2 text-[14px] font-black uppercase tracking-[0.04em] text-[#6f52f5]">
                        <ChartBar size={16} weight="fill" />
                        GPA tổng kết
                      </p>
                      <div className="space-y-1.5">
                        {currentConfig.displayGpaTable.map((item, index) => (
                          <div key={index} className="flex items-center justify-between rounded-[14px] border border-[rgba(236,229,250,0.92)] bg-white/84 px-4 py-2 text-[14px] font-black text-[var(--app-text-main)]">
                            <span>{item.range}</span>
                            <span className={item.color}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {hasChanged && (
                  <div className="flex justify-center pt-5">
                    <button
                      type="button"
                      onClick={handleSaveScale}
                      disabled={savingScale}
                      className="rounded-full bg-[linear-gradient(180deg,#8c74ff,#6d55ff)] px-8 py-3.5 text-sm font-black text-white shadow-[0_18px_32px_rgba(122,92,255,0.3)] hover:-translate-y-0.5 disabled:opacity-70"
                    >
                      {savingScale ? 'Đang lưu...' : 'Lưu cấu hình thang điểm'}
                    </button>
                  </div>
                )}
              </motion.section>
            )}

            {activeTab === 'notifications' && (
              <motion.section
                key="notifications"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.24 }}
                className="relative z-10 p-5 pr-4 md:p-6 md:pr-5 lg:h-full lg:overflow-y-auto"
              >
                <SectionHeader
                  icon={<Bell size={24} weight="fill" color="#5a94ff" />}
                  title="Thông báo"
                  subtitle="Cá nhân hóa email nhắc lịch học, deadline và cảnh báo chuyên cần"
                  tone="#5a94ff"
                />

                <div className="mt-5 grid gap-4">
                  <SettingRow
                    title="Email báo cáo hằng ngày"
                    description="Tổng hợp lịch trình ngày mai, deadline và cảnh báo vắng học."
                    action={<ToggleSwitch checked={notifications.emailAlerts} onChange={() => toggleNotification('emailAlerts')} color="#5a94ff" />}
                  />

                  <AnimatePresence>
                    {notifications.emailAlerts && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <SettingRow
                          title="Giờ nhận tự động"
                          description="Thời gian tối ưu để chuẩn bị cho hôm sau."
                          action={(
                            <input
                              type="time"
                              value={notifications.alertTime}
                              onChange={handleTimeChange}
                              className="rounded-[18px] border border-[rgba(220,212,247,0.92)] bg-white/82 px-4 py-2 text-sm font-black text-[var(--app-purple)] shadow-[0_10px_22px_rgba(182,167,230,0.12)] outline-none"
                            />
                          )}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <SettingRow
                    title="Nhắc deadline trước 3 ngày"
                    description="Đánh dấu cờ đỏ cho các sự kiện quan trọng và hạn nộp gần kề."
                    action={<ToggleSwitch checked={notifications.deadlineAlerts} onChange={() => toggleNotification('deadlineAlerts')} color="#ffb32c" disabled={!notifications.emailAlerts} />}
                  />

                  <SettingRow
                    title="Cảnh báo chuyên cần từ 70%"
                    description="Báo động sớm khi nguy cơ vắng quá số buổi cho phép."
                    action={<ToggleSwitch checked={notifications.attendanceWarnings} onChange={() => toggleNotification('attendanceWarnings')} color="#ff7a66" disabled={!notifications.emailAlerts} />}
                  />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ action, description, title }) {
  return (
    <div className="app-soft-card flex items-center justify-between gap-4 rounded-[28px] px-5 py-5" style={{ boxShadow: neuR }}>
      <div className="min-w-0">
        <p className="text-[1rem] font-black tracking-[-0.02em] text-[var(--app-text-main)]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--app-text-soft)]">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
