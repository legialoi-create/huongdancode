import React from "react";
import { Settings, Sparkles, BookOpen, RotateCcw, CheckCircle2, AlertTriangle, Code2 } from "lucide-react";
import { SAMPLE_PROBLEMS } from "../data/sampleProblems";

interface HeaderProps {
  onSelectSample: (sampleId: string) => void;
  onOpenSettings: () => void;
  onReset: () => void;
  hasApiKey: boolean;
  selectedModel: string;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectSample,
  onOpenSettings,
  onReset,
  hasApiKey,
  selectedModel,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Code2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Trợ lý Phân tích Thuật toán <span className="text-indigo-400 font-bold">&</span> Tối ưu Lập trình
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO CP v2.5
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sample Selector Dropdown */}
          <div className="relative">
            <select
              aria-label="Chọn bài tập mẫu"
              onChange={(e) => {
                if (e.target.value) {
                  onSelectSample(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="text-xs font-medium bg-slate-900 border border-slate-700/80 hover:border-indigo-500/60 text-slate-200 rounded-xl px-3 py-2 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-all shadow-sm"
            >
              <option value="" disabled>
                ⭐ Chọn bài tập mẫu...
              </option>
              {SAMPLE_PROBLEMS.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.difficulty}] {p.title}
                </option>
              ))}
            </select>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            title="Làm mới toàn bộ đề bài và code"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings Button with Key status */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              hasApiKey
                ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-850"
                : "bg-amber-950/30 border-amber-700/60 text-amber-300 hover:bg-amber-900/40"
            }`}
            title="Cài đặt API Key & Model AI"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Cài đặt AI</span>
            {hasApiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="API Key đã sẵn sàng" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Chưa nhập API Key" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
