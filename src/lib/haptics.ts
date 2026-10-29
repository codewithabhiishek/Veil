/**
 * Tactile mobile haptic feedback engine for Veil Password & Secrets Vault.
 * SSR-safe, gracefully degrades when navigator.vibrate is unsupported or denied.
 */

export const HAPTIC_PATTERNS = {
  tap: 8,
  select: 12,
  pinKey: 15,
  unlock: [15, 60, 25],
  copy: [12, 40, 15],
  lock: [20, 40, 20],
  error: [35, 50, 35],
  delete: [25, 45, 30],
} as const;

export type HapticType = keyof typeof HAPTIC_PATTERNS;

export function isHapticsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function triggerHaptic(type: HapticType): boolean {
  if (!isHapticsSupported()) return false;
  try {
    const pattern = HAPTIC_PATTERNS[type];
    return navigator.vibrate(pattern as unknown as VibratePattern);
  } catch {
    return false;
  }
}

export const haptics = {
  tap: () => triggerHaptic('tap'),
  select: () => triggerHaptic('select'),
  pinKey: () => triggerHaptic('pinKey'),
  unlock: () => triggerHaptic('unlock'),
  copy: () => triggerHaptic('copy'),
  lock: () => triggerHaptic('lock'),
  error: () => triggerHaptic('error'),
  delete: () => triggerHaptic('delete'),
  custom: (pattern: number | number[]): boolean => {
    if (!isHapticsSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  },
};
