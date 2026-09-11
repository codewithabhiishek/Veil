import { argon2id } from 'hash-wasm';
import type { VaultData, EncryptedVault, VaultMetadata, PasswordGeneratorOptions } from '../types/vault';

const VAULT_VERSION = 1;
const ARGON2_ITERATIONS = 3;
const ARGON2_MEMORY = 65536;
const ARGON2_PARALLELISM = 4;
const ARGON2_HASH_LEN = 32;
const PIN_PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toBufferSource(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

// Derive vault key from master password using Argon2id
export async function deriveKeyFromPassword(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltBase64 = arrayBufferToBase64(toBufferSource(salt));
  
  const derivedKeyMaterial = await argon2id({
    password: masterPassword,
    salt: saltBase64,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY,
    hashLength: ARGON2_HASH_LEN,
    outputType: 'binary',
  });

  const keyData = new Uint8Array(derivedKeyMaterial);
  const key = await crypto.subtle.importKey(
    'raw',
    toBufferSource(keyData),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  keyData.fill(0);
  return key;
}

// Derive key from PIN using PBKDF2 (faster for mobile)
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations: PIN_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Wrap (encrypt) the vault key with another key
async function wrapKey(vaultKey: CryptoKey, wrappingKey: CryptoKey): Promise<{ wrapped: string; iv: string }> {
  const iv = randomBytes(12);
  const exported = await crypto.subtle.exportKey('raw', vaultKey);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    wrappingKey,
    exported
  );

  return {
    wrapped: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(toBufferSource(iv)),
  };
}

// Unwrap (decrypt) the vault key
async function unwrapKey(wrappedKey: string, ivBase64: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
  const wrapped = base64ToArrayBuffer(wrappedKey);
  const iv = base64ToArrayBuffer(ivBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    unwrappingKey,
    wrapped
  );

  return crypto.subtle.importKey(
    'raw',
    decrypted,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Create vault with master password
export async function encryptVault(
  masterPassword: string,
  vaultData: VaultData,
  existingMetadata?: VaultMetadata
): Promise<EncryptedVault> {
  const salt = existingMetadata 
    ? new Uint8Array(base64ToArrayBuffer(existingMetadata.salt))
    : randomBytes(16);
  
  const iv = randomBytes(12);
  const key = await deriveKeyFromPassword(masterPassword, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(vaultData));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    key,
    plaintext.buffer as ArrayBuffer
  );

  const metadata: VaultMetadata = {
    salt: arrayBufferToBase64(toBufferSource(salt)),
    iv: arrayBufferToBase64(toBufferSource(iv)),
    version: VAULT_VERSION,
    createdAt: existingMetadata?.createdAt ?? Date.now(),
    lastModified: Date.now(),
  };

  return {
    metadata,
    ciphertext: arrayBufferToBase64(ciphertext),
  };
}

// Decrypt vault with master password
export async function decryptVault(
  masterPassword: string,
  encryptedVault: EncryptedVault
): Promise<VaultData> {
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedVault.metadata.salt));
  const iv = base64ToArrayBuffer(encryptedVault.metadata.iv);
  const key = await deriveKeyFromPassword(masterPassword, salt);
  const ciphertext = base64ToArrayBuffer(encryptedVault.ciphertext);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoded = new TextDecoder().decode(plaintext);
    return JSON.parse(decoded) as VaultData;
  } catch {
    throw new Error('INVALID_PASSWORD');
  }
}

// Setup PIN unlock
export async function setupPinUnlock(
  pin: string,
  vaultKey: CryptoKey,
  existingVault: EncryptedVault
): Promise<EncryptedVault> {
  const pinSalt = randomBytes(16);
  const pinKey = await deriveKeyFromPin(pin, pinSalt);
  const { wrapped, iv } = await wrapKey(vaultKey, pinKey);

  return {
    ...existingVault,
    pinSalt: arrayBufferToBase64(toBufferSource(pinSalt)),
    pinIv: iv,
    pinWrappedKey: wrapped,
  };
}

