import { useEffect, useCallback, useRef } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { haptics } from '../lib/haptics';

export { useToast } from '../components/Toast';

export function useAutoLock() {
  const { state, settings, lastActivity, lockVault, recordActivity } = useVaultStore();
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state !== 'unlocked' || settings.autoLockTimeout === 0) {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const timeoutMs = settings.autoLockTimeout * 60 * 1000;

    const checkActivity = () => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= timeoutMs) {
        lockVault();
      }
    };

    timeoutRef.current = setInterval(checkActivity, 5000);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state, settings.autoLockTimeout, lastActivity, lockVault]);

  useEffect(() => {
    if (state !== 'unlocked') return;

    const handleActivity = () => recordActivity();
    
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [state, recordActivity]);
}

export function useClipboard() {
  const { settings } = useVaultStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      haptics.copy();
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      if (settings.clipboardClearTimeout > 0) {
        timeoutRef.current = setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {
            // Clipboard API may not support read
          }
        }, settings.clipboardClearTimeout * 1000);
      }
      
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [settings.clipboardClearTimeout]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { copyToClipboard };
}

export function useKeyboardShortcuts(handlers: {
  onSearch?: () => void;
  onNewEntry?: () => void;
  onLock?: () => void;
  onEscape?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      
      if (mod && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      } else if (mod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewEntry?.();
      } else if (mod && e.key === 'l') {
        e.preventDefault();
        handlers.onLock?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
