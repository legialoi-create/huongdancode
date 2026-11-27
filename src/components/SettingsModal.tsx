import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  X,
  Cpu,
  Check,
  AlertCircle,
  RefreshCw,
  Zap,
  Sparkles,
  Brain,
  Clock,
  Radar,
} from "lucide-react";

export type ThinkingMode = "HIGH" | "XHIGH";

export interface DiscoveredModelInfo {
  id: string;
  displayName: string;
  tier: "primary" | "pro" | "lite";
  verified: boolean;
}

export interface ModelRegistryInfo {
  primaryModel: string;
  fallbackModels: string[];
  availableModels: DiscoveredModelInfo[];
  lastCheckedAt: number;
  nextCheckAt: number;
  intervalDays: number;
  lastError?: string | null;
  source?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  onSaveModel: (model: string) => void;
  thinkingLevel: ThinkingMode;
  onSaveThinkingLevel: (level: ThinkingMode) => void;
  hasEnvKey: boolean;
  registry: ModelRegistryInfo;
  onRegistryUpdated: (next: ModelRegistryInfo) => void;
}

function formatViDateTime(ts: number): string {
  if (!ts || ts <= 0) return "Đang khởi tạo...";
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  model,
  onSaveModel,
  thinkingLevel,
  onSaveThinkingLevel,
  hasEnvKey,
  registry,
  onRegistryUpdated,
}) => {
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedThinking, setSelectedThinking] = useState<ThinkingMode>(thinkingLevel);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedModel(model);
      setSelectedThinking(thinkingLevel);
      setScanResult(null);
    }
  }, [isOpen, model, thinkingLevel]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveModel(selectedModel);
    onSaveThinkingLevel(selectedThinking);
    onClose();
  };

  const handleScanNow = async () => {
    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/models/refresh", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success && data.primaryModel) {
        onRegistryUpdated({
          primaryModel: data.primaryModel,
          fallbackModels: data.fallbackModels || [],
          availableModels: data.availableModels || [],
          lastCheckedAt: data.lastCheckedAt || Date.now(),
          nextCheckAt: data.nextCheckAt || Date.now() + 5 * 24 * 60 * 60 * 1000,
          intervalDays: data.intervalDays || 5,
          lastError: data.lastError || null,
          source: data.source || "live-discovery",
        });
        setScanResult({
          success: true,
          message: `Đã quét xong từ Google Gemini API! Bản mới nhất khả dụng: ${data.primaryModel}. Chu kỳ tự động kiểm tra tiếp theo sau ${data.intervalDays || 5} ngày.`,
        });
      } else {
        setScanResult({
          success: false,
          message: data.error || "Không thể quét danh sách mô hình mới lúc này.",
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: "Không thể kết nối tới máy chủ để quét mô hình AI.",
      });
    } finally {
      setScanning(false);
    }
  };

  const activeResolvedModel = selectedModel === "auto" ? registry.primaryModel : selectedModel;
  const fullChain = Array.from(new Set([registry.primaryModel, ...(registry.fallbackModels || [])]));
  const supportsXHigh =
    activeResolvedModel === "gemini-4-hydrogen" || /^gemini-[5-9]/i.test(activeResolvedModel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cấu hình AI Tự Động Cập Nhật</h2>
              <p className="text-xs text-slate-400">
                Tự dò phiên bản Gemini mới nhất mỗi {registry.intervalDays || 5} ngày không cần sửa code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm overflow-y-auto">
          {/* Auto-Updater Status Panel */}
          {hasEnvKey ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/35 border border-emerald-800/60 text-emerald-200 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold text-emerald-100">Động cơ Tự Cập Nhật (Chu kỳ {registry.intervalDays || 5} ngày):</span>{" "}
                      Bản mới nhất đang dùng là{" "}
                      <span className="font-mono font-bold text-white">{registry.primaryModel}</span>
                    </div>
                    <div className="text-[11px] text-emerald-300/85">
                      Chuỗi dự phòng tự động:{" "}
                      {fullChain.map((id, idx) => (
                        <React.Fragment key={id}>
                          <span className="font-mono text-white">{id}</span>
                          {idx < fullChain.length - 1 && <span className="mx-1 text-emerald-400">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-800/40 text-[11px] text-emerald-300/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Quét gần nhất: <strong className="text-emerald-100">{formatViDateTime(registry.lastCheckedAt)}</strong>
                </span>
                <span>
                  Quét kế tiếp: <strong className="text-emerald-100">{formatViDateTime(registry.nextCheckAt)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Trạng thái:</span> Đang kiểm tra kết nối dịch vụ AI trên máy chủ.
              </div>
            </div>
          )}

          {/* Auto Mode Selection (Primary Recommended) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Chế độ chọn Mô hình AI
              </label>
              <span className="text-xs text-indigo-300 font-mono">
                {selectedModel === "auto" ? `auto (${registry.primaryModel})` : selectedModel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedModel("auto")}
              className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedModel === "auto"
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-indigo-200 flex items-center gap-1.5">
                  <Radar className="w-4 h-4 text-indigo-400" />
                  Tự động chọn phiên bản Gemini mới nhất (Khuyên dùng)
                </span>
                {selectedModel === "auto" && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <p className="text-xs text-slate-300/90 leading-relaxed">
                Hệ thống tự động gọi Google API mỗi <strong>{registry.intervalDays || 5} ngày</strong> để phát hiện các thế hệ Gemini mới nhất miễn phí (4.x, 5.x...), kiểm tra khả năng hoạt động thực tế và tự nâng cấp ngay mà không cần viết lại code.
              </p>
            </button>

            {/* Manual Override List from Live Discovered Models */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(registry.availableModels || []).map((item) => {
                const isSelected = selectedModel === item.id;
                const isLite = item.tier === "lite";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedModel(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? isLite
                          ? "bg-emerald-600/15 border-emerald-500 text-white ring-1 ring-emerald-500/40"
                          : "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/40"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-bold text-xs flex items-center gap-1.5 ${
                          isLite ? "text-emerald-300" : "text-indigo-300"
                        }`}
                      >
                        {isLite ? <Zap className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {item.displayName}
                      </span>
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 ${isLite ? "text-emerald-400" : "text-indigo-400"}`}
                        />
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{item.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thinking Depth Selector */}
          {supportsXHigh && (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-violet-400" />
                  Độ sâu suy luận ({activeResolvedModel})
                </span>
                <span className="text-[11px] font-mono text-violet-300">{selectedThinking}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedThinking("HIGH")}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedThinking === "HIGH"
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>HIGH — Cân bằng</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">Nhanh, chính xác cho đa số bài HSG</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedThinking("XHIGH")}
                  className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedThinking === "XHIGH"
                      ? "bg-violet-600/20 border-violet-500 text-white font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>XHIGH — Siêu sâu</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">Tối đa tư duy cho DP/Đồ thị/Olympic khó</div>
                </button>
              </div>
            </div>
          )}

          {/* Scan status */}
          {scanResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                scanResult.success
                  ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
              }`}
            >
              {scanResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{scanResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Đang dò bản mới..." : "Quét bản mới ngay"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
