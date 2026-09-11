import { useState, useEffect, useRef } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { Search, Star, X } from 'lucide-react';
import type { VaultEntry } from '../types/vault';

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const { vaultData, selectEntry, setSearchQuery } = useVaultStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VaultEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!vaultData || !query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const filtered = vaultData.entries.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      e.url.toLowerCase().includes(q)
    ).slice(0, 10);

    setResults(filtered);
    setSelectedIndex(0);
  }, [query, vaultData]);

  const handleSelect = (entry: VaultEntry) => {
    selectEntry(entry.id);
    setSearchQuery('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden modal-content"
        style={{ backgroundColor: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: results.length > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
          <Search className="w-4 h-4 flex-shrink-0 animate-fade-in" style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entries..."
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-[var(--color-text-muted)]"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <button
            onClick={onClose}
            className="p-1 rounded transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {results.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 stagger-item hover-lift"
                style={{
                  backgroundColor: i === selectedIndex ? 'var(--color-surface-2)' : 'transparent',
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium flex-shrink-0 transition-transform duration-200"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {entry.name}
                    </span>
                    {entry.favorite && <Star className="w-3 h-3 fill-current flex-shrink-0" style={{ color: 'var(--color-warning)' }} />}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {entry.username || entry.category}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {entry.category}
                </span>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center animate-fade-in">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No results found</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 flex items-center gap-4 text-xs animate-fade-in" style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
