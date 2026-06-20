import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PushPin,
  Trash,
  Plus,
  MagnifyingGlass,
  Palette,
  
  Tag as TagIcon,
  X,
  
  Warning
} from '@phosphor-icons/react';
import { getNotes, createNote, updateNote, deleteNote } from '../api/noteService';
import { useToast } from '../context/ToastContext';

const COLORS = [
  { id: 'yellow', bg: '#fef3c7', border: '#fde68a', text: '#78350f', lightText: '#92400e', name: 'Vàng' },
  { id: 'pink',   bg: '#fce7f3', border: '#fbcfe8', text: '#831843', lightText: '#9d174d', name: 'Hồng' },
  { id: 'green',  bg: '#dcfce7', border: '#bbf7d0', text: '#064e3b', lightText: '#166534', name: 'Xanh lá' },
  { id: 'blue',   bg: '#dbeafe', border: '#bfdbfe', text: '#1e3a8a', lightText: '#1e40af', name: 'Xanh dương' },
];

const FONTS = [
  { id: 'Be Vietnam Pro', name: 'Outfit (Modern)', class: "font-['Be Vietnam Pro']" },
  { id: 'Caveat', name: 'Caveat (Handwriting)', class: "font-['Caveat']" },
  { id: 'Roboto Mono', name: 'Roboto Mono', class: "font-['Roboto_Mono']" },
  { id: 'Merriweather', name: 'Merriweather (Serif)', class: "font-['Merriweather']" }
];

// Font Family Map từ Google Fonts — lazy load khi user chọn lần đầu
const FONT_GOOGLE_URLS = {
  'Caveat': 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',
  'Roboto Mono': 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap',
  'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
};

