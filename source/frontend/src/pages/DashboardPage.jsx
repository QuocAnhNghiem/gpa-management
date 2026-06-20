import { useEffect, useMemo, useRef, useState } from 'react';
import * as dashboardService from '../api/dashboardService';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarCheck,
  ChartLine,
  CheckCircle,
  Clock,
  Crown,
  MapPin,
  PencilSimple,
  Plant,
  RocketLaunch,
  ShootingStar,
  Warning,
  Notepad,
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from '../context/ToastContext';
import { DASHBOARD_STICKERS } from '../constants/dashboardStickers';
import {
  convertScore,
  getDefaultRiskThreshold,
  getGpaClassification,
  getMaxLabel,
  getMaxScore,
} from '../utils/gradeUtils';

const NOTE_COLORS = [
  { id: 'yellow', bg: '#FFF7D6', line: 'rgba(180, 128, 20, 0.18)', text: '#6F4E0B', title: '#92400E' },
  { id: 'pink', bg: '#FFE8F2', line: 'rgba(190, 60, 125, 0.16)', text: '#7F1D4D', title: '#9D174D' },
  { id: 'green', bg: '#E7F8EF', line: 'rgba(16, 185, 129, 0.16)', text: '#065F46', title: '#047857' },
  { id: 'blue', bg: '#EAF1FF', line: 'rgba(79, 70, 229, 0.16)', text: '#1E3A8A', title: '#4338CA' },
];

function calcNextGPA(currentGPA, targetGPA, completedCredits, totalCredits, maxScore = 20) {
  if (!targetGPA || !totalCredits) return null;
  const remaining = totalCredits - completedCredits;
  if (remaining <= 0) return 0;
  const nextCredits = Math.min(remaining, 15);
  const needed = (targetGPA * (completedCredits + nextCredits) - currentGPA * completedCredits) / nextCredits;
  
  if (isNaN(needed) || !isFinite(needed) || needed <= 0) return null;
  if (needed > maxScore) return null;
  return Number(needed.toFixed(2));
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function useCounter(target, duration = 850) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const numericTarget = Number(target) || 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * numericTarget * 100) / 100);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return val;
}

function formatCountdown(dateString, timeString = '') {
  const now = new Date();
  const safeTime = timeString && timeString !== '—' ? timeString : '23:59';
  const target = new Date(`${dateString}T${safeTime}:00`);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);

  const diffDay = Math.round((targetDay - today) / (1000 * 60 * 60 * 24));
  const diffHour = Math.ceil((target - now) / (1000 * 60 * 60));

  if (diffDay < 0) return { text: 'Đã qua', color: '#64748B', bg: '#F1F5F9' };
  if (diffDay === 0 && diffHour > 0 && diffHour <= 6) return { text: `Còn ${diffHour} giờ`, color: '#B91C1C', bg: '#FEE2E2' };
  if (diffDay === 0) return { text: 'Hôm nay', color: '#EF4444', bg: '#FEF2F2' };
  if (diffDay === 1) return { text: 'Còn 1 ngày', color: '#D97706', bg: '#FFFBEB' };
  return { text: `Còn ${diffDay} ngày`, color: '#059669', bg: '#ECFDF5' };
}

