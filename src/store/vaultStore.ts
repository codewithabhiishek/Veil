import { create } from 'zustand';
import type { VaultData, VaultEntry, VaultState, VaultSettings, UnlockMethod } from '../types/vault';
import {
  encryptVault,
  decryptVault,
  loadEncryptedVault,
  saveEncryptedVault,
  deleteEncryptedVault,
  unlockWithPin,
  unlockWithBiometric,
  setupPinUnlock,
  removePinUnlock,
  setupBiometricUnlock,
  removeBiometricUnlock,
  getVaultKey,
  isBiometricAvailable,
} from '../crypto/engine';

interface VaultStore {
  state: VaultState;
  vaultData: VaultData | null;
  settings: VaultSettings;
  selectedEntryId: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  lastActivity: number;
  lastMasterPassword: string | null;
  biometricAvailable: boolean;
  
  // Actions
  createVault: (masterPassword: string) => Promise<void>;
  unlockVault: (masterPassword: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  lockVault: () => void;
  deleteVault: () => void;
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  selectEntry: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  updateSettings: (settings: Partial<VaultSettings>) => void;
  recordActivity: () => void;
  getFilteredEntries: () => VaultEntry[];
  getCategories: () => string[];
  getFavorites: () => VaultEntry[];
  getRecentEntries: (count: number) => VaultEntry[];
  setupPin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<void>;
  setupBiometric: () => Promise<boolean>;
  removeBiometric: () => void;
  checkBiometricAvailability: () => Promise<void>;
  hasPin: () => boolean;
  hasBiometric: () => boolean;
}

const DEFAULT_SETTINGS: VaultSettings = {
  autoLockTimeout: 5,
  clipboardClearTimeout: 30,
  theme: 'system',
  pinEnabled: false,
  biometricEnabled: false,
};

function loadSettings(): VaultSettings {
  try {
    const raw = localStorage.getItem('vault_settings');
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: VaultSettings): void {
  localStorage.setItem('vault_settings', JSON.stringify(settings));
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  state: loadEncryptedVault() ? 'locked' : 'uninitialized',
  vaultData: null,
  settings: loadSettings(),
  selectedEntryId: null,
  searchQuery: '',
  selectedCategory: null,
  lastActivity: Date.now(),
  lastMasterPassword: null,
  biometricAvailable: false,

  createVault: async (masterPassword: string) => {
    const vaultData: VaultData = {
      entries: [],
      categories: ['Personal', 'Work', 'Finance', 'Social', 'Other'],
    };
    
    const encrypted = await encryptVault(masterPassword, vaultData);
    saveEncryptedVault(encrypted);
    
    set({
      state: 'unlocked',
      vaultData,
      lastMasterPassword: masterPassword,
      lastActivity: Date.now(),
    });
  },

  unlockVault: async (masterPassword: string) => {
    const encrypted = loadEncryptedVault();
    if (!encrypted) throw new Error('NO_VAULT');
    
    const vaultData = await decryptVault(masterPassword, encrypted);
    
    set({
      state: 'unlocked',
      vaultData,
      lastMasterPassword: masterPassword,
      lastActivity: Date.now(),
    });
  },

  unlockWithPin: async (pin: string) => {
    const encrypted = loadEncryptedVault();
    if (!encrypted) throw new Error('NO_VAULT');
    
    const vaultData = await unlockWithPin(pin, encrypted);
    
    set({
      state: 'unlocked',
      vaultData,
      lastActivity: Date.now(),
    });
  },

  unlockWithBiometric: async () => {
    const encrypted = loadEncryptedVault();
    if (!encrypted) return false;
    
    const vaultData = await unlockWithBiometric(encrypted);
    if (!vaultData) return false;
    
    set({
      state: 'unlocked',
      vaultData,
      lastActivity: Date.now(),
    });
    return true;
  },

  lockVault: () => {
    set({
      state: 'locked',
      vaultData: null,
      selectedEntryId: null,
      searchQuery: '',
      lastMasterPassword: null,
    });
  },

  deleteVault: () => {
    deleteEncryptedVault();
    set({
      state: 'uninitialized',
      vaultData: null,
      selectedEntryId: null,
      lastMasterPassword: null,
      settings: { ...DEFAULT_SETTINGS },
    });
    localStorage.removeItem('vault_settings');
  },

  addEntry: async (entry) => {
    const { vaultData, lastMasterPassword } = get();
    if (!vaultData || !lastMasterPassword) return;
    
    const now = Date.now();
    const newEntry: VaultEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    };
    
    const updatedData: VaultData = {
      ...vaultData,
      entries: [...vaultData.entries, newEntry],
    };
    
    const encrypted = await encryptVault(lastMasterPassword, updatedData);
    // Preserve PIN/biometric settings from existing vault
    const existing = loadEncryptedVault();
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted);
    
    set({ vaultData: updatedData, selectedEntryId: newEntry.id, lastActivity: now });
  },

