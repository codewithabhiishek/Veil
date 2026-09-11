import { useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { generatePassword, generateRecoveryCodes } from '../crypto/engine';
import { useToast } from '../hooks/useVault';
import type { CustomField, PasswordGeneratorOptions } from '../types/vault';
import {
  X, Eye, EyeOff, Copy, Check, RefreshCw, Plus, Trash2,
  Shuffle, ChevronDown, Sparkles
} from 'lucide-react';
import { useClipboard } from '../hooks/useVault';

interface EntryFormProps {
  entryId?: string;
  onClose: () => void;
}

const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

export function EntryForm({ entryId, onClose }: EntryFormProps) {
  const { vaultData, addEntry, updateEntry, getCategories } = useVaultStore();
  const { copyToClipboard } = useClipboard();
  const { addToast } = useToast();
  const existingEntry = entryId ? vaultData?.entries.find(e => e.id === entryId) : null;
  const categories = getCategories();

  const [name, setName] = useState(existingEntry?.name ?? '');
  const [username, setUsername] = useState(existingEntry?.username ?? '');
  const [password, setPassword] = useState(existingEntry?.password ?? '');
  const [url, setUrl] = useState(existingEntry?.url ?? '');
  const [recoveryEmail, setRecoveryEmail] = useState(existingEntry?.recoveryEmail ?? '');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>(existingEntry?.recoveryCodes ?? []);
  const [totpSecret, setTotpSecret] = useState(existingEntry?.totpSecret ?? '');
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [category, setCategory] = useState(existingEntry?.category ?? categories[0] ?? 'Personal');
  const [tags, setTags] = useState(existingEntry?.tags.join(', ') ?? '');
  const [favorite, setFavorite] = useState(existingEntry?.favorite ?? false);
  const [customFields, setCustomFields] = useState<CustomField[]>(existingEntry?.customFields ?? []);
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [passwordOptions, setPasswordOptions] = useState<PasswordGeneratorOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleCopy = async (value: string, field: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedField(field);
      addToast('success', 'Copied to clipboard');
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const handleGeneratePassword = () => {
    const newPass = generatePassword(passwordOptions);
    setPassword(newPass);
    setShowPassword(true);
    addToast('success', 'Password generated');
  };

  const handleGenerateRecoveryCodes = () => {
    setRecoveryCodes(generateRecoveryCodes(8));
    addToast('success', 'Recovery codes generated');
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { id: crypto.randomUUID(), name: '', value: '', type: 'text' }]);
  };

  const handleUpdateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const entryData = {
      name: name.trim(),
      username: username.trim(),
      password,
      url: url.trim(),
      recoveryEmail: recoveryEmail.trim(),
      recoveryCodes,
      totpSecret: totpSecret.trim(),
      notes: notes.trim(),
      category: category.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      favorite,
      customFields: customFields.filter(f => f.name.trim()),
    };

    if (existingEntry) {
      await updateEntry(existingEntry.id, entryData);
      addToast('success', 'Entry updated');
    } else {
      await addEntry(entryData);
      addToast('success', 'Entry added');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden modal-content"
        style={{ backgroundColor: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {existingEntry ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gmail, GitHub, AWS Console"
              className="form-input"
              autoFocus
            />
          </FormField>

          {/* Username */}
          <FormField label="Username / Email">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="form-input"
            />
          </FormField>

          {/* Password */}
          <FormField label="Password">
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="form-input pr-16 font-mono"
                  autoComplete="off"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded transition-all duration-200 icon-hover"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(password, 'password')}
                    className="p-1 rounded transition-all duration-200 icon-hover"
                    style={{ color: copiedField === 'password' ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                  >
                    {copiedField === 'password' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className="px-2.5 rounded-md transition-all duration-200 flex items-center gap-1.5 btn-press hover-lift"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                title="Generate password"
              >
                <Shuffle className={`w-3.5 h-3.5 transition-transform duration-300 ${showGenerator ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Password Generator */}
            {showGenerator && (
              <div className="mt-2 p-3 rounded-lg space-y-3 animate-fade-in-down" style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Password Generator</span>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-all duration-200 btn-press hover-lift"
                    style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Length</label>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    value={passwordOptions.length}
                    onChange={(e) => setPasswordOptions({ ...passwordOptions, length: parseInt(e.target.value) })}
                    className="flex-1 accent-current"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                    {passwordOptions.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'uppercase' as const, label: 'A-Z' },
                    { key: 'lowercase' as const, label: 'a-z' },
                    { key: 'numbers' as const, label: '0-9' },
                    { key: 'symbols' as const, label: '!@#' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordOptions[key]}
                        onChange={(e) => setPasswordOptions({ ...passwordOptions, [key]: e.target.checked })}
                        className="w-3.5 h-3.5 rounded"
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </FormField>

          {/* URL */}
          <FormField label="Website">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="form-input"
            />
          </FormField>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              {showNewCategory ? (
                <div className="flex gap-1 animate-fade-in">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category"
                    className="form-input text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { if (newCategory.trim()) { setCategory(newCategory.trim()); setShowNewCategory(false); setNewCategory(''); } }}
                    className="px-2.5 py-1 text-xs rounded-md flex-shrink-0 transition-all duration-200 btn-press"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-surface-0)' }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => { if (e.target.value === '__new__') { setShowNewCategory(true); } else { setCategory(e.target.value); } }}
                    className="form-input appearance-none pr-7"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ New category</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              )}
            </FormField>
            <FormField label="Tags">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
                className="form-input"
              />
            </FormField>
          </div>

          {/* Recovery Email */}
          <FormField label="Recovery Email">
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="backup@example.com"
              className="form-input"
            />
          </FormField>

          {/* Recovery Codes */}
          <FormField label="Recovery Codes">
            <div className="space-y-2">
              {recoveryCodes.length > 0 && (
                <div className="p-2 rounded-lg space-y-0.5 max-h-32 overflow-y-auto animate-fade-in" style={{ backgroundColor: 'var(--color-surface-1)' }}>
                  {recoveryCodes.map((code, i) => (
                    <div key={i} className="font-mono text-xs stagger-item" style={{ color: 'var(--color-text-secondary)', animationDelay: `${i * 30}ms` }}>{code}</div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerateRecoveryCodes}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate Codes
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryCodes([])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(recoveryCodes.join('\n'), 'recoveryCodes')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 btn-press hover-lift"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: copiedField === 'recoveryCodes' ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}
                >
                  {copiedField === 'recoveryCodes' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy All
                </button>
              </div>
            </div>
          </FormField>

          {/* TOTP Secret */}
          <FormField label="TOTP Secret">
            <input
              type="text"
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              placeholder="JBSWY3DPEHPK3PXP"
              className="form-input font-mono"
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="form-input resize-none"
            />
          </FormField>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Custom Fields
              </label>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-all duration-200 btn-press hover-lift"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>
            {customFields.map((field) => (
              <div key={field.id} className="flex gap-2 mb-2 animate-fade-in">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => handleUpdateCustomField(field.id, { name: e.target.value })}
                  placeholder="Field name"
                  className="form-input flex-1"
                />
                <input
                  type={field.type === 'sensitive' ? 'password' : 'text'}
                  value={field.value}
                  onChange={(e) => handleUpdateCustomField(field.id, { value: e.target.value })}
                  placeholder="Value"
                  className="form-input flex-1"
                />
                <select
                  value={field.type}
                  onChange={(e) => handleUpdateCustomField(field.id, { type: e.target.value as 'text' | 'sensitive' })}
                  className="form-input w-20 text-xs"
                >
                  <option value="text">Text</option>
                  <option value="sensitive">Secret</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(field.id)}
                  className="p-2 rounded transition-all duration-200 icon-hover"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Favorite */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Mark as favorite</span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 btn-press hover-lift"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 disabled:opacity-50 btn-press hover-lift"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-surface-0)' }}
          >
            {existingEntry ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