function ChartTooltip({ active, payload, label, scale }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <p className="mb-1 text-sm font-extrabold text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-bold" style={{ color: entry.color }}>
          {entry.dataKey === 'gpa' ? 'Thực tế' : 'Mục tiêu'}: {Number(entry.value).toFixed(2)} · {getGpaClassification(entry.value, scale).label}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [profileData, setProfileData] = useState({
    targetGpa: 14,
    currentGpa: 0,
    nextGpaTarget: null,
    creditsAcc: 0,
    creditsReq: 155,
  });
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [riskSubjects, setRiskSubjects] = useState([]);
  const [gpaData, setGpaData] = useState([]);
  const [riskThreshold, setRiskThreshold] = useState(getDefaultRiskThreshold('scale20'));
  const [dashboardNote, setDashboardNote] = useState({
    id: null,
    title: 'Ghi chú nhanh',
    content: '',
    colorId: 'yellow',
    isPinned: true,
  });
  const [noteSaveStatus, setNoteSaveStatus] = useState('idle');
  const [noteSavedAt, setNoteSavedAt] = useState(null);
  const [userScale, setUserScale] = useState('scale20');

  const noteTimeout = useRef(null);
  const noteIdRef = useRef(null);
  const creatingNoteRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dashRes, notesRes] = await Promise.all([
          dashboardService.getSummary(),
          import('../api/noteService').then((m) => m.getNotes()),
        ]);

        if (dashRes.success && dashRes.data) {
          const ac = dashRes.data.academics;
          const current = ac.currentGPA || 0;
          const target = Number(ac.targetGPA) || 14;
          const acc = ac.completedCredits || 0;
          const req = ac.totalRequiredCredits || 155;
          const scale = dashRes.data.user?.gradingScale || 'scale20';
          const maxSc = ac.maxScore || getMaxScore(scale);

          setUserScale(scale);
          setRiskThreshold(getDefaultRiskThreshold(scale));
          const nextVal = calcNextGPA(current, target, acc, req, maxSc);
          setProfileData({
            targetGpa: target,
            currentGpa: current,
            nextGpaTarget: nextVal,
            creditsAcc: acc,
            creditsReq: req,
          });
          setRiskSubjects(ac.riskSubjects || []);
          setGpaData(ac.chartData || []);

          if (dashRes.data.schedule?.upcomingDeadlines?.length) {
            setUpcomingExams(dashRes.data.schedule.upcomingDeadlines.map((deadline) => ({
              id: deadline._id,
              name: deadline.name,
              date: deadline.specificDate,
              time: deadline.startTime || '—',
              room: deadline.room || 'Không có',
              type: deadline.type,
              isCompleted: deadline.isCompleted,
            })));
          }
        }

        if (notesRes.success && notesRes.data?.length > 0) {
          const pinnedNotes = notesRes.data.filter((note) => note.isPinned);
          const activeNote = (pinnedNotes.length ? pinnedNotes : notesRes.data)
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
          noteIdRef.current = activeNote._id;
          setDashboardNote({
            id: activeNote._id,
            title: activeNote.title || 'Ghi chú nhanh',
            content: activeNote.content || '',
            colorId: activeNote.colorId || 'yellow',
            isPinned: activeNote.isPinned,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoaded(true);
      }
    };

    fetch();
  }, []);

  useEffect(() => () => {
    if (noteTimeout.current) clearTimeout(noteTimeout.current);
  }, []);

  const gpa = useCounter(profileData.currentGpa);
  const credits = useCounter(profileData.creditsAcc);
  const targetGpa = useCounter(profileData.targetGpa);
  const nextGpa = useCounter(profileData.nextGpaTarget ?? 0);
  const maxScore = getMaxScore(userScale);

  const filteredRiskSubjects = useMemo(() => riskSubjects.filter((subject) => {
    const subjectScale = subject.gradingScale || 'scale20';
    const normalizedScore = subjectScale !== userScale
      ? convertScore(subject.gpa, subjectScale, userScale)
      : subject.gpa;
    return normalizedScore < riskThreshold;
  }), [riskSubjects, riskThreshold, userScale]);

  const statCards = [
    {
      key: 'current',
      label: 'GPA hiện tại',
      value: loaded ? gpa.toFixed(2) : '—',
      total: getMaxLabel(userScale),
      icon: Crown,
      iconTone: 'indigo',
      surfaceTone: 'cool',
      progressTone: 'cool',
      progress: clampPercent((profileData.currentGpa / maxScore) * 100),
      helper: 'Điểm tích lũy hiện tại',
      sticker: DASHBOARD_STICKERS.stat_current,
      stickerClass: '-bottom-[16px] -right-[16px]',
    },
    {
      key: 'target',
      label: 'GPA mục tiêu',
      value: loaded ? targetGpa.toFixed(2) : '—',
      total: getMaxLabel(userScale),
      icon: ShootingStar,
      iconTone: 'amber',
      surfaceTone: 'warm',
      progressTone: 'warm',
      progress: clampPercent((profileData.targetGpa / maxScore) * 100),
      helper: 'Mục tiêu toàn khóa',
      sticker: DASHBOARD_STICKERS.stat_target,
      stickerClass: '-bottom-[36px] -right-[12px] scale-95',
    },
    {
      key: 'next',
      label: 'GPA cần đạt kỳ tới',
      value: loaded ? (profileData.nextGpaTarget === null ? '—' : nextGpa.toFixed(2)) : '—',
      total: getMaxLabel(userScale),
      icon: RocketLaunch,
      iconTone: 'violet',
      surfaceTone: 'violet',
      progressTone: 'violet',
      progress: clampPercent(((profileData.nextGpaTarget ?? 0) / maxScore) * 100),
      helper: profileData.nextGpaTarget === null
        ? 'Mục tiêu hiện tại chưa khả thi trong kỳ tới'
        : `Để đạt mục tiêu ${profileData.targetGpa.toFixed(2)}`,
      sticker: DASHBOARD_STICKERS.stat_required,
      stickerClass: '-bottom-[16px] -right-[16px]',
    },
    {
      key: 'credits',
      label: 'Tín chỉ tích lũy',
      value: loaded ? Math.round(credits) : '—',
      total: loaded ? `/ ${profileData.creditsReq}` : '',
      icon: Plant,
      iconTone: 'green',
      surfaceTone: 'mint',
      progressTone: 'mint',
      progress: clampPercent((profileData.creditsAcc / profileData.creditsReq) * 100),
      helper: 'Tiến độ hoàn thành',
      sticker: DASHBOARD_STICKERS.stat_credits,
      stickerClass: '-bottom-[36px] -right-[12px] scale-95',
    },
  ];

  const handleDashboardNoteChange = (event) => {
    const nextContent = event.target.value;
    setDashboardNote((prev) => ({ ...prev, content: nextContent }));
    setNoteSaveStatus('typing');

    if (noteTimeout.current) clearTimeout(noteTimeout.current);
    noteTimeout.current = setTimeout(() => {
      saveNote(nextContent);
    }, 1200);
  };

  const saveNote = async (contentToSave) => {
    setNoteSaveStatus('saving');
    try {
      const noteService = await import('../api/noteService');
      if (creatingNoteRef.current) {
        await creatingNoteRef.current;
      }

      if (noteIdRef.current) {
        await noteService.updateNote(noteIdRef.current, { content: contentToSave });
      } else {
        creatingNoteRef.current = noteService.createNote({
          title: dashboardNote.title,
          content: contentToSave,
          colorId: dashboardNote.colorId,
          isPinned: true,
        });
        const res = await creatingNoteRef.current;
        noteIdRef.current = res.data._id;
        setDashboardNote((prev) => ({ ...prev, id: res.data._id }));
        creatingNoteRef.current = null;
      }

      setNoteSavedAt(new Date());
      setNoteSaveStatus('saved');
    } catch (err) {
      console.error('Lỗi khi lưu note:', err);
      creatingNoteRef.current = null;
      setNoteSaveStatus('error');
      showToast('error', 'Không thể lưu ghi chú');
    }
  };

  const handleNoteBlur = () => {
    if (noteTimeout.current) {
      clearTimeout(noteTimeout.current);
      noteTimeout.current = null;
    }
    saveNote(dashboardNote.content);
  };

  const toggleComplete = async (examId, isCompleted) => {
    if (isCompleted) {
      confetti({
        particleCount: 90,
        spread: 68,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#06B6D4', '#F59E0B', '#10B981'],
      });
    }

    setUpcomingExams((prev) => prev.map((exam) => (
      exam.id === examId ? { ...exam, isCompleted } : exam
    )));

    try {
      const scheduleService = await import('../api/scheduleService');
      await scheduleService.updateSchedule(examId, { isCompleted });
    } catch {
      showToast('error', 'Không thể cập nhật trạng thái');
      setUpcomingExams((prev) => prev.map((exam) => (
        exam.id === examId ? { ...exam, isCompleted: !isCompleted } : exam
      )));
    }
  };

  return (
    <DashboardLayout>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:h-[162px] xl:shrink-0 xl:grid-cols-4 xl:gap-5">
        {statCards.map((card, index) => (
          <StatCard key={card.key} {...card} delay={index * 0.05} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:flex-1 xl:min-h-0 xl:grid-cols-2">
        <GpaTrendCard gpaData={gpaData} userScale={userScale} />
        <DeadlineCard upcomingExams={upcomingExams} onToggleComplete={toggleComplete} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:flex-1 xl:min-h-0 xl:grid-cols-2">
        <RiskCoursesCard
          filteredRiskSubjects={filteredRiskSubjects}
          riskThreshold={riskThreshold}
          setRiskThreshold={setRiskThreshold}
          userScale={userScale}
        />
        <QuickNoteCard
          dashboardNote={dashboardNote}
          colorConfig={NOTE_COLORS.find((color) => color.id === dashboardNote.colorId) || NOTE_COLORS[0]}
          noteSavedAt={noteSavedAt}
          noteSaveStatus={noteSaveStatus}
          onBlur={handleNoteBlur}
          onChange={handleDashboardNoteChange}
        />
      </section>
    </DashboardLayout>
  );
}

function DashboardLayout({ children }) {
  return (
    <div className="h-full min-h-0 space-y-7 overflow-y-auto px-1 pb-1 pr-1 xl:flex xl:flex-col xl:space-y-7 xl:overflow-y-auto">
      {children}
    </div>
  );
}

function CardShell({ children, className = '', delay = 0, style = {} }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative overflow-hidden rounded-[30px] border border-[rgba(220,211,248,0.78)] bg-[rgba(255,255,255,0.84)] p-6 shadow-[0_28px_64px_rgba(182,167,230,0.15),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(224,215,248,0.28)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_74px_rgba(176,161,229,0.19)] ${className}`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: 'radial-gradient(circle at top right, rgba(224, 214, 255, 0.48), transparent 17rem), radial-gradient(circle at bottom left, rgba(255, 248, 225, 0.3), transparent 18rem)',
        }}
      />
      {children}
    </motion.article>
  );
}

function iconToneClasses(tone) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600 ring-amber-200/60',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-200/70',
    red: 'bg-red-50 text-red-500 ring-red-200/60',
    violet: 'bg-violet-50 text-violet-600 ring-violet-200/60',
  };
  return tones[tone] || tones.indigo;
}

const STAT_SURFACE_STYLES = {
  cool: {
    background: 'linear-gradient(180deg, rgba(253,252,255,0.96) 0%, rgba(241,244,255,0.92) 100%)',
  },
  warm: {
    background: 'linear-gradient(180deg, rgba(255,250,244,0.96) 0%, rgba(255,244,226,0.92) 100%)',
  },
  violet: {
    background: 'linear-gradient(180deg, rgba(255,251,255,0.96) 0%, rgba(249,239,255,0.94) 100%)',
  },
  mint: {
    background: 'linear-gradient(180deg, rgba(251,255,253,0.96) 0%, rgba(241,255,248,0.92) 100%)',
  },
};

const PROGRESS_GRADIENTS = {
  cool: 'linear-gradient(90deg, #4e62ff, #59b8ff)',
  mint: 'linear-gradient(90deg, #7de0bc, #ccefdc)',
  violet: 'linear-gradient(90deg, #6f4dff, #d66af7)',
  warm: 'linear-gradient(90deg, #f4b267, #ff7b6b)',
  primary: 'linear-gradient(90deg, #6f4dff, #59b8ff)',
};

function StatCard({ delay, helper, icon: Icon, iconTone, label, progress, progressTone, surfaceTone, total, value, sticker, stickerClass }) {
  return (
    <CardShell className="h-full min-h-[164px] p-5 xl:min-h-0 relative overflow-hidden group/stat" delay={delay} style={STAT_SURFACE_STYLES[surfaceTone] || STAT_SURFACE_STYLES.cool}>
      <div className="flex h-full flex-col justify-between relative z-10 pointer-events-none">
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.04)] ring-1 ${iconToneClasses(iconTone)}`}>
            <Icon size={22} weight="duotone" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-white/90 backdrop-blur-md">
            {progress ? `${Math.round(progress)}%` : '0%'}
          </div>
        </div>
        <div className="mt-5">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-slate-500/90 drop-shadow-sm">{label}</p>
          <div className="mt-2 flex items-baseline gap-1 drop-shadow-sm">
            <span className="text-[38px] font-black leading-none tracking-[-0.04em] text-[#1f2758]">{value}</span>
            {total && <span className="text-[16px] font-black text-[#7f86c9]/90 ml-0.5">/{total.replace('/', '').trim()}</span>}
          </div>
          {helper ? (
            <p className="mt-2 max-w-[85%] text-[11px] font-bold leading-relaxed text-slate-500/90">
              {helper}
            </p>
          ) : null}
        </div>
        <div className="mt-auto pt-4 drop-shadow-sm">
          <ProgressBar value={progress} variant={progressTone} />
        </div>
      </div>
      
      {sticker && (
        <div className={`absolute z-0 pointer-events-none transition-transform duration-300 group-hover/stat:scale-110 group-hover/stat:-rotate-6 ${stickerClass || '-bottom-[16px] -right-[16px]'}`}>
          <img
            src={sticker}
            alt=""
            className="h-[140px] w-[140px] object-contain opacity-95 drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
            aria-hidden="true"
          />
        </div>
      )}
    </CardShell>
  );
}

