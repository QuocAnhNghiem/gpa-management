import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, WarningCircle, XCircle, X } from '@phosphor-icons/react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type, message, duration = 3000) => {
    idCounter.current += 1;
    const id = `toast-${Date.now()}-${idCounter.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 min-w-[280px]
                rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border backdrop-blur-xl
                ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-800' : ''}
                ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-200/50 text-rose-800' : ''}
                ${toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200/50 text-amber-800' : ''}
              `}
            >
              {toast.type === 'success' && <CheckCircle size={24} weight="fill" className="text-emerald-500 shrink-0" />}
              {toast.type === 'error' && <XCircle size={24} weight="fill" className="text-rose-500 shrink-0" />}
              {toast.type === 'warning' && <WarningCircle size={24} weight="fill" className="text-amber-500 shrink-0" />}
              
              <span className="text-sm font-medium leading-tight flex-1">{toast.message}</span>
              
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-full hover:bg-black/5 transition-colors shrink-0"
              >
                <X size={16} weight="bold" className="opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
