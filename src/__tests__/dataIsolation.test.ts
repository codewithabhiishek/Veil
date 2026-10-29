import {
  BASE_VAULT_KEY,
  BASE_SETTINGS_KEY,
  DEFAULT_VAULT_ID,
  sanitizeVaultId,
  getActiveVaultId,
  setActiveVaultId,
  getScopedVaultStorageKey,
  getScopedSettingsKey,
  migrateLegacyVaultIfNeeded,
  loadEncryptedVault,
  saveEncryptedVault,
  deleteEncryptedVault,
} from '../crypto/engine.ts';
import type { EncryptedVault, VaultMetadata } from '../types/vault.ts';

export function runDataIsolationTests(): void {
  function assertEqual<T>(actual: T, expected: T, msg: string): void {
    if (actual !== expected) {
      throw new Error(`FAIL: ${msg} (expected ${expected}, got ${actual})`);
    }
    console.log(`PASS: ${msg}`);
  }

  function assertTrue(actual: boolean, msg: string): void {
    if (!actual) {
      throw new Error(`FAIL: ${msg}`);
    }
    console.log(`PASS: ${msg}`);
  }

  // Setup localStorage mock in Node environment
  const mockStorage = new Map<string, string>();
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };

  try {
    // 1. Test sanitizeVaultId
    assertEqual(sanitizeVaultId(null), DEFAULT_VAULT_ID, "sanitizeVaultId(null) defaults to 'default'");
    assertEqual(sanitizeVaultId(undefined), DEFAULT_VAULT_ID, "sanitizeVaultId(undefined) defaults to 'default'");
    assertEqual(sanitizeVaultId(''), DEFAULT_VAULT_ID, "sanitizeVaultId('') defaults to 'default'");
    assertEqual(sanitizeVaultId('   '), DEFAULT_VAULT_ID, "sanitizeVaultId('   ') defaults to 'default'");
    assertEqual(sanitizeVaultId('Personal_Vault'), 'personal_vault', 'sanitizeVaultId lowercases name');
    assertEqual(sanitizeVaultId('Work Secret@Vault!'), 'work_secret_vault_', 'sanitizeVaultId strips symbols');

    // 2. Test scoped keys
    assertEqual(
      getScopedVaultStorageKey('alice'),
      `${BASE_VAULT_KEY}:alice`,
      'getScopedVaultStorageKey returns expected format'
    );
    assertEqual(
      getScopedSettingsKey('bob'),
      `${BASE_SETTINGS_KEY}:bob`,
      'getScopedSettingsKey returns expected format'
    );

    // 3. Test active vault state
    setActiveVaultId('work');
    assertEqual(getActiveVaultId(), 'work', 'getActiveVaultId reflects setActiveVaultId');
    assertEqual(getScopedVaultStorageKey(), `${BASE_VAULT_KEY}:work`, 'getScopedVaultStorageKey uses active vault ID');

    // 4. Test legacy migration
    mockStorage.clear();
    const mockLegacyVault: EncryptedVault = {
      metadata: {
        salt: 'mock-salt',
        iv: 'mock-iv',
        version: 1,
        createdAt: 1000,
        lastModified: 1000,
      },
      ciphertext: 'mock-ciphertext',
    };
    mockStorage.set('vault_encrypted_data', JSON.stringify(mockLegacyVault));
    mockStorage.set('vault_settings', JSON.stringify({ theme: 'dark', autoLockTimeout: 10 }));

    migrateLegacyVaultIfNeeded();

    const migratedVault = mockStorage.get(`${BASE_VAULT_KEY}:${DEFAULT_VAULT_ID}`);
    assertTrue(migratedVault !== null && migratedVault !== undefined, 'Legacy vault migrated to default scoped key');
    const parsedMigrated = JSON.parse(migratedVault!);
    assertEqual(parsedMigrated.ciphertext, 'mock-ciphertext', 'Migrated vault matches legacy ciphertext');

    const migratedSettings = mockStorage.get(`${BASE_SETTINGS_KEY}:${DEFAULT_VAULT_ID}`);
    assertTrue(migratedSettings !== null, 'Legacy settings migrated to default scoped key');
    const parsedSettings = JSON.parse(migratedSettings!);
    assertEqual(parsedSettings.theme, 'dark', 'Migrated settings match legacy values');

    // 5. Test multi-vault isolation
    mockStorage.clear();
    const vaultAlice: EncryptedVault = {
      metadata: { salt: 'alice-salt', iv: 'alice-iv', version: 1, createdAt: 1, lastModified: 1 },
      ciphertext: 'alice-secret-payload',
    };
    const vaultBob: EncryptedVault = {
      metadata: { salt: 'bob-salt', iv: 'bob-iv', version: 1, createdAt: 2, lastModified: 2 },
      ciphertext: 'bob-secret-payload',
    };

    saveEncryptedVault(vaultAlice, 'alice');
    saveEncryptedVault(vaultBob, 'bob');

    const loadedAlice = loadEncryptedVault('alice');
    assertTrue(loadedAlice !== null, 'Alice vault loads correctly');
    assertEqual(loadedAlice?.ciphertext, 'alice-secret-payload', 'Alice ciphertext is intact');

    const loadedBob = loadEncryptedVault('bob');
    assertTrue(loadedBob !== null, 'Bob vault loads correctly');
    assertEqual(loadedBob?.ciphertext, 'bob-secret-payload', 'Bob ciphertext is intact');

    // Delete Alice's vault and ensure Bob's vault is untouched
    deleteEncryptedVault('alice');
    assertEqual(loadEncryptedVault('alice'), null, 'Alice vault is deleted');
    const remainingBob = loadEncryptedVault('bob');
    assertTrue(remainingBob !== null, 'Bob vault is completely preserved after Alice deletion');
    assertEqual(remainingBob?.ciphertext, 'bob-secret-payload', 'Bob data has no leakage or corruption');
  } finally {
    (globalThis as any).localStorage = originalLocalStorage;
  }
}
