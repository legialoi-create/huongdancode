import React, { useState } from "react";
import {
  Settings,
  Sparkles,
  RotateCcw,
  Code2,
  User,
  LogOut,
  LogIn,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { SAMPLE_PROBLEMS } from "../data/sampleProblems";
import { checkCredentials } from "../utils/auth";

interface HeaderProps {
  onSelectSample: (sampleId: string) => void;
  onOpenSettings: () => void;
  onReset: () => void;
  hasApiKey: boolean;
  selectedModel: string;
  currentUser?: string | null;
  onLogout?: () => void;
  onLoginSuccess?: (username: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectSample,
  onOpenSettings,
  onReset,
  hasApiKey,
  currentUser,
  onLogout,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      if (checkCredentials(username, password)) {
        const validName = username.trim() || "legialoi";
        if (onLoginSuccess) {
          onLoginSuccess(validName);
        }
        setUsername("");
        setPassword("");
        setLoginError(null);
      } else {
        setLoginError("Sai tài khoản / mật khẩu!");
      }
      setIsSubmitting(false);
    }, 150);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Logo, Title & Inline Login Box on the Top Left */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Code2 className="w-4.5 h-4.5 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1">
                <span>Trợ lý Phân tích Thuật toán</span>
                <span className="text-indigo-400 font-bold">&</span>
                <span>Tối ưu C++</span>
              </h1>
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO CP
              </span>
            </div>
          </div>

          {/* Ô ĐĂNG NHẬP TRÊN CÙNG BÊN TRÁI (TOP-LEFT LOGIN BOX) */}
          <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-800">
            {!currentUser ? (
              <form
                onSubmit={handleInlineLogin}
                className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 border border-indigo-500/40 rounded-xl shadow-inner relative"
              >
                {/* Username Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-500">
                    <User className="w-3 h-3 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Name..."
                    className="w-24 sm:w-28 pl-6 pr-2 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3 h-3 text-indigo-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Pass..."
                    className="w-24 sm:w-28 pl-6 pr-6 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-1.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showPassword ? "Ẩn" : "Hiện"}
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !username || !password}
                  className={`px-3 py-1 rounded-lg text-xs font-bold text-white shadow transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                    isSubmitting || !username || !password
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 active:scale-95"
                  }`}
                  title="Đăng nhập"
                >
                  {isSubmitting ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-3 h-3" />
                  )}
                  <span>Đăng nhập</span>
                </button>

                {/* Error tooltip if wrong password */}
                {loginError && (
                  <div className="absolute top-full left-0 mt-1 z-50 px-2 py-1 bg-rose-950 border border-rose-600 rounded-lg text-[10px] font-semibold text-rose-300 flex items-center gap-1 shadow-lg whitespace-nowrap animate-in fade-in">
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}
              </form>
            ) : (
              /* User Profile Badge & Logout */
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs font-medium text-indigo-200"
                  title={`Đang đăng nhập: ${currentUser}`}
                >
                  <div className="w-4 h-4 rounded-full bg-indigo-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                    <User className="w-2.5 h-2.5" />
                  </div>
                  <span className="font-mono text-xs font-semibold">{currentUser}</span>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Đăng xuất khỏi tài khoản"
                    className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Đăng xuất</span>
                  </button>
                )}
              </div>
            )}
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
              className="text-xs font-medium bg-slate-900 border border-slate-700/80 hover:border-indigo-500/60 text-slate-200 rounded-xl px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-all shadow-sm"
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
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            title="Làm mới toàn bộ đề bài và code"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings Button with Key status */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              hasApiKey
                ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-slate-850"
                : "bg-amber-950/30 border-amber-700/60 text-amber-300 hover:bg-amber-900/40"
            }`}
            title="Cài đặt API Key & Model AI"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
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
