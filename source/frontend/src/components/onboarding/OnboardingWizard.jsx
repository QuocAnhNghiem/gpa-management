import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Student, GraduationCap, ArrowsClockwise, Ruler, ChartBar } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateProfile } from '../../api/userService';
import { getConfig, getTargetGpaHint } from '../../utils/gradeUtils';

const neuRaised = '6px 6px 14px #c5cdd8, -6px -6px 14px #ffffff';
const neuInset = 'inset 4px 4px 8px #c5cdd8, inset -4px -4px 8px #ffffff';

const steps = [
  { id: 1, title: 'Hồ sơ', label: 'Hồ sơ sinh viên' },
  { id: 2, title: 'Học thuật', label: 'Thiết lập học thuật' },
  { id: 3, title: 'Đồng bộ', label: 'Tích hợp ERP' },
];

const scaleOptions = [
  {
    key: 'scale20',
    icon: <Ruler size={28} weight="fill" color="#3182ce" />,
    title: 'Thang 20',
    desc: 'Phổ biến tại Đại học Bách Khoa, hệ Pháp',
  },
  {
    key: 'scale4',
    icon: <ChartBar size={28} weight="fill" color="#8b5cf6" />,
    title: 'Thang 4 (GPA)',
    desc: 'Phổ biến tại phần lớn các trường ĐH Việt Nam',
  },
];

