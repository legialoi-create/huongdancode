import React, { useState } from "react";
import { ShieldCheck, X, Cpu, Check, AlertCircle, RefreshCw, Zap, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  onSaveModel: (model: string) => void;
  hasEnvKey: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  model,
  onSaveModel,
  hasEnvKey,
}) => {
  const [selectedModel, setSelectedModel] = useState(model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveModel(selectedModel);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/health");
      const data = await res.json();

      if (data.status === "ok" && data.hasEnvKey) {
        setTestResult({
          success: true,
          message: "Kết nối máy chủ AI thành công! Hệ thống sẵn sàng phân tích thuật toán và tối ưu mã nguồn.",
        });
      } else {
        setTestResult({
          success: false,
          message: "Máy chủ chưa nhận diện được cấu hình môi trường AI.",
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
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cấu hình Mô hình AI Phân tích</h2>
              <p className="text-xs text-slate-400">Tùy chọn động cơ phân tích thuật toán & tối ưu C++</p>
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
        <div className="p-6 space-y-5 text-sm">
          {/* Status Alert */}
          {hasEnvKey ? (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-200">Hệ thống AI trực tuyến:</span> Máy chủ phân tích thuật toán đã được kết nối tự động với cơ chế tự động chuyển đổi dự phòng (Auto-Failover) chống nghẽn.
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

          {/* Model Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Chọn Mô hình AI Chủ đạo
              </label>
              <span className="text-xs text-indigo-300 font-mono">
                {selectedModel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Gemini 3.8 Flash (Recommended Default) */}
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.8-flash")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedModel === "gemini-3.8-flash"
                    ? "bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                    Gemini 3.8 Flash
                  </span>
                  {selectedModel === "gemini-3.8-flash" && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Khuyên dùng: Cân bằng hoàn hảo giữa tốc độ phản hồi nhanh, chuẩn hóa đề PDF/Word chính xác và tối ưu thuật toán C++ Full AC.
                </p>
              </button>

              {/* Option 2: Gemini 3.1 Flash Lite */}
              <button
                type="button"
                onClick={() => setSelectedModel("gemini-3.1-flash-lite")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedModel === "gemini-3.1-flash-lite"
                    ? "bg-emerald-600/15 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Gemini 3.1 Flash Lite
                  </span>
                  {selectedModel === "gemini-3.1-flash-lite" && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Siêu tốc độ: Độ trễ thấp nhất, phản hồi tức thì cho các bài toán cơ bản và kiểm tra nhanh lỗi cú pháp / tràn số.
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
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            <span>Kiểm tra máy chủ</span>
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