// Unlock vault with PIN
export async function unlockWithPin(
  pin: string,
  encryptedVault: EncryptedVault
): Promise<VaultData> {
  if (!encryptedVault.pinSalt || !encryptedVault.pinIv || !encryptedVault.pinWrappedKey) {
    throw new Error('PIN_NOT_CONFIGURED');
  }

  const pinSalt = new Uint8Array(base64ToArrayBuffer(encryptedVault.pinSalt));
  const pinKey = await deriveKeyFromPin(pin, pinSalt);

  try {
    const vaultKey = await unwrapKey(encryptedVault.pinWrappedKey, encryptedVault.pinIv, pinKey);
    const iv = base64ToArrayBuffer(encryptedVault.metadata.iv);
    const ciphertext = base64ToArrayBuffer(encryptedVault.ciphertext);
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      vaultKey,
      ciphertext
    );

    const decoded = new TextDecoder().decode(plaintext);
    return JSON.parse(decoded) as VaultData;
  } catch {
    throw new Error('INVALID_PIN');
  }
}

// Remove PIN unlock
export function removePinUnlock(encryptedVault: EncryptedVault): EncryptedVault {
  const { pinSalt, pinIv, pinWrappedKey, ...rest } = encryptedVault;
  return rest as EncryptedVault;
}

// Get the vault key from master password
export async function getVaultKey(
  masterPassword: string,
  encryptedVault: EncryptedVault
): Promise<CryptoKey> {
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedVault.metadata.salt));
  return deriveKeyFromPassword(masterPassword, salt);
}

// ============ WebAuthn / Biometric Support ============

