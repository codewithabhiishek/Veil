import { useState, useCallback, createContext, useContext } from 'react';
import { Check, Copy, AlertCircle, Info, X } from 'lucide-react';
import { haptics } from '../lib/haptics';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  icon?: React.ReactNode;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, icon?: React.ReactNode) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, icon?: React.ReactNode) => {
    if (type === 'error') {
      haptics.error();
    } else {
      haptics.tap();
    }
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message, icon }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />,
    error: <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />,
    info: <Info className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />,
  };

  const bgColors = {
    success: 'var(--color-success-bg)',
    error: 'var(--color-danger-bg)',
    info: 'var(--color-surface-1)',
  };

  return (
    <div
      className="toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm"
      style={{
        backgroundColor: bgColors[toast.type],
        border: '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex-shrink-0">
        {toast.icon || icons[toast.type]}
      </div>
      <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-md transition-colors hover:bg-black/5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
