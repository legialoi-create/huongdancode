/**
 * Safe localStorage wrapper with QuotaExceededError protection, size checks,
 * and graceful fallback to prevent app crashes when handling large datasets (e.g. 100k array tests).
 */

const MAX_SAFE_ITEM_SIZE = 1.5 * 1024 * 1024; // 1.5 MB limit per item for localStorage

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    // If item is too large for standard 5MB localStorage quota, do not attempt to write full payload
    if (value.length > MAX_SAFE_ITEM_SIZE) {
      console.warn(
        `[safeStorage] Key "${key}" payload is ${(value.length / (1024 * 1024)).toFixed(2)} MB, exceeding safe localStorage size limit. Skipping persistence to prevent quota crash.`
      );
      return false;
    }

    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[safeStorage] Failed to save key "${key}" to localStorage (likely quota exceeded):`, error);
    
    // Attempt cleaning non-essential cached analysis to free space
    if (key !== "cp_last_analysis") {
      try {
        localStorage.removeItem("cp_last_analysis");
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Still failed, ignore to prevent crashing React tree
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[safeStorage] Failed to read key "${key}" from localStorage:`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn(`[safeStorage] Failed to remove key "${key}" from localStorage:`, error);
  }
}

export function safeSaveThemisTests(tests: any[]): void {
  try {
    // If the test suite is small enough (< 500KB stringified), save normally
    const serialized = JSON.stringify(tests);
    if (serialized.length <= 500 * 1024) {
      safeSetItem("cp_themis_tests", serialized);
      return;
    }

    // For large test suites (e.g. N=100k mảng lớn), create a lightweight summary for localStorage
    // to preserve test metadata without exploding storage quota
    const lightweight = tests.map((t) => {
      const isInputHuge = (t.input || "").length > 2000;
      const isOutputHuge = (t.expectedOutput || "").length > 2000;
      return {
        ...t,
        input: isInputHuge ? t.input.slice(0, 1500) + "\n... [Dữ liệu mảng lớn]" : t.input,
        expectedOutput: isOutputHuge ? t.expectedOutput.slice(0, 1000) + "\n... [Đáp án lớn]" : t.expectedOutput,
      };
    });

    safeSetItem("cp_themis_tests", JSON.stringify(lightweight));
  } catch (error) {
    console.warn("[safeStorage] Could not cache large themis test suite:", error);
  }
}