  updateEntry: async (id: string, updates: Partial<VaultEntry>) => {
    const { vaultData, lastMasterPassword } = get();
    if (!vaultData || !lastMasterPassword) return;
    
    const now = Date.now();
    const updatedData: VaultData = {
      ...vaultData,
      entries: vaultData.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: now } : e
      ),
    };
    
    const encrypted = await encryptVault(lastMasterPassword, updatedData);
    const existing = loadEncryptedVault();
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted);
    
    set({ vaultData: updatedData, lastActivity: now });
  },

  deleteEntry: async (id: string) => {
    const { vaultData, lastMasterPassword, selectedEntryId } = get();
    if (!vaultData || !lastMasterPassword) return;
    
    const updatedData: VaultData = {
      ...vaultData,
      entries: vaultData.entries.filter((e) => e.id !== id),
    };
    
    const encrypted = await encryptVault(lastMasterPassword, updatedData);
    const existing = loadEncryptedVault();
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted);
    
    set({
      vaultData: updatedData,
      selectedEntryId: selectedEntryId === id ? null : selectedEntryId,
      lastActivity: Date.now(),
    });
  },

  selectEntry: (id: string | null) => {
    const { vaultData } = get();
    if (id && vaultData) {
      const entry = vaultData.entries.find(e => e.id === id);
      if (entry) {
        const updatedData = {
          ...vaultData,
          entries: vaultData.entries.map(e =>
            e.id === id ? { ...e, lastAccessedAt: Date.now() } : e
          ),
        };
        set({ selectedEntryId: id, vaultData: updatedData, lastActivity: Date.now() });
        return;
      }
    }
    set({ selectedEntryId: id, lastActivity: Date.now() });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, lastActivity: Date.now() });
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category, lastActivity: Date.now() });
  },

  updateSettings: (newSettings: Partial<VaultSettings>) => {
    const { settings } = get();
    const updated = { ...settings, ...newSettings };
    saveSettings(updated);
    set({ settings: updated });
  },

  recordActivity: () => {
    set({ lastActivity: Date.now() });
  },

  getFilteredEntries: () => {
    const { vaultData, searchQuery, selectedCategory } = get();
    if (!vaultData) return [];
    
    let entries = vaultData.entries;
    
    if (selectedCategory) {
      if (selectedCategory === '__favorites__') {
        entries = entries.filter(e => e.favorite);
      } else if (selectedCategory === '__recent__') {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        entries = entries.filter(e => e.lastAccessedAt > oneDayAgo);
      } else {
        entries = entries.filter(e => e.category === selectedCategory);
      }
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.url.toLowerCase().includes(q)
      );
    }
    
    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getCategories: () => {
    const { vaultData } = get();
    if (!vaultData) return [];
    const cats = new Set<string>();
    vaultData.entries.forEach(e => { if (e.category) cats.add(e.category); });
    vaultData.categories.forEach(c => cats.add(c));
    return Array.from(cats).sort();
  },

  getFavorites: () => {
    const { vaultData } = get();
    if (!vaultData) return [];
    return vaultData.entries.filter(e => e.favorite);
  },

  getRecentEntries: (count: number) => {
    const { vaultData } = get();
    if (!vaultData) return [];
    return [...vaultData.entries]
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, count);
  },

  setupPin: async (pin: string) => {
    const { lastMasterPassword } = get();
    if (!lastMasterPassword) return false;
    
    const encrypted = loadEncryptedVault();
    if (!encrypted) return false;
    
    try {
      const vaultKey = await getVaultKey(lastMasterPassword, encrypted);
      const updated = await setupPinUnlock(pin, vaultKey, encrypted);
      saveEncryptedVault(updated);
      
      const { settings } = get();
      const newSettings = { ...settings, pinEnabled: true };
      saveSettings(newSettings);
      set({ settings: newSettings });
      return true;
    } catch {
      return false;
    }
  },

  removePin: async () => {
    const encrypted = loadEncryptedVault();
    if (!encrypted) return;
    
    const updated = removePinUnlock(encrypted);
    saveEncryptedVault(updated);
    
    const { settings } = get();
    const newSettings = { ...settings, pinEnabled: false };
    saveSettings(newSettings);
    set({ settings: newSettings });
  },

  setupBiometric: async () => {
    const { lastMasterPassword } = get();
    if (!lastMasterPassword) return false;
    
    const encrypted = loadEncryptedVault();
    if (!encrypted) return false;
    
    try {
      const vaultKey = await getVaultKey(lastMasterPassword, encrypted);
      const result = await setupBiometricUnlock(vaultKey, encrypted);
      
      if (result.success) {
        saveEncryptedVault(result.vault);
        const { settings } = get();
        const newSettings = { ...settings, biometricEnabled: true };
        saveSettings(newSettings);
        set({ settings: newSettings });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  removeBiometric: () => {
    const encrypted = loadEncryptedVault();
    if (!encrypted) return;
    
    const updated = removeBiometricUnlock(encrypted);
    saveEncryptedVault(updated);
    
    const { settings } = get();
    const newSettings = { ...settings, biometricEnabled: false };
    saveSettings(newSettings);
    set({ settings: newSettings });
  },

  checkBiometricAvailability: async () => {
    const available = await isBiometricAvailable();
    set({ biometricAvailable: available });
  },

  hasPin: () => {
    const encrypted = loadEncryptedVault();
    return !!(encrypted?.pinSalt && encrypted?.pinWrappedKey);
  },

  hasBiometric: () => {
    const encrypted = loadEncryptedVault();
    return !!(encrypted?.webauthnCredentialId && encrypted?.webauthnWrappedKey);
  },
}));
