import { useState, useRef, useEffect } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface PinPadProps {
  pinLength?: number;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
  error?: string;
  title?: string;
  subtitle?: string;
  showBiometric?: boolean;
  onBiometric?: () => void;
}

export function PinPad({
  pinLength = 6,
  onSubmit,
  onCancel,
  error,
  title = 'Enter PIN',
  subtitle = 'Use your PIN to unlock',
  showBiometric = false,
  onBiometric,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      haptics.error();
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 500);
    }
  }, [error]);

  const handleDigit = (digit: string) => {
    haptics.pinKey();
    if (pin.length < pinLength) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === pinLength) {
        setTimeout(() => onSubmit(newPin), 150);
      }
    }
  };

  const handleDelete = () => {
    haptics.tap();
    setPin(pin.slice(0, -1));
  };

  const handleBiometric = () => {
    haptics.select();
    onBiometric?.();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text-primary) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }} />

      <div className="relative z-10 w-full max-w-xs">
        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {subtitle}
          </p>
        </div>

        {/* PIN Dots */}
        <div className={`flex items-center justify-center gap-3 mb-8 ${shake ? 'animate-bounce-subtle' : ''}`}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: i < pin.length ? 'var(--color-accent)' : 'var(--color-surface-3)',
                transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-xs mb-4 animate-fade-in-down" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(String(num))}
              className="w-full aspect-square rounded-full text-xl font-medium transition-all duration-150 btn-press hover-lift"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {num}
            </button>
          ))}

          {/* Bottom row */}
          {showBiometric ? (
            <button
              onClick={handleBiometric}
              className="w-full aspect-square rounded-full flex items-center justify-center transition-all duration-150 btn-press hover-lift"
              style={{
                backgroundColor: 'var(--color-surface-1)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <div />
          )}
          
          <button
            onClick={() => handleDigit('0')}
            className="w-full aspect-square rounded-full text-xl font-medium transition-all duration-150 btn-press hover-lift"
            style={{
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            0
          </button>
          
          <button
            onClick={handleDelete}
            className="w-full aspect-square rounded-full flex items-center justify-center transition-all duration-150 btn-press hover-lift"
            style={{
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Use password instead */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-6 py-2 text-sm transition-colors duration-200"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Use master password instead
          </button>
        )}
      </div>
    </div>
  );
}
