import React, { useState } from "react";
import {
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Zap,
} from "lucide-react";
import { ParsedAnalysis } from "../types";
import { MarkdownRenderer, CodeBlock } from "./MarkdownRenderer";

interface ResultPanelProps {
  result: ParsedAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  isLoading,
  error,
  onRetry,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [viewMode, setViewMode] = useState<"tabs" | "full">("tabs");
  const [copiedAc, setCopiedAc] = useState(false);

  // Copy full AC code directly
  const handleCopyAcCode = () => {
    if (result?.acCodeOnly) {
      navigator.clipboard.writeText(result.acCodeOnly);
      setCopiedAc(true);
      setTimeout(() => setCopiedAc(false), 2000);
    }
  };

  // Download .cpp file
  const handleDownloadCpp = () => {
    if (!result?.acCodeOnly) return;
    const blob = new Blob([result.acCodeOnly], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "solution_full_ac.cpp";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Loading state with competitive programming steps
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-900/80 border border-slate-800 rounded-2xl min-h-[460px] text-center shadow-2xl">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 animate-pulse" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          Đang phân tích & tối ưu thuật toán...
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          AI Chuyên gia Competitive Programming đang kiểm tra độ phức tạp thời gian/bộ nhớ, vị trí tràn số và xây dựng code chuẩn Full AC.
        </p>

        {/* Dynamic step checklist */}
        <div className="w-full max-w-sm bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 text-left space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Phân tích đề bài & ràng buộc giới hạn $N, M$...</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Rà soát logic, ép kiểu long long, mảng vượt kích thước...</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Đo lường độ phức tạp $O(...)$ và nguy cơ TLE...</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span>Tối ưu code C++ Full điểm (Full AC)...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isApiKeyError =
      error.toLowerCase().includes("api key") ||
      error.toLowerCase().includes("chưa cấu hình") ||
      error.toLowerCase().includes("cài đặt") ||
      error.toLowerCase().includes("vercel");

    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-rose-950/20 border border-rose-900/60 rounded-2xl min-h-[400px] text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Đã xảy ra lỗi khi phân tích</h3>
        <p className="text-xs sm:text-sm text-rose-300/90 max-w-md mb-6 leading-relaxed bg-rose-950/50 p-3.5 rounded-xl border border-rose-800/40">
          {error}
        </p>

        <div className="flex items-center gap-3">
          {isApiKeyError && (
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Mở Cài đặt API Key
            </button>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Empty state before any analysis is run
  if (!result || !result.rawMarkdown) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl min-h-[460px] text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <Terminal className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Bảng kết quả phân tích & Code tối ưu</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Nhập đề bài ở khung bên trái, code C++ của bạn ở khung bên phải, sau đó bấm nút{" "}
          <strong className="text-indigo-400 font-semibold">"Phân tích & Tối ưu Code"</strong> để nhận đánh giá chi tiết.
        </p>

        {/* Feature pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>Chống TLE & Tối ưu</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tính toán độ phức tạp lý thuyết và thực thi, áp dụng `cin.tie(0)` và cấu trúc dữ liệu chuẩn.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Bắt lỗi Tràn số (Overflow)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cảnh báo khi phép nhân hoặc tổng vượt quá phạm vi `int` 32-bit ($2 \cdot 10^9$) để ép sang `long long`.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Giải pháp Full AC</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cung cấp code hoàn chỉnh tối đa 100% test pass, giữ nguyên phong cách code quen thuộc của học sinh.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active result state
  return (
    <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Result Header & Overview Tags */}
      <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Báo cáo Phân tích Thuật toán
                {result.estimatedScore && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Ước tính pass: {result.estimatedScore}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Được tạo bởi Gemini AI dành riêng cho Lập trình Thi đấu</p>
            </div>
          </div>

          {/* Quick Actions (Copy AC / Download .cpp / View Mode) */}
          <div className="flex items-center gap-2">
            {result.acCodeOnly && (
              <>
                <button
                  type="button"
                  onClick={handleCopyAcCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Sao chép toàn bộ code Full AC"
                >
                  {copiedAc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAc ? "Đã chép code!" : "Copy Code AC"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCpp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Tải file solution_full_ac.cpp"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Tải file .cpp</span>
                </button>
              </>
            )}

            {/* View Mode Toggle */}
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("tabs")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === "tabs" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Theo Tab
              </button>
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === "full" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Toàn văn
              </button>
            </div>
          </div>
        </div>

        {/* Detected Tags Bar */}
        {result.detectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Nhận diện điểm nhấn:</span>
            {result.detectedTags.map((tag, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 ${
                  tag.includes("không khớp")
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold animate-pulse"
                    : "bg-indigo-950/60 border border-indigo-700/50 text-indigo-300"
                }`}
              >
                {tag.includes("không khớp") ? (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                ) : (
                  <Zap className="w-2.5 h-2.5 text-indigo-400" />
                )}
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Warning Banner if Mismatched */}
        {result.isMismatch && (
          <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">Cảnh báo nộp không đúng bài toán:</div>
              <p className="text-amber-200/90 mt-0.5">
                Nội dung đề bài và code C++ nộp lên không khớp hoặc không liên quan đến nhau. Vui lòng kiểm tra lại để tránh nộp nhầm file code của bài khác!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation (when viewMode === "tabs") */}
      {viewMode === "tabs" && (
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 1
                ? "border-indigo-500 text-indigo-300 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tab 1: Tóm tắt & Đánh giá</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 2
                ? "border-rose-500 text-rose-300 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Tab 2: Chi tiết lỗi & Điểm nghẽn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(3)}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 3
                ? "border-amber-500 text-amber-300 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Tab 3: Hướng dẫn sửa từng bước</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(4)}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 4
                ? "border-emerald-500 text-emerald-300 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tab 4: Code chuẩn Full AC</span>
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="p-5 sm:p-6 min-h-[380px]">
        {viewMode === "full" ? (
          <div>
            <MarkdownRenderer content={result.rawMarkdown} />
          </div>
        ) : (
          <div>
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>
                    Tổng hợp yêu cầu bài toán, ràng buộc dữ liệu (Time, Memory limit) và đánh giá thuật toán hiện tại của học sinh.
                  </span>
                </div>
                <MarkdownRenderer content={result.section1_Overview} />
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    Chỉ rõ các dòng bị tràn số int, tính toán nguy cơ TLE, lỗi khởi tạo mảng, và thiếu tối ưu Fast I/O (`cin.tie`).
                  </span>
                </div>
                <MarkdownRenderer content={result.section2_Flaws} />
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    Giải thích cặn kẽ nguyên nhân vì sao sai và tư duy cải tiến thuật toán theo từng bước rõ ràng.
                  </span>
                </div>
                <MarkdownRenderer content={result.section3_Guide} />
              </div>
            )}

            {activeTab === 4 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Mã nguồn C++ Full AC: Giữ nguyên 100% tên biến gốc của học sinh, biến mới đặt ngắn gọn (1-3 ký tự quen thuộc), chuẩn File I/O (freopen) theo đề bài và chú thích rõ ràng từng dòng sửa.
                    </span>
                  </div>
                  {result.acCodeOnly && (
                    <button
                      type="button"
                      onClick={handleCopyAcCode}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedAc ? "Đã sao chép!" : "Copy Code"}
                    </button>
                  )}
                </div>
                <MarkdownRenderer content={result.section4_FullAcCode} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
