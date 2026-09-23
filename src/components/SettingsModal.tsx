import React, { useState } from "react";
import { Key, ShieldCheck, ExternalLink, X, Cpu, Check, AlertCircle, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  model: string;
  onSaveModel: (model: string) => void;
  hasEnvKey: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  model,
  onSaveModel,
  hasEnvKey,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onSaveModel(selectedModel);
    onClose();
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/health");
      const data = await res.json();

      if (inputKey.trim() || data.hasEnvKey) {
        setTestResult({
          success: true,
          message: "Kết nối máy chủ thành công! Hệ thống sẵn sàng phân tích mã nguồn.",
        });
      } else {
        setTestResult({
          success: false,
          message: "Vui lòng nhập API Key để kết nối trực tiếp với Google Gemini.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Không thể kết nối tới máy chủ AI. Vui lòng thử lại sau.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cấu hình Gemini AI & API Key</h2>
              <p className="text-xs text-slate-400">Quản lý khóa API và mô hình phân tích</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Status Alert */}
          {hasEnvKey ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-200">Đã cấu hình hệ thống:</span> Đã nhận diện API Key mặc định của máy chủ. Bạn có thể để trống hoặc nhập API Key cá nhân để sử dụng hạn mức riêng.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Lưu ý:</span> Để sử dụng đầy đủ các tính năng phân tích đề và tối ưu thuật toán, vui lòng nhập Gemini API Key của bạn bên dưới (được lưu an toàn trong trình duyệt của bạn).
              </div>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Gemini API Key Cá nhân
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
              >
                Lấy API Key miễn phí <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={hasEnvKey ? "Để trống để dùng key mặc định, hoặc nhập key riêng..." : "AIzaSy..."}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
              />
              {inputKey && (
                <button
                  type="button"
                  onClick={() => setInputKey("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
                >
                  Xóa
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              API key được lưu an toàn tại LocalStorage trong trình duyệt và chỉ gửi lên endpoint phân tích.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Chọn Mô hình AI (Gemini Model)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.1-flash-lite")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === "gemini-3.1-flash-lite"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-indigo-300">gemini-3.1-flash-lite</span>
                  {selectedModel === "gemini-3.1-flash-lite" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  <strong className="text-emerald-400">Khuyên dùng:</strong> Tốc độ phản hồi cực nhanh, tối ưu hạn mức ổn định, hỗ trợ ảnh & đề bài.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.8-flash")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === "gemini-3.8-flash"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-indigo-300">gemini-3.8-flash</span>
                  {selectedModel === "gemini-3.8-flash" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Mô hình nâng cao: Phân tích thuật toán chi tiết và chuyên sâu cho các bài toán phức tạp.
                </p>
              </button>
            </div>
          </div>

          {/* Test status */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            <span>Kiểm tra kết nối</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
