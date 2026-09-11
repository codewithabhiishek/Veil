import { useState, useEffect, useCallback } from 'react';
import { useVaultStore } from './store/vaultStore';
import { useAutoLock, useKeyboardShortcuts } from './hooks/useVault';
import { ToastProvider } from './components/Toast';
import { LockScreen } from './components/LockScreenRouter';
import { CreateVault } from './components/CreateVault';
import { Sidebar } from './components/Sidebar';
import { EntryList } from './components/EntryList';
import { EntryDetail } from './components/EntryDetail';
import { EntryForm } from './components/EntryForm';
import { SearchModal } from './components/SearchModal';
import { Settings } from './components/Settings';
import { VaultSkeleton, UnlockSkeleton } from './components/Skeleton';
import { Menu, Search, Plus } from 'lucide-react';

function App() {
  const { state, settings } = useVaultStore();
  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | undefined>();
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useAutoLock();

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme;

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        root.classList.toggle('dark', e.matches);
        root.classList.toggle('light', !e.matches);
      };
      handler(mq);
      mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
      return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  }, [settings.theme]);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleNewEntry = useCallback(() => {
    setEditingEntryId(undefined);
    setShowForm(true);
    setSidebarOpen(false);
  }, []);

  const handleEditEntry = useCallback(() => {
    const { selectedEntryId } = useVaultStore.getState();
    if (selectedEntryId) {
      setEditingEntryId(selectedEntryId);
      setShowForm(true);
    }
  }, []);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
    setSidebarOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setSidebarOpen(false);
  }, []);

  useKeyboardShortcuts({
    onSearch: handleOpenSearch,
    onNewEntry: handleNewEntry,
    onLock: () => useVaultStore.getState().lockVault(),
    onEscape: () => {
      if (showSearch) setShowSearch(false);
      else if (showForm) setShowForm(false);
      else if (showSettings) setShowSettings(false);
    },
  });

  // Handle entry selection on mobile
  const { selectedEntryId } = useVaultStore();
  useEffect(() => {
    if (isMobile && selectedEntryId) {
      setMobileView('detail');
    }
  }, [selectedEntryId, isMobile]);

  // Show skeleton during initial load
  if (isLoading) {
    if (state === 'locked') {
      return <UnlockSkeleton />;
    }
    return <VaultSkeleton />;
  }

  // Render based on vault state
  if (state === 'uninitialized') {
    return (
      <ToastProvider>
        <CreateVault />
      </ToastProvider>
    );
  }

  if (state === 'locked') {
    return (
      <ToastProvider>
        <LockScreen />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="h-screen flex flex-col overflow-hidden animate-fade-in" style={{ backgroundColor: 'var(--color-surface-0)' }}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between px-4 py-3 md:hidden animate-fade-in-down" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-center gap-2">
              {mobileView === 'detail' ? (
                <button
                  onClick={() => setMobileView('list')}
                  className="p-1.5 rounded-md transition-all duration-200 btn-press"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Back to list"
                >
                  ←
                </button>
              ) : (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-md transition-all duration-200 icon-hover"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Open menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Vault
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenSearch}
                className="p-2 rounded-md transition-all duration-200 icon-hover"
                style={{ color: 'var(--color-text-tertiary)' }}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleNewEntry}
                className="p-2 rounded-md transition-all duration-200 icon-hover"
                style={{ color: 'var(--color-text-tertiary)' }}
                aria-label="New entry"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-40 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setSidebarOpen(false)}>
              <div className="w-72 h-full" onClick={(e) => e.stopPropagation()}>
                <Sidebar
                  onNewEntry={handleNewEntry}
                  onOpenSearch={handleOpenSearch}
                  onOpenSettings={handleOpenSettings}
                  isMobile
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar
              onNewEntry={handleNewEntry}
              onOpenSearch={handleOpenSearch}
              onOpenSettings={handleOpenSettings}
            />
          )}

          {/* Entry List */}
          {(!isMobile || mobileView === 'list') && (
            <EntryList onNewEntry={handleNewEntry} />
          )}

          {/* Entry Detail */}
          {(!isMobile || mobileView === 'detail') && (
            <EntryDetail onEdit={handleEditEntry} />
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <EntryForm
            entryId={editingEntryId}
            onClose={() => { setShowForm(false); setEditingEntryId(undefined); }}
          />
        )}

        {showSearch && (
          <SearchModal onClose={() => setShowSearch(false)} />
        )}

        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
