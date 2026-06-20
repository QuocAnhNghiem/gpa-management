import { useState, useEffect, useRef } from 'react';
import * as userService from '../api/userService';
import * as dashboardService from '../api/dashboardService';
import * as subjectService from '../api/subjectService';
import { API_BASE_URL } from '../api/apiClient';
import { motion } from 'framer-motion';
import {
  Camera, Checks, PencilSimple, Target, Trophy, Bookmark,
  CheckCircle, CircleDashed, ShieldCheck,
  Medal, Star, BookOpen, Crown
} from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { convertScore, getGpaClassification, getMaxLabel, getMaxScore } from '../utils/gradeUtils';

const neuI = 'inset 4px 4px 8px rgba(182,167,230,0.15), inset -4px -4px 8px #ffffff';
const clayR = '0 16px 34px rgba(182,167,230,0.18), inset 0 2px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(225,216,248,0.4)';

const YEARS_STRUCTURE = [
  {
    key: 'year1',
    label: 'Năm thứ nhất',
    semesters: ['Năm 1 - Kỳ 1', 'Năm 1 - Kỳ 2'],
    defaultAchievements: ['Bắt đầu chặng đường đại học đầy hứa hẹn!'],
    sticker: '/assets/profile/year-1-sticker.png'
  },
  {
    key: 'year2',
    label: 'Năm thứ hai',
    semesters: ['Năm 2 - Kỳ 1', 'Năm 2 - Kỳ 2'],
    defaultAchievements: ['Tiếp tục khám phá và tích lũy kiến thức chuyên sâu.'],
    sticker: '/assets/profile/year-2-sticker.png'
  },
  {
    key: 'year3',
    label: 'Năm thứ ba',
    semesters: ['Năm 3 - Kỳ 1', 'Năm 3 - Kỳ 2'],
    defaultAchievements: ['Khẳng định năng lực, chuẩn bị tinh thần thực tập.'],
    sticker: '/assets/profile/year-3-sticker.png'
  },
  {
    key: 'year4',
    label: 'Năm thứ tư',
    semesters: ['Năm 4 - Kỳ 1', 'Năm 4 - Kỳ 2'],
    defaultAchievements: ['Sẵn sàng bứt phá, bảo vệ đồ án tốt nghiệp xuất sắc!'],
    sticker: '/assets/profile/year-4-sticker.png'
  }
];

const SEMESTERS = [
  'Năm 1 - Kỳ 1', 'Năm 1 - Kỳ 2',
  'Năm 2 - Kỳ 1', 'Năm 2 - Kỳ 2',
  'Năm 3 - Kỳ 1', 'Năm 3 - Kỳ 2',
  'Năm 4 - Kỳ 1', 'Năm 4 - Kỳ 2',
];

