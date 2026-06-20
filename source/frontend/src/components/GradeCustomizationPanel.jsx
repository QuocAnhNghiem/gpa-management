import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Palette, Image as ImageIcon, TextAa } from '@phosphor-icons/react';
import * as userService from '../api/userService';
import { API_BASE_URL } from '../api/apiClient';

const THEME_COLORS = [
  '#3a628a', '#2e5a3c', '#1f3c5c', '#4a3728', 
  '#dc2626', '#ea580c', '#d97706', '#65a30d',
  '#059669', '#0d9488', '#0284c7', '#2563eb',
  '#4f46e5', '#7c3aed', '#c026d3', '#e11d48'
];

export default function GradeCustomizationPanel({ gradeCustomization, setGradeCustomization, onClose, showToast }) {
  const [activeYear, setActiveYear] = useState(1);
  const saveTimeout = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleChange = (field, value) => {
    const newCust = {
      ...gradeCustomization,
      [`year${activeYear}`]: {
        ...(gradeCustomization?.[`year${activeYear}`] || {}),
        [field]: value
      }
    };
    setGradeCustomization(newCust);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await userService.updateProfile({ gradeCustomization: newCust });
      } catch (err) {
        showToast('error', 'Lỗi khi lưu tùy chỉnh: ' + err.message);
      }
    }, 800);
  };

  const currentSettings = gradeCustomization?.[`year${activeYear}`] || {};

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-sm h-full bg-[#eaebee] shadow-2xl border-l border-white flex flex-col"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-customization-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-300/40 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
              <Palette size={20} weight="fill" />
            </div>
            <h2 id="grade-customization-title" className="text-xl font-black text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>Cá nhân hóa</h2>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors" aria-label="Đóng bảng cá nhân hóa">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Year Selector */}
        <div className="p-4 grid grid-cols-4 gap-2 border-b border-slate-300/40">
          {[1, 2, 3, 4].map(y => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={`py-2 text-sm font-bold rounded-xl transition-all ${activeYear === y ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
            >
              Năm {y}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 scrollbar-hide">
          
          {/* Colors */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
              <Palette size={18} weight="fill" /> Màu chủ đạo
            </div>
            <div className="grid grid-cols-8 gap-2">
              {THEME_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleChange('color', color)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm relative flex items-center justify-center"
                  style={{ backgroundColor: color, borderColor: currentSettings.color === color ? '#1e293b' : 'transparent' }}
                >
                  {currentSettings.color === color && <div className="w-2 h-2 bg-white rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
              <ImageIcon size={18} weight="fill" /> Ảnh bìa
            </div>
            <div className="flex flex-col gap-2">
              {currentSettings.imageUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200">
                  <img src={currentSettings.imageUrl.startsWith('http') ? currentSettings.imageUrl : `${API_BASE_URL}${currentSettings.imageUrl}`} alt="Cover" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleChange('imageUrl', '')}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                    aria-label="Xóa ảnh bìa"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const res = await userService.uploadImage(file);
                    if (res && res.url) {
                      handleChange('imageUrl', res.url);
                    }
                  } catch (err) {
                    showToast('error', err.message);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 focus:outline-none focus:border-blue-500 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Slogan */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
              <TextAa size={18} weight="fill" /> Câu châm ngôn
            </div>
            <textarea
              value={currentSettings.slogan || ''}
              onChange={e => handleChange('slogan', e.target.value)}
              placeholder='VD: "Focus on progress, not perfection."'
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 focus:outline-none focus:border-blue-500 shadow-sm resize-none h-24"
              style={{ fontFamily: "'Itim', cursive" }}
            />
          </div>

          {/* SubQuote */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
              <TextAa size={18} weight="fill" /> Mục tiêu ngắn
            </div>
            <input
              type="text"
              value={currentSettings.subQuote || ''}
              onChange={e => handleChange('subQuote', e.target.value)}
              placeholder="VD: Every effort counts!"
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 focus:outline-none focus:border-blue-500 shadow-sm"
              style={{ fontFamily: "'Itim', cursive" }}
            />
          </div>

        </div>
      </motion.div>
    </div>
  );
}
