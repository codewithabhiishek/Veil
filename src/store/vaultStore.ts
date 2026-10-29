import { create } from 'zustand';
import type { VaultData, VaultEntry, VaultState, VaultSettings } from '../types/vault';
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
  getActiveVaultId,
  setActiveVaultId,
  sanitizeVaultId,
  getScopedSettingsKey,
  DEFAULT_VAULT_ID,
  BASE_VAULT_KEY,
} from '../crypto/engine';
import { haptics } from '../lib/haptics';

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
  activeVaultId: string;
  
  // Actions
  switchVault: (vaultId: string) => void;
  getAvailableVaults: () => string[];
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

function loadSettings(vaultId?: string): VaultSettings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(getScopedSettingsKey(vaultId));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: VaultSettings, vaultId?: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(getScopedSettingsKey(vaultId), JSON.stringify(settings));
    }
  } catch {
    /* ignore storage errors */
  }
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
  activeVaultId: getActiveVaultId(),

  switchVault: (newVaultId: string) => {
    const cleanId = sanitizeVaultId(newVaultId);
    setActiveVaultId(cleanId);
    const hasData = !!loadEncryptedVault(cleanId);
    haptics.select();
    set({
      activeVaultId: cleanId,
      state: hasData ? 'locked' : 'uninitialized',
      vaultData: null,
      selectedEntryId: null,
      searchQuery: '',
      selectedCategory: null,
      lastMasterPassword: null,
      settings: loadSettings(cleanId),
    });
  },

  getAvailableVaults: () => {
    const vaults = new Set<string>([DEFAULT_VAULT_ID, 'work', 'personal']);
    try {
      if (typeof localStorage !== 'undefined') {
        const prefix = `${BASE_VAULT_KEY}:`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const id = key.slice(prefix.length);
            if (id) vaults.add(id);
          }
        }
      }
    } catch {
      /* ignore */
    }
    return Array.from(vaults);
  },

  createVault: async (masterPassword: string) => {
    const vaultData: VaultData = {
      entries: [],
      categories: ['Personal', 'Work', 'Finance', 'Social', 'Other'],
    };
    
    const encrypted = await encryptVault(masterPassword, vaultData);
    saveEncryptedVault(encrypted, get().activeVaultId);
    haptics.unlock();
    
    set({
      state: 'unlocked',
      vaultData,
      lastMasterPassword: masterPassword,
      lastActivity: Date.now(),
    });
  },

  unlockVault: async (masterPassword: string) => {
    const encrypted = loadEncryptedVault(get().activeVaultId);
    if (!encrypted) throw new Error('NO_VAULT');
    
    const vaultData = await decryptVault(masterPassword, encrypted);
    haptics.unlock();
    
    set({
      state: 'unlocked',
      vaultData,
      lastMasterPassword: masterPassword,
      lastActivity: Date.now(),
    });
  },

  unlockWithPin: async (pin: string) => {
    const encrypted = loadEncryptedVault(get().activeVaultId);
    if (!encrypted) throw new Error('NO_VAULT');
    
    const vaultData = await unlockWithPin(pin, encrypted);
    haptics.unlock();
    
    set({
      state: 'unlocked',
      vaultData,
      lastActivity: Date.now(),
    });
  },

  unlockWithBiometric: async () => {
    const encrypted = loadEncryptedVault(get().activeVaultId);
    if (!encrypted) return false;
    
    const vaultData = await unlockWithBiometric(encrypted);
    if (!vaultData) return false;
    
    haptics.unlock();
    set({
      state: 'unlocked',
      vaultData,
      lastActivity: Date.now(),
    });
    return true;
  },

  lockVault: () => {
    haptics.lock();
    set({
      state: 'locked',
      vaultData: null,
      selectedEntryId: null,
      searchQuery: '',
      lastMasterPassword: null,
    });
  },

  deleteVault: () => {
    const { activeVaultId } = get();
    deleteEncryptedVault(activeVaultId);
    haptics.delete();
    set({
      state: 'uninitialized',
      vaultData: null,
      selectedEntryId: null,
      lastMasterPassword: null,
      settings: { ...DEFAULT_SETTINGS },
    });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(getScopedSettingsKey(activeVaultId));
      }
    } catch {
      /* ignore */
    }
  },

  addEntry: async (entry) => {
    const { vaultData, lastMasterPassword, activeVaultId } = get();
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
    const existing = loadEncryptedVault(activeVaultId);
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted, activeVaultId);
    
    set({ vaultData: updatedData, selectedEntryId: newEntry.id, lastActivity: now });
  },

  updateEntry: async (id: string, updates: Partial<VaultEntry>) => {
    const { vaultData, lastMasterPassword, activeVaultId } = get();
    if (!vaultData || !lastMasterPassword) return;
    
    const now = Date.now();
    const updatedData: VaultData = {
      ...vaultData,
      entries: vaultData.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: now } : e
      ),
    };
    
    const encrypted = await encryptVault(lastMasterPassword, updatedData);
    const existing = loadEncryptedVault(activeVaultId);
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted, activeVaultId);
    
    set({ vaultData: updatedData, lastActivity: now });
  },

  deleteEntry: async (id: string) => {
    const { vaultData, lastMasterPassword, selectedEntryId, activeVaultId } = get();
    if (!vaultData || !lastMasterPassword) return;
    
    haptics.delete();
    const updatedData: VaultData = {
      ...vaultData,
      entries: vaultData.entries.filter((e) => e.id !== id),
    };
    
    const encrypted = await encryptVault(lastMasterPassword, updatedData);
    const existing = loadEncryptedVault(activeVaultId);
    if (existing) {
      encrypted.pinSalt = existing.pinSalt;
      encrypted.pinIv = existing.pinIv;
      encrypted.pinWrappedKey = existing.pinWrappedKey;
      encrypted.webauthnCredentialId = existing.webauthnCredentialId;
      encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
    }
    saveEncryptedVault(encrypted, activeVaultId);
    
    set({
      vaultData: updatedData,
      selectedEntryId: selectedEntryId === id ? null : selectedEntryId,
      lastActivity: Date.now(),
    });
  },

  selectEntry: (id: string | null) => {
    if (id) {
      const { vaultData, lastMasterPassword, activeVaultId } = get();
      if (vaultData && lastMasterPassword) {
        const now = Date.now();
        const updatedData: VaultData = {
          ...vaultData,
          entries: vaultData.entries.map((e) =>
            e.id === id ? { ...e, lastAccessedAt: now } : e
          ),
        };
        encryptVault(lastMasterPassword, updatedData).then((encrypted) => {
          const existing = loadEncryptedVault(activeVaultId);
          if (existing) {
            encrypted.pinSalt = existing.pinSalt;
            encrypted.pinIv = existing.pinIv;
            encrypted.pinWrappedKey = existing.pinWrappedKey;
            encrypted.webauthnCredentialId = existing.webauthnCredentialId;
            encrypted.webauthnWrappedKey = existing.webauthnWrappedKey;
          }
          saveEncryptedVault(encrypted, activeVaultId);
        });
        set({ vaultData: updatedData });
      }
    }
    set({ selectedEntryId: id, lastActivity: Date.now() });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedCategory: (category: string | null) => {
    haptics.select();
    set({ selectedCategory: category, selectedEntryId: null });
  },

  updateSettings: (newSettings: Partial<VaultSettings>) => {
    const { settings, activeVaultId } = get();
    const updated = { ...settings, ...newSettings };
    saveSettings(updated, activeVaultId);
    set({ settings: updated });
  },

  recordActivity: () => {
    set({ lastActivity: Date.now() });
  },

  getFilteredEntries: () => {
    const { vaultData, searchQuery, selectedCategory } = get();
    if (!vaultData) return [];

    return vaultData.entries.filter((entry) => {
      const matchesSearch =
        searchQuery === '' ||
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === null ||
        (selectedCategory === 'Favorites' ? entry.favorite : entry.category === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  },

  getCategories: () => {
    const { vaultData } = get();
    if (!vaultData) return [];
    return vaultData.categories;
  },

  getFavorites: () => {
    const { vaultData } = get();
    if (!vaultData) return [];
    return vaultData.entries.filter((e) => e.favorite);
  },

  getRecentEntries: (count: number) => {
    const { vaultData } = get();
    if (!vaultData) return [];
    return [...vaultData.entries]
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, count);
  },

  setupPin: async (pin: string) => {
    const { lastMasterPassword, activeVaultId } = get();
    if (!lastMasterPassword) return false;
    
    const encrypted = loadEncryptedVault(activeVaultId);
    if (!encrypted) return false;
    
    try {
      const vaultKey = await getVaultKey(lastMasterPassword, encrypted);
      const updated = await setupPinUnlock(pin, vaultKey, encrypted);
      saveEncryptedVault(updated, activeVaultId);
      
      const { settings } = get();
      const newSettings = { ...settings, pinEnabled: true };
      saveSettings(newSettings, activeVaultId);
      set({ settings: newSettings });
      return true;
    } catch {
      return false;
    }
  },

  removePin: async () => {
    const { activeVaultId } = get();
    const encrypted = loadEncryptedVault(activeVaultId);
    if (!encrypted) return;
    
    const updated = removePinUnlock(encrypted);
    saveEncryptedVault(updated, activeVaultId);
    
    const { settings } = get();
    const newSettings = { ...settings, pinEnabled: false };
    saveSettings(newSettings, activeVaultId);
    set({ settings: newSettings });
  },

  setupBiometric: async () => {
    const { lastMasterPassword, activeVaultId } = get();
    if (!lastMasterPassword) return false;
    
    const encrypted = loadEncryptedVault(activeVaultId);
    if (!encrypted) return false;
    
    try {
      const vaultKey = await getVaultKey(lastMasterPassword, encrypted);
      const result = await setupBiometricUnlock(vaultKey, encrypted);
      
      if (result.success) {
        saveEncryptedVault(result.vault, activeVaultId);
        const { settings } = get();
        const newSettings = { ...settings, biometricEnabled: true };
        saveSettings(newSettings, activeVaultId);
        set({ settings: newSettings });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  removeBiometric: () => {
    const { activeVaultId } = get();
    const encrypted = loadEncryptedVault(activeVaultId);
    if (!encrypted) return;
    
    const updated = removeBiometricUnlock(encrypted);
    saveEncryptedVault(updated, activeVaultId);
    
    const { settings } = get();
    const newSettings = { ...settings, biometricEnabled: false };
    saveSettings(newSettings, activeVaultId);
    set({ settings: newSettings });
  },

  checkBiometricAvailability: async () => {
    const available = await isBiometricAvailable();
    set({ biometricAvailable: available });
  },

  hasPin: () => {
    const encrypted = loadEncryptedVault(get().activeVaultId);
    return !!(encrypted?.pinSalt && encrypted?.pinWrappedKey);
  },

  hasBiometric: () => {
    const encrypted = loadEncryptedVault(get().activeVaultId);
    return !!(encrypted?.webauthnCredentialId && encrypted?.webauthnWrappedKey);
  },
}));