export default function ProfilePage() {
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Đang tải...',
    avatar: '',
    email: '',
    mssv: '',
    major: '',
    class: '',
    university: '',
    program: '',
    currentSemester: 'Năm 2 - Kỳ 2',
    status: 'Đang học',
    targetGpa: '14.00',
    completedCredits: '0',
    totalRequiredCredits: '155',
    currentGpa: 0,
    chartData: []
  });

  const [yearlyStats, setYearlyStats] = useState({
    year1: { gpa: null, credits: 0, achievements: [] },
    year2: { gpa: null, credits: 0, achievements: [] },
    year3: { gpa: null, credits: 0, achievements: [] },
    year4: { gpa: null, credits: 0, achievements: [] },
  });

  const cardRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [res, dashRes, subRes] = await Promise.all([
          userService.getProfile(),
          dashboardService.getSummary(),
          subjectService.getSubjects()
        ]);
        
        if (res.data) {
          setProfile(prev => ({
            ...prev,
            ...res.data,
            currentGpa: dashRes?.data?.academics?.currentGPA ?? 0,
            completedCredits: dashRes?.data?.academics?.completedCredits ?? res.data.completedCredits,
            totalRequiredCredits: dashRes?.data?.academics?.totalRequiredCredits ?? res.data.totalRequiredCredits,
            chartData: dashRes?.data?.academics?.chartData ?? [],
          }));
        }

        // Xử lý yearly stats
        const subjects = subRes.data || [];
        const stats = {
          year1: { totalScore: 0, totalCredits: 0, achievements: [] },
          year2: { totalScore: 0, totalCredits: 0, achievements: [] },
          year3: { totalScore: 0, totalCredits: 0, achievements: [] },
          year4: { totalScore: 0, totalCredits: 0, achievements: [] },
        };

        const activeUserScale = res.data?.gradingScale || 'scale20';

        subjects.forEach(sub => {
          const yKey = `year${sub.year}`;
          if (stats[yKey]) {
            const score = sub.finalScore ?? sub.score20;
            const subScale = sub.gradingScale || 'scale20';
            if (score !== null && score !== undefined && sub.credits) {
              const normalizedScore = convertScore(score, subScale, activeUserScale);
              stats[yKey].totalScore += normalizedScore * sub.credits;
              stats[yKey].totalCredits += sub.credits;
            }
          }
        });

        // Lấy achievements trực tiếp từ profile (lưu ở trang Grade)
        const userAch = res.data?.achievements || {};
        const finalStats = {};
        
        Object.keys(stats).forEach(yKey => {
          finalStats[yKey] = {
            gpa: stats[yKey].totalCredits > 0 ? (stats[yKey].totalScore / stats[yKey].totalCredits).toFixed(2) : null,
            credits: stats[yKey].totalCredits,
            achievements: userAch[yKey] && userAch[yKey].length > 0 ? userAch[yKey] : null
          };
        });

        setYearlyStats(finalStats);

      } catch {
        showToast('error', 'Không thể tải hồ sơ');
      }
    };
    fetchProfile();
  }, [showToast]);

  const userScale = profile.gradingScale || 'scale20';
  const classification = (() => {
    const val = parseFloat(profile.currentGpa) || 0;
    const cls = getGpaClassification(val, userScale);
    return { text: cls.label, color: cls.color };
  })();

  const handleToggleEdit = async () => {
    if (isEditing) {
      let gpa = parseFloat(profile.targetGpa);
      if (isNaN(gpa)) gpa = 0;
      if (gpa < 0) gpa = 0;
      if (gpa > getMaxScore(userScale)) gpa = getMaxScore(userScale);

      let comp = Math.max(0, parseInt(profile.completedCredits) || 0);
      let req = Math.max(1, parseInt(profile.totalRequiredCredits) || 0);
      if (comp > req) comp = req;

      const updatedProfile = {
        name: profile.name,
        avatar: profile.avatar,
        email: profile.email,
        mssv: profile.mssv,
        major: profile.major,
        class: profile.class,
        university: profile.university,
        program: profile.program,
        currentSemester: profile.currentSemester,
        status: profile.status,
        targetGpa: gpa.toFixed(2),
        completedCredits: String(comp),
        totalRequiredCredits: String(req),
      };

      setProfile((prev) => ({ ...prev, ...updatedProfile }));

      try {
        await userService.updateProfile(updatedProfile);
        await refreshUser();
        window.dispatchEvent(new Event('profileUpdated'));
        showToast('success', 'Đã lưu hồ sơ');
      } catch (error) {
        showToast('error', 'Lỗi lưu hồ sơ: ' + error.message);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const res = await userService.uploadAvatar(file);
        if (res.data && res.data.avatar) {
          setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
          await refreshUser();
          window.dispatchEvent(new Event('profileUpdated'));
          showToast('success', 'Đã cập nhật ảnh đại diện');
        }
      } catch (error) {
        showToast('error', 'Lỗi tải ảnh: ' + error.message);
      }
    }
  };

  const avatarSrc = profile.avatar
    ? (profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE_URL}${profile.avatar}`)
    : '';

  const accumulated = parseInt(profile.completedCredits) || 0;
  const required = parseInt(profile.totalRequiredCredits) || 0;
  const percent = required > 0 ? Math.min(100, Math.round((accumulated / required) * 100)) : 0;

  // 3D Hover & Glare Effect
  const handleMouseMove = (e) => {
    if (isEditing || !cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rotateX = -(y - rect.height / 2) / 20;
    const rotateY = (x - rect.width / 2) / 25;
    
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.setProperty('--glare-x', `${glareX}%`);
    card.style.setProperty('--glare-y', `${glareY}%`);
    card.style.setProperty('--glare-opacity', '0.2');
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.setProperty('--glare-opacity', '0');
  };

  return (
    <div className="min-h-full w-full overflow-visible bg-[#f8f6fc] p-4 md:p-6 xl:flex xl:h-full xl:min-h-0 xl:flex-row xl:gap-6 xl:overflow-hidden">
      
      {/* LEFT COLUMN: Wrapper */}
      <div className="flex w-full shrink-0 flex-col gap-4 xl:h-full xl:min-h-0 xl:w-[650px]">
        
        {/* Title Outside */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <h2 className="text-[1.55rem] font-black tracking-[-0.04em] text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            Hồ sơ sinh viên
          </h2>
          <button 
            onClick={handleToggleEdit}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white/80 hover:scale-105 active:scale-95 border border-white"
            style={{ boxShadow: isEditing ? neuI : '0 4px 12px rgba(182,167,230,0.15)', color: isEditing ? '#2563eb' : '#64748b' }}
            title={isEditing ? 'Lưu hồ sơ' : 'Chỉnh sửa hồ sơ'}
            aria-label={isEditing ? 'Lưu hồ sơ' : 'Chỉnh sửa hồ sơ'}
          >
            {isEditing ? <Checks size={20} weight="bold" /> : <PencilSimple size={20} weight="bold" />}
          </button>
        </div>

        {/* Big White Container */}
        <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,255,255,0.85)] p-4 md:p-6 flex flex-col gap-5 relative xl:flex-1 xl:min-h-0 xl:overflow-y-auto scrollbar-hide" style={{ boxShadow: clayR }}>

        {/* 1. HORIZONTAL 3D ID CARD - Thiết kế Midnight Blue sang trọng */}
        <div 
          className="w-full flex justify-center mt-1"
          style={{ perspective: '1000px' }}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full rounded-[2rem] overflow-hidden flex flex-col md:flex-row relative transition-transform duration-200 ease-out border border-white/40 select-none animate-none"
            style={{ 
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)', 
              boxShadow: '0 24px 48px -12px rgba(139, 92, 246, 0.5), inset 0 2px 10px rgba(255,255,255,0.4)',
              transformStyle: 'preserve-3d',
              minHeight: '280px' // Kích thước thẻ giảm lại một chút
            }}
          >
            {/* Glare Layer */}
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300 rounded-[2rem]"
              style={{
                background: 'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 60%)',
                opacity: 'var(--glare-opacity, 0)',
                zIndex: 20
              }}
            />

            {/* Avatar Section (Left) */}
            <div className="md:w-[240px] bg-white/[0.02] backdrop-blur-md p-6 flex flex-col items-center justify-center border-r border-slate-600/30 z-10 relative">
              
              {/* Chip Đồng Thông Minh Gold Hologram */}
              <div className="absolute top-5 left-5 w-12 h-9 rounded-md bg-gradient-to-br from-yellow-500 via-amber-300 to-yellow-600 border border-yellow-500/30 flex flex-col gap-1 p-1 shadow-md">
                <div className="w-full h-[2px] bg-amber-900/30" />
                <div className="w-3/4 h-full border-r border-amber-900/30" />
                <div className="absolute inset-1.5 border border-amber-900/20 rounded-sm" />
              </div>

              {/* Khung Ảnh Thẻ */}
              <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-[2rem] p-1.5 bg-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.15)] mt-4 mb-4 border border-white/30 backdrop-blur-lg transition-transform hover:scale-105 duration-300 group">
                <div className="w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[inset_0_4px_10px_rgba(255,255,255,0.4)] flex items-center justify-center text-white border border-emerald-300/50">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[5rem] font-black drop-shadow-md">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'A'}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-[-6px] right-[-6px] w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white cursor-pointer hover:bg-blue-600 shadow-lg border-2 border-slate-800 transition-transform hover:scale-105">
                    <Camera size={14} weight="fill" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                )}
              </div>

              {/* Mã vạch Barcode Giả Lập */}
              <div className="flex flex-col items-center gap-1 opacity-60 mt-1 bg-black/20 py-1.5 px-4 rounded border border-white/5">
                <span className="text-[10px] font-mono text-slate-300 tracking-[3px]">{profile.mssv || '00000000'}</span>
              </div>
            </div>

            {/* Info Section (Right) - Cỡ chữ to rõ rệt, khoảng cách gọn gàng */}
            <div className="flex-1 p-6 text-white z-10 flex flex-col justify-between relative">
              
              {/* Logo mờ dưới nền */}
              <div className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] pointer-events-none">
                <ShieldCheck size={280} weight="fill" />
              </div>

              {/* Header Thẻ: Trường học */}
              <div className="flex items-center gap-3 border-b border-slate-600/50 pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                  <ShieldCheck size={24} weight="duotone" className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm md:text-[15px] font-black uppercase tracking-wider text-slate-200" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    {isEditing ? (
                      <input name="university" value={profile.university} onChange={handleChange} className="bg-white/10 px-2 py-0.5 rounded border border-white/20 focus:outline-none w-full text-white" placeholder="Trường Đại học..." />
                    ) : (
                      profile.university || 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ'
                    )}
                  </h4>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mt-0.5">Thẻ Sinh Viên - Student Card</span>
                </div>
              </div>

              {/* Giữa Thẻ: Tên SV */}
              <div className="my-4">
                {isEditing ? (
                  <input name="name" value={profile.name} onChange={handleChange} className="text-2xl md:text-[28px] font-black uppercase tracking-tight bg-white/10 px-2 py-1 rounded border border-white/20 focus:outline-none w-full text-white" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }} />
                ) : (
                  <h3 className="text-2xl md:text-[30px] font-black uppercase tracking-tight text-white drop-shadow-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    {profile.name}
                  </h3>
                )}
              </div>

              {/* Dưới Thẻ: Grid Thông tin chi tiết */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-5 text-sm">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Mã số sinh viên</span>
                  {isEditing ? (
                    <input name="mssv" value={profile.mssv} onChange={handleChange} className="bg-white/10 px-2 py-0.5 rounded focus:outline-none w-full font-mono font-bold" />
                  ) : (
                    <span className="font-mono font-bold text-base text-blue-300 tracking-wide">{profile.mssv || '---'}</span>
                  )}
                </div>
                
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Lớp sinh hoạt</span>
                  {isEditing ? (
                    <input name="class" value={profile.class} onChange={handleChange} className="bg-white/10 px-2 py-0.5 rounded focus:outline-none w-full font-bold" />
                  ) : (
                    <span className="font-bold text-base text-slate-200">{profile.class || '---'}</span>
                  )}
                </div>
                
                <div className="col-span-2">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Chuyên ngành đào tạo</span>
                  {isEditing ? (
                    <input name="major" value={profile.major} onChange={handleChange} className="bg-white/10 px-2 py-0.5 rounded focus:outline-none w-full font-bold" />
                  ) : (
                    <span className="font-bold text-base text-slate-200">{profile.major || '---'}</span>
                  )}
                </div>
              </div>

              {/* Trạng thái hoạt động ở góc dưới */}
              <div className="absolute top-5 right-5">
                {isEditing ? (
                  <select name="status" value={profile.status} onChange={handleChange} className="text-[10px] font-bold bg-slate-800 text-white rounded-full px-3 py-1 focus:outline-none text-center cursor-pointer border border-slate-600">
                    <option value="Đang học">Đang học</option>
                    <option value="Bảo lưu">Bảo lưu</option>
                    <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-3 py-1 uppercase tracking-widest shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {profile.status}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 2. MINI DASHBOARD STRIP (4 KPI Cards) - Tăng kích thước card & cỡ chữ */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* KPI: GPA hiện tại */}
          <div 
            className="rounded-[1.5rem] p-4 flex items-center gap-4 bg-[rgba(255,255,255,0.85)] border border-white/60 relative overflow-hidden transition-all duration-300" 
            style={{ boxShadow: clayR }}
          >
            <div className="w-[3.25rem] h-[3.25rem] rounded-full flex shrink-0 items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_8px_16px_rgba(168,85,247,0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] border border-purple-300">
              <Crown size={28} weight="fill" className="text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">GPA Hiện tại</span>
              <div className="text-[22px] font-black text-slate-800 leading-none mt-0.5">
                {profile.currentGpa ? profile.currentGpa.toFixed(2) : '0.00'} <span className="text-[11px] text-slate-400">/ {getMaxLabel(userScale)}</span>
              </div>
            </div>
          </div>

          {/* KPI: GPA Mục tiêu */}
          <div 
            className="rounded-[1.5rem] p-4 flex items-center gap-4 bg-[rgba(255,255,255,0.85)] border border-white/60 relative overflow-hidden transition-all duration-300" 
            style={{ boxShadow: clayR }}
          >
            <div className="w-[3.25rem] h-[3.25rem] rounded-full flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_8px_16px_rgba(59,130,246,0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] border border-blue-300">
              <Target size={28} weight="fill" className="text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-0.5 w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">GPA Mục tiêu</span>
              {isEditing ? (
                <div className="flex items-center bg-white px-2 py-0.5 rounded-xl mt-1 border border-blue-100 shadow-inner">
                  <input type="number" step="0.01" name="targetGpa" value={profile.targetGpa} onChange={handleChange} className="w-full bg-transparent text-[18px] font-black text-slate-800 focus:outline-none" />
                </div>
              ) : (
                <div className="text-[22px] font-black text-slate-800 leading-none mt-0.5">
                  {profile.targetGpa} <span className="text-[11px] text-slate-400">/ {getMaxLabel(userScale)}</span>
                </div>
              )}
            </div>
          </div>

          {/* KPI: Số tín chỉ */}
          <div 
            className="rounded-[1.5rem] p-4 flex items-center gap-4 bg-[rgba(255,255,255,0.85)] border border-white/60 relative overflow-hidden transition-all duration-300" 
            style={{ boxShadow: clayR }}
          >
            <div className="w-[3.25rem] h-[3.25rem] rounded-full flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] border border-emerald-300">
              <Bookmark size={28} weight="fill" className="text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-0.5 w-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Tín chỉ ({percent}%)</span>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1/2 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-inner text-xs font-black text-slate-500 text-center select-none" title="Tự động đồng bộ từ Bảng điểm">
                    {profile.completedCredits}
                  </div>
                  <span className="text-slate-400 pt-0.5">/</span>
                  <input type="number" name="totalRequiredCredits" value={profile.totalRequiredCredits} onChange={handleChange} className="w-1/2 bg-white border border-emerald-200 px-1.5 py-0.5 rounded shadow-inner text-xs font-black focus:outline-none" />
                </div>
              ) : (
                <div className="text-[22px] font-black text-slate-800 leading-none mt-0.5 truncate">
                  {accumulated} <span className="text-[11px] text-slate-400">/ {required}</span>
                </div>
              )}
            </div>
          </div>

          {/* KPI: Xếp loại */}
          <div 
            className="rounded-[1.5rem] p-4 flex items-center gap-4 bg-[rgba(255,255,255,0.85)] border border-white/60 relative overflow-hidden transition-all duration-300" 
            style={{ boxShadow: clayR }}
          >
            <div className="w-[3.25rem] h-[3.25rem] rounded-full flex shrink-0 items-center justify-center bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_8px_16px_rgba(244,63,94,0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] border border-rose-300">
              <Trophy size={28} weight="fill" className="text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Xếp loại</span>
              <div className="text-lg font-black mt-0.5 line-clamp-1" style={{ color: classification.color }}>
                {classification.text}
              </div>
            </div>
          </div>
        </div>

        {/* 3. BẢNG KÝ TỰ / GHI CHÚ MỤC TIÊU */}
        <div className="rounded-[1.5rem] p-6 bg-gradient-to-br from-[#fffdf5] to-[#fffbe6] border border-yellow-100/50 flex flex-col gap-3 relative flex-1 min-h-[160px]" style={{ boxShadow: clayR }}>
          <div className="flex items-center gap-2.5 text-yellow-600 relative z-10">
            <Star size={24} weight="fill" className="text-yellow-500 drop-shadow-sm" />
            <h4 className="text-[14px] font-black uppercase tracking-wider text-yellow-700">Lời thề học tập</h4>
          </div>
          <p className="text-[14px] font-extrabold text-yellow-800/80 leading-relaxed italic relative z-10 pr-[100px] xl:pr-[130px]">
            "Kiến thức không tự nhiên sinh ra cũng không tự nhiên mất đi, nó chỉ chuyển từ đề thi của thầy cô sang bài làm của những người nỗ lực."
          </p>
          <img 
            src="/assets/profile/floating-badge.png" 
            alt="Study character" 
            className="absolute bottom-[20px] right-[-10px] w-[140px] h-[140px] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.25)] z-0 hover:scale-105 transition-transform origin-bottom-right"
          />
        </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Wrapper */}
      <div className="mt-6 flex flex-1 flex-col gap-4 xl:mt-0 xl:h-full xl:min-h-0">
        
        {/* Title Outside */}
        <div className="flex items-center gap-3 px-2 shrink-0">
          <img src="/assets/profile/trophy-badge.png" alt="Trophy" className="w-8 h-8 object-contain drop-shadow-md" />
          <h2 className="text-[1.55rem] font-black tracking-[-0.04em] text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            Hành trình học tập & Thành tích ✨
          </h2>
        </div>

        {/* Big White Container */}
        <div className="rounded-[2rem] border border-white/60 bg-[rgba(255,255,255,0.85)] p-6 md:p-8 flex flex-col relative xl:flex-1 xl:min-h-0 xl:overflow-y-auto scrollbar-hide" style={{ boxShadow: clayR }}>
          
          {/* Timeline List */}
          <div className="flex flex-col gap-8 relative mt-2 pb-4">
            
            {YEARS_STRUCTURE.map((yearObj, index) => {
              const isLast = index === YEARS_STRUCTURE.length - 1;
              const stats = yearlyStats[yearObj.key];
              const achievementsList = stats.achievements || yearObj.defaultAchievements;
              
              // Nhận diện năm hiện tại
              let isPast = false;
              let isCurrent = false;
              
              const curSemIdx = SEMESTERS.indexOf(profile.currentSemester);
              const s1Idx = SEMESTERS.indexOf(yearObj.semesters[0]);
              const s2Idx = SEMESTERS.indexOf(yearObj.semesters[1]);

              if (curSemIdx > -1) {
                if (curSemIdx > s2Idx) isPast = true;
                else if (curSemIdx >= s1Idx && curSemIdx <= s2Idx) isCurrent = true;
              }

              return (
                <div key={yearObj.key} className="relative pl-9 flex flex-col gap-3 group">
                  {/* Node Dot Timeline nổi khối */}
                  <div 
                    className="absolute left-[0px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-white z-10 border-2 border-slate-100" 
                    style={{ 
                      boxShadow: isCurrent ? '0 0 10px rgba(59,130,246,0.6)' : clayR,
                      marginLeft: '-1px'
                    }}
                  >
                    {isPast && <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />}
                    {isCurrent && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-md" />}
                    {isPast === false && isCurrent === false && <CircleDashed size={14} weight="bold" className="text-slate-300" />}
                  </div>

                  {/* Line segment connecting to next node */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-7 bottom-[-24px] w-[2px] bg-slate-300/80 z-0" />
                  )}

                  {/* Card Năm Học (Claymorphic) */}
                  <div 
                    className="rounded-3xl p-5 md:pr-32 bg-[rgba(255,255,255,0.9)] flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-0.5 relative group/card"
                    style={{ 
                      boxShadow: isCurrent ? '0 12px 24px rgba(59,130,246,0.15), inset 0 2px 0 rgba(255,255,255,0.9)' : clayR,
                      border: isCurrent ? '1.5px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    {/* Sticker nổi của mỗi năm học */}
                    <img 
                      src={yearObj.sticker} 
                      alt={`Sticker ${yearObj.label}`} 
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-28 h-28 object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)] group-hover/card:scale-110 transition-transform duration-300 z-0"
                    />

                    {/* Header Card: Năm học & Các chỉ số */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-300/40 relative z-10">
                      <span className={`text-sm font-black uppercase tracking-wider ${isCurrent ? 'text-blue-600' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                        {yearObj.label}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {stats.gpa ? (
                          <>
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm flex items-center gap-1.5">
                              GPA Năm: <span className="text-emerald-700 text-xs">{stats.gpa}</span>
                            </span>
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm flex items-center gap-1.5">
                              <BookOpen size={13} weight="fill" />
                              Tích lũy: <span className="text-indigo-700 text-xs">{stats.credits} TC</span>
                            </span>
                          </>
                        ) : (
                          isCurrent && <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 animate-pulse">Đang học</span>
                        )}
                      </div>
                    </div>

                    {/* Thành tích cá nhân của năm học */}
                    <div className="flex flex-col gap-2 relative z-10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Medal size={14} weight="duotone" className="text-amber-500" />
                        Thành tích cá nhân
                      </span>
                      
                      <ul className="flex flex-col gap-2.5 pl-1.5">
                        {achievementsList.map((ach, aIdx) => (
                          <li key={aIdx} className="text-xs md:text-[13px] font-bold text-slate-700 flex items-start gap-2 leading-relaxed">
                            <Star size={14} weight="fill" className="text-yellow-500 mt-0.5 shrink-0" />
                            <span>{ach}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}

        </div>
        </div>
      </div>

    </div>
  );
}
