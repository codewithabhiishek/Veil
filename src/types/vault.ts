export interface VaultEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  recoveryEmail: string;
  recoveryCodes: string[];
  totpSecret: string;
  notes: string;
  category: string;
  tags: string[];
  favorite: boolean;
  customFields: CustomField[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'sensitive';
}

export interface VaultData {
  entries: VaultEntry[];
  categories: string[];
}

export interface VaultMetadata {
  salt: string;
  iv: string;
  version: number;
  createdAt: number;
  lastModified: number;
}

export interface EncryptedVault {
  metadata: VaultMetadata;
  ciphertext: string;
  // PIN unlock support
  pinSalt?: string;
  pinIv?: string;
  pinWrappedKey?: string; // vault key encrypted with PIN-derived key
  // WebAuthn / biometric support
  webauthnCredentialId?: string;
  webauthnWrappedKey?: string; // vault key encrypted with WebAuthn-derived key
}

export interface VaultSettings {
  autoLockTimeout: number; // minutes, 0 = never
  clipboardClearTimeout: number; // seconds
  theme: 'light' | 'dark' | 'system';
  pinEnabled: boolean;
  biometricEnabled: boolean;
}

export type VaultState = 'uninitialized' | 'locked' | 'unlocked';
export type UnlockMethod = 'password' | 'pin' | 'biometric';

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}