export function isWebAuthnAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof PublicKeyCredential !== 'undefined' &&
         typeof navigator.credentials !== 'undefined';
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Setup biometric unlock
export async function setupBiometricUnlock(
  vaultKey: CryptoKey,
  existingVault: EncryptedVault
): Promise<{ vault: EncryptedVault; success: boolean }> {
  if (!isWebAuthnAvailable()) return { vault: existingVault, success: false };

  try {
    // Generate a random unlock key
    const unlockKeyRaw = randomBytes(32);
    const unlockKey = await crypto.subtle.importKey(
      'raw',
      toBufferSource(unlockKeyRaw),
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    // Register biometric credential (triggers Face ID / Touch ID)
    const challenge = randomBytes(32);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: toBufferSource(challenge),
        rp: {
          name: 'Vault',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: toBufferSource(randomBytes(16)),
          name: 'vault-user@local',
          displayName: 'Vault User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) return { vault: existingVault, success: false };

    const pubKeyCred = credential as PublicKeyCredential;
    const credentialId = arrayBufferToBase64(toBufferSource(new Uint8Array(pubKeyCred.rawId)));

    // Wrap the vault key with our unlock key
    const { wrapped } = await wrapKey(vaultKey, unlockKey);

    // Store the unlock key in localStorage (protected by biometric gate)
    localStorage.setItem('vault_bio_unlock_key', arrayBufferToBase64(toBufferSource(unlockKeyRaw)));
    localStorage.setItem('vault_bio_credential_id', credentialId);

    return {
      vault: {
        ...existingVault,
        webauthnCredentialId: credentialId,
        webauthnWrappedKey: wrapped,
      },
      success: true,
    };
  } catch (err) {
    console.error('Biometric setup failed:', err);
    return { vault: existingVault, success: false };
  }
}

// Unlock with biometric
export async function unlockWithBiometric(
  encryptedVault: EncryptedVault
): Promise<VaultData | null> {
  if (!encryptedVault.webauthnCredentialId || !encryptedVault.webauthnWrappedKey) {
    return null;
  }

  try {
    const credentialId = encryptedVault.webauthnCredentialId;
    const challenge = randomBytes(32);
    
    // Decode credential ID back to bytes
    const credIdBinary = atob(credentialId);
    const credIdBytes = new Uint8Array(credIdBinary.length);
    for (let i = 0; i < credIdBinary.length; i++) {
      credIdBytes[i] = credIdBinary.charCodeAt(i);
    }

    // This triggers Face ID / Touch ID
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: toBufferSource(challenge),
        allowCredentials: [{
          id: credIdBytes.buffer.slice(credIdBytes.byteOffset, credIdBytes.byteOffset + credIdBytes.byteLength),
          type: 'public-key',
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) return null;

    // Biometric auth succeeded - retrieve the unlock key
    const storedKeyB64 = localStorage.getItem('vault_bio_unlock_key');
    if (!storedKeyB64) return null;

    const unlockKeyRaw = base64ToArrayBuffer(storedKeyB64);
    const unlockKey = await crypto.subtle.importKey(
      'raw',
      unlockKeyRaw,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Unwrap the vault key
    const vaultKey = await unwrapKey(
      encryptedVault.webauthnWrappedKey,
      encryptedVault.metadata.iv,
      unlockKey
    );

    // Decrypt vault
    const iv = base64ToArrayBuffer(encryptedVault.metadata.iv);
    const ciphertext = base64ToArrayBuffer(encryptedVault.ciphertext);
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      vaultKey,
      ciphertext
    );

    const decoded = new TextDecoder().decode(plaintext);
    return JSON.parse(decoded) as VaultData;
  } catch (err) {
    console.error('Biometric unlock failed:', err);
    return null;
  }
}

// Remove biometric unlock
export function removeBiometricUnlock(encryptedVault: EncryptedVault): EncryptedVault {
  const { webauthnCredentialId, webauthnWrappedKey, ...rest } = encryptedVault;
  localStorage.removeItem('vault_bio_unlock_key');
  localStorage.removeItem('vault_bio_credential_id');
  return rest as EncryptedVault;
}

export function verifyPassword(
  masterPassword: string,
  encryptedVault: EncryptedVault
): Promise<boolean> {
  return decryptVault(masterPassword, encryptedVault)
    .then(() => true)
    .catch((err) => {
      if (err.message === 'INVALID_PASSWORD') return false;
      throw err;
    });
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  let charset = '';
  const required: string[] = [];

  if (options.uppercase) {
    const chars = options.excludeAmbiguous ? uppercase : uppercase + 'IO';
    charset += chars;
    required.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  if (options.lowercase) {
    const chars = options.excludeAmbiguous ? lowercase : lowercase + 'lo';
    charset += chars;
    required.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  if (options.numbers) {
    const chars = options.excludeAmbiguous ? numbers : numbers + '01';
    charset += chars;
    required.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  if (options.symbols) {
    charset += symbols;
    required.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (charset.length === 0) charset = lowercase + numbers;

  const randomValues = randomBytes(options.length);
  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  const passwordArr = password.split('');
  for (let i = 0; i < required.length && i < passwordArr.length; i++) {
    const pos = randomValues[i + options.length] % options.length;
    passwordArr[pos] = required[i];
  }

  return passwordArr.join('');
}

export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

export function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(`${generateRecoveryCode()}-${generateRecoveryCode()}`);
  }
  return codes;
}

export function getVaultStorageKey(): string {
  return 'vault_encrypted_data';
}

export function loadEncryptedVault(): EncryptedVault | null {
  try {
    const raw = localStorage.getItem(getVaultStorageKey());
    if (!raw) return null;
    return JSON.parse(raw) as EncryptedVault;
  } catch {
    return null;
  }
}

export function saveEncryptedVault(vault: EncryptedVault): void {
  localStorage.setItem(getVaultStorageKey(), JSON.stringify(vault));
}

export function deleteEncryptedVault(): void {
  localStorage.removeItem(getVaultStorageKey());
  localStorage.removeItem('vault_bio_unlock_key');
  localStorage.removeItem('vault_bio_credential_id');
}
