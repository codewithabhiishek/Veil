import { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { LockScreenView } from './LockScreenPassword';
import { PinPad } from './PinPad';
import { Shield, KeyRound, Fingerprint } from 'lucide-react';

type UnlockView = 'choice' | 'password' | 'pin';

export function LockScreen() {
  const { unlockVault, unlockWithPin: storeUnlockWithPin, unlockWithBiometric: storeUnlockWithBiometric, settings, checkBiometricAvailability, biometricAvailable } = useVaultStore();
  const [view, setView] = useState<UnlockView>('choice');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const hasPin = settings.pinEnabled;
  const hasBiometric = settings.biometricEnabled;

  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  // Auto-select best unlock method
  useEffect(() => {
    if (hasBiometric && biometricAvailable) {
      // Try biometric automatically on load
      handleBiometricUnlock();
    } else if (hasPin) {
      setView('pin');
    } else {
      setView('password');
    }
  }, []);

  const handleBiometricUnlock = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const success = await storeUnlockWithBiometric();
      if (!success) {
        setError('Biometric authentication failed');
      }
    } catch {
      setError('Biometric authentication failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setLoading(true);
    setError('');
    try {
      await storeUnlockWithPin(pin);
    } catch {
      setError('Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  // Show PIN pad
  if (view === 'pin') {
    return (
      <PinPad
        pinLength={6}
        onSubmit={handlePinSubmit}
        onCancel={() => setView('password')}
        error={error}
        title="Enter PIN"
        subtitle="Enter your 6-digit PIN"
        showBiometric={hasBiometric && biometricAvailable}
        onBiometric={handleBiometricUnlock}
      />
    );
  }

  // Show password form
  if (view === 'password') {
    return (
      <LockScreenView
        onUnlock={async (password: string) => {
          setError('');
          try {
            await unlockVault(password);
          } catch {
            setError('Unable to unlock vault. Please check your master password.');
            throw new Error('Invalid password');
          }
        }}
        error={error}
        hasPin={hasPin}
        hasBiometric={hasBiometric && biometricAvailable}
        onSwitchToPin={() => { setView('pin'); setError(''); }}
        onBiometric={handleBiometricUnlock}
      />
    );
  }

  // Choice screen (brief, then auto-navigate)
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden animate-fade-in" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text-primary) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />
      
      <div className="w-full max-w-sm relative text-center animate-fade-in-up">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-xl animate-pulse-ring" style={{ backgroundColor: 'var(--color-surface-2)' }} />
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-xl" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <Shield className="w-8 h-8" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        </div>

        <h1 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Vault Locked
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
          Choose how to unlock
        </p>

        <div className="space-y-2">
          {hasBiometric && biometricAvailable && (
            <button
              onClick={handleBiometricUnlock}
              disabled={biometricLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 btn-press hover-lift animate-fade-in-up"
              style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)', animationDelay: '100ms' }}
            >
              <Fingerprint className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {biometricLoading ? 'Authenticating...' : 'Use Face ID / Touch ID'}
              </span>
            </button>
          )}

          {hasPin && (
            <button
              onClick={() => setView('pin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 btn-press hover-lift animate-fade-in-up"
              style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)', animationDelay: '200ms' }}
            >
              <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}>
                #
              </span>
              <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Enter PIN
              </span>
            </button>
          )}

          <button
            onClick={() => setView('password')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 btn-press hover-lift animate-fade-in-up"
            style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)', animationDelay: '300ms' }}
          >
            <KeyRound className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
            <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Master Password
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
