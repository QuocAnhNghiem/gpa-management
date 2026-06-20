import { useState, useEffect, useCallback, useRef } from 'react';
import * as subjectService from '../api/subjectService';
import * as attendanceService from '../api/attendanceService';
import * as userService from '../api/userService';
import { API_BASE_URL } from '../api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import GradeCustomizationPanel from '../components/GradeCustomizationPanel';
import {
  Plus, X, Check, Star, PencilSimple, Quotes, Warning,
  Compass, BookOpen, ChatTeardropText, ListChecks, Crown,
  Lightning, Notebook, FlagBanner, Trophy,
  Brain, FolderOpen, Tree, TrendUp, Certificate,
  GraduationCap, Scroll, Sun, Globe, SealCheck, Palette
} from '@phosphor-icons/react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { convertScore, getSubjectGrade, getMaxLabel, getPassThreshold, getConfig } from '../utils/gradeUtils';

const IconMap = {
  Compass, BookOpen, ChatTeardropText, ListChecks, Crown,
  Lightning, Notebook, FlagBanner, Trophy,
  Brain, FolderOpen, Tree, TrendUp, Certificate,
  GraduationCap, Scroll, Sun, Globe, SealCheck
};

const getNeuShadows = () => ({
  neuR: `0 28px 64px rgba(182,167,230,0.15), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(224,215,248,0.28)`,
  neuI: `inset 0 2px 4px rgba(169,157,226,0.18)`,
});

// Dynamic classification — dùng gradeUtils thay vì hard-code
const getClassification = (score, scale = 'scale20') => {
  return getSubjectGrade(score, scale);
};

const YEARS = [
  {
    id: 1, name: 'Year 1', color: '#3a628a', bg: '#eff4f8', light: '#d0dfec',
    img: 'https://picsum.photos/seed/cozystudydesk1/500/350',
    quote: '🌱 "The expert in anything was once a beginner."',
    subQuote: '✨ Every effort counts!',
    icons: { header: 'Compass', grades: 'BookOpen', quote: 'ChatTeardropText', goals: 'ListChecks', achievements: 'Crown' }
  },
  {
    id: 2, name: 'Year 2', color: '#2e5a3c', bg: '#f0f7f3', light: '#cee6d7',
    img: 'https://picsum.photos/seed/cozystudydesk2/500/350',
    quote: '⚡ "Focus on progress, not perfection."',
    subQuote: '🚀 Keep pushing forward!',
    icons: { header: 'Lightning', grades: 'Notebook', quote: 'Quotes', goals: 'FlagBanner', achievements: 'Trophy' }
  },
  {
    id: 3, name: 'Year 3', color: '#1f3c5c', bg: '#e5ecf2', light: '#b8c9d9',
    img: 'https://picsum.photos/seed/cozystudydesk3/500/350',
    quote: '🧠 "Small steps every day build giant paths."',
    subQuote: '🎯 Consistency is key.',
    icons: { header: 'Brain', grades: 'FolderOpen', quote: 'Tree', goals: 'TrendUp', achievements: 'Certificate' }
  },
  {
    id: 4, name: 'Year 4', color: '#4a3728', bg: '#fdfbf7', light: '#e8ded2',
    img: 'https://picsum.photos/seed/cozystudydesk4/500/350',
    quote: '🎓 "Finish strong and look back with pride."',
    subQuote: '🌟 The finish line is yours!',
    icons: { header: 'GraduationCap', grades: 'Scroll', quote: 'Sun', goals: 'Globe', achievements: 'SealCheck' }
  },
];

