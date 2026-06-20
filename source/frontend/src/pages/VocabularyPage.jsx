import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  SpeakerHigh,
  Cards,
  PencilSimple,
  Trash,
  X,
  CheckCircle,
  ClockCounterClockwise,
  TextAa,
  SpeakerLow,
  Tag,
  BookOpen,
  Bookmarks,
  ArrowsLeftRight,
  ShieldCheck,
  Wrench,
  Check
} from '@phosphor-icons/react';
import {
  getVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  updateVocabularyStatus,
  getFlashcards
} from '../api/vocabularyService';
import { useToast } from '../context/ToastContext';

const neuR = '0 12px 36px rgba(182,167,230,0.12)';
const neuI = 'inset 0 2px 4px rgba(169,157,226,0.18)';
const neuInsetDeep = 'inset 0 4px 8px rgba(169,157,226,0.22)';

const playAudio = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

export default function VocabularyPage() {
  const { showToast } = useToast();
  
  const [vocabularies, setVocabularies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  
  // States cho Form Inline
  const [editingId, setEditingId] = useState(null); // ID của từ đang sửa (null = thêm mới)
  const defaultForm = {
    word: '', phonetic: '', partOfSpeech: '', meaning: '',
    synonyms: '', antonyms: '', example: '', topic: 'General', status: 'new'
  };
  const [formData, setFormData] = useState(defaultForm);

  // States cho Flashcard
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardDirection, setFlashcardDirection] = useState('random');
  const [currentDirection, setCurrentDirection] = useState('en-vi');
  const [reviewStats, setReviewStats] = useState({ remembered: 0, reviewing: 0 });

  const fetchVocabularies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVocabularies();
      if (data.success) {
        setVocabularies(data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách từ vựng:", err);
      showToast('error', `Lỗi khi tải danh sách từ vựng: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchVocabularies();
  }, [fetchVocabularies]);

  const filteredVocabularies = useMemo(() => {
    return vocabularies.filter(v => {
      const matchSearch = v.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.meaning.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTopic = selectedTopic === 'all' || v.topic === selectedTopic;
      return matchSearch && matchTopic;
    });
  }, [vocabularies, searchQuery, selectedTopic]);

  const allTopics = useMemo(() => {
    const topics = new Set(vocabularies.map(v => v.topic));
    return ['General', ...Array.from(topics).filter(t => t !== 'General')];
  }, [vocabularies]);

  const stats = useMemo(() => {
    const total = vocabularies.length;
    const mastered = vocabularies.filter(v => v.status === 'mastered').length;
    const learning = vocabularies.filter(v => v.status === 'learning').length;
    const newWords = vocabularies.filter(v => v.status === 'new' || !v.status).length;
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, learning, newWords, masteryRate };
  }, [vocabularies]);

  // XỬ LÝ LƯU (THÊM / SỬA) INLINE
  const handleSaveVocab = async () => {
    if (!formData.word || !formData.meaning) {
      showToast('error', 'Vui lòng nhập ít nhất Từ vựng và Nghĩa');
      return;
    }
    try {
      if (editingId) {
        await updateVocabulary(editingId, formData);
        showToast('success', 'Cập nhật từ vựng thành công');
      } else {
        await createVocabulary(formData);
        showToast('success', 'Thêm từ vựng thành công');
      }
      setEditingId(null);
      setFormData(defaultForm);
      await fetchVocabularies(); // Cập nhật dữ liệu ngay lập tức
    } catch (err) {
      showToast('error', err.message || 'Có lỗi xảy ra khi lưu từ vựng');
    }
  };

  const handleEditClick = (v) => {
    setEditingId(v._id);
    setFormData({
      word: v.word || '',
      phonetic: v.phonetic || '',
      partOfSpeech: v.partOfSpeech || '',
      meaning: v.meaning || '',
      synonyms: v.synonyms || '',
      antonyms: v.antonyms || '',
      example: v.example || '',
      topic: v.topic || 'General',
      status: v.status || 'new'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(defaultForm);
  };

  const handleDeleteVocab = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa từ vựng này không?")) {
      try {
        await deleteVocabulary(id);
        showToast('success', 'Đã xóa từ vựng');
        fetchVocabularies();
      } catch (err) {
        showToast('error', err.message || 'Lỗi khi xóa từ vựng');
      }
    }
  };

  // LOGIC FLASHCARD
  const startFlashcardSession = async () => {
    try {
      const filterTopic = selectedTopic === 'all' ? '' : selectedTopic;
      const data = await getFlashcards(filterTopic);
      if (data.success && data.data.length > 0) {
        setFlashcards(data.data);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setReviewStats({ remembered: 0, reviewing: 0 });
        determineCardDirection(flashcardDirection);
        setIsFlashcardMode(true);
      } else {
        showToast('error', 'Không có từ vựng nào để ôn tập trong chủ đề này');
      }
    } catch {
      showToast('error', 'Lỗi khi lấy danh sách Flashcard');
    }
  };

  const determineCardDirection = (direction = flashcardDirection) => {
    if (direction === 'random') {
      setCurrentDirection(Math.random() > 0.5 ? 'en-vi' : 'vi-en');
    } else {
      setCurrentDirection(direction);
    }
  };

  const handleDirectionChange = (direction) => {
    setFlashcardDirection(direction);
    determineCardDirection(direction);
    setIsFlipped(false);
  };

  const handleFlipCard = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    const currentCard = flashcards[currentCardIndex];
    if (currentCard && currentDirection === 'vi-en' && nextFlipped) {
      playAudio(currentCard.word);
    }
  };

  useEffect(() => {
    if (isFlashcardMode && flashcards.length > 0 && !isFlipped && currentDirection === 'en-vi') {
      playAudio(flashcards[currentCardIndex].word);
    }
  }, [currentCardIndex, isFlashcardMode, currentDirection, flashcards, isFlipped]);

  const handleNextCard = (stats = reviewStats) => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      determineCardDirection();
    } else {
      showToast('success', `Hoàn thành: nhớ ${stats.remembered}, cần ôn lại ${stats.reviewing}`);
      setIsFlashcardMode(false);
      fetchVocabularies();
    }
  };

  const handleMarkStatus = async (status) => {
    const currentCard = flashcards[currentCardIndex];
    try {
      await updateVocabularyStatus(currentCard._id, status);
      const nextStats = {
        remembered: reviewStats.remembered + (status === 'mastered' ? 1 : 0),
        reviewing: reviewStats.reviewing + (status === 'learning' ? 1 : 0),
      };
      setReviewStats(nextStats);
      if (status === 'learning') {
        setFlashcards(prev => [...prev, currentCard]);
      }
      handleNextCard(nextStats);
    } catch {
      showToast('error', 'Có lỗi xảy ra khi lưu trạng thái');
    }
  };

  const closeFlashcard = () => {
    setIsFlashcardMode(false);
    fetchVocabularies();
  };

  const renderFlashcard = () => {
    if (flashcards.length === 0) return null;
    const card = flashcards[currentCardIndex];
    const showEnglishFront = currentDirection === 'en-vi';

    const clayShadowCard = '0 32px 64px rgba(182,167,230,0.3), inset 0 2px 6px rgba(255,255,255,0.9), inset 0 -6px 16px rgba(182,167,230,0.15)';
    const clayShadowButton = '0 12px 24px rgba(182,167,230,0.25), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -4px 8px rgba(182,167,230,0.15)';

    const frontContent = showEnglishFront ? (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <h2 className="text-[5rem] font-black text-slate-800 mb-4 bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-600">{card.word}</h2>
        <p className="text-3xl text-slate-400 font-bold mb-10 tracking-wide">{card.phonetic}</p>
        <button 
          onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}
          className="w-24 h-24 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.9)] hover:bg-white transition-all active:scale-95 group"
          style={{ boxShadow: clayShadowButton }}
        >
          <SpeakerHigh size={44} weight="fill" className="text-blue-500 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <h2 className="text-[4rem] font-black text-slate-800 mb-6 leading-tight">{card.meaning}</h2>
        <p className="text-xl text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-6 py-2 rounded-full shadow-inner">{card.topic}</p>
      </div>
    );

    const backContent = showEnglishFront ? (
      <div className="flex flex-col h-full text-left p-12 justify-center">
        <span className="text-lg font-black text-indigo-500 uppercase tracking-widest mb-4 bg-indigo-50 inline-block px-4 py-1.5 rounded-full w-max shadow-inner">{card.partOfSpeech}</span>
        <h2 className="text-6xl font-black text-slate-800 mb-8 leading-tight">{card.meaning}</h2>
        {card.example && (
          <div className="mt-4 p-8 rounded-3xl bg-[rgba(255,255,255,0.6)] border border-white shadow-sm">
            <p className="text-2xl text-slate-600 font-medium italic leading-relaxed">"{card.example}"</p>
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col h-full text-center p-12 justify-center items-center">
        <h2 className="text-[5rem] font-black text-slate-800 mb-4 bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-600">{card.word}</h2>
        <p className="text-3xl text-slate-400 font-bold mb-8 tracking-wide">{card.phonetic}</p>
        <button 
          onClick={(e) => { e.stopPropagation(); playAudio(card.word); }}
          className="w-24 h-24 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.9)] hover:bg-white transition-all active:scale-95 mb-8 group"
          style={{ boxShadow: clayShadowButton }}
        >
          <SpeakerHigh size={44} weight="fill" className="text-blue-500 group-hover:text-blue-600 transition-colors" />
        </button>
        {card.example && <p className="text-xl text-slate-500 italic mt-4 max-w-2xl leading-relaxed">"{card.example}"</p>}
      </div>
    );

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(235,232,246,0.5)] backdrop-blur-xl"
      >
        <button onClick={closeFlashcard} className="absolute top-10 right-10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-[rgba(255,255,255,0.9)] text-slate-500 hover:text-red-500 transition-all active:scale-95" style={{ boxShadow: clayShadowButton }}>
          <X size={32} weight="bold" />
        </button>

        <div className="absolute top-10 left-10 flex items-center gap-6">
          <div className="flex items-center p-2 rounded-2xl bg-[rgba(255,255,255,0.9)]" style={{ boxShadow: clayShadowButton }}>
            <button 
              onClick={() => handleDirectionChange('en-vi')}
              className={`px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${flashcardDirection === 'en-vi' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >Anh - Việt</button>
            <button 
              onClick={() => handleDirectionChange('vi-en')}
              className={`px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${flashcardDirection === 'vi-en' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >Việt - Anh</button>
            <button 
              onClick={() => handleDirectionChange('random')}
              className={`px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${flashcardDirection === 'random' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >Ngẫu nhiên</button>
          </div>
          <div className="flex flex-col gap-1 bg-[rgba(255,255,255,0.9)] px-6 py-3 rounded-2xl" style={{ boxShadow: clayShadowButton }}>
            <span className="text-lg font-black text-slate-700">
              Thẻ {currentCardIndex + 1} / {flashcards.length}
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-bold text-emerald-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"/> Nhớ: {reviewStats.remembered}</span>
              <span className="font-bold text-amber-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"/> Cần ôn: {reviewStats.reviewing}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-12 w-full max-w-5xl px-4">
          <div className="relative w-full aspect-[16/9] perspective-1000 cursor-pointer group" onClick={handleFlipCard}>
            <motion.div
              className="w-full h-full relative preserve-3d"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 150, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 backface-hidden rounded-[3.5rem] bg-[rgba(255,255,255,0.95)] border-4 border-white/80 transition-transform group-hover:scale-[1.02]" style={{ backfaceVisibility: 'hidden', boxShadow: clayShadowCard }}>
                {frontContent}
              </div>
              <div className="absolute inset-0 backface-hidden rounded-[3.5rem] bg-[rgba(255,255,255,0.95)] border-4 border-white/80 transition-transform group-hover:scale-[1.02]" style={{ backfaceVisibility: 'hidden', boxShadow: clayShadowCard, transform: 'rotateY(180deg)' }}>
                {backContent}
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {isFlipped && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="flex items-center gap-8">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkStatus('learning'); }}
                  className="px-12 py-6 rounded-[2rem] flex items-center gap-4 bg-[rgba(255,255,255,0.9)] text-red-500 font-black hover:text-red-600 transition-all active:scale-95 text-xl group"
                  style={{ boxShadow: clayShadowButton }}
                >
                  <ClockCounterClockwise size={32} weight="bold" className="group-hover:-rotate-45 transition-transform" />
                  Chưa thuộc
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkStatus('mastered'); }}
                  className="px-12 py-6 rounded-[2rem] flex items-center gap-4 bg-[rgba(255,255,255,0.9)] text-emerald-500 font-black hover:text-emerald-600 transition-all active:scale-95 text-xl group"
                  style={{ boxShadow: clayShadowButton }}
                >
                  <CheckCircle size={32} weight="fill" className="group-hover:scale-110 transition-transform" />
                  Đã nhớ
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-visible px-4 pt-4 pb-4 gap-6 bg-[rgba(235,232,246,0.3)]">
      <AnimatePresence>{isFlashcardMode && renderFlashcard()}</AnimatePresence>
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/assets/vocabulary/icon.png" alt="Vocab Sticker" className="w-24 h-24 object-contain drop-shadow-xl" />
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              Từ vựng
            </h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">
              Quản lý và ôn tập từ vựng bằng Flashcard
            </p>
          </div>
        </div>

        {/* Stats Chart */}
        <div className="flex items-center gap-5 bg-[rgba(255,255,255,0.7)] px-5 py-3 rounded-[2rem] border border-white/60 backdrop-blur-md" style={{ boxShadow: neuR }}>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
              <path className="text-slate-200/80" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-emerald-500" strokeDasharray={`${stats.masteryRate}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[12px] font-black text-slate-700 leading-none">{stats.masteryRate}%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pr-2">
            <div className="flex items-center justify-between gap-4 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600"><span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"/> Đã thuộc</span> <span>{stats.mastered}</span></div>
            <div className="flex items-center justify-between gap-4 text-[11px] font-extrabold uppercase tracking-wider text-amber-500"><span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"/> Đang học</span> <span>{stats.learning}</span></div>
            <div className="flex items-center justify-between gap-4 text-[11px] font-extrabold uppercase tracking-wider text-slate-400"><span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm"/> Mới thêm</span> <span>{stats.newWords}</span></div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 lg:flex-initial">
          {/* Bộ lọc chủ đề */}
          <div className="flex items-center gap-2 px-4 h-16 rounded-2xl bg-[rgba(255,255,255,0.8)]" style={{ boxShadow: neuR }}>
            <select 
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả chủ đề</option>
              {allTopics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          {/* Search bar (Tìm kiếm song ngữ) */}
          <div className="flex items-center px-5 h-16 w-80 rounded-2xl transition-all bg-[rgba(255,255,255,0.8)]" style={{ boxShadow: neuInsetDeep }}>
            <MagnifyingGlass size={22} className="text-slate-500 absolute left-4" weight="bold" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm từ vựng, nghĩa..."
              className="bg-transparent w-full text-base font-bold text-slate-800 focus:outline-none pl-10"
            />
          </div>
        </div>

        <button
          onClick={startFlashcardSession}
          disabled={loading}
          className="h-16 px-8 rounded-2xl bg-[rgba(255,255,255,0.8)] hover:bg-slate-200 text-blue-600 font-black text-base transition-all flex items-center gap-3 border border-white/50"
          style={{ boxShadow: neuR }}
        >
          <Cards size={24} weight="fill" />
          {loading ? 'Đang tải từ vựng...' : 'Bắt đầu ôn tập Flashcard'}
        </button>
      </div>

      {/* Bảng dữ liệu phong cách Excel */}
      <div className="flex-1 min-h-[700px] bg-[rgba(255,255,255,0.8)] rounded-2xl p-4 relative flex flex-col" style={{ boxShadow: neuI }}>
        <div className="flex-1 overflow-auto rounded-xl custom-scrollbar" style={{ paddingBottom: '1rem' }}>
          <table className="w-full text-left border-collapse min-w-[1300px] border border-slate-300 bg-white">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-60">
                  <div className="flex items-center gap-1.5">
                    <TextAa size={18} className="text-blue-600" />
                    <span>Word</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Từ vựng)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-40">
                  <div className="flex items-center gap-1.5">
                    <SpeakerLow size={18} className="text-emerald-600" />
                    <span>Phonetic</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Phiên âm)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-44">
                  <div className="flex items-center gap-1.5">
                    <Bookmarks size={18} className="text-purple-600" />
                    <span>P.O.S</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Loại từ)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-64">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={18} className="text-amber-600" />
                    <span>Meaning</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Nghĩa)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-52">
                  <div className="flex items-center gap-1.5">
                    <ArrowsLeftRight size={18} className="text-rose-600" />
                    <span>Syn/Antonyms</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Đồng/Trái nghĩa)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={18} className="text-orange-600" />
                    <span>Example</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Ví dụ)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 w-44">
                  <div className="flex items-center gap-1.5">
                    <Tag size={18} className="text-teal-600" />
                    <span>Topic</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Chủ đề)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 text-center w-36">
                  <div className="flex items-center justify-center gap-1.5">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <span>Status</span>
                  </div>
                  <div className="text-[10px] lowercase mt-0.5 text-slate-500 font-normal">(Trạng thái)</div>
                </th>
                <th className="p-4 font-extrabold text-sm text-slate-700 uppercase tracking-wider border border-slate-300 text-center w-28">
                  <div className="flex items-center justify-center gap-1.5">
                    <Wrench size={18} className="text-slate-600" />
                    <span>Hành động</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* DÒNG INLINE FORM (THÊM / SỬA) Ở ĐẦU BẢNG */}
              <tr className="bg-sky-50/90 border-b-2 border-sky-300">
                <td className="p-2 border border-slate-300 bg-blue-50/80">
                  <input 
                    type="text" 
                    placeholder="Abundant..." 
                    value={formData.word} 
                    onChange={e => setFormData({...formData, word: e.target.value})} 
                    className="w-full h-12 px-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                </td>
                <td className="p-2 border border-slate-300 bg-emerald-50/80">
                  <input 
                    type="text" 
                    placeholder="/.../" 
                    value={formData.phonetic} 
                    onChange={e => setFormData({...formData, phonetic: e.target.value})} 
                    className="w-full h-12 px-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                </td>
                <td className="p-2 border border-slate-300 bg-purple-50/80">
                  <select 
                    value={formData.partOfSpeech} 
                    onChange={e => setFormData({...formData, partOfSpeech: e.target.value})} 
                    className="w-full h-12 px-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="">-- Loại từ --</option>
                    <option value="Noun">Noun (Danh từ)</option>
                    <option value="Verb">Verb (Động từ)</option>
                    <option value="Adjective">Adjective (Tính từ)</option>
                    <option value="Adverb">Adverb (Trạng từ)</option>
                    <option value="Pronoun">Pronoun (Đại từ)</option>
                    <option value="Preposition">Preposition (Giới từ)</option>
                    <option value="Conjunction">Conjunction (Liên từ)</option>
                    <option value="Interjection">Interjection (Thán từ)</option>
                  </select>
                </td>
                <td className="p-2 border border-slate-300 bg-amber-50/80">
                  <input 
                    type="text" 
                    placeholder="Nghĩa TV..." 
                    value={formData.meaning} 
                    onChange={e => setFormData({...formData, meaning: e.target.value})} 
                    className="w-full h-12 px-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                </td>
                <td className="p-2 border border-slate-300 bg-rose-50/80">
                  <div className="flex flex-col gap-1">
                    <input 
                      type="text" 
                      placeholder="Synonyms..." 
                      value={formData.synonyms} 
                      onChange={e => setFormData({...formData, synonyms: e.target.value})} 
                      className="w-full h-8 px-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                    />
                    <input 
                      type="text" 
                      placeholder="Antonyms..." 
                      value={formData.antonyms} 
                      onChange={e => setFormData({...formData, antonyms: e.target.value})} 
                      className="w-full h-8 px-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                    />
                  </div>
                </td>
                <td className="p-2 border border-slate-300 bg-orange-50/80">
                  <input 
                    type="text" 
                    placeholder="Ví dụ..." 
                    value={formData.example} 
                    onChange={e => setFormData({...formData, example: e.target.value})} 
                    className="w-full h-12 px-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                </td>
                <td className="p-2 border border-slate-300 bg-teal-50/80">
                  <input 
                    type="text" 
                    placeholder="Topic..." 
                    value={formData.topic} 
                    onChange={e => setFormData({...formData, topic: e.target.value})} 
                    className="w-full h-12 px-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" 
                  />
                </td>
                <td className="p-2 border border-slate-300 bg-sky-50/80 text-center">
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full h-12 px-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="new">Mới</option>
                    <option value="learning">Đang học</option>
                    <option value="mastered">Đã thuộc</option>
                  </select>
                </td>
                <td className="p-2 border border-slate-300 text-center bg-slate-50">
                  <div className="flex items-center justify-center gap-1.5">
                    <button 
                      onClick={handleSaveVocab} 
                      className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-95" 
                      title="Lưu"
                    >
                      <Check size={20} weight="bold" />
                    </button>
                    {editingId && (
                      <button 
                        onClick={handleCancelEdit} 
                        className="w-9 h-9 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-700 flex items-center justify-center shadow-sm transition-transform active:scale-95" 
                        title="Hủy"
                      >
                        <X size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {/* LIST DỮ LIỆU */}
              {filteredVocabularies.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-lg font-bold text-slate-500 border border-slate-300 bg-white">
                    Chưa có từ vựng nào. Hãy nhập ở dòng trên!
                  </td>
                </tr>
              ) : (
                filteredVocabularies.map((v) => (
                  <tr 
                    key={v._id} 
                    className={`border-b border-slate-300 hover:bg-slate-50 transition-colors group ${editingId === v._id ? 'bg-amber-100/50' : ''}`}
                  >
                    <td className="p-4 border border-slate-300 bg-blue-50/40 group-hover:bg-blue-100/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => playAudio(v.word)}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-blue-600 hover:bg-blue-100 border border-slate-200 transition-colors flex-shrink-0 shadow-sm"
                        >
                          <SpeakerHigh size={18} weight="fill" />
                        </button>
                        <span className="font-extrabold text-blue-900 text-lg leading-tight">{v.word}</span>
                      </div>
                    </td>
                    <td className="p-4 border border-slate-300 bg-emerald-50/40 group-hover:bg-emerald-100/60 transition-colors font-bold text-emerald-800 text-base">
                      {v.phonetic}
                    </td>
                    <td className="p-4 border border-slate-300 bg-purple-50/40 group-hover:bg-purple-100/60 transition-colors text-center">
                      {v.partOfSpeech ? (
                        <span className="text-xs font-black px-2.5 py-1.5 bg-purple-100 text-purple-800 border border-purple-200 rounded">
                          {v.partOfSpeech}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="p-4 border border-slate-300 bg-amber-50/40 group-hover:bg-amber-100/60 transition-colors font-extrabold text-amber-950 text-base">
                      {v.meaning}
                    </td>
                    <td className="p-4 border border-slate-300 bg-rose-50/40 group-hover:bg-rose-100/60 transition-colors text-xs font-bold text-slate-700">
                      <div className="flex flex-col gap-1.5">
                        {v.synonyms && (
                          <div className="flex items-start gap-1">
                            <span className="font-black text-emerald-600 flex-shrink-0 bg-emerald-100/80 px-1 rounded">S:</span> 
                            <span>{v.synonyms}</span>
                          </div>
                        )}
                        {v.antonyms && (
                          <div className="flex items-start gap-1">
                            <span className="font-black text-rose-600 flex-shrink-0 bg-rose-100/80 px-1 rounded">A:</span> 
                            <span>{v.antonyms}</span>
                          </div>
                        )}
                        {!v.synonyms && !v.antonyms && <span className="text-slate-400 font-bold self-center">-</span>}
                      </div>
                    </td>
                    <td className="p-4 border border-slate-300 bg-orange-50/40 group-hover:bg-orange-100/60 transition-colors text-base font-semibold text-orange-950 italic">
                      {v.example ? `"${v.example}"` : <span className="text-slate-400 font-bold not-italic">-</span>}
                    </td>
                    <td className="p-4 border border-slate-300 bg-teal-50/40 group-hover:bg-teal-100/60 transition-colors font-black text-teal-800 text-xs uppercase tracking-wider text-center">
                      <span className="bg-teal-100 px-2 py-1 rounded border border-teal-200">
                        {v.topic}
                      </span>
                    </td>
                    <td className="p-4 border border-slate-300 bg-sky-50/30 group-hover:bg-sky-100/50 transition-colors text-center">
                      {v.status === 'new' && (
                        <span className="inline-block px-2.5 py-1 rounded text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                          Mới
                        </span>
                      )}
                      {v.status === 'learning' && (
                        <span className="inline-block px-2.5 py-1 rounded text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          Đang học
                        </span>
                      )}
                      {v.status === 'mastered' && (
                        <span className="inline-block px-2.5 py-1 rounded text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                          Đã thuộc
                        </span>
                      )}
                    </td>
                    <td className="p-4 border border-slate-300 text-center bg-slate-50">
                      <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(v)} 
                          className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm" 
                          title="Sửa"
                        >
                          <PencilSimple size={16} weight="bold" />
                        </button>
                        <button 
                          onClick={() => handleDeleteVocab(v._id)} 
                          className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 transition-all shadow-sm" 
                          title="Xóa"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
