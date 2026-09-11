import { useVaultStore } from '../store/vaultStore';
import { Star, Globe, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useClipboard, useToast } from '../hooks/useVault';
import type { VaultEntry } from '../types/vault';

interface EntryListProps {
  onNewEntry: () => void;
}

export function EntryList({ onNewEntry }: EntryListProps) {
  const { getFilteredEntries, selectedEntryId, selectEntry, searchQuery } = useVaultStore();
  const entries = getFilteredEntries();

  return (
    <div className="flex flex-col h-full border-r w-full md:w-80 md:min-w-[320px]" style={{ borderColor: 'var(--color-border-subtle)' }}>
      {/* List Header */}
      <div className="px-4 py-3 flex items-center justify-between animate-fade-in" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <EmptyState searchQuery={searchQuery} onNewEntry={onNewEntry} />
        ) : (
          <div className="py-1">
            {entries.map((entry, index) => (
              <div key={entry.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                <EntryItem
                  entry={entry}
                  isSelected={entry.id === selectedEntryId}
                  onSelect={() => selectEntry(entry.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryItem({ entry, isSelected, onSelect }: { entry: VaultEntry; isSelected: boolean; onSelect: () => void }) {
  const [copied, setCopied] = useState(false);
  const { copyToClipboard } = useClipboard();
  const { addToast } = useToast();

  const handleCopyUsername = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.username) {
      const success = await copyToClipboard(entry.username);
      if (success) {
        setCopied(true);
        addToast('success', 'Username copied to clipboard');
        setTimeout(() => setCopied(false), 1500);
      }
    }
  };

  const initial = entry.name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 entry-card ${
        isSelected ? 'border-l-2' : 'border-l-2 border-transparent'
      }`}
      style={{
        backgroundColor: isSelected ? 'var(--color-surface-2)' : 'transparent',
        borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium transition-all duration-200 group-hover:scale-105"
        style={{
          backgroundColor: isSelected ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
            {entry.name}
          </span>
          {entry.favorite && (
            <Star className="w-3 h-3 flex-shrink-0 fill-current animate-fade-in" style={{ color: 'var(--color-warning)' }} />
          )}
        </div>
        <p className="text-xs truncate mt-0.5 transition-colors duration-200" style={{ color: 'var(--color-text-tertiary)' }}>
          {entry.username || 'No username'}
        </p>
      </div>

      {/* Quick Copy */}
      {entry.username && (
        <button
          onClick={handleCopyUsername}
          className={`p-1.5 rounded-md transition-all duration-200 icon-hover ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{ color: 'var(--color-text-muted)' }}
          title="Copy username"
          aria-label="Copy username"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 animate-scale-in" style={{ color: 'var(--color-success)' }} />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </button>
  );
}

function EmptyState({ searchQuery, onNewEntry }: { searchQuery: string; onNewEntry: () => void }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          No entries match "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in-up">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 hover-lift" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <Globe className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        Your vault is empty
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Add your first credential to get started.
      </p>
      <button
        onClick={onNewEntry}
        className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 hover-lift btn-press"
        style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
      >
        + Add Entry
      </button>
    </div>
  );
}
