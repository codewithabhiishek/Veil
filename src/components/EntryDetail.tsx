import { useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { useClipboard, useToast } from '../hooks/useVault';
import {
  Eye, EyeOff, Copy, Check, Edit3, Trash2, ExternalLink,
  Star, Key, Mail, FileText, Shield, Globe, Hash
} from 'lucide-react';

interface EntryDetailProps {
  onEdit: () => void;
}

export function EntryDetail({ onEdit }: EntryDetailProps) {
  const { vaultData, selectedEntryId, updateEntry, deleteEntry } = useVaultStore();
  const { copyToClipboard } = useClipboard();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showTotp, setShowTotp] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  const entry = vaultData?.entries.find(e => e.id === selectedEntryId);

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 hover-lift" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <Shield className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Select an entry to view details
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async (value: string, field: string, label: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedField(field);
      addToast('success', `${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleToggleFavorite = () => {
    updateEntry(entry.id, { favorite: !entry.favorite });
    addToast('success', entry.favorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleDelete = () => {
    deleteEntry(entry.id);
    addToast('info', 'Entry deleted');
  };

  const isCopied = (field: string) => copiedField === field;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between animate-fade-in-down" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium hover-lift"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
          >
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {entry.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {entry.category && (
                <span className="text-xs px-1.5 py-0.5 rounded transition-colors duration-200 hover:scale-105" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                  {entry.category}
                </span>
              )}
              {entry.tags.map(tag => (
                <span key={tag} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleFavorite}
            className="p-2 rounded-md transition-all duration-200 icon-hover"
            style={{ color: entry.favorite ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
            title={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-4 h-4 transition-all duration-300 ${entry.favorite ? 'fill-current animate-bounce-subtle' : ''}`} />
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-muted)' }}
            title="Edit entry"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-muted)' }}
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Username */}
        <FieldRow
          icon={<Mail className="w-4 h-4" />}
          label="Username"
          value={entry.username}
          onCopy={() => handleCopy(entry.username, 'username', 'Username')}
          isCopied={isCopied('username')}
        />

        {/* Password */}
        <FieldRow
          icon={<Key className="w-4 h-4" />}
          label="Password"
          value={entry.password}
          isSecret
          showSecret={showPassword}
          onToggleSecret={() => setShowPassword(!showPassword)}
          onCopy={() => handleCopy(entry.password, 'password', 'Password')}
          isCopied={isCopied('password')}
          mono
        />

        {/* URL */}
        {entry.url && (
          <FieldRow
            icon={<Globe className="w-4 h-4" />}
            label="Website"
            value={entry.url}
            onCopy={() => handleCopy(entry.url, 'url', 'Website')}
            isCopied={isCopied('url')}
            isLink
          />
        )}

        {/* Recovery Email */}
        {entry.recoveryEmail && (
          <FieldRow
            icon={<Mail className="w-4 h-4" />}
            label="Recovery Email"
            value={entry.recoveryEmail}
            onCopy={() => handleCopy(entry.recoveryEmail, 'recoveryEmail', 'Recovery email')}
            isCopied={isCopied('recoveryEmail')}
          />
        )}

        {/* Recovery Codes */}
        {entry.recoveryCodes.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Recovery Codes
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                  className="p-1.5 rounded transition-all duration-200 icon-hover text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {showRecoveryCodes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleCopy(entry.recoveryCodes.join('\n'), 'recoveryCodes', 'Recovery codes')}
                  className="p-1.5 rounded transition-all duration-200 icon-hover"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {isCopied('recoveryCodes') ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg space-y-1 transition-all duration-300" style={{ backgroundColor: 'var(--color-surface-1)' }}>
              {entry.recoveryCodes.map((code, i) => (
                <div
                  key={i}
                  className="font-mono text-sm transition-all duration-300 stagger-item"
                  style={{
                    color: showRecoveryCodes ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  {showRecoveryCodes ? code : '••••••-••••••'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOTP Secret */}
        {entry.totpSecret && (
          <FieldRow
            icon={<Shield className="w-4 h-4" />}
            label="TOTP Secret"
            value={entry.totpSecret}
            isSecret
            showSecret={showTotp}
            onToggleSecret={() => setShowTotp(!showTotp)}
            onCopy={() => handleCopy(entry.totpSecret, 'totp', 'TOTP secret')}
            isCopied={isCopied('totp')}
            mono
          />
        )}

        {/* Custom Fields */}
        {entry.customFields.map((field, index) => (
          <div key={field.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
            <FieldRow
              icon={<FileText className="w-4 h-4" />}
              label={field.name}
              value={field.value}
              isSecret={field.type === 'sensitive'}
              onCopy={() => handleCopy(field.value, field.id, field.name)}
              isCopied={isCopied(field.id)}
              mono={field.type === 'sensitive'}
            />
          </div>
        ))}

        {/* Notes */}
        {entry.notes && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Notes
              </span>
            </div>
            <div className="p-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed transition-all duration-200 hover-lift" style={{ backgroundColor: 'var(--color-surface-1)', color: 'var(--color-text-secondary)' }}>
              {entry.notes}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 animate-fade-in" style={{ borderTop: '1px solid var(--color-border-subtle)', animationDelay: '200ms' }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>Created {formatDate(entry.createdAt)}</span>
            <span>Modified {formatDate(entry.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-xl p-5 shadow-2xl modal-content" style={{ backgroundColor: 'var(--color-surface-1)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Entry</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Are you sure you want to delete "{entry.name}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 btn-press hover-lift"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 btn-press hover-lift"
                style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  icon, label, value, isSecret, showSecret, onToggleSecret, onCopy, isCopied, isLink, mono
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isSecret?: boolean;
  showSecret?: boolean;
  onToggleSecret?: () => void;
  onCopy?: () => void;
  isCopied?: boolean;
  isLink?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-lg transition-all duration-200 hover-lift" style={{ backgroundColor: 'var(--color-surface-1)' }}>
        <span className={`flex-1 text-sm truncate transition-all duration-300 ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
          {isSecret && !showSecret ? '••••••••••••' : value}
        </span>
        <div className="flex items-center gap-0.5">
          {isSecret && onToggleSecret && (
            <button
              onClick={onToggleSecret}
              className="p-1.5 rounded transition-all duration-200 icon-hover"
              style={{ color: 'var(--color-text-muted)' }}
              title={showSecret ? 'Hide' : 'Show'}
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          {isLink && value && (
            <a
              href={value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded transition-all duration-200 icon-hover"
              style={{ color: 'var(--color-text-muted)' }}
              title="Open link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onCopy}
            className="p-1.5 rounded transition-all duration-200 icon-hover"
            style={{ color: isCopied ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            title="Copy"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 animate-scale-in" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