function ProgressBar({ value, variant = 'primary' }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-white/80 shadow-[inset_0_1px_3px_rgba(169,157,226,0.18)]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: PROGRESS_GRADIENTS[variant] || PROGRESS_GRADIENTS.primary,
          boxShadow: '0 10px 18px rgba(118, 103, 226, 0.2)',
        }}
      />
    </div>
  );
}

function PanelHeader({ icon: Icon, title, tone = 'indigo', action }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconToneClasses(tone)}`}>
          <Icon size={20} weight="duotone" />
        </div>
        <h3 className="truncate text-lg font-black tracking-tight" style={{ color: '#35305f' }}>{title}</h3>
      </div>
      {action}
    </div>
  );
}



function GpaTrendCard({ gpaData, userScale }) {
  return (
    <CardShell className="h-[220px] xl:h-full xl:min-h-0 shadow-[0_16px_36px_rgba(178,167,230,0.18),_inset_0_4px_12px_rgba(255,255,255,0.8)]">
      <PanelHeader icon={ChartLine} title="Xu hướng GPA qua các kỳ" />
      <div className="relative z-10 mt-4 h-[148px] xl:h-[calc(100%-3.35rem)]">
        {gpaData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center pb-2">
            <div className="app-sticker-stage mb-0 -translate-y-2">
              <img
                src={DASHBOARD_STICKERS.trend}
                alt=""
                className="h-48 w-48 object-contain scale-125"
                aria-hidden="true"
              />
            </div>
            <div className="shrink-0 -mt-6 z-10 px-4">
              <p className="text-[15px] font-extrabold text-[#556298]">Chưa có dữ liệu học kỳ để vẽ xu hướng GPA.</p>
              <p className="mt-0.5 text-[13px] font-medium leading-relaxed text-[#7984af]">Biểu đồ sẽ hiển thị sau khi bạn nhập điểm cho ít nhất 2 học kỳ.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={gpaData} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardGpaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="ky" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, getMaxScore(userScale)]} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip scale={userScale} />} />
              <Area type="monotone" dataKey="gpa" stroke="#4F46E5" strokeWidth={3} fill="url(#dashboardGpaFill)" dot={{ r: 4, fill: '#fff', strokeWidth: 2.5, stroke: '#4F46E5' }} activeDot={{ r: 6, fill: '#4F46E5' }} />
              <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="7 7" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardShell>
  );
}

function DeadlineCard({ upcomingExams, onToggleComplete }) {
  return (
    <CardShell
      className="h-[220px] xl:h-full xl:min-h-0 shadow-[0_16px_36px_rgba(178,167,230,0.18),_inset_0_4px_12px_rgba(255,255,255,0.8)]"
      style={{
        background: 'linear-gradient(180deg, rgba(253,252,255,0.8) 0%, rgba(241,244,255,0.85) 100%)',
      }}
    >
      <PanelHeader icon={CalendarCheck} title="Deadline / Lịch thi tới" tone="red" />
      <div className="relative z-10 mt-4 h-[148px] overflow-auto pr-1 xl:h-[calc(100%-3.35rem)]">
        {upcomingExams.length === 0 ? (
          <DeadlineEmptyState />
        ) : (
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <DeadlineItem key={exam.id} exam={exam} onToggleComplete={onToggleComplete} />
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}

function DeadlineItem({ exam, onToggleComplete }) {
  const countdown = formatCountdown(exam.date, exam.time);
  const isDone = exam.isCompleted;

  return (
    <article className={`flex items-start gap-3 rounded-[22px] border border-[rgba(223,216,248,0.92)] bg-[rgba(255,255,255,0.82)] p-3 transition ${isDone ? 'opacity-55 grayscale' : ''}`}>
      <button
        type="button"
        onClick={() => onToggleComplete(exam.id, !isDone)}
        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${isDone ? 'bg-emerald-500 text-white' : 'bg-white text-transparent ring-1 ring-slate-200 hover:text-slate-300'}`}
        aria-label="Cập nhật trạng thái"
      >
        <CheckCircle size={19} weight="fill" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600">
            {exam.type === 'exam' ? 'Lịch thi' : 'Deadline'}
          </span>
          <span className="rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: countdown.bg, color: countdown.color }}>
            {countdown.text}
          </span>
        </div>
        <p className={`truncate text-sm font-extrabold text-slate-800 ${isDone ? 'line-through' : ''}`}>{exam.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock size={13} weight="bold" />{exam.time} · {exam.date ? exam.date.split('-').reverse().join('/') : '—'}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={13} weight="bold" />{exam.room}</span>
        </div>
      </div>
    </article>
  );
}

