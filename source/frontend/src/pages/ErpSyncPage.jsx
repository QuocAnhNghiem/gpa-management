import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowsClockwise,
  Browser,
  CalendarDots,
  CheckCircle,
  ClockCounterClockwise,
  Database,
  GraduationCap,
  WarningCircle,
} from '@phosphor-icons/react';
import { createExtensionToken } from '../api/authService';
import { getUsthErpHistory } from '../api/erpSyncService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const neuR = '0 12px 36px rgba(182,167,230,0.12)';
const clayR = '0 16px 34px rgba(182,167,230,0.18), inset 0 2px 0 rgba(255,255,255,0.95), inset 0 -2px 0 rgba(225,216,248,0.4)';

const statCards = [
  { key: 'subjects', label: 'Bảng điểm', icon: GraduationCap, accent: '#2563eb' },
  { key: 'schedules', label: 'Thời khóa biểu', icon: CalendarDots, accent: '#059669' },
];

export default function ErpSyncPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extensionToken, setExtensionToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUsthErpHistory();
      setHistory(res.data || []);
      window.dispatchEvent(new Event('scheduleUpdated'));
    } catch (error) {
      showToast('error', error.message || 'Không thể tải lịch sử đồng bộ');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHistory();
      }
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, [fetchHistory]);

  const latestSynced = history.find(log => log.status === 'synced');
  const latest = latestSynced || history[0];

  const handleCreateToken = async () => {
    try {
      setTokenLoading(true);
      const res = await createExtensionToken();
      setExtensionToken(res.token);
      showToast('success', 'Đã tạo token extension');
    } catch (error) {
      showToast('error', error.message || 'Không thể tạo token extension');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!extensionToken) return;
    try {
      await navigator.clipboard.writeText(extensionToken);
      showToast('success', 'Đã sao chép token thành công');
    } catch {
      showToast('warning', 'Không thể tự sao chép, hãy bôi đen token để copy thủ công');
    }
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr] overflow-hidden p-5 gap-4 bg-[rgba(235,232,246,0.3)]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/assets/erp/icon.png" alt="ERP Sticker" className="w-16 h-16 object-contain drop-shadow-2xl hover:scale-105 transition-transform" />
          <div>
            <h2 className="text-4xl font-black tracking-tight text-slate-800" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              Đồng bộ ERP USTH
            </h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">
              Đồng bộ bảng điểm và thời khóa biểu trực tiếp từ cổng ERP USTH
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="h-11 px-5 rounded-2xl bg-[rgba(255,255,255,0.8)] text-blue-600 font-black flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 border border-white/80 disabled:opacity-50"
          style={{ boxShadow: neuR }}
        >
          <ArrowsClockwise size={18} weight="bold" className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Main Workspace: 2-Column Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        {/* Left Column: Extension Instructions & Token Generation */}
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col min-h-0 rounded-[2rem] p-5 bg-[rgba(255,255,255,0.7)] border border-white/60 overflow-y-auto custom-scrollbar backdrop-blur-md"
          style={{ boxShadow: clayR }}
        >
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 shadow-neu-inset">
              <Browser size={23} weight="duotone" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Cách sử dụng extension
              </h3>
              <p className="text-xs font-bold text-slate-500">Đọc trực tiếp dữ liệu từ ERP USTH qua Extension an toàn</p>
            </div>
          </div>

          <div className="grid gap-3 shrink-0 my-1">
            {[
              {
                text: 'Cài extension trong thư mục extension bằng Chrome Developer Mode.',
                index: 1
              },
              {
                text: 'Bấm Tạo token extension trong trang này rồi dán token vào popup extension.',
                index: 2
              },
              {
                html: (
                  <span>
                    Đăng nhập ERP USTH, mở trang{' '}
                    <a
                      href="https://erp.usth.edu.vn/students/learn/timetable"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-black transition-all"
                    >
                      Thời khóa biểu
                    </a>{' '}
                    hoặc{' '}
                    <a
                      href="https://erp.usth.edu.vn/students/learn/personal-transcript"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-black transition-all"
                    >
                      Bảng điểm cá nhân
                    </a>
                    .
                  </span>
                ),
                index: 3
              },
              {
                text: 'Bấm Quét dữ liệu trên extension, xem trước rồi bấm Đồng bộ vào GPA.',
                index: 4
              }
            ].map(({ text, html, index }) => (
              <div key={index} className="flex items-start gap-2.5 rounded-[1.25rem] px-4 py-2.5 bg-[rgba(255,255,255,0.85)] shadow-[0_8px_16px_rgba(182,167,230,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] border border-white/60">
                <span className="w-6 h-6 rounded-[10px] bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-[0_4px_8px_rgba(59,130,246,0.3)]">
                  {index}
                </span>
                <p className="text-sm font-bold text-slate-600 leading-relaxed pt-0.5">
                  {html || text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[1.25rem] p-3 bg-amber-50 border border-amber-100 shrink-0 shadow-sm">
            <p className="text-xs font-black text-amber-700 uppercase mb-0.5">Lưu ý thang điểm</p>
            <p className="text-xs font-bold text-amber-800 leading-snug">
              Bảng điểm ERP chỉ đồng bộ khi tài khoản đang ở Thang 20. Thời khóa biểu vẫn đồng bộ được ở mọi hệ.
              {user?.gradingScale === 'scale4' ? ' (Bạn đang dùng Thang 4, hãy đổi sang Thang 20 trong Cài đặt để đồng bộ điểm).' : ''}
            </p>
          </div>

          <div className="mt-3 rounded-[1.25rem] p-3.5 bg-[rgba(255,255,255,0.85)] shadow-[0_8px_20px_rgba(182,167,230,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] border border-white/60 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
              <div>
                <p className="text-xs font-black text-blue-700 uppercase">Extension Token</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">Mã kết nối với extension (hết hạn sau 7 ngày).</p>
              </div>
              <button
                onClick={handleCreateToken}
                disabled={tokenLoading}
                className="h-8 px-4 rounded-xl bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-white text-xs font-black shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-all shrink-0"
              >
                {tokenLoading ? 'Đang tạo...' : 'Tạo token'}
              </button>
            </div>
            {extensionToken && (
              <div className="grid gap-2">
                <textarea
                  readOnly
                  value={extensionToken}
                  className="w-full min-h-20 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs font-mono text-slate-700 resize-none outline-none"
                />
                <button
                  onClick={handleCopyToken}
                  className="h-9 px-4 rounded-xl bg-white/80 text-blue-600 text-sm font-black border border-white hover:scale-[1.01] active:scale-[0.99] transition-all"
                  style={{ boxShadow: neuR }}
                >
                  Sao chép Token
                </button>
              </div>
            )}
          </div>
        </motion.section>

        {/* Right Column: Combined Last Sync Status & Sync History List */}
        <motion.section
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col min-h-0 rounded-[2rem] p-5 bg-[rgba(255,255,255,0.7)] border border-white/60 backdrop-blur-md"
          style={{ boxShadow: clayR }}
        >
          {/* Header Block & Last Synced Status */}
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600 shadow-neu-inset">
              <Database size={23} weight="duotone" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Trạng thái đồng bộ
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                {latest
                  ? `${new Date(latest.createdAt).toLocaleString('vi-VN')} · ${
                      latest.status === 'synced' ? 'Thành công' : latest.status === 'previewed' ? 'Đang xem trước' : 'Thất bại'
                    }`
                  : 'Chưa có dữ liệu đồng bộ'}
              </p>
            </div>
          </div>

          {!latestSynced && history.length > 0 && (
            <div className="mb-3 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-[11px] font-bold text-amber-700 shrink-0">
              Chưa có lần đồng bộ thành công. Thống kê dưới đây lấy từ lần xem trước (preview) gần nhất.
            </div>
          )}

          {/* Sync Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
            {statCards.map(({ key, label, icon: Icon, accent }) => {
              const summary = latest?.summary?.[key] || {};
              return (
                <div key={key} className="rounded-2xl p-3 bg-[rgba(255,255,255,0.6)] shadow-[inset_0_2px_4px_rgba(169,157,226,0.18)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} weight="duotone" style={{ color: accent }} />
                    <span className="text-xs font-black text-slate-700">{label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      ['Tạo', summary.create || 0],
                      ['Sửa', summary.update || 0],
                      ['Giữ', summary.unchanged || 0],
                      ['Lỗi', summary.conflicts || 0],
                    ].map(([labelText, value]) => (
                      <div key={labelText} className="rounded-lg py-1 bg-white/55">
                        <p className="text-sm font-black text-slate-800">{value}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{labelText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-300/40 my-2 shrink-0" />

          {/* History Section Title */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise size={18} weight="duotone" className="text-slate-500" />
              <h4 className="font-black text-slate-700 text-sm" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Lịch sử đồng bộ gần đây
              </h4>
            </div>
            {loading && <span className="text-[10px] font-bold text-slate-400">Đang tải...</span>}
          </div>

          {/* Scrollable Sync History List */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-12 text-xs font-bold text-slate-400">
                Chưa có lịch sử đồng bộ nào từ ERP USTH.
              </div>
            ) : (
              history.map(log => (
                <div
                  key={log._id}
                  className="grid grid-cols-[1fr_auto] gap-3 items-center rounded-2xl p-3 bg-[rgba(255,255,255,0.6)] border border-white/60 transition-all hover:scale-[1.01] shadow-[inset_0_2px_4px_rgba(169,157,226,0.18)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-700">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          log.status === 'synced'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : log.status === 'previewed'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.status === 'synced' ? 'Đã đồng bộ' : log.status === 'previewed' ? 'Preview' : 'Thất bại'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-500 mt-1">
                      <span>Môn: +{log.summary?.subjects?.create || 0} / ~{log.summary?.subjects?.update || 0}</span>
                      <span>Lịch: +{log.summary?.schedules?.create || 0} / ~{log.summary?.schedules?.update || 0}</span>
                      {((log.summary?.subjects?.conflicts || 0) + (log.summary?.schedules?.conflicts || 0)) > 0 && (
                        <span className="text-rose-600 font-extrabold">
                          Lỗi: {(log.summary?.subjects?.conflicts || 0) + (log.summary?.schedules?.conflicts || 0)}
                        </span>
                      )}
                    </div>

                    {log.errorMessages && log.errorMessages.length > 0 && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1 line-clamp-1 italic">
                        Lỗi: {log.errorMessages.join(', ')}
                      </p>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${
                      log.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {log.status === 'failed' ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
