import fs from "fs";
import path from "path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export const REFRESH_INTERVAL_DAYS = 5;
export const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

export const BASE_FALLBACK_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
];

const CACHE_FILE_PATH = path.join(process.cwd(), ".gemini-model-cache.json");

export interface DiscoveredModelInfo {
  id: string;
  displayName: string;
  tier: "primary" | "pro" | "lite";
  verified: boolean;
}

export interface ModelRegistryState {
  primaryModel: string;
  fallbackModels: string[];
  availableModels: DiscoveredModelInfo[];
  lastCheckedAt: number;
  nextCheckAt: number;
  intervalDays: number;
  lastError: string | null;
  source: "default" | "cache" | "live-discovery";
}

// Paid-only or specialized models to skip during automatic free-tier discovery
const PAID_OR_EXCLUDED_EXACT = new Set([
  "gemini-4-neon",
  "gemini-4-carbon",
  "gemini-4-argon",
  "gemini-pro",
  "gemini-flash",
]);

const EXCLUDED_SUBSTRING_REGEX =
  /image|tts|live|audio|transcribe|translate|embedding|vision|aqa|robotics|computer-use|veo|lyria|genie|decision|nano-banana|omni|dialog|whisper|ultra|gemma|learnlm|tuning|bisect/i;

function normalizeModelId(rawName: string): string {
  return rawName.replace(/^models\//i, "").trim();
}

function parseVersion(id: string): { major: number; minor: number } | null {
  const match = id.match(/^gemini-(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: match[2] ? parseInt(match[2], 10) : 0,
  };
}

function classifyTier(id: string): "primary" | "pro" | "lite" {
  const lower = id.toLowerCase();
  if (lower.includes("lite")) return "lite";
  if (lower.includes("pro")) return "pro";
  return "primary";
}

export function formatModelDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) => {
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function isEligibleTextModel(id: string, supportedMethods?: string[]): boolean {
  const lower = id.toLowerCase();
  if (!lower.startsWith("gemini-")) return false;
  if (PAID_OR_EXCLUDED_EXACT.has(lower)) return false;
  if (EXCLUDED_SUBSTRING_REGEX.test(lower)) return false;

  // Exclude known paid-only codenames even with date suffixes
  if (/^gemini-4-(?:neon|carbon|argon)(?:-|$)/i.test(lower)) return false;

  const ver = parseVersion(lower);
  // Only consider Gemini 3.1+ and future generations (4.x, 5.x, ...)
  if (!ver) return false;
  if (ver.major < 3) return false;
  if (ver.major === 3 && ver.minor < 1) return false;

  if (Array.isArray(supportedMethods) && supportedMethods.length > 0) {
    const supportsGenerate = supportedMethods.some((m) =>
      m.toLowerCase().includes("generatecontent")
    );
    if (!supportsGenerate) return false;
  }

  return true;
}

function scoreModel(id: string): number {
  const lower = id.toLowerCase();
  const ver = parseVersion(lower) || { major: 0, minor: 0 };

  let score = ver.major * 10000 + ver.minor * 500;

  // Within the same version, prioritize flagship free-tier flash/hydrogen models first
  if (lower.includes("hydrogen") || (lower.includes("flash") && !lower.includes("lite"))) {
    score += 300;
  } else if (lower.includes("lite")) {
    score += 120;
  } else if (lower.includes("pro")) {
    score += 200;
  } else {
    // Future new codename (e.g., gemini-5-helium)
    score += 260;
  }

  // Prefer canonical aliases over dated/experimental snapshots
  const isExperimental = /-(?:exp|alpha|001|002|\d{2}-\d{2}|\d{4})$/i.test(lower);
  const isPreview = lower.includes("preview");
  if (!isExperimental && !isPreview) {
    score += 60;
  } else if (!isExperimental) {
    score += 25;
  }

  return score;
}

function createDefaultState(): ModelRegistryState {
  const now = 0;
  return {
    primaryModel: BASE_FALLBACK_MODELS[0],
    fallbackModels: BASE_FALLBACK_MODELS.slice(1),
    availableModels: BASE_FALLBACK_MODELS.map((id) => ({
      id,
      displayName: formatModelDisplayName(id),
      tier: classifyTier(id),
      verified: true,
    })),
    lastCheckedAt: now,
    nextCheckAt: Date.now() + REFRESH_INTERVAL_MS,
    intervalDays: REFRESH_INTERVAL_DAYS,
    lastError: null,
    source: "default",
  };
}

let state: ModelRegistryState = createDefaultState();
let refreshInFlight: Promise<ModelRegistryState> | null = null;
let schedulerStarted = false;

function loadCacheFromDisk(): void {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) return;
    const raw = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.primaryModel === "string" &&
      Array.isArray(parsed.fallbackModels) &&
      typeof parsed.lastCheckedAt === "number"
    ) {
      state = {
        primaryModel: parsed.primaryModel,
        fallbackModels: parsed.fallbackModels,
        availableModels: Array.isArray(parsed.availableModels) && parsed.availableModels.length > 0
          ? parsed.availableModels
          : [parsed.primaryModel, ...parsed.fallbackModels].map((id: string) => ({
              id,
              displayName: formatModelDisplayName(id),
              tier: classifyTier(id),
              verified: true,
            })),
        lastCheckedAt: parsed.lastCheckedAt,
        nextCheckAt: parsed.lastCheckedAt + REFRESH_INTERVAL_MS,
        intervalDays: REFRESH_INTERVAL_DAYS,
        lastError: null,
        source: "cache",
      };
      console.log(
        `[ModelRegistry] Loaded cached models: primary=${state.primaryModel}, fallbacks=${state.fallbackModels.join(", ")}`
      );
    }
  } catch (err) {
    console.warn("[ModelRegistry] Could not read model cache, using defaults:", err);
  }
}