export default function OnboardingWizard() {
  const { user, loginContext } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    mssv: '',
    major: '',
    userClass: '',
    university: '',
    year: '1',
    semester: '1',
    gradingScale: 'scale20',
    targetGpa: 14.00,
  });

  useEffect(() => {
    if (user?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user?.onboardingCompleted]);

  const currentConfig = getConfig(data.gradingScale);

  const updateData = (field, value) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      // Khi đổi thang điểm → reset targetGpa về default của thang mới
      if (field === 'gradingScale') {
        const cfg = getConfig(value);
        next.targetGpa = cfg.defaultTargetGpa;
      }
      return next;
    });
  };

  const next = async () => {
    if (currentStep === 1) {
      if (!data.mssv.trim()) {
        showToast('error', 'Vui lòng nhập Mã sinh viên');
        return;
      }
      if (!data.major.trim()) {
        showToast('error', 'Vui lòng nhập Chuyên ngành');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    // Step 3 -> Hoàn tất (Lưu 1 lần duy nhất)
    setSaving(true);
    try {
      const payload = {
        mssv: data.mssv.trim(),
        major: data.major.trim(),
        class: data.userClass.trim(),
        university: data.university.trim(),
        currentSemester: `Năm ${data.year} - Kỳ ${data.semester}`,
        gradingScale: data.gradingScale,
        targetGpa: data.targetGpa,
        onboardingCompleted: true,
      };
      
      const res = await updateProfile(payload);
      if (res.success || res.data) {
        showToast('success', 'Thiết lập hoàn tất!');
        loginContext({ ...user, ...res.data, onboardingCompleted: true });
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      showToast('error', err.message || 'Có lỗi xảy ra khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 lg:p-8 bg-[#eaebee]">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset }}
          >
            <GraduationCap size={32} weight="fill" color="#3182ce" />
          </div>
          <h1 className="text-2xl font-bold mt-2" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: '#1e293b' }}>
            Thiết lập tài khoản
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Chỉ 3 bước để cá nhân hóa lộ trình học tập của bạn
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-[1rem] flex items-center justify-center text-sm font-bold transition-all duration-300"
                  style={{
                    backgroundColor: currentStep > step.id ? '#3182ce' : currentStep === step.id ? 'var(--neu-bg)' : 'var(--neu-bg)',
                    color: currentStep > step.id ? '#ffffff' : currentStep === step.id ? '#3182ce' : '#94a3b8',
                    boxShadow: currentStep === step.id ? neuInset : (currentStep > step.id ? '4px 4px 10px #2563a0' : neuRaised),
                  }}
                >
                  {currentStep > step.id ? <CheckCircle size={20} weight="bold" /> : step.id}
                </div>
                <span className="text-xs mt-2 font-bold" style={{ color: currentStep >= step.id ? '#1e293b' : '#94a3b8' }}>
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="w-16 h-1 mx-3 mb-5 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: currentStep > step.id ? '#3182ce' : '#c5cdd8' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-[2.5rem] p-10" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuRaised }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* ============ SLIDE 1: HỒ SƠ SINH VIÊN ============ */}
              {currentStep === 1 && (
                <div className="flex flex-col gap-5">
                  <h2 className="text-lg font-bold text-[#1e293b] mb-2 font-['Be Vietnam Pro']">
                    Xin chào {user?.name}! Hãy cho chúng tôi biết về trường lớp của bạn
                  </h2>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Trường học</label>
                    <input
                      type="text"
                      placeholder="VD: Đại học Bách Khoa Hà Nội"
                      value={data.university}
                      onChange={(e) => updateData('university', e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Mã sinh viên (MSSV)</label>
                    <input
                      type="text"
                      placeholder="VD: 20210001"
                      value={data.mssv}
                      onChange={(e) => updateData('mssv', e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Chuyên ngành</label>
                    <input
                      type="text"
                      placeholder="VD: Khoa học máy tính"
                      value={data.major}
                      onChange={(e) => updateData('major', e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Lớp</label>
                    <input
                      type="text"
                      placeholder="VD: K66-KHMT"
                      value={data.userClass}
                      onChange={(e) => updateData('userClass', e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                    />
                  </div>

                  <div className="flex gap-4 mt-2">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Năm học hiện tại</label>
                      <select
                        value={data.year}
                        onChange={(e) => updateData('year', e.target.value)}
                        className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200 appearance-none bg-transparent cursor-pointer"
                        style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                      >
                        <option value="1">Năm 1</option>
                        <option value="2">Năm 2</option>
                        <option value="3">Năm 3</option>
                        <option value="4">Năm 4</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2 ml-2" style={{ color: '#475569' }}>Học kỳ</label>
                      <select
                        value={data.semester}
                        onChange={(e) => updateData('semester', e.target.value)}
                        className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-shadow duration-200 appearance-none bg-transparent cursor-pointer"
                        style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset, color: '#1e293b' }}
                      >
                        <option value="1">Kỳ 1</option>
                        <option value="2">Kỳ 2</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ SLIDE 2: THIẾT LẬP HỌC THUẬT ============ */}
              {currentStep === 2 && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-xl font-bold text-[#1e293b] font-['Be Vietnam Pro']">Thiết lập Học thuật</h2>
                  
                  {/* Chọn thang điểm */}
                  <div>
                    <label className="block text-sm font-semibold mb-4 ml-2" style={{ color: '#475569' }}>
                      Chọn thang điểm của trường bạn
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {scaleOptions.map((opt) => {
                        const isActive = data.gradingScale === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => updateData('gradingScale', opt.key)}
                            className="relative flex flex-col items-center gap-3 p-6 rounded-[1.5rem] transition-all duration-300 cursor-pointer text-center"
                            style={{
                              backgroundColor: 'var(--neu-bg)',
                              boxShadow: isActive ? neuInset : neuRaised,
                              border: isActive ? '2px solid #3182ce' : '2px solid transparent',
                            }}
                          >
                            {isActive && (
                              <div className="absolute top-3 right-3">
                                <CheckCircle size={20} weight="fill" color="#3182ce" />
                              </div>
                            )}
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center"
                              style={{
                                backgroundColor: isActive ? (opt.key === 'scale20' ? '#dbeafe' : '#ede9fe') : '#f1f5f9',
                                boxShadow: neuInset,
                              }}
                            >
                              {opt.icon}
                            </div>
                            <span className="text-base font-bold" style={{ color: isActive ? '#1e293b' : '#64748b' }}>
                              {opt.title}
                            </span>
                            <span className="text-xs font-medium leading-relaxed" style={{ color: '#94a3b8' }}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bảng quy chiếu động */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={data.gradingScale}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="p-6 rounded-[1.5rem]"
                      style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuInset }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bảng Điểm Môn học */}
                        <div className="bg-white/40 rounded-[1.25rem] p-5 border border-white shadow-sm transition-all hover:bg-white/60">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center border-b-2 border-slate-200/60 pb-3">
                            Điểm Môn học
                          </h4>
                          <div className="space-y-2">
                            {currentConfig.displayTable.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm font-bold bg-white/30 px-3 py-1.5 rounded-lg">
                                <span className="text-[#475569]">{item.range}</span>
                                <span className={item.color}>{item.letter} — {item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bảng Xếp loại GPA */}
                        <div className="bg-white/40 rounded-[1.25rem] p-5 border border-white shadow-sm transition-all hover:bg-white/60">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center border-b-2 border-slate-200/60 pb-3">
                            Xếp loại Bằng
                          </h4>
                          <div className="space-y-2.5">
                            {currentConfig.displayGpaTable.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm font-bold bg-white/30 px-3 py-1.5 rounded-lg">
                                <span className="text-[#475569]">{item.range}</span>
                                <span className={item.color}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* GPA Mục tiêu — Slider động theo thang */}
                  <div>
                    <label className="block text-sm font-semibold mb-4 ml-2" style={{ color: '#475569' }}>
                      GPA Mục tiêu ({currentConfig.label})
                    </label>
                    <div className="flex items-center gap-6 px-2">
                      <input
                        type="range"
                        min="0"
                        max={currentConfig.maxScore}
                        step={currentConfig.step}
                        value={data.targetGpa}
                        onChange={(e) => updateData('targetGpa', parseFloat(e.target.value))}
                        className="flex-1 h-2 rounded-full appearance-none bg-slate-300 outline-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3182ce 0%, #3182ce ${(data.targetGpa / currentConfig.maxScore) * 100}%, #cbd5e1 ${(data.targetGpa / currentConfig.maxScore) * 100}%, #cbd5e1 100%)`
                        }}
                      />
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-col shrink-0" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuRaised }}>
                        <span className="text-lg font-bold text-[#3182ce]">{data.targetGpa.toFixed(currentConfig.step < 0.5 ? 2 : 1)}</span>
                      </div>
                    </div>
                    <p className="text-center text-xs font-semibold mt-4 text-[#64748b]">
                      Gợi ý: {getTargetGpaHint(data.targetGpa, data.gradingScale)}
                    </p>
                  </div>
                </div>
              )}

              {/* ============ SLIDE 3: ĐỒNG BỘ ERP ============ */}
              {currentStep === 3 && (
                <div className="flex flex-col items-center gap-6 text-center py-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: neuRaised }}>
                      <ArrowsClockwise size={40} weight="bold" color="#3182ce" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Student size={24} weight="fill" color="#1e293b" />
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-[#1e293b] font-['Be Vietnam Pro'] mb-2">
                      Đồng bộ dữ liệu ERP
                    </h2>
                    <p className="text-sm font-medium text-[#64748b] max-w-sm">
                      Kéo tự động điểm số và lịch học từ hệ thống nhà trường để không phải nhập tay.
                    </p>
                  </div>

                  <button
                    onClick={() => showToast('warning', 'Tính năng này đang được phát triển, vui lòng thử lại sau!')}
                    className="w-full py-4 rounded-2xl text-sm font-bold transition-all mt-4 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--neu-bg)', color: '#3182ce', boxShadow: neuRaised }}
                  >
                    Đồng bộ ngay bây giờ
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={back}
              disabled={currentStep === 1 || saving}
              className="px-6 py-3.5 text-sm font-bold rounded-[14px] transition-all disabled:opacity-0 disabled:pointer-events-none hover:scale-105 active:scale-95 cursor-pointer"
              style={{ color: '#64748b' }}
            >
              ← Quay lại
            </button>
            <button
              onClick={next}
              disabled={saving}
              className="px-8 py-3.5 text-sm font-bold rounded-[14px] transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: '#3182ce', color: '#ffffff', boxShadow: '4px 4px 10px #2563a0' }}
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (currentStep === 3 ? 'Bỏ qua & Hoàn tất' : 'Tiếp tục')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