export default function GradesPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const userScale = user?.gradingScale || 'scale20';
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [gradesData, setGradesData] = useState({ 1: [], 2: [], 3: [], 4: [] });
  // Pop-over confirm khi xóa — hiển thị TRƯỚC khi xóa (đúng UX flow)
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { subjectId, subjectName, hasAttendance }
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [gradeCustomization, setGradeCustomization] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const deleteModalCloseRef = useRef(null);
  const subjectModalCloseRef = useRef(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await subjectService.getSubjects();
      const data = res.data || [];
      const newGradesData = { 1: [], 2: [], 3: [], 4: [] };
      data.forEach(subject => {
        const year = subject.year;
        if (!newGradesData[year]) return;
        let semObj = newGradesData[year].find(s => s.name === subject.semester);
        if (!semObj) {
          semObj = { name: subject.semester, grades: [] };
          newGradesData[year].push(semObj);
        }
        const subjectScale = subject.gradingScale || 'scale20';
        const score = subject.finalScore ?? subject.score20;
        const cls = getClassification(score, subjectScale);
        semObj.grades.push({
          id: subject._id,
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          finalScore: score,
          gradingScale: subjectScale,
          letter: subject.scoreLetter || cls.letter,
          classification: subject.classification || cls.label,
          isPassed: subject.isPassed,
          scoreComponents: subject.scoreComponents || []
        });
      });
      // Sort semesters by name
      Object.keys(newGradesData).forEach(year => {
        newGradesData[year].sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName === 'kỳ 1' && bName !== 'kỳ 1') return -1;
          if (bName === 'kỳ 1' && aName !== 'kỳ 1') return 1;
          if (aName === 'kỳ 2' && bName !== 'kỳ 2') return -1;
          if (bName === 'kỳ 2' && aName !== 'kỳ 2') return 1;
          return a.name.localeCompare(b.name);
        });
      });
      setGradesData(newGradesData);
    } catch {
      showToast('error', 'Không thể tải dữ liệu bảng điểm');
    }
  }, [showToast]);

  useEffect(() => { 
    fetchSubjects(); 
    userService.getProfile().then(res => {
      if (res.data?.gradeCustomization) {
        setGradeCustomization(res.data.gradeCustomization);
      }
    }).catch(console.error);
  }, [fetchSubjects]);

  useEffect(() => {
    if (deleteConfirm) {
      deleteModalCloseRef.current?.focus();
    }
  }, [deleteConfirm]);

  useEffect(() => {
    if (isModalOpen) {
      subjectModalCloseRef.current?.focus();
    }
  }, [isModalOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (isModalOpen) setModalOpen(false);
      if (deleteConfirm) setDeleteConfirm(null);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [deleteConfirm, isModalOpen]);

  // Dynamic score components
  const [calcData, setCalcData] = useState({
    id: null,
    subjectName: '',
    subjectCode: '',
    semester: 'Kỳ 1',
    credits: 3,
    gradingScale: userScale,
    components: [
      { name: 'Chuyên cần', weight: 10, score: userScale === 'scale4' ? 3.0 : 15 },
      { name: 'Giữa kỳ',   weight: 30, score: userScale === 'scale4' ? 3.0 : 14 },
      { name: 'Cuối kỳ',   weight: 60, score: userScale === 'scale4' ? 3.0 : 13 },
    ]
  });

  const displayYears = YEARS.map(y => {
    const custom = gradeCustomization?.[`year${y.id}`];
    if (!custom) return y;
    return {
      ...y,
      color: custom.color || y.color,
      bg: custom.color ? `${custom.color}10` : y.bg,
      light: custom.color ? `${custom.color}40` : y.light,
      img: custom.imageUrl ? (custom.imageUrl.startsWith('http') ? custom.imageUrl : `${API_BASE_URL}${custom.imageUrl}`) : y.img,
      quote: custom.slogan || y.quote,
      subQuote: custom.subQuote || y.subQuote,
    };
  });

  const currentModalYear = displayYears[(selectedYear || 1) - 1] || displayYears[0];
  const totalWeight = calcData.components.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) <= 0.01;
  const modalScale = calcData.gradingScale || userScale;
  const modalScaleConfig = getConfig(modalScale);

  const finalScore = weightOk
    ? calcData.components.reduce((sum, c) => sum + (c.score * (c.weight / 100)), 0).toFixed(2)
    : null;
  const finalCls = finalScore !== null ? getClassification(parseFloat(finalScore), modalScale) : null;

  const handleOpenModal = (yearId) => {
    setSelectedYear(yearId);
    setCalcData({
      id: null, subjectName: '', subjectCode: '', semester: 'Kỳ 1', credits: 3,
      gradingScale: userScale,
      components: [
        { name: 'Chuyên cần', weight: 10, score: userScale === 'scale4' ? 3.0 : 15 },
        { name: 'Giữa kỳ',   weight: 30, score: userScale === 'scale4' ? 3.0 : 14 },
        { name: 'Cuối kỳ',   weight: 60, score: userScale === 'scale4' ? 3.0 : 13 },
      ]
    });
    setModalOpen(true);
  };

  const handleEditSubject = (yearId, subject, semesterName) => {
    setSelectedYear(yearId);
    setCalcData({
      id: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code || '',
      semester: semesterName,
      credits: subject.credits,
      gradingScale: subject.gradingScale || 'scale20',
      components: subject.scoreComponents && subject.scoreComponents.length > 0 
        ? subject.scoreComponents.map(c => ({ name: c.name, weight: c.weight * 100, score: c.score || 0 }))
        : (subject.finalScore !== null && subject.finalScore !== undefined
          ? [{ name: 'Diem tong ket', weight: 100, score: subject.finalScore }]
        : [
            { name: 'Chuyên cần', weight: 10, score: userScale === 'scale4' ? 3.0 : 15 },
            { name: 'Giữa kỳ',   weight: 30, score: userScale === 'scale4' ? 3.0 : 14 },
            { name: 'Cuối kỳ',   weight: 60, score: userScale === 'scale4' ? 3.0 : 13 },
          ])
    });
    setModalOpen(true);
  };

  const addComponent = () => {
    setCalcData(prev => ({
      ...prev,
      components: [...prev.components, { name: `Thành phần ${prev.components.length + 1}`, weight: 0, score: 10 }]
    }));
  };

  const removeComponent = (idx) => {
    setCalcData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx)
    }));
  };

  const updateComponent = (idx, field, value) => {
    setCalcData(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };

  const handleSaveSubject = async () => {
    if (!calcData.subjectName.trim()) {
      showToast('error', 'Vui lòng nhập tên môn học!');
      return;
    }
    if (!weightOk) {
      showToast('error', `Tổng trọng số phải bằng 100% (hiện tại ${totalWeight}%)`);
      return;
    }

    // Kiểm tra trùng tên môn học trong cùng học kỳ
    const yearData = gradesData[selectedYear] || [];
    const semesterData = yearData.find(s => s.name === (calcData.semester || 'Kỳ 1'));
    if (semesterData) {
      const isDuplicate = semesterData.grades.some(g => 
        g.name.trim().toLowerCase() === calcData.subjectName.trim().toLowerCase() && 
        g.id !== calcData.id
      );
      if (isDuplicate) {
        showToast('error', `Môn học "${calcData.subjectName}" đã tồn tại trong ${calcData.semester || 'Kỳ 1'}!`);
        return;
      }
    }

    try {
      const subjectPayload = {
        name: calcData.subjectName,
        code: calcData.subjectCode,
        credits: calcData.credits || 3,
        year: selectedYear,
        semester: calcData.semester || 'Kỳ 1',
        scoreComponents: calcData.components.map(c => ({
          name: c.name,
          weight: c.weight / 100,
          score: c.score
        }))
      };
      
      if (calcData.id) {
        await subjectService.updateSubject(calcData.id, subjectPayload);
      } else {
        await subjectService.createSubject(subjectPayload);
      }
      
      setModalOpen(false);
      setCalcData({
        id: null, subjectName: '', subjectCode: '', semester: 'Kỳ 1', credits: 3,
        components: [
          { name: 'Chuyên cần', weight: 10, score: userScale === 'scale4' ? 3.0 : 15 },
          { name: 'Giữa kỳ',   weight: 30, score: userScale === 'scale4' ? 3.0 : 14 },
          { name: 'Cuối kỳ',   weight: 60, score: userScale === 'scale4' ? 3.0 : 13 },
        ]
      });
      showToast('success', 'Đã lưu môn học thành công!');
      fetchSubjects();
    } catch (error) {
      showToast('error', 'Lỗi khi lưu: ' + error.message);
    }
  };

  // Delete subject with cascade confirm — KIỂM TRA TRƯỚC, XÓA SAU (đúng UX flow)
  const handleDeleteSubject = async (subjectId) => {
    setDeleteChecking(true);
    try {
      // Bước 1: Kiểm tra xem có attendance liên quan không (gọi riêng 1 endpoint check)
      // Backend DELETE trả hasAttendance mà KHÔNG xóa nếu ta dùng ?dryRun=true
      // Cách đơn giản: check attendance list
      const attRes = await attendanceService.getAttendances();
      // Lấy subject name từ data để tìm attendance
      const subjectData = Object.values(gradesData).flat().flatMap(s => s.grades).find(g => g.id === subjectId);
      const subjectName = subjectData?.name || '';
      const subjectCode = subjectData?.code || '';
      const hasAttendance = attRes.success && attRes.data.some((attendance) => (
        attendance.subjectId === subjectId
        || (subjectCode && attendance.subjectCode === subjectCode)
        || attendance.subjectName?.toLowerCase() === subjectName.toLowerCase()
      ));

      // Bước 2: Hiển thị confirm trước khi xóa
      setDeleteConfirm({ subjectId, subjectName, subjectCode, hasAttendance });
    } catch (err) {
      showToast('error', 'Lỗi kiểm tra dữ liệu: ' + err?.message);
    } finally {
      setDeleteChecking(false);
    }
  };

  // Thực sự xóa sau khi user đã quyết định
  const handleConfirmDelete = async (deleteAttendance) => {
    if (!deleteConfirm) return;
    const { subjectId } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await subjectService.deleteSubject(subjectId, { deleteAttendance });
      showToast('success', `Đã xóa môn học${deleteAttendance ? ' và dữ liệu chuyên cần' : ''}`);
      fetchSubjects();
    } catch (err) {
      showToast('error', 'Lỗi xóa môn: ' + err?.message);
    }
  };

  const { neuI } = getNeuShadows();

  return (
    <div className="min-h-full overflow-y-auto overflow-x-hidden scrollbar-hide px-3 pt-4 md:px-4 bg-[rgba(235,232,246,0.3)]">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 h-auto w-full gap-4 xl:gap-6 pb-8 items-start">
        {displayYears.map(year => (
          <div 
            key={year.id} 
            className="rounded-[2.5rem] overflow-hidden bg-[rgba(255,255,255,0.8)] border border-white/60 shadow-[0_12px_36px_rgba(182,167,230,0.12)] backdrop-blur-xl flex flex-col h-full"
          >
            <div className="w-full px-1 pb-8">
              <YearColumn year={year} yearData={gradesData[year.id] || []} onAdd={() => handleOpenModal(year.id)} onEdit={(subject, semName) => handleEditSubject(year.id, subject, semName)} onDeleteSubject={handleDeleteSubject} deleteChecking={deleteChecking} userScale={userScale} />
            </div>
          </div>
        ))}
      </div>

      {/* Cascade Confirm Pop-over — ĐÚNG FLOW: hỏi TRƯỚC khi xóa */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative rounded-[2rem] p-8 bg-[rgba(255,255,255,0.7)] max-w-sm w-full flex flex-col gap-5 items-center text-center z-10"
              style={{ boxShadow: getNeuShadows().neuR }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="grades-delete-title"
            >
              <button
                ref={deleteModalCloseRef}
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-slate-500"
                style={{ boxShadow: getNeuShadows().neuR }}
                aria-label="Đóng hộp thoại xóa môn học"
              >
                <X size={18} weight="bold" />
              </button>
              <Warning size={48} weight="duotone" color="#d97706" />
              <div>
                <p id="grades-delete-title" className="text-base font-bold text-slate-700 mb-2">
                  Xóa môn <strong className="text-slate-900">"{deleteConfirm.subjectName}"</strong>?
                </p>
                {deleteConfirm.hasAttendance && (
                  <p className="text-sm font-bold text-amber-600 bg-amber-50 rounded-xl px-4 py-2">
                    ⚠️ Môn này có dữ liệu chuyên cần. Bạn muốn xóa luôn hay giữ lại?
                  </p>
                )}
              </div>
              {deleteConfirm.hasAttendance ? (
                <div className="flex gap-3 w-full">
                  <button onClick={() => handleConfirmDelete(true)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
                    Xóa luôn
                  </button>
                  <button onClick={() => handleConfirmDelete(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer">
                    Giữ chuyên cần
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <button onClick={() => handleConfirmDelete(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
                    Xóa môn
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer">
                    Hủy bỏ
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Thêm môn & Giả lập Điểm */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-[2rem] p-8 flex flex-col gap-5 bg-[rgba(255,255,255,0.7)] z-10 max-h-[90vh] overflow-y-auto scrollbar-hide"
              style={{ boxShadow: getNeuShadows().neuR }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="grades-subject-modal-title"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="grades-subject-modal-title" className="text-xl font-extrabold text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {calcData.id ? 'Sửa môn học' : 'Thêm môn & Giả lập Điểm'}
                  </h3>
                  <p className="text-sm font-bold text-slate-500">Year {selectedYear} — {modalScaleConfig.label}</p>
                </div>
                <button
                  ref={subjectModalCloseRef}
                  onClick={() => setModalOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 bg-[rgba(255,255,255,0.7)] cursor-pointer"
                  style={{ boxShadow: getNeuShadows().neuR }}
                  aria-label="Đóng modal môn học"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Tên môn học</label>
                  <input type="text" value={calcData.subjectName} onChange={e => setCalcData({...calcData, subjectName: e.target.value})} placeholder="VD: Toán cao cấp" className="w-full h-12 px-5 rounded-xl text-sm font-bold text-slate-700 bg-[rgba(255,255,255,0.7)] focus:outline-none" style={{ boxShadow: neuI }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Học kỳ</label>
                  <select value={calcData.semester} onChange={e => setCalcData({...calcData, semester: e.target.value})} className="h-12 px-4 rounded-xl text-sm font-bold text-slate-700 bg-[rgba(255,255,255,0.7)] focus:outline-none cursor-pointer" style={{ boxShadow: neuI }}>
                    {['Kỳ 1','Kỳ 2'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Số tín chỉ</label>
                  <input type="number" min="1" max="10" value={calcData.credits} onChange={e => setCalcData({...calcData, credits: Math.min(10, Math.max(1, Number(e.target.value)))})} className="h-12 px-4 rounded-xl text-sm font-bold text-slate-700 bg-[rgba(255,255,255,0.7)] focus:outline-none" style={{ boxShadow: neuI }} />
                </div>
              </div>

              {/* Dynamic Score Components */}
              <div className="border-t-2 border-slate-300/60 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Đầu điểm ({modalScaleConfig.label})</p>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${weightOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    Tổng: {totalWeight}%
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {calcData.components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/60">
                      <input type="text" value={comp.name} onChange={e => updateComponent(idx, 'name', e.target.value)}
                        className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none min-w-0" placeholder="Tên đầu điểm" />
                      <div className="flex items-center gap-1 shrink-0">
                        <input type="number" value={comp.weight} onChange={e => updateComponent(idx, 'weight', Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-12 h-9 px-1 text-center rounded-lg text-xs font-bold bg-[#eaebee] outline-none" style={{ boxShadow: neuI }} />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                      <input type="number" step={modalScaleConfig.step} min="0" max={modalScaleConfig.maxScore} value={comp.score} onChange={e => updateComponent(idx, 'score', Math.min(modalScaleConfig.maxScore, Math.max(0, Number(e.target.value))))}
                        className="w-16 h-9 px-2 text-center rounded-lg text-sm font-extrabold bg-[#eaebee] outline-none" style={{ boxShadow: neuI }} />
                      {calcData.components.length > 1 && (
                        <button onClick={() => removeComponent(idx)} className="text-red-400 hover:text-red-500 cursor-pointer shrink-0" aria-label={`Xóa đầu điểm ${comp.name || idx + 1}`}>
                          <X size={16} weight="bold" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addComponent}
                    className="py-2 text-xs font-bold rounded-xl bg-white/60 border border-dashed border-slate-300 hover:bg-white/80 transition-colors cursor-pointer text-slate-500">
                    + Thêm đầu điểm
                  </button>
                </div>
              </div>

              {/* Result Preview */}
              <div className="rounded-[1.5rem] p-5 flex items-center justify-between" style={{ backgroundColor: currentModalYear.bg, border: `2px solid ${currentModalYear.light}` }}>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Kết quả giả lập</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tabular-nums" style={{ color: currentModalYear.color }}>
                      {finalScore !== null ? finalScore : '—'}
                    </span>
                    <span className="text-sm font-bold text-slate-400 mb-1">{getMaxLabel(modalScale)}</span>
                  </div>
                  {finalCls && <p className="text-xs font-bold mt-1" style={{ color: finalCls.color }}>{finalCls.label}</p>}
                  {!weightOk && <p className="text-xs text-red-500 font-bold mt-1">Tổng trọng số ≠ 100%</p>}
                </div>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ backgroundColor: currentModalYear.color, boxShadow: `0 8px 20px ${currentModalYear.color}50` }}>
                  {finalCls ? finalCls.letter : '?'}
                </div>
              </div>

              <button onClick={handleSaveSubject} disabled={!weightOk}
                className="w-full h-12 rounded-xl text-white text-sm font-extrabold tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: currentModalYear.color, boxShadow: `0 6px 16px ${currentModalYear.color}50` }}
              >
                Lưu vào Year {selectedYear}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB - Customization */}
      <button
        onClick={() => setIsCustomizing(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-40 cursor-pointer"
        style={{ boxShadow: '0 10px 25px rgba(30, 41, 59, 0.4)' }}
        title="Cá nhân hóa bảng điểm"
        aria-label="Cá nhân hóa bảng điểm"
      >
        <Palette size={24} weight="fill" />
      </button>

      <AnimatePresence>
        {isCustomizing && (
          <GradeCustomizationPanel
            gradeCustomization={gradeCustomization}
            setGradeCustomization={setGradeCustomization}
            onClose={() => setIsCustomizing(false)}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function YearColumn({ year, yearData, onAdd, onEdit, onDeleteSubject, deleteChecking, userScale }) {
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isEditingAch, setIsEditingAch] = useState(false);

  const shadows = getNeuShadows();

  const calculateYearGPA = () => {
    let totalScore = 0;
    let totalCredits = 0;
    yearData.forEach(sem => {
      sem.grades.forEach(g => {
        const score = g.finalScore;
        const gScale = g.gradingScale || 'scale20';
        if (score !== null && score !== undefined && g.credits) {
          const normalizedScore = convertScore(score, gScale, userScale);
          totalScore += normalizedScore * g.credits;
          totalCredits += g.credits;
        }
      });
    });
    return totalCredits === 0 ? '0.00' : (totalScore / totalCredits).toFixed(2);
  };
  const yearGPA = calculateYearGPA();

  const HeaderIcon = IconMap[year.icons.header] || Compass;
  const GradesIcon = IconMap[year.icons.grades] || Notebook;
  const QuoteIcon = IconMap[year.icons.quote] || Quotes;
  const GoalsIcon = IconMap[year.icons.goals] || ListChecks;
  const AchievementsIcon = IconMap[year.icons.achievements] || Trophy;

  // Goals CRUD
  useEffect(() => {
    userService.getProfile().then(res => {
      if (res.data?.goals && res.data.goals[`year${year.id}`]) {
        setGoals(res.data.goals[`year${year.id}`]);
      } else {
        setGoals([{ id: 1, text: `Hoàn thành tốt năm ${year.id}`, done: false }]);
      }
      if (res.data?.achievements && res.data.achievements[`year${year.id}`]) {
        setAchievements(res.data.achievements[`year${year.id}`]);
      } else {
        setAchievements([`Nỗ lực không ngừng năm ${year.id}`]);
      }
    }).catch(console.error);
  }, [year.id]);

  const saveGoals = async (newGoals) => {
    try {
      setGoals(newGoals);
      await userService.updateProfile({ goals: { [`year${year.id}`]: newGoals } });
    } catch (error) {
      console.error(error);
    }
  };

  const addGoal = () => saveGoals([...goals, { id: Date.now(), text: 'Mục tiêu mới', done: false }]);
  const updateGoal = (id, text) => saveGoals(goals.map(g => g.id === id ? { ...g, text } : g));
  const removeGoal = (id) => saveGoals(goals.filter(g => g.id !== id));
  const toggleGoal = (e, id) => { e.stopPropagation(); saveGoals(goals.map(g => g.id === id ? { ...g, done: !g.done } : g)); };

  const saveAch = async (newAch) => {
    try {
      setAchievements(newAch);
      await userService.updateProfile({ achievements: { [`year${year.id}`]: newAch } });
    } catch (error) {
      console.error(error);
    }
  };

  const addAch = () => saveAch([...achievements, 'Thành tích mới']);
  const updateAch = (idx, text) => saveAch(achievements.map((a, i) => i === idx ? text : a));
  const removeAch = (idx) => saveAch(achievements.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Cột năm học header */}
      <div className="w-full py-4 rounded-[2rem] border-2 border-white/50 flex items-center justify-center gap-3 shadow-md relative overflow-hidden" style={{ backgroundColor: year.color }}>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        <HeaderIcon size={32} weight="duotone" className="text-white drop-shadow" />
        <h3 className="text-3xl xl:text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-md" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>{year.name}</h3>
      </div>

      {/* Image card */}
      <div className="rounded-[2rem] p-5 flex flex-col items-center border border-white/70 bg-gradient-to-br from-white/60 to-transparent transition-transform hover:scale-[1.01] duration-300" style={{ boxShadow: shadows.neuR }}>
        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 border-4 border-white shadow-lg relative group">
          <img src={year.img} alt="Cozy Study Desk" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
        </div>
        <div className="h-[60px] flex items-center justify-center w-full px-2">
          <p className="text-center text-xl xl:text-2xl font-bold leading-snug line-clamp-2 drop-shadow-sm" style={{ fontFamily: "'Itim', cursive", color: year.color }}>{year.quote}</p>
        </div>
        <div className="mt-2 text-xs font-black text-slate-400 uppercase tracking-widest border-t-2 border-slate-300/40 pt-3 w-full text-center">
          {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Bảng điểm — Thang 20 */}
      <Widget title="Bảng điểm học kỳ" icon={<GradesIcon size={26} weight="duotone" />} titleColor={year.color} bg={year.bg} light={year.light} shadows={shadows}
        action={<button onClick={onAdd} className="w-8 h-8 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: year.color, boxShadow: `0 4px 10px ${year.color}40` }}><Plus size={18} weight="bold" /></button>}
      >
        <div className="bg-white/60 rounded-2xl border-2 overflow-hidden flex flex-col shadow-inner" style={{ borderColor: year.light }}>
          <div className="flex flex-col relative" style={{ backgroundImage: 'radial-gradient(#c5cdd8 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
            <div className="flex items-center text-[10px] xl:text-xs font-black text-slate-500 uppercase tracking-wider p-2 xl:p-3 bg-white/95 border-b-2" style={{ borderColor: year.light }}>
              <span className="w-6 text-center">#</span>
              <span className="flex-1">Môn học</span>
              <span className="w-12 text-center">Điểm</span>
              <span className="w-8 text-center">Chữ</span>
              <span className="w-16 text-center">Trạng thái</span>
              <span className="w-6"></span>
            </div>
            <div className="flex flex-col h-[500px] overflow-y-auto scrollbar-hide">
              {yearData.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-400 font-bold text-sm">Chưa có môn học nào.</div>
              )}
              {yearData.map((sem, sIdx) => (
                <div key={sIdx} className="flex flex-col">
                  <div className="py-2 px-3 text-xs xl:text-sm font-black tracking-wide bg-white/90 border-y border-white/60" style={{ color: year.color }}>✦ {sem.name}</div>
                  {sem.grades.map((g, idx) => {
                    const gScale = g.gradingScale || 'scale20';
                    const cls = getClassification(g.finalScore, gScale);
                    const passThresh = getPassThreshold(gScale);
                    const isFailed = g.finalScore !== null && g.finalScore !== undefined && g.finalScore < passThresh;
                    const excellentThresh = gScale === 'scale4' ? 3.50 : 16;
                    const isExcellent = g.finalScore !== null && g.finalScore >= excellentThresh;
                    return (
                      <div key={idx} onClick={() => onEdit(g, sem.name)} className={`flex items-center text-xs xl:text-sm font-bold p-2.5 xl:p-3 border-b-2 border-dashed border-[#c5cdd8]/60 hover:bg-white/80 transition-colors cursor-pointer ${isFailed ? 'bg-red-50/70' : 'bg-white/50'}`}>
                        <span className="w-6 shrink-0 text-center text-slate-400 text-[10px]">
                          {isFailed ? <Warning size={14} weight="fill" color="#dc2626" /> : isExcellent ? '👑' : idx + 1}
                        </span>
                        <span className={`flex-1 line-clamp-2 leading-snug pr-1 font-extrabold ${isFailed ? 'text-red-700' : 'text-slate-700'}`}>{g.name}</span>
                        <span className={`w-12 shrink-0 text-center font-extrabold tabular-nums ${isFailed ? 'text-red-600' : 'text-slate-800'}`}>
                          {g.finalScore !== null && g.finalScore !== undefined ? `${Number(g.finalScore).toFixed(2)}` : '—'}
                        </span>
                        <span className="w-8 text-center font-black text-[11px]" style={{ color: cls.color }}>
                          {cls.letter}
                        </span>
                        <span className="w-16 text-center">
                           <span className={`px-2 py-0.5 rounded-full text-[9px] xl:text-[10px] font-bold ${g.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {g.isPassed ? 'Đạt' : 'Không đạt'}
                           </span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteSubject(g.id); }}
                          disabled={deleteChecking}
                          className="w-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer disabled:cursor-wait"
                          title={deleteChecking ? 'Đang kiểm tra...' : 'Xóa môn'}
                        >
                          {deleteChecking
                            ? <span className="w-3 h-3 border-2 border-slate-300 border-t-red-400 rounded-full animate-spin" />
                            : <X size={14} weight="bold" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border-t-2 bg-white" style={{ borderColor: year.light }}>
            <span className="text-sm xl:text-base font-black uppercase tracking-wider" style={{ color: year.color }}>Tổng kết năm</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tabular-nums drop-shadow-sm" style={{ color: year.color }}>{yearGPA}</span>
              <span className="text-xs font-bold text-slate-400">{getMaxLabel(userScale)}</span>
            </div>
          </div>
        </div>
      </Widget>

      {/* Sub-quote */}
      <div className="flex items-center gap-2 relative px-2 my-1 h-[90px]">
        <div className="shrink-0 -rotate-12 transform hover:scale-110 transition-transform">
          <QuoteIcon size={26} weight="duotone" color={year.color} className="opacity-60" />
        </div>
        <div className="flex-1 py-3 px-4 rounded-[1.5rem] border-2 border-dashed shadow-sm text-center" style={{ backgroundColor: `${year.light}30`, borderColor: `${year.color}50`, boxShadow: shadows.neuR }}>
          <p className="text-[20px] font-bold leading-snug" style={{ fontFamily: "'Itim', cursive", color: year.color }}>{year.subQuote}</p>
        </div>
        <div className="shrink-0 rotate-12 transform hover:scale-110 transition-transform">
          <QuoteIcon size={26} weight="duotone" color={year.color} className="opacity-60" />
        </div>
      </div>

      {/* Mục tiêu */}
      <Widget title="Mục tiêu cá nhân" icon={<GoalsIcon size={26} weight="duotone" />} titleColor={year.color} bg={year.bg} light={year.light} shadows={shadows}
        action={<button onClick={() => setIsEditingGoals(!isEditingGoals)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer" style={{ backgroundColor: isEditingGoals ? year.color : 'var(--neu-bg)', color: isEditingGoals ? '#fff' : year.color, boxShadow: isEditingGoals ? `0 4px 10px ${year.color}40` : shadows.neuR }}>{isEditingGoals ? <Check size={18} weight="bold" /> : <PencilSimple size={18} weight="bold" />}</button>}
      >
        <div className="flex flex-col gap-3 mt-1 h-[200px] overflow-y-auto scrollbar-hide pb-2">
          {goals.map(g => (
            <div key={g.id} className={`flex items-center gap-4 bg-white/60 p-3 rounded-xl border border-white transition-all hover:bg-white/80 shadow-sm ${!isEditingGoals && 'cursor-pointer'}`} onClick={(e) => !isEditingGoals && toggleGoal(e, g.id)}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border-2 border-white transition-all shrink-0" style={{ backgroundColor: g.done && !isEditingGoals ? 'var(--neu-bg)' : year.bg, boxShadow: g.done && !isEditingGoals ? shadows.neuI : shadows.neuR }}>
                <motion.div initial={false} animate={{ scale: (g.done || isEditingGoals) ? 1 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <Check size={20} weight="bold" color={isEditingGoals ? '#94a3b8' : year.color} />
                </motion.div>
              </div>
              {isEditingGoals ? (
                <div className="flex-1 flex items-center gap-2">
                  <input type="text" value={g.text} onChange={e => updateGoal(g.id, e.target.value)} className="flex-1 bg-white/90 px-3 py-1 rounded-lg text-sm font-bold outline-none border border-slate-200" style={{ color: year.color }} />
                  <button onClick={() => removeGoal(g.id)} className="text-red-400 hover:text-red-500 cursor-pointer"><X size={18} weight="bold" /></button>
                </div>
              ) : (
                <div className="relative flex-1">
                  <span className={`text-sm xl:text-base font-extrabold transition-all duration-300 ${g.done ? 'opacity-40' : 'opacity-100'}`} style={{ color: year.color }}>{g.text}</span>
                  {g.done && (
                    <motion.div layoutId={`strike-${g.id}`} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.3 }} className="absolute top-1/2 left-0 h-[3px] bg-current rounded-full" style={{ color: year.color }} />
                  )}
                </div>
              )}
            </div>
          ))}
          {isEditingGoals && (
            <button onClick={addGoal} className="mt-2 py-2 text-sm font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer" style={{ color: year.color }}>+ Thêm mục tiêu</button>
          )}
        </div>
      </Widget>

      {/* Thành tích */}
      <Widget title="Thành tích đạt được" icon={<AchievementsIcon size={26} weight="duotone" />} titleColor={year.color} bg={year.bg} light={year.light} shadows={shadows}
        action={<button onClick={() => setIsEditingAch(!isEditingAch)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer" style={{ backgroundColor: isEditingAch ? year.color : 'var(--neu-bg)', color: isEditingAch ? '#fff' : year.color, boxShadow: isEditingAch ? `0 4px 10px ${year.color}40` : shadows.neuR }}>{isEditingAch ? <Check size={18} weight="bold" /> : <PencilSimple size={18} weight="bold" />}</button>}
      >
        <div className="flex flex-col gap-3 mt-1 h-[200px] overflow-y-auto scrollbar-hide pb-2">
          {achievements.map((ach, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-white/60 p-3.5 rounded-xl border border-white shadow-sm hover:bg-white/80 transition-colors">
              <Star size={22} weight="fill" color={year.color} className="mt-0.5 shrink-0" />
              {isEditingAch ? (
                <div className="flex-1 flex items-center gap-2">
                  <input type="text" value={ach} onChange={e => updateAch(idx, e.target.value)} className="flex-1 bg-white/90 px-3 py-1 rounded-lg text-sm font-bold outline-none border border-slate-200" style={{ color: year.color }} />
                  <button onClick={() => removeAch(idx)} className="text-red-400 hover:text-red-500 cursor-pointer"><X size={18} weight="bold" /></button>
                </div>
              ) : (
                <span className="text-sm xl:text-base font-extrabold" style={{ color: year.color }}>{ach}</span>
              )}
            </div>
          ))}
          {isEditingAch && (
            <button onClick={addAch} className="mt-2 py-2 text-sm font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer" style={{ color: year.color }}>+ Thêm thành tích</button>
          )}
        </div>
      </Widget>
    </div>
  );
}

function Widget({ title, icon, action, titleColor, bg, light, shadows, children }) {
  return (
    <div className="rounded-[2rem] p-5 xl:p-6 flex flex-col gap-4 relative transition-transform hover:scale-[1.01] duration-300" style={{ backgroundColor: bg, border: `2px solid ${light}80`, boxShadow: shadows.neuR }}>
      <div className="flex items-center justify-between mb-1 pl-2 relative z-10">
        <h4 className="text-lg xl:text-xl font-extrabold flex items-center gap-3 tracking-wide" style={{ color: titleColor }}>{icon} {title}</h4>
        {action && <div>{action}</div>}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
