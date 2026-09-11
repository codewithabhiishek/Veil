import { useState, useRef, useEffect } from 'react';
import { Lock, Shield, AlertCircle, KeyRound, Fingerprint } from 'lucide-react';

interface LockScreenPasswordProps {
  onUnlock: (password: string) => Promise<void>;
  error?: string;
  hasPin?: boolean;
  hasBiometric?: boolean;
  onSwitchToPin?: () => void;
  onBiometric?: () => void;
}

export function LockScreenView({ onUnlock, error: externalError, hasPin, hasBiometric, onSwitchToPin, onBiometric }: LockScreenPasswordProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      await onUnlock(password);
    } catch {
      setError('Unable to unlock vault. Please check your master password.');
      setPassword('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden animate-fade-in" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text-primary) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />
      
      <div className={`w-full max-w-sm relative ${shake ? 'animate-bounce-subtle' : ''}`}>
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-xl animate-pulse-ring" style={{ backgroundColor: 'var(--color-surface-2)' }} />
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl hover-lift" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              <Shield className="w-7 h-7 animate-fade-in" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-4" style={{ color: 'var(--color-text-primary)' }}>
            Unlock Vault
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Enter your master password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200" style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Master password"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border transition-all duration-200 hover-lift"
                style={{
                  backgroundColor: 'var(--color-surface-1)',
                  borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-xs animate-fade-in-down" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 btn-press hover-lift group relative overflow-hidden"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-surface-0)',
            }}
          >
            <span className={`inline-flex items-center gap-2 transition-all duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
              <KeyRound className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
              Unlock
            </span>
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </span>
            )}
          </button>
        </form>

        {/* Alternative unlock methods */}
        {(hasPin || hasBiometric) && (
          <div className="mt-6 flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          {hasBiometric && onBiometric && (
            <button
              onClick={onBiometric}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 btn-press hover-lift text-sm"
              style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
              <Fingerprint className="w-4 h-4" />
              Face ID
            </button>
          )}
          {hasPin && onSwitchToPin && (
            <button
              onClick={onSwitchToPin}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 btn-press hover-lift text-sm"
              style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
              <span className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--color-surface-3)' }}>
                PIN
              </span>
              Use PIN
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs animate-fade-in-up" style={{ color: 'var(--color-text-muted)', animationDelay: '400ms' }}>
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
          <span>Encrypted with AES-256-GCM</span>
        </div>
      </div>
    </div>
  );
}
