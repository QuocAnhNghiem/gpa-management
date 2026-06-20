import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as scheduleService from '../api/scheduleService';
import * as attendanceService from '../api/attendanceService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarBlank, CaretLeft, CaretRight, Plus, X, 
  MapPin, User, Clock, CheckCircle,
  Warning, Trash, List, FileText, Pencil,
  ToggleLeft, ToggleRight, GearSix, CalendarCheck
} from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';

const COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

const neuR = '0 24px 58px rgba(183,166,236,0.14), inset 0 1px 0 rgba(255,255,255,0.84)';
const neuI = 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 0 rgba(205,193,245,0.34)';
const clayCard = '0 20px 44px rgba(171,156,228,0.16), inset 0 1px 0 rgba(255,255,255,0.82)';
const clayButton = '0 14px 24px rgba(180,166,234,0.12), inset 0 1px 0 rgba(255,255,255,0.82)';

export default function SchedulePage() {
  const { showToast } = useToast();
  
  const [viewType, setViewType] = useState('week'); // 'week' hoặc 'month'
  const [weekOffset, setWeekOffset] = useState(0); 
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [eventsList, setEventsList] = useState([]);
  
  // Attendance states
  const [attendances, setAttendances] = useState([]);
  const [editingConfigId, setEditingConfigId] = useState(null); // id môn đang cấu hình
  const [configData, setConfigData] = useState({ totalSessions: 15, maxAbsencesAllowed: 3 });
  
  // Realtime clock for line indicator
  const [now, setNow] = useState(new Date());
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  
  // Active Tab in Add Event Modal
  const [addEventTab, setAddEventTab] = useState('class'); // 'class', 'deadline', 'exam'

  // Edit states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Conflict error state (for transparency in Modal)
  const [conflictError, setConflictError] = useState(null);

  // Delete Confirm states
  const [deleteEventConfirm, setDeleteEventConfirm] = useState(null);
  const [deleteAttendanceConfirm, setDeleteAttendanceConfirm] = useState(null);

  // Ref for scroll container to enable auto-scroll
  const scrollContainerRef = useRef(null);

  // Timezone-safe YYYY-MM-DD converter
  const getLocalYYYYMMDD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateVal}`;
  };

  const todayStr = getLocalYYYYMMDD(new Date());

  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'class',
    startTime: '07:00',
    endTime: '09:30',
    room: '',
    instructor: '',
    specificDate: getLocalYYYYMMDD(new Date()),
    isCompleted: false,
    color: '#3B82F6'
  });

  const matchesAttendance = useCallback((attendance, identity = {}) => {
    if (!attendance) return false;
    if (identity.subjectId && attendance.subjectId === identity.subjectId) return true;
    if (identity.subjectCode && attendance.subjectCode === identity.subjectCode) return true;
    return Boolean(
      identity.subjectName
      && attendance.subjectName?.toLowerCase() === identity.subjectName.toLowerCase()
    );
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await scheduleService.getSchedules();
      if (data.data) {
        setEventsList(data.data);
        window.dispatchEvent(new Event('scheduleUpdated'));
      }
    } catch {
      showToast('error', 'Không thể tải lịch học');
    }
  }, [showToast]);

  const fetchAttendances = useCallback(async () => {
    try {
      const res = await attendanceService.getAttendances();
      if (res.success) {
        setAttendances(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchAttendances();
    
    // Timer for real-time indicator
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // update every minute
    
    return () => clearInterval(timer);
  }, [fetchSchedule, fetchAttendances]);

  // Reset conflict error when opening modal or switching tabs
  useEffect(() => {
    setConflictError(null);
  }, [addEventTab, isAddModalOpen]);

  // Update newEvent color/type when tab changes
  useEffect(() => {
    if (!isEditMode) {
      setNewEvent(prev => ({
        ...prev,
        type: addEventTab,
        color: addEventTab === 'class' ? '#3B82F6' : addEventTab === 'deadline' ? '#F59E0B' : '#EF4444'
      }));
    }
  }, [addEventTab, isEditMode]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;

      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        setIsEditMode(false);
        setEditingEventId(null);
        setConflictError(null);
      }
      if (isDayDetailModalOpen) setIsDayDetailModalOpen(false);
      if (deleteEventConfirm) setDeleteEventConfirm(null);
      if (deleteAttendanceConfirm) setDeleteAttendanceConfirm(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [deleteAttendanceConfirm, deleteEventConfirm, isAddModalOpen, isDayDetailModalOpen]);

  // Auto scroll to current time in Week View
  const scrollToCurrentTime = useCallback(() => {
    if (viewType === 'week' && scrollContainerRef.current) {
      const currentHours = new Date().getHours();
      const scrollTarget = Math.max(0, (currentHours - 2) * 68);
      scrollContainerRef.current.scrollTop = scrollTarget;
    }
  }, [viewType]);

  useEffect(() => {
    if (viewType === 'week' && eventsList.length > 0) {
      const t = setTimeout(() => {
        scrollToCurrentTime();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [viewType, eventsList.length, scrollToCurrentTime]);

  // Date Logic for Week View
  const getWeekDates = (offset) => {
    const d = new Date();
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dayOfWeek + (offset * 7));
    
    const dates = [];
    for(let i=0; i<7; i++) {
      const temp = new Date(d);
      temp.setDate(d.getDate() + i);
      dates.push(temp);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const currentWeekNumber = useMemo(() => {
    const d = new Date(weekDates[0]);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { week: weekNo, year: d.getFullYear() };
  }, [weekDates]);

  const daysOfWeek = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];
  const formatHeaderDate = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Date Logic for Month View
  const monthGridDates = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 
    
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startDayOfWeek);
    
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const temp = new Date(startDate);
      temp.setDate(startDate.getDate() + i);
      dates.push(temp);
    }
    return dates;
  }, [currentMonthDate]);

  const monthLabel = useMemo(() => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${months[currentMonthDate.getMonth()]} - ${currentMonthDate.getFullYear()}`;
  }, [currentMonthDate]);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Open Edit Modal and fill data
  const handleOpenEditModal = (ev) => {
    setIsEditMode(true);
    setEditingEventId(ev._id);
    setAddEventTab(ev.type);
    setConflictError(null);
    setNewEvent({
      name: ev.name,
      type: ev.type,
      startTime: ev.startTime,
      endTime: ev.endTime || '09:30',
      room: ev.room || '',
      instructor: ev.instructor || '',
      specificDate: ev.specificDate,
      isCompleted: ev.isCompleted || false,
      color: ev.color || '#3B82F6'
    });
    setIsAddModalOpen(true);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setConflictError(null);
    
    if (!newEvent.name || !newEvent.startTime) {
      showToast('warning', 'Vui lòng điền đầy đủ tên và thời gian bắt đầu');
      return;
    }

    let payload = { ...newEvent };
    
    if (addEventTab === 'deadline') {
      const [h, m] = newEvent.startTime.split(':').map(Number);
      const endMin = h * 60 + m + 30;
      const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');
      payload.endTime = `${endH}:${endM}`;
      payload.room = ''; 
    } else {
      if (!newEvent.endTime) {
        showToast('warning', 'Vui lòng điền giờ kết thúc');
        return;
      }
      if (timeToMinutes(newEvent.endTime) <= timeToMinutes(newEvent.startTime)) {
        showToast('warning', 'Giờ kết thúc phải sau giờ bắt đầu');
        return;
      }
    }
    
    try {
      let res;
      if (isEditMode) {
        res = await scheduleService.updateSchedule(editingEventId, payload);
      } else {
        res = await scheduleService.createSchedule(payload);
      }

      if (res.success) {
        showToast('success', isEditMode ? 'Cập nhật sự kiện thành công' : 'Thêm sự kiện thành công');
        setIsAddModalOpen(false);
        setIsDayDetailModalOpen(false);
        setIsEditMode(false);
        setEditingEventId(null);
        setNewEvent({
          name: '',
          type: addEventTab,
          startTime: '07:00',
          endTime: '09:30',
          room: '',
          instructor: '',
          specificDate: getLocalYYYYMMDD(new Date()),
          isCompleted: false,
          color: addEventTab === 'class' ? '#3B82F6' : addEventTab === 'deadline' ? '#F59E0B' : '#EF4444'
        });
        fetchSchedule();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Lỗi khi lưu sự kiện';
      if (err.response?.status === 409) {
        // Minh bạch lỗi trùng lịch trực tiếp trong Modal
        setConflictError(errMsg);
      } else {
        showToast('error', errMsg);
      }
    }
  };

  const handleDeleteEvent = (ev) => {
    setDeleteEventConfirm(ev);
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventConfirm) return;
    try {
      await scheduleService.deleteSchedule(deleteEventConfirm._id);
      showToast('success', 'Đã xóa sự kiện');
      fetchSchedule();
      setDeleteEventConfirm(null);
    } catch {
      showToast('error', 'Lỗi khi xóa sự kiện');
    }
  };

  const handleDeleteAttendance = (att) => {
    setDeleteAttendanceConfirm(att);
  };

  const confirmDeleteAttendance = async () => {
    if (!deleteAttendanceConfirm) return;
    try {
      await attendanceService.deleteAttendance(deleteAttendanceConfirm._id);
      showToast('success', 'Đã xóa dữ liệu điểm danh');
      fetchAttendances();
      setDeleteAttendanceConfirm(null);
    } catch {
      showToast('error', 'Lỗi khi xóa dữ liệu điểm danh');
    }
  };

  const handleToggleComplete = async (ev) => {
    try {
      const res = await scheduleService.updateSchedule(ev._id, { isCompleted: !ev.isCompleted });
      if (res.success) {
        showToast('success', !ev.isCompleted ? 'Đã hoàn thành công việc 🎉' : 'Đã đánh dấu chưa hoàn thành');
        fetchSchedule();
      }
    } catch {
      showToast('error', 'Lỗi khi cập nhật trạng thái');
    }
  };

  const currentEvents = useMemo(() => {
    return eventsList.filter(ev => {
      const evDate = new Date(ev.specificDate);
      evDate.setHours(0,0,0,0);
      const start = new Date(weekDates[0]); start.setHours(0,0,0,0);
      const end = new Date(weekDates[6]); end.setHours(23,59,59,999);
      return evDate >= start && evDate <= end;
    });
  }, [eventsList, weekDates]);

  const hours = Array.from({length: 24}, (_, i) => i + 1); // 1:00 to 24:00
  const ROW_HEIGHT = 60; 

  // Filter events for the selected day in dayDetailModal
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dayStr = getLocalYYYYMMDD(selectedDay);
    return eventsList.filter(ev => ev.specificDate === dayStr);
  }, [eventsList, selectedDay]);

  // Real-time line calculations
  const isThisWeek = useMemo(() => {
    const todayStr = getLocalYYYYMMDD(new Date());
    return weekDates.some(d => getLocalYYYYMMDD(d) === todayStr);
  }, [weekDates]);

  const timeIndicatorTop = useMemo(() => {
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    return ((currentHours * 60 + currentMinutes) / 60) * ROW_HEIGHT;
  }, [now]);

  // --- Attendance Handlers ---
  const handleToggleAttendance = async (e, identity, date, isCurrentlyAbsent) => {
    e.stopPropagation();
    try {
      const res = await attendanceService.toggleAttendance({
        subjectId: identity.subjectId,
        subjectCode: identity.subjectCode,
        subjectName: identity.subjectName,
        date,
        isAbsent: !isCurrentlyAbsent
      });
      if (res.success) {
        fetchAttendances();
        showToast('success', !isCurrentlyAbsent ? 'Đã đánh dấu vắng mặt' : 'Đã xóa vắng mặt');
      }
    } catch {
      showToast('error', 'Lỗi khi điểm danh');
    }
  };

  const handleSaveConfig = async (identity) => {
    try {
      const res = await attendanceService.updateAttendanceConfig({
        subjectId: identity.subjectId,
        subjectCode: identity.subjectCode,
        subjectName: identity.subjectName,
        totalSessions: configData.totalSessions,
        maxAbsencesAllowed: configData.maxAbsencesAllowed
      });
      if (res.success) {
        showToast('success', 'Cập nhật cấu hình thành công');
        setEditingConfigId(null);
        fetchAttendances();
      }
    } catch {
      showToast('error', 'Lỗi lưu cấu hình');
    }
  };

  const isUserAbsent = (identity, date) => {
    const att = attendances.find((attendance) => matchesAttendance(attendance, identity));
    if (!att || !att.absentDates) return false;
    return att.absentDates.includes(date);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden pb-2 font-sans text-slate-800">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[252px_minmax(0,1fr)]">
        
        {/* KHU VỰC A: BẢNG ĐIỀU KHIỂN ĐIỂM DANH */}
        <div className="app-shell-card-strong h-full min-h-0 shrink-0 rounded-[32px] p-4 xl:flex xl:flex-col hidden">
          <div className="mt-1 mb-4 flex items-center gap-3 px-1 shrink-0">
            <div className="app-icon-badge w-12 h-12 rounded-[18px] flex items-center justify-center shadow-sm bg-white">
              <CalendarCheck size={26} weight="duotone" className="text-[#6D28D9]" />
            </div>
            <div>
              <h2 className="text-[1.55rem] font-black tracking-[-0.04em] text-[var(--app-text-main)]">Điểm danh</h2>
              <p className="text-[13px] font-bold text-[var(--app-text-soft)]">Quản lý chuyên cần</p>
            </div>
          </div>

        <div className="flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
          {attendances.length === 0 ? (
            <div className="flex flex-col items-center text-center px-2 gap-4 mt-8">
              <div className="app-sticker-stage">
                <img
                  src="/assets/schedule/calendar-sticker.png"
                  alt="Calendar sticker"
                  className="app-sticker-blend h-48 w-48 object-contain"
                />
              </div>
              <p className="px-4 text-[15px] font-bold leading-relaxed text-[var(--app-text-soft)]">
                Chưa có dữ liệu. Hãy đánh dấu vắng mặt trên lịch học để tạo thẻ môn học.
              </p>
            </div>
          ) : (
            attendances.map(att => {
              const absentCount = att.absentDates.length;
              let max = Number(att.maxAbsencesAllowed);
              const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
              const percent = Math.min((absentCount / safeMax) * 100, 100);
              
              let statusColor = 'bg-emerald-500';
              if (percent >= 100) statusColor = 'bg-rose-500';
              else if (percent >= 70) statusColor = 'bg-amber-500';

              const isEditing = editingConfigId === att._id;

              return (
                <div key={att._id} className="flex flex-col gap-3 rounded-[26px] border border-[rgba(223,216,248,0.9)] bg-white/78 p-5" style={{ boxShadow: neuR }}>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-black text-slate-700 leading-tight">{att.subjectName}</h4>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => {
                        if (isEditing) setEditingConfigId(null);
                        else {
                          setEditingConfigId(att._id);
                          setConfigData({ totalSessions: att.totalSessions, maxAbsencesAllowed: att.maxAbsencesAllowed });
                        }
                      }} className="text-slate-400 hover:text-blue-600 transition-colors shrink-0">
                        <GearSix size={18} weight="fill" />
                      </button>
                      <button onClick={() => handleDeleteAttendance(att)} className="text-slate-400 hover:text-rose-600 transition-colors shrink-0">
                        <Trash size={18} weight="fill" />
                      </button>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5 text-xs font-bold mt-2 border-t border-slate-300/40 pt-3">
                      <label className="flex justify-between items-center text-slate-600">
                        Tổng số buổi: 
                        <input type="number" min="1" value={configData.totalSessions} onChange={e => setConfigData({...configData, totalSessions: parseInt(e.target.value)})} className="w-16 rounded-lg border border-slate-300/50 p-1.5 text-center bg-white shadow-inner outline-none" />
                      </label>
                      <label className="flex justify-between items-center text-slate-600">
                        Vắng tối đa: 
                        <input type="number" min="1" value={configData.maxAbsencesAllowed} onChange={e => {
                          const val = Number(e.target.value);
                          setConfigData({...configData, maxAbsencesAllowed: Number.isFinite(val) && val >= 1 ? val : 1});
                        }} className="w-16 rounded-lg border border-slate-300/50 p-1.5 text-center bg-white shadow-inner outline-none" />
                      </label>
                      <button onClick={() => handleSaveConfig({ subjectId: att.subjectId, subjectCode: att.subjectCode, subjectName: att.subjectName })} className="mt-2 py-2 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 active:scale-95 transition-all shadow-md">Lưu cấu hình</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-500 mb-0.5">
                        <span>Vắng: <strong className={percent >= 100 ? 'text-rose-600 text-xs' : 'text-slate-800 text-xs'}>{absentCount}/{max}</strong> buổi</span>
                        <span>{att.totalSessions} buổi</span>
                      </div>
                      
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(239,235,252,0.92)]" style={{ boxShadow: neuI }}>
                        <div className={`h-full rounded-full transition-all duration-700 ${statusColor}`} style={{ width: `${percent}%` }}></div>
                      </div>

                      {absentCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-300/40">
                          <p className="text-[9px] font-black tracking-wider text-slate-400 mb-2 uppercase">Các ngày vắng</p>
                          <div className="flex flex-wrap gap-2">
                            {att.absentDates.map(d => (
                              <span key={d} className="rounded-xl bg-[rgba(248,245,255,0.94)] px-2 py-1 text-[10px] font-bold text-slate-600" style={{ boxShadow: clayButton }}>
                                {d.split('-').reverse().join('/')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
          </div>
          {/* Sticker cây xanh tự ẩn khi danh sách quá dài */}
          {attendances.length <= 1 && (
            <div className="flex justify-center mt-auto pt-10 pb-2">
              <div className="app-sticker-stage translate-y-[10px]">
                <img
                  src="/assets/schedule/plant-sticker.png"
                  alt="Plant sticker"
                  className="h-32 w-32 object-contain drop-shadow-2xl hover:scale-105 transition-transform"
                />
              </div>
            </div>
          )}
        </div>

      {/* KHU VỰC B: LỊCH (SCHEDULE) */}
      <div className="app-shell-card-strong flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-[34px] p-4 md:p-5">
        {/* Top Controller */}
        <div className="mb-1 flex shrink-0 flex-col items-center justify-between gap-3 px-1 py-1 sm:flex-row">
          {/* Left: Today & Switch Buttons */}
          <div className="flex w-full sm:w-auto items-center gap-4">
      <button
        onClick={() => {
                setWeekOffset(0);
                setCurrentMonthDate(new Date());
              }}
              className="h-10 rounded-full bg-[linear-gradient(180deg,#8d74ff,#7058ff)] px-7 text-[14px] font-black text-white shadow-[0_16px_28px_rgba(122,92,255,0.26)] hover:bg-[#5b21b6]"
            >
              Hôm nay
            </button>

            {/* Navigation Month/Week */}
            <div className="app-soft-card flex h-10 items-center rounded-full p-1 px-3">
              <button 
                onClick={() => {
                  if (viewType === 'week') setWeekOffset(prev => prev - 1);
                  else setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6d28d9] hover:bg-white hover:shadow-sm transition-all"
                aria-label="Quay lại"
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <span className="min-w-[122px] px-5 text-center text-[14px] font-black tracking-wide text-[var(--app-text-main)]">
                {viewType === 'week' ? `W${currentWeekNumber.week} - ${currentWeekNumber.year}` : monthLabel}
              </span>
              <button 
                onClick={() => {
                  if (viewType === 'week') setWeekOffset(prev => prev + 1);
                  else setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6d28d9] hover:bg-white hover:shadow-sm transition-all"
                aria-label="Tiếp theo"
              >
                <CaretRight size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Right: Tab Switcher (Week/Month View) */}
            <div className="app-soft-card flex h-10 w-full rounded-full p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setViewType('week')}
              className={`flex-1 sm:flex-none px-7 rounded-full text-[14px] font-black transition-all ${viewType === 'week' ? 'text-white bg-[#6D28D9] shadow-[0_4px_15px_rgba(109,40,217,0.2)]' : 'text-slate-400 hover:text-[#6d28d9]'}`}
            >
              Lịch tuần
            </button>
            <button
              type="button"
              onClick={() => setViewType('month')}
              className={`flex-1 sm:flex-none px-7 rounded-full text-[14px] font-black transition-all ${viewType === 'month' ? 'text-white bg-[#6D28D9] shadow-[0_4px_15px_rgba(109,40,217,0.2)]' : 'text-slate-400 hover:text-[#6d28d9]'}`}
            >
              Lịch tháng
            </button>
          </div>
        </div>

      {/* Main Calendar View Area */}
      <div className="relative min-h-0 flex-grow flex-shrink overflow-hidden rounded-[30px] border border-[rgba(223,216,248,0.9)] bg-[rgba(255,255,255,0.78)] shadow-[0_20px_46px_rgba(178,163,231,0.14)]">
        <div 
          ref={scrollContainerRef}
          className="w-full h-full overflow-auto p-0 scroll-smooth"
        >
          {/* Empty state sticker cho toàn bộ lịch tuần khi không có sự kiện */}
          {viewType === 'week' && currentEvents.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10" style={{ top: '48px' }}>
              <div className="app-sticker-stage">
                <img
                  src="/assets/schedule/empty-state-sticker.png"
                  alt="Empty schedule sticker"
                  className="app-sticker-blend h-80 w-80 object-contain"
                />
              </div>
              <div className="rounded-[24px] bg-white/72 px-6 py-3 text-center backdrop-blur-sm">
                <p className="text-[17px] font-black tracking-wide text-[var(--app-text-main)]">Chưa có dữ liệu điểm danh tuần này.</p>
                <p className="mt-1 text-sm font-bold text-[var(--app-purple)]">Hãy đánh dấu vắng mặt để theo dõi chuyên cần nhé!</p>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {viewType === 'week' ? (
              /* --- WEEK VIEW --- */
              <motion.div 
                key="week"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="min-w-[920px] h-full"
              >
                {/* Day Headers */}
                <div className="sticky top-0 z-20 flex rounded-t-[2.2rem] border-b border-[rgba(224,218,245,0.92)] bg-[rgba(248,246,255,0.96)] py-2 backdrop-blur-md">
                  <div className="flex w-24 shrink-0 items-center justify-center rounded-tl-[2.2rem] bg-[rgba(248,246,255,0.96)] text-xs font-black text-slate-500">
                    Giờ
                  </div>
                  {daysOfWeek.map((day, idx) => {
                    const isToday = getLocalYYYYMMDD(weekDates[idx]) === todayStr;
                    return (
                      <div key={day} className={`flex flex-1 flex-col items-center justify-center border-b border-[rgba(238,232,250,0.94)] bg-[rgba(252,250,255,0.92)] py-3 ${idx === 6 ? 'rounded-tr-[2rem]' : idx === 0 ? 'rounded-tl-[2rem]' : ''}`}>
                        <span className={`text-xs font-black uppercase tracking-widest`} style={{ color: (idx === 5 || idx === 6) ? '#8b5cf6' : '#64748b' }}>{day}</span>
                        <span className={`text-[15px] font-black mt-1 px-4 py-1.5 rounded-full`} style={isToday ? { background: '#6D28D9', color: '#fff', boxShadow: '0 4px 12px rgba(109,40,217,0.3)' } : { color: '#1e293b' }}>
                          {formatHeaderDate(weekDates[idx])}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Lịch Week Body */}
                <div className="flex relative">
                  {/* Time Axis */}
                  <div className="w-24 shrink-0 relative border-r border-slate-300 bg-[#eaebee]/30">
                    {hours.map(hour => (
                      <div key={hour} className="absolute w-full flex items-center justify-end pr-4" style={{ top: hour * ROW_HEIGHT, height: 0 }}>
                        <span className="text-[11px] font-black -translate-y-1/2" style={{ color: '#A89FE8' }}>
                          {hour}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {daysOfWeek.map((day, idx) => {
                    const dayStr = getLocalYYYYMMDD(weekDates[idx]);
                    const dayEvents = currentEvents.filter(ev => ev.specificDate === dayStr);
                    const isToday = dayStr === todayStr;

                    return (
                      <div key={day} className="flex-1 relative min-h-[1440px] border-r border-slate-200/50">
                        {/* Grid Lines */}
                        {hours.map(hour => (
                          <div 
                            key={hour} 
                            className="absolute w-full border-t border-dashed border-slate-300/60"
                            style={{ top: hour * ROW_HEIGHT }}
                          />
                        ))}

                        {/* Realtime Line Indicator */}
                        {isToday && isThisWeek && (
                          <div 
                            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" 
                            style={{ top: `${timeIndicatorTop}px` }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)] -ml-1.75 shrink-0" />
                            <div className="flex-1 h-[2.5px] bg-rose-500" />
                          </div>
                        )}

                        {/* Event Cards */}
                        {dayEvents.map(ev => {
                          const startMin = timeToMinutes(ev.startTime);
                          const endMin = timeToMinutes(ev.endTime);
                          const duration = endMin - startMin;
                          const top = (startMin / 60) * ROW_HEIGHT;
                          const height = Math.max(50, (duration / 60) * ROW_HEIGHT); 
                          const isDone = ev.isCompleted;

                          return (
                            <div
                              key={ev._id}
                              onClick={() => {
                                setSelectedDay(new Date(ev.specificDate));
                                setIsDayDetailModalOpen(true);
                              }}
                          className={`absolute left-[4px] flex w-[calc(100%-8px)] cursor-pointer flex-col justify-between rounded-[1.35rem] p-3 group transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 ${isDone ? 'opacity-55 grayscale' : ''}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: ev.color || '#3B82F6',
                                boxShadow: clayCard,
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: '#ffffff',
                                zIndex: 10
                              }}
                            >
                              <div className="flex flex-col gap-1 overflow-hidden">
                                <div className="flex justify-between items-start gap-1">
                                  <span className={`text-[13.5px] md:text-[14px] font-black truncate leading-tight tracking-wide ${isDone ? 'line-through opacity-85' : ''}`}>
                                    {ev.name}
                                  </span>
                                  
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {ev.type === 'deadline' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(ev); }}
                                        className="w-5 h-5 rounded-full flex items-center justify-center transition-colors border border-white/50 bg-white/10 hover:bg-white/30"
                                      >
                                        {isDone && <CheckCircle size={13} weight="fill" className="text-emerald-400" />}
                                      </button>
                                    )}
                                    
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ev); }}
                                      className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity bg-white/15 p-1 rounded-full hover:bg-white/25"
                                      title="Chỉnh sửa sự kiện"
                                    >
                                      <Pencil size={11} weight="bold" />
                                    </button>

                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev); }}
                                      className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity bg-black/15 p-1 rounded-full hover:bg-black/25"
                                      title="Xóa sự kiện"
                                    >
                                      <X size={11} weight="bold" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold opacity-95 mt-0.5">
                                  <Clock size={12} weight="duotone" className="text-yellow-200" />
                                  <span className="truncate">{ev.startTime}{ev.type !== 'deadline' && ' - ' + ev.endTime}</span>
                                </div>

                                {ev.room && (
                                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold opacity-95">
                                    <MapPin size={12} weight="duotone" className="text-orange-200" />
                                    <span className="truncate">{ev.room}</span>
                                  </div>
                                )}
                              </div>

                              {/* Hiển thị rõ Trạng thái hoàn thành ĐÃ XONG của Deadline */}
                              {ev.type === 'deadline' && isDone && (
                                <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-black tracking-widest uppercase">
                                  <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded px-1.5 py-0.5">
                                    ✓ ĐÃ HOÀN THÀNH
                                  </span>
                                </div>
                              )}

                              {height > 78 && ev.type !== 'deadline' && (
                                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/10 text-[9px] font-black tracking-widest uppercase opacity-90">
                                  <span>{ev.type === 'class' ? 'Lớp học' : 'Lịch thi'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* --- MONTH VIEW --- */
              <motion.div 
                key="month"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="min-w-[920px] h-full flex flex-col"
              >
                {/* Lưới Header ngày trong tuần */}
                <div className="grid grid-cols-7 border-b border-slate-100 py-4 bg-[#f8f9fc] rounded-t-[2.5rem]">
                  {['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'].map((d, idx) => (
                    <div key={d} className={`text-center font-black text-[13px] uppercase tracking-widest ${idx === 0 ? 'rounded-tl-[2.5rem]' : idx === 6 ? 'rounded-tr-[2.5rem]' : ''}`} 
                         style={{ color: (idx === 5 || idx === 6) ? '#8b5cf6' : '#64748b' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Lưới các ô ngày (6 hàng x 7 cột) */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-slate-200/40 rounded-b-[2rem] overflow-hidden">
                  {monthGridDates.map((dayDate, idx) => {
                    const dayStr = getLocalYYYYMMDD(dayDate);
                    const isCurrentMonth = dayDate.getMonth() === currentMonthDate.getMonth();
                    const isToday = dayStr === todayStr;
                    
                    // Lọc các sự kiện trong ngày này
                    const dayEvents = eventsList.filter(ev => ev.specificDate === dayStr);

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDay(dayDate);
                        setIsDayDetailModalOpen(true);
                      }}
                      className={`min-h-[96px] p-2 border-r border-b border-slate-300/40 flex flex-col justify-between transition-all cursor-pointer hover:bg-slate-200/30 ${isCurrentMonth ? 'bg-[#eaebee]' : 'bg-[#e4e8ee]/45 opacity-60'}`}
                    >
                      {/* Số ngày ở góc trên */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black" style={{ color: '#A89FE8' }}>
                          {dayDate.getDate() === 1 ? `${dayDate.getDate()} thg ${dayDate.getMonth() + 1}` : ''}
                        </span>
                        <span 
                          className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-full`}
                          style={isToday ? { background: 'linear-gradient(135deg, #7B61FF, #6C5CE7)', color: '#fff', boxShadow: '0 2px 8px rgba(108,92,231,0.35)' } : { color: '#4C3BCF' }}
                        >
                          {dayDate.getDate()}
                        </span>
                      </div>

                      {/* Danh sách sự kiện ngày (max 3) */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden pr-0.5 justify-start">
                        {dayEvents.slice(0, 3).map(ev => {
                          const isDone = ev.isCompleted;
                          return (
                            <div 
                              key={ev._id}
                              className={`px-2 py-1 rounded-xl text-[10px] font-bold truncate border border-white/20 text-white flex items-center gap-1 ${isDone ? 'opacity-65 line-through' : ''}`}
                              style={{ 
                                backgroundColor: ev.color || '#3B82F6',
                                boxShadow: '2px 2px 5px rgba(0,0,0,0.06)'
                              }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                              <span className="truncate">
                                {ev.type === 'deadline' && isDone && '✓ '}
                                {ev.name}
                              </span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-black text-blue-600 px-1">
                            + {dayEvents.length - 3} sự kiện
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    {/* KẾT THÚC KHU VỰC B */}
    </div>

    {/* FAB Add Event (Neumorphic Float) */}
    <button
      onClick={() => {
          setIsEditMode(false);
          setEditingEventId(null);
          setConflictError(null);
          setNewEvent({
            name: '',
            type: addEventTab,
            startTime: '07:00',
            endTime: '09:30',
            room: '',
            instructor: '',
            specificDate: getLocalYYYYMMDD(new Date()),
            isCompleted: false,
            color: addEventTab === 'class' ? '#3B82F6' : addEventTab === 'deadline' ? '#F59E0B' : '#EF4444'
          });
          setIsAddModalOpen(true);
        }}
        className="fixed bottom-10 right-10 z-30 flex h-16 w-16 items-center justify-center rounded-full text-white hover:scale-105 active:scale-95 transition-all"
        style={{ 
          background: 'linear-gradient(180deg, #9b84ff, #735dff)',
          boxShadow: '0 22px 34px rgba(122,92,255,0.3), inset 0 1px 0 rgba(255,255,255,0.45)'
        }}
        aria-label="Thêm sự kiện mới"
      >
        <Plus size={32} weight="bold" />
      </button>

      {/* MODAL 1: Chi tiết ngày */}
      <AnimatePresence>
        {isDayDetailModalOpen && selectedDay && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#eaebee] rounded-[2.5rem] p-7 w-full max-w-lg relative border border-white/40"
              style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-day-detail-title"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chi tiết lịch trình</span>
                  <h3 id="schedule-day-detail-title" className="text-xl font-black text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    {formatHeaderDate(selectedDay)}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsDayDetailModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 bg-[#eaebee] hover:scale-105 active:scale-95 transition-all"
                  style={{ boxShadow: neuR }}
                  aria-label="Đóng chi tiết lịch trình"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Body: Danh sách các sự kiện trong ngày */}
              <div className="max-h-[350px] overflow-auto flex flex-col gap-4 mb-6 pr-1 scrollbar-hide">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <CalendarBlank size={40} weight="light" />
                    <span className="text-sm font-bold">Không có sự kiện nào cho ngày này</span>
                  </div>
                ) : (
                  selectedDayEvents.map(ev => {
                    const isDone = ev.isCompleted;
                    return (
                      <div
                        key={ev._id}
                        className={`rounded-2xl p-4 flex flex-col gap-3 transition-all ${isDone ? 'opacity-65' : ''} bg-[#eaebee]`}
                        style={{ boxShadow: neuR, borderLeft: `6px solid ${ev.color || '#3B82F6'}` }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className={`text-base font-black text-slate-800 ${isDone ? 'line-through text-slate-500' : ''}`}>
                              {ev.name}
                            </h4>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md text-white mt-1.5 inline-block" style={{ backgroundColor: ev.color }}>
                              {ev.type === 'class' ? 'Lớp học' : ev.type === 'exam' ? 'Lịch thi' : 'Deadline'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ev.type === 'deadline' && (
                              <button 
                                onClick={() => handleToggleComplete(ev)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-inner' : 'bg-transparent border-slate-300 text-transparent hover:bg-slate-100'}`}
                                aria-label={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                              >
                                <CheckCircle size={16} weight="fill" />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleOpenEditModal(ev)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-500 hover:bg-blue-100 transition-colors"
                              title="Chỉnh sửa"
                              aria-label="Chỉnh sửa sự kiện"
                            >
                              <Pencil size={14} weight="bold" />
                            </button>

                            <button 
                              onClick={() => handleDeleteEvent(ev._id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-colors"
                              title="Xóa sự kiện"
                              aria-label="Xóa sự kiện"
                            >
                              <Trash size={14} weight="bold" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-300/40 pt-2.5">
                          <div className="flex items-center gap-2 text-slate-700 font-extrabold">
                            <Clock size={15} weight="duotone" className="text-blue-500" />
                            <span>{ev.startTime}{ev.type !== 'deadline' && ' - ' + ev.endTime}</span>
                          </div>
                          
                          {ev.room && (
                            <div className="flex items-center gap-2 text-slate-700 font-extrabold">
                              <MapPin size={15} weight="duotone" className="text-orange-500" />
                              <span>{ev.type === 'exam' ? 'Phòng thi: ' : 'Phòng: '}{ev.room}</span>
                            </div>
                          )}

                          {ev.instructor && (
                            <div className="flex items-center gap-2 text-slate-700 font-extrabold col-span-2">
                              {ev.type === 'class' ? (
                                <>
                                  <User size={15} weight="duotone" className="text-emerald-500" />
                                  <span>GV: {ev.instructor}</span>
                                </>
                              ) : ev.type === 'exam' ? (
                                <>
                                  <FileText size={15} weight="duotone" className="text-purple-500" />
                                  <span>SBD/Ghi chú: {ev.instructor}</span>
                                </>
                              ) : (
                                <>
                                  <List size={15} weight="duotone" className="text-amber-500" />
                                  <span className="italic">Mô tả công việc: {ev.instructor}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Điểm danh (Chỉ cho Lớp học) */}
                        {ev.type === 'class' && (
                          <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-300/40">
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Vắng mặt buổi này</span>
                            <button 
                              onClick={(e) => handleToggleAttendance(
                                e,
                                { subjectCode: ev.courseCode, subjectName: ev.name },
                                ev.specificDate,
                                isUserAbsent({ subjectCode: ev.courseCode, subjectName: ev.name }, ev.specificDate),
                              )}
                              className="text-slate-400 hover:scale-110 active:scale-95 transition-all"
                              aria-label="Đổi trạng thái vắng mặt"
                            >
                              {isUserAbsent({ subjectCode: ev.courseCode, subjectName: ev.name }, ev.specificDate) ? (
                                <ToggleRight size={28} weight="fill" className="text-rose-500 drop-shadow-md" />
                              ) : (
                                <ToggleLeft size={28} weight="duotone" className="text-slate-400" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Nút thêm nhanh cho ngày này */}
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditingEventId(null);
                  setConflictError(null);
                  setNewEvent(prev => ({
                    ...prev,
                    specificDate: getLocalYYYYMMDD(selectedDay),
                    isCompleted: false
                  }));
                  setIsAddModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={18} weight="bold" />
                Thêm sự kiện cho ngày này
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Form Thêm/Sửa Sự Kiện (Tích hợp Banner đỏ báo trùng lịch cực kỳ minh bạch) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#eaebee] rounded-[2.5rem] p-7 w-full max-w-md relative border border-white/40 font-sans"
              style={{ 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
                fontFamily: "'Be Vietnam Pro', sans-serif" 
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-event-modal-title"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditMode(false);
                  setEditingEventId(null);
                  setConflictError(null);
                }} 
                className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full text-slate-500 bg-[#eaebee] hover:scale-105 active:scale-95"
                style={{ boxShadow: neuR }}
                aria-label="Đóng form lịch trình"
              >
                <X size={16} weight="bold" />
              </button>

              <h2 id="schedule-event-modal-title" className="text-xl font-black text-slate-800 mb-6">
                {isEditMode ? 'Cập nhật lịch trình' : 'Thêm lịch trình'}
              </h2>

              {/* Tabs Selector */}
              <div 
                className="flex rounded-2xl p-1 mb-6 bg-[#eaebee]"
                style={{ boxShadow: neuI }}
              >
                {[
                  { id: 'class', label: 'Lớp học', color: '#3B82F6' },
                  { id: 'deadline', label: 'Deadline', color: '#F59E0B' },
                  { id: 'exam', label: 'Lịch thi', color: '#EF4444' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => setAddEventTab(tab.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${addEventTab === tab.id ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ 
                      backgroundColor: addEventTab === tab.id ? tab.color : 'transparent',
                      boxShadow: addEventTab === tab.id ? 'inset 1px 1px 2px rgba(255,255,255,0.4), 2px 2px 6px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
                
                {/* --- FORM 1: LỚP HỌC --- */}
                {addEventTab === 'class' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên môn học</label>
                      <input
                        type="text"
                        value={newEvent.name}
                        onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                        placeholder="Ví dụ: Toán Cao Cấp"
                        className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày học</label>
                        <input
                          type="date"
                          value={newEvent.specificDate}
                          onChange={e => setNewEvent({...newEvent, specificDate: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phòng học</label>
                        <input
                          type="text"
                          value={newEvent.room}
                          onChange={e => setNewEvent({...newEvent, room: e.target.value})}
                          placeholder="VD: A301"
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bắt đầu</label>
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kết thúc</label>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giảng viên</label>
                      <input
                        type="text"
                        value={newEvent.instructor}
                        onChange={e => setNewEvent({...newEvent, instructor: e.target.value})}
                        placeholder="Ví dụ: TS. Nguyễn Văn A"
                        className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>
                  </>
                )}

                {/* --- FORM 2: DEADLINE --- */}
                {addEventTab === 'deadline' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên công việc (Deadline)</label>
                      <input
                        type="text"
                        value={newEvent.name}
                        onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                        placeholder="Ví dụ: Nộp bài tập lớn nhóm"
                        className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày hạn chót</label>
                        <input
                          type="date"
                          value={newEvent.specificDate}
                          onChange={e => setNewEvent({...newEvent, specificDate: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giờ nộp</label>
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mô tả công việc</label>
                      <textarea
                        value={newEvent.instructor}
                        onChange={e => setNewEvent({...newEvent, instructor: e.target.value})}
                        placeholder="Nhập chi tiết yêu cầu nộp bài, đề án..."
                        rows={2}
                        className="p-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800 resize-none"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>

                    {/* status completed */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái hoàn thành</label>
                      <div className="flex items-center h-12 gap-3 pl-3 rounded-2xl bg-[#eaebee]" style={{ boxShadow: neuI }}>
                        <input 
                          type="checkbox"
                          checked={newEvent.isCompleted}
                          onChange={e => setNewEvent({...newEvent, isCompleted: e.target.checked})}
                          className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-700">Đã hoàn thành công việc</span>
                      </div>
                    </div>
                  </>
                )}

                {/* --- FORM 3: LỊCH THI --- */}
                {addEventTab === 'exam' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên môn thi</label>
                      <input
                        type="text"
                        value={newEvent.name}
                        onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                        placeholder="Ví dụ: Thi Cuối Kỳ Toán Cao Cấp"
                        className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày thi</label>
                        <input
                          type="date"
                          value={newEvent.specificDate}
                          onChange={e => setNewEvent({...newEvent, specificDate: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phòng thi</label>
                        <input
                          type="text"
                          value={newEvent.room}
                          onChange={e => setNewEvent({...newEvent, room: e.target.value})}
                          placeholder="VD: Hội trường A"
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giờ bắt đầu</label>
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giờ kết thúc</label>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                          className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                          style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số báo danh / Giám thị / Ghi chú</label>
                      <input
                        type="text"
                        value={newEvent.instructor}
                        onChange={e => setNewEvent({...newEvent, instructor: e.target.value})}
                        placeholder="SBD: 12, Giám thị: TS. Nguyễn Văn A..."
                        className="h-12 px-4 rounded-2xl border-none bg-[#eaebee] text-sm focus:outline-none transition-all text-slate-800"
                        style={{ boxShadow: neuI, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                      />
                    </div>
                  </>
                )}

                {/* Color Selector */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Màu sắc chỉ báo</label>
                  <div className="flex gap-2">
                    {COLOR_PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewEvent({...newEvent, color: c})}
                        className={`w-7 h-7 rounded-full transition-transform ${newEvent.color === c ? 'scale-115 ring-2 ring-slate-400' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c, border: '2px solid rgba(255,255,255,0.7)' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Hộp Banner đỏ báo lỗi trùng lịch trực quan (Conflict Alert Box) */}
                <AnimatePresence>
                  {conflictError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs font-bold leading-relaxed mt-2"
                      style={{ boxShadow: 'inset 2px 2px 5px rgba(244,63,94,0.03)' }}
                    >
                      <Warning size={18} weight="fill" className="text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="block font-black text-rose-800 mb-0.5">Xung đột lịch trình</span>
                        {conflictError}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setConflictError(null)} 
                        className="text-rose-400 hover:text-rose-600 shrink-0 bg-transparent border-none cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button (Clay style) */}
                <button
                  type="submit"
                  className="mt-3 h-[3.25rem] w-full rounded-2xl text-sm font-extrabold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    backgroundColor: addEventTab === 'class' ? '#3B82F6' : addEventTab === 'deadline' ? '#F59E0B' : '#EF4444',
                    boxShadow: clayButton,
                    fontFamily: "'Be Vietnam Pro', sans-serif"
                  }}
                >
                  {isEditMode ? 'Cập nhật lịch trình' : 'Thêm vào lịch trình'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Xác nhận xóa sự kiện */}
      <AnimatePresence>
        {deleteEventConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#eaebee] rounded-[2rem] p-7 w-full max-w-sm relative border border-white/40 flex flex-col items-center text-center"
              style={{ boxShadow: neuR }}
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-4" style={{ boxShadow: neuI }}>
                <Trash size={28} weight="fill" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Xóa sự kiện này?</h3>
              <p className="text-sm text-slate-500 font-bold mb-6">Bạn có chắc chắn muốn xóa "{deleteEventConfirm.name}"? Hành động này không thể hoàn tác.</p>
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setDeleteEventConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-[#eaebee] hover:text-slate-700 transition-all"
                  style={{ boxShadow: clayButton }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-all"
                  style={{ boxShadow: clayButton }}
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Xác nhận xóa điểm danh */}
      <AnimatePresence>
        {deleteAttendanceConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#eaebee] rounded-[2rem] p-7 w-full max-w-sm relative border border-white/40 flex flex-col items-center text-center"
              style={{ boxShadow: neuR }}
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-4" style={{ boxShadow: neuI }}>
                <Trash size={28} weight="fill" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Xóa dữ liệu điểm danh?</h3>
              <p className="text-sm text-slate-500 font-bold mb-6">Xóa lịch sử điểm danh của môn "{deleteAttendanceConfirm.subjectName}"? Hành động này không thể hoàn tác.</p>
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setDeleteAttendanceConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-[#eaebee] hover:text-slate-700 transition-all"
                  style={{ boxShadow: clayButton }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmDeleteAttendance}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-all"
                  style={{ boxShadow: clayButton }}
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