function RiskCoursesCard({ filteredRiskSubjects, riskThreshold, setRiskThreshold, userScale }) {
  const thresholdLabel = riskThreshold.toFixed(userScale === 'scale4' ? 2 : 1);

  return (
    <CardShell className="min-h-[220px] xl:h-full xl:min-h-0 shadow-[0_16px_36px_rgba(178,167,230,0.18),_inset_0_4px_12px_rgba(255,255,255,0.8)]">
      <div className="relative z-10 flex flex-col flex-1 min-h-0 h-full">
        <PanelHeader
          icon={Warning}
          title="Môn học gặp rủi ro"
          tone="amber"
          action={(
            <label className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200/80">
              Ngưỡng:
              <select
                value={riskThreshold}
                onChange={(event) => setRiskThreshold(Number(event.target.value))}
                className="bg-transparent text-xs font-black text-slate-800 outline-none"
              >
                {userScale === 'scale4' ? (
                  <>
                    <option value={1.5}>&lt; 1.50</option>
                    <option value={2.0}>&lt; 2.00</option>
                    <option value={2.5}>&lt; 2.50</option>
                  </>
                ) : (
                  <>
                    <option value={8}>&lt; 8.0</option>
                    <option value={10}>&lt; 10.0</option>
                    <option value={12}>&lt; 12.0</option>
                  </>
                )}
              </select>
            </label>
          )}
        />

        <div className="mt-4 overflow-hidden rounded-[26px] border border-[rgba(223,216,248,0.96)] bg-[rgba(255,255,255,0.78)] p-1.5 shadow-[inset_0_2px_8px_rgba(178,167,230,0.15)] flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 rounded-[20px] bg-[rgba(255,255,255,0.85)] text-[12.5px] font-black text-slate-600 shrink-0 mb-2 shadow-[0_4px_12px_rgba(178,167,230,0.15),_inset_0_2px_4px_rgba(255,255,255,1)] border border-white/80">
            <div>Môn học</div>
            <div className="text-center">TC</div>
            <div className="text-center">GPA</div>
            <div className="text-right">Trạng thái</div>
          </div>

          {filteredRiskSubjects.length === 0 ? (
            <div className="rounded-[20px] flex-1 flex items-center justify-center gap-6 px-4 pb-2">
              <div className="app-sticker-stage shrink-0">
                <img
                  src={DASHBOARD_STICKERS.risk}
                  alt=""
                  className="app-sticker-blend h-40 w-40 object-contain"
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col text-left">
                <p className="text-[15px] font-extrabold text-[#556298]">{`Không có môn nào dưới ngưỡng ${thresholdLabel}`}</p>
                <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-[#7984af]">Bạn đang giữ nhịp học tập ổn định.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto rounded-[20px] bg-[rgba(255,255,255,0.68)]">
              {filteredRiskSubjects.map((subject, index) => (
                <div key={`${subject.name}-${index}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-t border-slate-200/70 px-4 py-3 text-sm font-bold text-slate-700 first:border-t-0">
                  <span className="min-w-0 truncate pr-3 text-slate-900">{subject.name}</span>
                  <span className="text-center text-slate-500">{subject.credits}</span>
                  <span className="text-center font-black text-amber-600">{Number(subject.gpa).toFixed(2)}</span>
                  <span className="justify-self-end rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 max-sm:hidden">
                    {subject.status || 'Cần chú ý'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function QuickNoteCard({ colorConfig, dashboardNote, noteSavedAt, noteSaveStatus, onBlur, onChange }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-[24px] border border-amber-100/90 p-6 shadow-[0_16px_36px_rgba(178,167,230,0.18),_inset_0_4px_12px_rgba(255,255,255,0.8)] transition duration-300 hover:-translate-y-0.5 xl:h-full xl:min-h-0"
      style={{
        backgroundColor: colorConfig.bg,
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${colorConfig.line} 32px)`,
      }}
    >
      {/* Nếp gấp giấy 3D ở góc dưới phải */}
      <div 
        className="absolute bottom-0 right-0 h-10 w-10 z-10 pointer-events-none rounded-tl-[8px]"
        style={{
          background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0) 100%)`,
          boxShadow: '-2px -2px 5px rgba(0,0,0,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.5)',
          borderLeft: '1px solid rgba(255,255,255,0.5)'
        }}
      ></div>

      {/* Ghim 3D ở giữa trên cùng của thẻ */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-md">
        <div className="h-5 w-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff8a8a,#dc2626)] border border-red-800 shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3),_0_4px_4px_rgba(0,0,0,0.2)]"></div>
        <div className="h-[10px] w-[3px] bg-gradient-to-b from-gray-300 to-gray-500 rounded-b-full shadow-[0_2px_2px_rgba(0,0,0,0.1)] -mt-1"></div>
      </div>

      <div className="relative z-10 flex items-center gap-2.5 pt-2 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/50 text-amber-700 ring-1 ring-white/70">
          <Notepad size={18} weight="duotone" />
        </div>
        <h3 className="text-lg font-black tracking-tight" style={{ color: colorConfig.title }}>{dashboardNote.title}</h3>
        <button
          type="button"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-white/50 text-indigo-600 ring-1 ring-white/70 transition hover:bg-white/70"
          aria-label="Chỉnh sửa ghi chú"
        >
          <PencilSimple size={18} weight="bold" />
        </button>
      </div>

      <textarea
        value={dashboardNote.content}
        onChange={onChange}
        onBlur={onBlur}
        className="relative z-10 mt-4 flex-1 w-full min-h-[120px] resize-none bg-transparent pr-4 font-['Itim'] text-[18px] font-medium leading-8 outline-none placeholder:text-amber-800/45"
        style={{ color: colorConfig.text }}
        placeholder="Viết ghi chú tại đây..."
      />

      <div className="absolute bottom-1 right-2 z-20 pointer-events-none">
        <img
          src={DASHBOARD_STICKERS.note}
          alt=""
          className="h-[160px] w-[160px] object-contain opacity-95"
          aria-hidden="true"
        />
      </div>

      <p className="absolute bottom-4 left-6 z-10 text-xs font-black" style={{ color: colorConfig.title }}>
        {noteSaveStatus === 'typing' && 'Đang chờ lưu...'}
        {noteSaveStatus === 'saving' && 'Đang lưu...'}
        {noteSaveStatus === 'saved' && noteSavedAt && `Đã lưu lúc ${noteSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
        {noteSaveStatus === 'error' && 'Lưu thất bại'}
      </p>
    </motion.article>
  );
}

function DeadlineEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center pb-2">
      <div className="app-sticker-stage flex-1 min-h-0 w-full flex items-center justify-center mb-0">
        <img
          src={DASHBOARD_STICKERS.deadline}
          alt=""
          className="h-full w-auto object-contain max-h-[140px] scale-[1.15] opacity-92 -translate-y-2"
          aria-hidden="true"
        />
      </div>
      <div className="shrink-0 z-10 flex flex-col items-center">
        <p className="max-w-[24ch] text-[15px] font-extrabold text-[#556298]">Không có sự kiện nào</p>
        <p className="mt-0.5 text-[13.5px] font-medium text-[#7984af]">trong 7 ngày tới</p>
      </div>
    </div>
  );
}