function lazyLoadFont(fontId) {
  const url = FONT_GOOGLE_URLS[fontId];
  if (!url) return; // Outfit đã có trong index.html
  const linkId = `gfont-${fontId.replace(/\s/g, '-')}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

const neuR = '0 12px 36px rgba(182,167,230,0.12)';
const neuI = 'inset 0 2px 4px rgba(169,157,226,0.18)';
const neuInsetDeep = 'inset 0 4px 8px rgba(169,157,226,0.22)';

export default function NotesPage() {
  const { showToast } = useToast();
  const [notes, setNotes] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null); // tag filter
  const [sortMode, setSortMode] = useState('newest'); // newest | oldest | byColor | byName

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isEmptyNoteConfirm, setIsEmptyNoteConfirm] = useState(false); // popup xóa note rỗng
  const [emptyNoteDraft, setEmptyNoteDraft] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await getNotes();
        if (res.success) {
          setNotes(res.data);
        }
      } catch {
        showToast('error', 'Không thể tải ghi chú');
      }
    };
    fetchNotes();
  }, [showToast]);

  const handleAddNote = async () => {
    const newNote = {
      title: 'Ghi chú mới',
      content: 'Nhấn đúp để chỉnh sửa nội dung...',
      colorId: COLORS[Math.floor(Math.random() * COLORS.length)].id,
      fontFamily: 'Be Vietnam Pro', // mặc định đúng với FONTS list
      tags: [],
      isPinned: false,
    };
    try {
      const res = await createNote(newNote);
      if (res.success) {
        setNotes(prev => [res.data, ...prev]);
        showToast('success', 'Đã tạo ghi chú mới');
      }
    } catch {
      showToast('error', 'Không thể tạo ghi chú');
    }
  };

  const confirmDeleteNote = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteNote(deleteConfirmId);
      setNotes((prev) => prev.filter((note) => note._id !== deleteConfirmId));
      if (editingNoteId === deleteConfirmId) setEditingNoteId(null);
      showToast('success', 'Đã xóa ghi chú');
    } catch {
      showToast('error', 'Không thể xóa ghi chú');
    }
    setDeleteConfirmId(null);
    setEmptyNoteDraft(null);
  };

  const keepEmptyNote = async () => {
    if (!emptyNoteDraft) return;
    try {
      const res = await updateNote(emptyNoteDraft.id, {
        title: emptyNoteDraft.title,
        content: ''
      });
      if (res.success) {
        setNotes(prev => prev.map(n => n._id === emptyNoteDraft.id ? res.data : n));
      }
    } catch {
      showToast('error', 'Không thể giữ ghi chú trống');
    } finally {
      setDeleteConfirmId(null);
      setIsEmptyNoteConfirm(false);
      setEmptyNoteDraft(null);
    }
  };

  const handleTogglePin = async (id) => {
    const note = notes.find(n => n._id === id);
    if (!note) return;
    try {
      const res = await updateNote(id, { isPinned: !note.isPinned });
      if (res.success) {
        setNotes(prev => prev.map(n => n._id === id ? res.data : n));
        showToast('success', note.isPinned ? 'Đã bỏ ghim' : 'Đã ghim ghi chú');
      }
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    }
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id) => {
    const trimmedTitle = editTitle.trim();
    const trimmedContent = editContent.trim();

    if (trimmedContent === '') {
      // Hiện popup riêng cho note rỗng, cho phép user giữ lại hoặc xóa
      setEmptyNoteDraft({
        id,
        title: trimmedTitle || 'Không có tiêu đề',
        content: ''
      });
      setDeleteConfirmId(id);
      setIsEmptyNoteConfirm(true);
      setEditingNoteId(null);
      return;
    }

    try {
      const res = await updateNote(id, { title: trimmedTitle || 'Không có tiêu đề', content: trimmedContent });
      if (res.success) {
        setNotes(prev => prev.map(n => n._id === id ? res.data : n));
      }
    } catch {
      showToast('error', 'Lỗi khi lưu ghi chú');
    }
    setEditingNoteId(null);
  };

  const handleUpdateNoteField = async (id, fieldName, value) => {
    // Lazy load Google Font nếu đang cập nhật fontFamily
    if (fieldName === 'fontFamily') {
      lazyLoadFont(value);
    }
    try {
      const res = await updateNote(id, { [fieldName]: value });
      if (res.success) {
        setNotes(prev => prev.map(n => n._id === id ? res.data : n));
      }
    } catch {
      showToast('error', 'Có lỗi xảy ra');
    }
  };

  // Lấy tất cả tags từ notes
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];

  // Filter + Sort notes
  const filteredNotes = notes
    .filter((note) => {
      const titleStr = note.title || "";
      const contentStr = note.content || "";
      const matchesSearch =
        titleStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contentStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesColor =
        selectedColorFilter === 'all' || note.colorId === selectedColorFilter;
      const matchesTag =
        !selectedTag || (note.tags && note.tags.includes(selectedTag));
      return matchesSearch && matchesColor && matchesTag;
    })
    .sort((a, b) => {
      // Pin lên đầu luôn
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      // Sort theo mode
      if (sortMode === 'newest') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      if (sortMode === 'oldest') return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
      if (sortMode === 'byColor') return (a.colorId || '').localeCompare(b.colorId || '');
      if (sortMode === 'byName') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

  return (
    <div className="h-full min-h-0 flex flex-col overflow-visible px-4 pt-4 pb-4 gap-6 bg-[rgba(235,232,246,0.3)]">
      {/* Header & Controls */}
      <div className="flex-shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/assets/notes/icon.png" alt="Note Sticker" className="w-24 h-24 object-contain drop-shadow-xl" />
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              Ghi chú cá nhân
            </h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">
              Ghim và lưu trữ thông tin học tập hàng ngày
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search bar */}
          <div className="flex items-center px-5 h-12 w-64 rounded-2xl transition-all bg-[rgba(255,255,255,0.8)]" style={{ boxShadow: neuInsetDeep }}>
            <MagnifyingGlass size={20} color="#64748b" className="mr-3" weight="bold" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none"
            />
          </div>

          {/* Color Filter Selector */}
          <div className="flex items-center gap-2 px-4 h-12 rounded-2xl bg-[rgba(255,255,255,0.8)]" style={{ boxShadow: neuR }}>
            <button
              onClick={() => setSelectedColorFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                selectedColorFilter === 'all'
                  ? 'bg-slate-700 text-white shadow-inner scale-95'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            {COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColorFilter(color.id)}
                className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                  selectedColorFilter === color.id ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: color.bg }}
                title={color.name}
              />
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 px-4 h-12 rounded-2xl bg-[rgba(255,255,255,0.8)]" style={{ boxShadow: neuR }}>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="newest">↓ Mới nhất</option>
              <option value="oldest">↑ Cũ nhất</option>
              <option value="byColor">Theo màu</option>
              <option value="byName">Theo tên</option>
            </select>
          </div>

          {/* Add Note Button */}
          <button
            onClick={handleAddNote}
            className="flex items-center gap-2 px-6 h-12 rounded-2xl text-white font-extrabold text-sm transition-transform active:scale-[0.97]"
            style={{
              backgroundColor: '#3b82f6',
              boxShadow: '4px 4px 10px rgba(59, 130, 246, 0.4), inset -2px -2px 6px rgba(0,0,0,0.1), inset 2px 2px 6px rgba(255,255,255,0.3)',
            }}
          >
            <Plus size={18} weight="bold" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Pinboard Area */}
      <div
        className="flex-1 min-h-0 rounded-[2.5rem] p-6 lg:p-8 overflow-auto scrollbar-hide relative bg-[rgba(255,255,255,0.8)]"
        style={{ boxShadow: neuI }}
      >

        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5 relative z-10">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                selectedTag === null ? 'bg-slate-700 text-white' : 'bg-white/60 text-slate-500 hover:bg-white'
              }`}
            >
              Tất cả
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                  selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-white/60 text-slate-500 hover:bg-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70 py-20 relative z-10">
            <Palette size={64} weight="duotone" color="#64748b" className="mb-4 animate-pulse" />
            <h3 className="text-xl font-extrabold text-slate-600 uppercase tracking-widest" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              Bảng ghim trống
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-2 max-w-sm">
              Chưa có ghi chú nào. Hãy tạo một ghi chú mới để bắt đầu lưu trữ.
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8 relative z-10 items-start auto-rows-max"
          >
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note) => (
                <StickyNote
                  key={note._id}
                  note={note}
                  isEditing={editingNoteId === note._id}
                  editTitle={editTitle}
                  editContent={editContent}
                  setEditTitle={setEditTitle}
                  setEditContent={setEditContent}
                  onStartEdit={() => handleStartEdit(note)}
                  onSaveEdit={() => handleSaveEdit(note._id)}
                  onTogglePin={() => handleTogglePin(note._id)}
                  onDelete={() => { setDeleteConfirmId(note._id); setIsEmptyNoteConfirm(false); }}
                  onUpdateField={handleUpdateNoteField}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>


      {/* Modal Confirm Delete — 2 dạng: xóa note rỗng vs xóa note có nội dung */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setDeleteConfirmId(null); setIsEmptyNoteConfirm(false); setEmptyNoteDraft(null); }} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative rounded-[2rem] p-8 bg-[rgba(255,255,255,0.8)] max-w-sm w-full flex flex-col gap-5 items-center text-center z-10"
              style={{ boxShadow: neuR }}
            >
              <Warning size={48} weight="duotone" color={isEmptyNoteConfirm ? '#d97706' : '#dc2626'} />
              <h3 className="text-xl font-black text-slate-800">
                {isEmptyNoteConfirm ? 'Xóa ghi chú trống này?' : 'Xóa ghi chú?'}
              </h3>
              <p className="text-sm font-bold text-slate-500">
                {isEmptyNoteConfirm
                  ? 'Ghi chú này đang trống. Bạn có muốn xóa nó hay giữ lại (trống)?'
                  : 'Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa ghi chú này không?'
                }
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={confirmDeleteNote}
                  className="flex-1 py-3 rounded-xl text-sm font-black bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
                  Xóa
                </button>
                <button onClick={() => { 
                    if (isEmptyNoteConfirm) {
                      keepEmptyNote();
                    } else {
                      setDeleteConfirmId(null); 
                      setIsEmptyNoteConfirm(false); 
                      setEmptyNoteDraft(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-black bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer">
                  {isEmptyNoteConfirm ? 'Giữ lại' : 'Hủy'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StickyNote({
  note, isEditing, editTitle, editContent, setEditTitle, setEditContent,
  onStartEdit, onSaveEdit, onTogglePin, onDelete, onUpdateField
}) {
  const colorConfig = COLORS.find((c) => c.id === note.colorId) || COLORS[0];
  const [showOptions, setShowOptions] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editContent, isEditing]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!note.tags.includes(newTag)) {
        onUpdateField(note._id, 'tags', [...note.tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    onUpdateField(note._id, 'tags', note.tags.filter(t => t !== tagToRemove));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, rotate: (note._id.charCodeAt(note._id.length - 1) % 5) - 2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: 15 }}
      transition={{ duration: 0.3 }}
      className={`rounded-br-3xl p-6 relative flex flex-col min-h-[260px] group transition-shadow shadow-md hover:shadow-xl hover:-translate-y-1 ${showOptions ? 'z-50' : 'z-10 hover:z-50'}`}
      style={{
        backgroundColor: colorConfig.bg,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
        backgroundSize: '100% 28px',
        backgroundPositionY: '50px',
      }}
    >
      {/* Skewomorphic Pin */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 transition-transform group-hover:scale-110">
        <div
          className="w-5 h-5 rounded-full"
          style={{
            background: note.isPinned
              ? 'radial-gradient(circle at 35% 35%, #ef4444, #991b1b)'
              : 'radial-gradient(circle at 35% 35%, #94a3b8, #475569)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)',
          }}
        />
        <div className="w-0.5 h-3 mx-auto shadow-sm" style={{ backgroundColor: '#64748b' }} />
      </div>

      {/* Card Actions */}
      <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button onClick={onTogglePin} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/60 hover:bg-white text-slate-700 shadow-sm transition-all cursor-pointer backdrop-blur-sm" title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}>
          <PushPin size={16} weight={note.isPinned ? 'fill' : 'bold'} className={note.isPinned ? 'text-red-500' : ''} />
        </button>
        <button onClick={onDelete} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/60 hover:bg-red-500 hover:text-white text-slate-700 shadow-sm transition-all cursor-pointer backdrop-blur-sm" title="Xóa ghi chú">
          <Trash size={16} weight="bold" />
        </button>
      </div>

      {/* Title */}
      <div className="mt-5 mb-3 z-10 font-[Outfit]">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-white/50 px-2 py-1 rounded-lg font-black text-lg focus:outline-none border-b-2 border-dashed border-slate-300"
            style={{ color: colorConfig.text }}
          />
        ) : (
          <h4
            onDoubleClick={onStartEdit}
            className="font-black text-lg tracking-tight cursor-text select-none line-clamp-2 px-1"
            style={{ color: colorConfig.text }}
          >
            {note.title}
          </h4>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 z-10 relative">
        {isEditing ? (
          <div className="flex flex-col h-full gap-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white/40 p-2 rounded-xl text-base leading-[28px] resize-none focus:outline-none min-h-[120px]"
              style={{ color: colorConfig.text, fontFamily: `"${note.fontFamily || 'Itim'}", sans-serif` }}
            />
            <div className="flex justify-end mt-auto pt-2">
              <button onClick={onSaveEdit} className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-600 transition-colors">
                Xong
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <p
              onDoubleClick={onStartEdit}
              className="text-base leading-[28px] whitespace-pre-wrap cursor-text select-none flex-1 px-1"
              style={{ color: colorConfig.text, fontFamily: `"${note.fontFamily || 'Itim'}", sans-serif` }}
            >
              {note.content}
            </p>
            {/* Tags display */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dashed" style={{ borderColor: colorConfig.border }}>
                {note.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/50" style={{ color: colorConfig.text }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tool Bar (Color, Font, Tags) */}
      <div className="mt-4 flex items-center justify-between z-20">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: colorConfig.lightText }}>
          {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
        </span>

        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/40 hover:bg-white/80 transition-colors cursor-pointer"
            style={{ color: colorConfig.text }}
          >
            <Palette size={16} weight="bold" />
          </button>

          {/* Options Popover */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute bottom-full right-0 mb-3 p-4 rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col gap-3 w-[340px] z-50 text-slate-800"
              >
                {/* Options Header & Colors */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Màu sắc</span>
                    <div className="flex items-center gap-1">
                      {COLORS.map((c) => (
                        <button key={c.id} onClick={() => onUpdateField(note._id, 'colorId', c.id)}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${note.colorId === c.id ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                          style={{ backgroundColor: c.bg }} title={c.name} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setShowOptions(false)} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer self-start">
                    <X size={12} weight="bold" />
                  </button>
                </div>

                {/* Fonts & Tags 2 Columns */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Left Column: Fonts */}
                  <div className="flex flex-col gap-1 border-r border-slate-100 pr-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Font chữ</span>
                    <div className="flex flex-col gap-0.5 max-h-[100px] overflow-y-auto pr-1">
                      {FONTS.map(f => (
                        <button key={f.id} onClick={() => onUpdateField(note._id, 'fontFamily', f.id)}
                          className={`text-[10px] px-2 py-1 rounded-md text-left transition-colors truncate ${note.fontFamily === f.id ? 'bg-slate-100 font-bold text-slate-800' : 'text-slate-500 hover:bg-slate-50'} ${f.class}`}>
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Tags */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tags</span>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-200">
                      <TagIcon size={10} className="text-slate-400" />
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="Thêm tag" className="bg-transparent text-[10px] font-bold text-slate-700 w-full focus:outline-none py-0.5" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1 max-h-[60px] overflow-y-auto">
                      {note.tags && note.tags.map(t => (
                        <span key={t} className="flex items-center gap-1 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {t}
                          <X size={8} weight="bold" className="cursor-pointer hover:text-red-500" onClick={() => handleRemoveTag(t)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Folded corner (3D effect) */}
      <div
        className="absolute bottom-0 right-0 w-8 h-8 rounded-tl-lg transition-all duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${colorConfig.bg} 0%, ${colorConfig.bg} 40%, rgba(0,0,0,0.1) 50%, transparent 50%)`,
          boxShadow: '-2px -2px 5px rgba(0,0,0,0.05)',
        }}
      />
    </motion.div>
  );
}
