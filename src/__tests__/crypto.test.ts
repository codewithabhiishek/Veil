import {
  generatePassword,
  generateRecoveryCode,
  generateRecoveryCodes,
} from '../crypto/engine.ts';

export function runCryptoTests(): void {
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

  // 1. Password generation lengths
  const p16 = generatePassword({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  assertEqual(p16.length, 16, 'generatePassword produces exact requested length 16');

  const p32 = generatePassword({
    length: 32,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  assertEqual(p32.length, 32, 'generatePassword produces exact requested length 32');

  // 2. Character inclusion checks
  const pNumeric = generatePassword({
    length: 20,
    uppercase: false,
    lowercase: false,
    numbers: true,
    symbols: false,
    excludeAmbiguous: false,
  });
  assertTrue(/^\d+$/.test(pNumeric), 'Numbers-only password contains only digits');

  const pAlpha = generatePassword({
    length: 24,
    uppercase: true,
    lowercase: true,
    numbers: false,
    symbols: false,
    excludeAmbiguous: false,
  });
  assertTrue(/^[A-Za-z]+$/.test(pAlpha), 'Alpha-only password contains only letters');

  // 3. Ambiguous characters exclusion
  const pUnambiguous = generatePassword({
    length: 50,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
    excludeAmbiguous: true,
  });
  assertTrue(!/[lIO01]/.test(pUnambiguous), 'excludeAmbiguous filters out confusing characters (l, I, O, 0, 1)');

  // 4. Recovery codes
  const singleCode = generateRecoveryCode();
  assertEqual(singleCode.length, 4, 'generateRecoveryCode produces 4-character token');

  const recoveryList = generateRecoveryCodes(5);
  assertEqual(recoveryList.length, 5, 'generateRecoveryCodes produces 5 codes');
  for (let i = 0; i < recoveryList.length; i++) {
    const code = recoveryList[i];
    assertTrue(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), `Recovery code ${i + 1} matches XXXX-XXXX format (${code})`);
  }
}
