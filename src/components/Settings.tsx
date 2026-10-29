import { useState, useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { isBiometricAvailable } from '../crypto/engine';
import { X, Shield, Clock, Palette, AlertTriangle, Fingerprint, Hash, Check, Loader2, Layers } from 'lucide-react';
import { useToast } from '../hooks/useVault';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const {
    settings,
    updateSettings,
    deleteVault,
    setupPin,
    removePin,
    setupBiometric,
    removeBiometric,
    checkBiometricAvailability,
    biometricAvailable,
    activeVaultId,
    switchVault,
    getAvailableVaults,
  } = useVaultStore();
  const { addToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');

  useEffect(() => {
    checkBiometricAvailability();
    isBiometricAvailable().then(setBioAvailable);
  }, [checkBiometricAvailability]);

  const handleSetupPin = async () => {
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pin.length > 8) {
      setPinError('PIN must be at most 8 digits');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setPinError('PIN must contain only numbers');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }

    setPinLoading(true);
    setPinError('');
    const success = await setupPin(pin);
    setPinLoading(false);

    if (success) {
      addToast('success', 'PIN setup complete');
      setShowPinSetup(false);
      setPin('');
      setPinConfirm('');
    } else {
      setPinError('Failed to setup PIN');
    }
  };

  const handleRemovePin = async () => {
    await removePin();
    addToast('info', 'PIN removed');
  };

  const handleSetupBiometric = async () => {
    setBioLoading(true);
    const success = await setupBiometric();
    setBioLoading(false);

    if (success) {
      addToast('success', 'Biometric unlock enabled');
    } else {
      addToast('error', 'Failed to enable biometric unlock');
    }
  };

  const handleRemoveBiometric = () => {
    removeBiometric();
    addToast('info', 'Biometric unlock disabled');
  };

  const handleDeleteVault = () => {
    if (deleteConfirmText === 'DELETE') {
      deleteVault();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden modal-content"
        style={{ backgroundColor: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Unlock Methods */}
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Unlock Methods
              </span>
            </div>
            <div className="space-y-3">
              {/* PIN Setup */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>PIN Code</span>
                  </div>
                  {settings.pinEnabled ? (
                    <button
                      onClick={handleRemovePin}
                      className="text-xs px-2 py-1 rounded transition-all duration-200 btn-press"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPinSetup(!showPinSetup)}
                      className="text-xs px-2 py-1 rounded transition-all duration-200 btn-press"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                    >
                      Setup
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1 ml-6" style={{ color: 'var(--color-text-muted)' }}>
                  Quick unlock with a 4-8 digit PIN
                </p>

                {showPinSetup && !settings.pinEnabled && (
                  <div className="mt-3 space-y-2 animate-fade-in-down">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                      placeholder="Enter PIN (4-8 digits)"
                      className="form-input text-sm"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={pinConfirm}
                      onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                      placeholder="Confirm PIN"
                      className="form-input text-sm"
                    />
                    {pinError && (
                      <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{pinError}</p>
                    )}
                    <button
                      onClick={handleSetupPin}
                      disabled={pinLoading || !pin || !pinConfirm}
                      className="w-full py-2 text-xs font-medium rounded-md transition-all duration-200 btn-press disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-surface-0)' }}
                    >
                      {pinLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Setting up...
                        </span>
                      ) : 'Enable PIN'}
                    </button>
                  </div>
                )}
              </div>

              {/* Biometric Setup */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Face ID / Touch ID</span>
                  </div>
                  {settings.biometricEnabled ? (
                    <button
                      onClick={handleRemoveBiometric}
                      className="text-xs px-2 py-1 rounded transition-all duration-200 btn-press"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleSetupBiometric}
                      disabled={bioLoading || !bioAvailable}
                      className="text-xs px-2 py-1 rounded transition-all duration-200 btn-press disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                    >
                      {bioLoading ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          ...
                        </span>
                      ) : 'Enable'}
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1 ml-6" style={{ color: 'var(--color-text-muted)' }}>
                  {bioAvailable 
                    ? 'Use biometric authentication to unlock'
                    : 'Not available on this device/browser'}
                </p>
              </div>
            </div>
          </div>

          {/* Auto-lock */}
          <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Auto-Lock
              </span>
            </div>
            <div className="space-y-2">
              {[
                { value: 1, label: '1 minute' },
                { value: 5, label: '5 minutes' },
                { value: 15, label: '15 minutes' },
                { value: 30, label: '30 minutes' },
                { value: 0, label: 'Never' },
              ].map(({ value, label }, index) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer py-1 stagger-item" style={{ animationDelay: `${index * 30}ms` }}>
                  <input
                    type="radio"
                    name="autoLock"
                    checked={settings.autoLockTimeout === value}
                    onChange={() => updateSettings({ autoLockTimeout: value })}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-sm transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clipboard */}
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Clipboard Security
              </span>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--color-text-tertiary)' }}>
                Clear clipboard after copying sensitive data
              </label>
              <select
                value={settings.clipboardClearTimeout}
                onChange={(e) => updateSettings({ clipboardClearTimeout: parseInt(e.target.value) })}
                className="form-input transition-all duration-200 hover-lift"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={0}>Never</option>
              </select>
            </div>
          </div>

          {/* Theme */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Appearance
              </span>
            </div>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-all duration-200 btn-press hover-lift ${
                    settings.theme === theme ? 'font-medium' : ''
                  }`}
                  style={{
                    backgroundColor: settings.theme === theme ? 'var(--color-surface-2)' : 'transparent',
                    borderColor: settings.theme === theme ? 'var(--color-border)' : 'var(--color-border-subtle)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Vault Profile Isolation */}
          <div className="pt-4 animate-fade-in-up" style={{ borderTop: '1px solid var(--color-border-subtle)', animationDelay: '180ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Vault Profiles (Isolated Storage)
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Current profile: <strong style={{ color: 'var(--color-text-primary)' }}>{activeVaultId}</strong>. Each profile maintains its own encrypted vault data.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {getAvailableVaults().map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    if (activeVaultId !== v) {
                      switchVault(v);
                      addToast('info', `Switched to vault: ${v}`);
                      onClose();
                    }
                  }}
                  className="px-2.5 py-1 text-xs rounded-md border font-mono transition-colors"
                  style={{
                    backgroundColor: activeVaultId === v ? 'var(--color-surface-2)' : 'transparent',
                    borderColor: activeVaultId === v ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                    color: activeVaultId === v ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                placeholder="New vault profile..."
                className="form-input text-xs flex-1"
              />
              <button
                onClick={() => {
                  if (newVaultName.trim()) {
                    const id = newVaultName.trim();
                    switchVault(id);
                    addToast('info', `Switched to vault: ${id}`);
                    setNewVaultName('');
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-md border transition-colors"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
              >
                Switch
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 animate-fade-in-up" style={{ borderTop: '1px solid var(--color-border-subtle)', animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>
                Danger Zone
              </span>
            </div>
            
            {showDeleteConfirm ? (
              <div className="p-3 rounded-lg space-y-3 animate-fade-in-down" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
                <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  This will permanently delete your vault and all entries. Type <strong>DELETE</strong> to confirm.
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="form-input text-sm"
                  style={{ borderColor: 'var(--color-danger)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    className="px-3 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift"
                    style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteVault}
                    disabled={deleteConfirmText !== 'DELETE'}
                    className="px-3 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
                  >
                    Delete Vault
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift"
                style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
              >
                Delete Vault
              </button>
            )}
          </div>

          {/* Creator Attribution */}
          <div className="pt-4 text-center" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <a
              href="https://abhiishek.is-a.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Crafted by <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Abhishek</span> ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
