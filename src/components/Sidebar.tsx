import { useVaultStore } from '../store/vaultStore';
import {
  Lock, Search, Plus, Star, Clock, FolderOpen,
  Settings, ChevronDown, ChevronRight, Key
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  onNewEntry: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onNewEntry, onOpenSearch, onOpenSettings, isMobile, onClose }: SidebarProps) {
  const { selectedCategory, setSelectedCategory, getCategories, lockVault, state, vaultData } = useVaultStore();
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const categories = getCategories();
  const entryCount = vaultData?.entries.length ?? 0;

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategory(id);
    if (isMobile && onClose) onClose();
  };

  const navItems = [
    { id: null, label: 'All Items', icon: Key, count: entryCount },
    { id: '__favorites__', label: 'Favorites', icon: Star, count: null },
    { id: '__recent__', label: 'Recent', icon: Clock, count: null },
  ];

  return (
    <aside
      className={`flex flex-col h-full animate-slide-in-left ${isMobile ? 'w-full' : 'w-60 flex-shrink-0 border-r'}`}
      style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-surface-1)' }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center hover-lift" style={{ backgroundColor: 'var(--color-surface-3)' }}>
            <Key className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Vault
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Search (⌘K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onNewEntry}
            className="p-1.5 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="New Entry (⌘N)"
            aria-label="New entry"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={lockVault}
            className="p-1.5 rounded-md transition-all duration-200 icon-hover"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Lock Vault (⌘L)"
            aria-label="Lock vault"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item, index) => (
          <button
            key={item.id ?? 'all'}
            onClick={() => handleSelectCategory(item.id)}
            className={`sidebar-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-200 ${
              selectedCategory === item.id ? 'font-medium' : ''
            } stagger-item`}
            style={{
              backgroundColor: selectedCategory === item.id ? 'var(--color-surface-2)' : 'transparent',
              color: selectedCategory === item.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              animationDelay: `${index * 50}ms`,
            }}
          >
            <item.icon className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== null && (
              <span className="text-xs tabular-nums transition-all duration-200" style={{ color: 'var(--color-text-muted)' }}>
                {item.count}
              </span>
            )}
          </button>
        ))}

        {/* Categories */}
        <div className="pt-3">
          <button
            onClick={() => setCategoriesExpanded(!categoriesExpanded)}
            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-all duration-200 hover:text-current"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${categoriesExpanded ? 'rotate-0' : '-rotate-90'}`} />
            Categories
          </button>
          {categoriesExpanded && (
            <div className="mt-0.5 space-y-0.5 animate-fade-in">
              {categories.map((cat, index) => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`sidebar-item w-full flex items-center gap-2.5 px-2.5 py-1.5 pl-7 rounded-md text-sm transition-all duration-200 stagger-item`}
                  style={{
                    backgroundColor: selectedCategory === cat ? 'var(--color-surface-2)' : 'transparent',
                    color: selectedCategory === cat ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="truncate">{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-200 sidebar-item"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Settings className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
          Settings
        </button>
      </div>
    </aside>
  );
}