function saveCacheToDisk(nextState: ModelRegistryState): void {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(nextState, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ModelRegistry] Could not persist cache file (memory cache active):", err);
  }
}

async function probeModelUsable(ai: GoogleGenAI, modelId: string): Promise<boolean> {
  try {
    const res = await ai.models.generateContent({
      model: modelId,
      contents: "Reply with OK",
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return !!(res && res.text);
  } catch (err: any) {
    const msg = String(err?.message || "");
    // If the model simply rejects thinkingConfig (e.g., future model config diff), retry once without it
    if (msg.includes("400") && msg.toLowerCase().includes("thinking")) {
      try {
        const res = await ai.models.generateContent({
          model: modelId,
          contents: "Reply with OK",
        });
        return !!(res && res.text);
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function refreshGeminiModels(force = false): Promise<ModelRegistryState> {
  const now = Date.now();
  if (!force && state.lastCheckedAt > 0 && now - state.lastCheckedAt < REFRESH_INTERVAL_MS) {
    return state;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      state = {
        ...state,
        lastError: "Thiếu GEMINI_API_KEY trên máy chủ.",
      };
      return state;
    }

    try {
      console.log("[ModelRegistry] Starting automatic Gemini model discovery scan...");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const discoveredSet = new Set<string>();
      const pager = await ai.models.list();
      for await (const m of pager as AsyncIterable<any>) {
        const rawName = typeof m?.name === "string" ? m.name : "";
        if (!rawName) continue;
        const id = normalizeModelId(rawName);
        const methods: string[] | undefined =
          m?.supportedActions || m?.supportedGenerationMethods;
        if (isEligibleTextModel(id, methods)) {
          discoveredSet.add(id);
        }
      }

      // Always include our known good baseline models in candidate pool
      for (const base of BASE_FALLBACK_MODELS) {
        discoveredSet.add(base);
      }

      // Sort all eligible models by version & tier (newest highest-capability first)
      const ranked = Array.from(discoveredSet).sort((a, b) => scoreModel(b) - scoreModel(a));

      // Probe top candidates (up to 6) to verify the current API key can actually call them (free-tier safe)
      const verifiedModels: string[] = [];
      const toProbe = ranked.slice(0, 6);

      for (const candidate of toProbe) {
        const ok = await probeModelUsable(ai, candidate);
        if (ok) {
          verifiedModels.push(candidate);
          console.log(`[ModelRegistry] Verified usable model: ${candidate}`);
        } else {
          console.log(`[ModelRegistry] Skipped unavailable/paid-tier model: ${candidate}`);
        }
        // Once we have 3 verified working models (1 primary + 2 fallbacks), stop probing to stay fast
        if (verifiedModels.length >= 3) break;
      }

      const finalChain = Array.from(
        new Set([...verifiedModels, ...BASE_FALLBACK_MODELS])
      );

      const primaryModel = finalChain[0] || BASE_FALLBACK_MODELS[0];
      const fallbackModels = finalChain.slice(1, 4);

      const availableModels: DiscoveredModelInfo[] = finalChain.slice(0, 5).map((id) => ({
        id,
        displayName: formatModelDisplayName(id),
        tier: classifyTier(id),
        verified: verifiedModels.includes(id),
      }));

      const checkedAt = Date.now();
      state = {
        primaryModel,
        fallbackModels,
        availableModels,
        lastCheckedAt: checkedAt,
        nextCheckAt: checkedAt + REFRESH_INTERVAL_MS,
        intervalDays: REFRESH_INTERVAL_DAYS,
        lastError: null,
        source: "live-discovery",
      };

      saveCacheToDisk(state);
      console.log(
        `[ModelRegistry] Auto-update complete. Primary=${state.primaryModel}, Fallbacks=${state.fallbackModels.join(" -> ")}. Next check in ${REFRESH_INTERVAL_DAYS} days.`
      );
      return state;
    } catch (err: any) {
      console.warn("[ModelRegistry] Model discovery failed, keeping active models:", err?.message || err);
      const checkedAt = Date.now();
      state = {
        ...state,
        lastCheckedAt: state.lastCheckedAt || checkedAt,
        nextCheckAt: (state.lastCheckedAt || checkedAt) + REFRESH_INTERVAL_MS,
        lastError: err?.message || "Không thể quét danh sách mô hình mới.",
      };
      return state;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function initModelAutoUpdater(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  loadCacheFromDisk();

  // Trigger non-blocking initial check if never checked or > 5 days old
  if (state.lastCheckedAt === 0 || Date.now() - state.lastCheckedAt >= REFRESH_INTERVAL_MS) {
    refreshGeminiModels(false).catch(() => {});
  }

  // Background check every 6 hours to see if 5-day interval has elapsed
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const timer = setInterval(() => {
    if (Date.now() - state.lastCheckedAt >= REFRESH_INTERVAL_MS) {
      refreshGeminiModels(false).catch(() => {});
    }
  }, SIX_HOURS_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function getModelRegistryState(): ModelRegistryState {
  // Opportunistic trigger if 5 days have elapsed
  if (state.lastCheckedAt === 0 || Date.now() - state.lastCheckedAt >= REFRESH_INTERVAL_MS) {
    refreshGeminiModels(false).catch(() => {});
  }
  return state;
}

export function getCandidateModels(requestedModel?: string): string[] {
  const current = getModelRegistryState();
  const baseChain = [current.primaryModel, ...current.fallbackModels, ...BASE_FALLBACK_MODELS];

  if (!requestedModel || requestedModel === "auto") {
    return Array.from(new Set(baseChain));
  }

  // Only allow requested model if it is in our discovered availableModels or BASE_FALLBACK_MODELS
  const allowedIds = new Set([
    ...current.availableModels.map((m) => m.id),
    ...BASE_FALLBACK_MODELS,
  ]);

  if (allowedIds.has(requestedModel)) {
    return Array.from(new Set([requestedModel, ...baseChain]));
  }

  return Array.from(new Set(baseChain));
}
