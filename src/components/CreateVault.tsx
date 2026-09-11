import { useState, useRef } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { Shield, AlertCircle, Check, Sparkles } from 'lucide-react';

export function CreateVault() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { createVault } = useVaultStore();

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 8) {
      setError('Master password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createVault(password);
    } catch {
      setError('Failed to create vault. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text-primary) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />
      
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-xl animate-pulse-ring" style={{ backgroundColor: 'var(--color-surface-2)' }} />
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl hover-lift" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              <Shield className="w-7 h-7" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-4" style={{ color: 'var(--color-text-primary)' }}>
            Create Your Vault
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Choose a strong master password. This cannot be recovered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Master Password
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter master password"
                className="w-full px-4 py-2.5 text-sm rounded-lg border transition-all duration-200 hover-lift"
                style={{
                  backgroundColor: 'var(--color-surface-1)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-0.5 rounded transition-all duration-200 hover:scale-105 btn-press"
                style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-surface-2)' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {password && (
              <div className="mt-2 flex items-center gap-2 animate-fade-in">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-3)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${passwordStrength.percent}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium transition-colors duration-200" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Confirm master password"
                className="w-full px-4 py-2.5 text-sm rounded-lg border transition-all duration-200 hover-lift"
                style={{
                  backgroundColor: 'var(--color-surface-1)',
                  borderColor: confirm && confirm !== password ? 'var(--color-danger)' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                autoComplete="new-password"
                disabled={loading}
              />
              {confirm && confirm === password && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-scale-in">
                  <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                </div>
              )}
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
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 btn-press hover-lift group relative overflow-hidden animate-fade-in-up"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-surface-0)',
              animationDelay: '300ms',
            }}
          >
            <span className="inline-flex items-center gap-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating vault…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                  Create Vault
                </>
              )}
            </span>
          </button>
        </form>

        <div className="mt-6 p-3 rounded-lg text-xs space-y-1 animate-fade-in-up hover-lift" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', animationDelay: '400ms' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Security details</p>
          <p>• Key derivation: Argon2id (3 iterations, 64MB)</p>
          <p>• Encryption: AES-256-GCM</p>
          <p>• All data remains on your device</p>
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): { percent: number; label: string; color: string } {
  if (!password) return { percent: 0, label: '', color: 'var(--color-text-muted)' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { percent: 25, label: 'Weak', color: 'var(--color-danger)' };
  if (score <= 3) return { percent: 50, label: 'Fair', color: 'var(--color-warning)' };
  if (score <= 4) return { percent: 75, label: 'Strong', color: 'var(--color-success)' };
  return { percent: 100, label: 'Excellent', color: 'var(--color-success)' };
}
