import { runHapticsTests } from "./src/__tests__/haptics.test.ts";
import { runDataIsolationTests } from "./src/__tests__/dataIsolation.test.ts";
import { runCryptoTests } from "./src/__tests__/crypto.test.ts";

console.log("=== RUNNING VEIL SENIOR TEST SUITE ===");
try {
  console.log("\n[1/3] Running Tactile Mobile Haptics Engine Tests...");
  runHapticsTests();

  console.log("\n[2/3] Running Multi-Vault Data Isolation Tests...");
  runDataIsolationTests();

  console.log("\n[3/3] Running Password & Recovery Token Generator Tests...");
  runCryptoTests();

  console.log("\n>>> ALL VEIL TESTS PASSED SUCCESSFULLY (100% PASS RATE)! <<<");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}
