import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCode,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { Header } from "./components/Header";
import { ProblemInputPanel } from "./components/ProblemInputPanel";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { ResultPanel } from "./components/ResultPanel";
import { SettingsModal } from "./components/SettingsModal";
import { AttachedFile, ParsedAnalysis } from "./types";
import { SAMPLE_PROBLEMS } from "./data/sampleProblems";
import { parseAnalysisMarkdown } from "./utils/parser";

export default function App() {
  // Input states
  const [problemText, setProblemText] = useState<string>(() => {
    return localStorage.getItem("cp_problem_text") || "";
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [codeText, setCodeText] = useState<string>(() => {
    return (
      localStorage.getItem("cp_code_text") ||
      `#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        // Viết code C++ của bạn tại đây...
    }
    return 0;
}`
    );
  });

  // Settings states
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("cp_user_api_key") || "";
  });
  const [model, setModel] = useState<string>(() => {
    const saved = localStorage.getItem("cp_selected_model");
    if (!saved || saved === "gemini-2.5-flash" || saved === "gemini-3.8-flash") {
      localStorage.setItem("cp_selected_model", "gemini-3.1-flash-lite");
      return "gemini-3.1-flash-lite";
    }
    return saved;
  });
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Analysis states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedAnalysis | null>(() => {
    const cached = localStorage.getItem("cp_last_analysis");
    if (cached) {
      try {
        return parseAnalysisMarkdown(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const resultRef = useRef<HTMLDivElement>(null);

  // Check server health and env key presence on initial load
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasEnvKey === "boolean") {
          setHasEnvKey(data.hasEnvKey);
        }
      })
      .catch(() => {
        // Dev server fallback
      });
  }, []);

  // Save drafts to localStorage
  useEffect(() => {
    localStorage.setItem("cp_problem_text", problemText);
  }, [problemText]);

  useEffect(() => {
    localStorage.setItem("cp_code_text", codeText);
  }, [codeText]);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem("cp_user_api_key", key);
  };

  const handleSaveModel = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem("cp_selected_model", newModel);
  };

  // Add files
  const handleAddFiles = (files: AttachedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Clear inputs
  const handleClearProblem = () => {
    setProblemText("");
    setAttachedFiles([]);
    localStorage.removeItem("cp_problem_text");
  };

  const handleClearCode = () => {
    setCodeText("");
    localStorage.removeItem("cp_code_text");
  };

  const handleResetAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn làm mới toàn bộ đề bài và code?")) {
      handleClearProblem();
      handleClearCode();
      setResult(null);
      setError(null);
      localStorage.removeItem("cp_last_analysis");
    }
  };

  // Load sample problem
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_PROBLEMS.find((p) => p.id === sampleId);
    if (!sample) return;

    setProblemText(sample.problemStatement);
    setCodeText(sample.studentCode);
    setAttachedFiles([]);
    setError(null);
  };

  // Trigger analysis call
  const handleAnalyze = useCallback(async () => {
    if (!codeText.trim()) {
      setError("Vui lòng nhập mã nguồn C++ của học sinh.");
      return;
    }

    if (!problemText.trim() && attachedFiles.length === 0) {
      setError("Vui lòng cung cấp đề bài (nhập văn bản hoặc tải file đính kèm/ảnh chụp).");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        problemText,
        problemFiles: attachedFiles.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          base64: f.base64,
        })),
        codeText,
        userApiKey,
        model,
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể nhận phản hồi từ AI.");
      }

      const parsed = parseAnalysisMarkdown(data.analysis);
      setResult(parsed);
      localStorage.setItem("cp_last_analysis", data.analysis);

      // Smooth scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi không mong muốn.");
    } finally {
      setIsLoading(false);
    }
  }, [codeText, problemText, attachedFiles, userApiKey, model]);

  // Global keyboard shortcut: Ctrl+Enter or Cmd+Enter to run analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAnalyze]);

  const canAnalyze = codeText.trim().length > 0 && (problemText.trim().length > 0 || attachedFiles.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onSelectSample={handleSelectSample}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleResetAll}
        hasApiKey={!!userApiKey || hasEnvKey}
        selectedModel={model}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Sample Problem Quick Access Badges */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Đề mẫu kiểm thử nhanh:
          </span>
          {SAMPLE_PROBLEMS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample.id)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700/60 text-slate-300 transition-all active:scale-95 cursor-pointer font-medium"
            >
              {sample.title}
            </button>
          ))}
        </div>

        {/* Two-Column Input Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Left Column: Problem Statement */}
          <div className="h-[460px] sm:h-[500px]">
            <ProblemInputPanel
              problemText={problemText}
              onChangeProblemText={setProblemText}
              attachedFiles={attachedFiles}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              onClearProblem={handleClearProblem}
            />
          </div>

          {/* Right Column: Student C++ Code */}
          <div className="h-[460px] sm:h-[500px]">
            <CodeInputPanel
              codeText={codeText}
              onChangeCodeText={setCodeText}
              onClearCode={handleClearCode}
            />
          </div>
        </div>

        {/* Center Action Button */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading || !canAnalyze}
            className={`group relative flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white shadow-xl transition-all cursor-pointer ${
              isLoading || !canAnalyze
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70"
                : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-indigo-600/30 active:scale-98 hover:shadow-indigo-500/40"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang phân tích & tối ưu thuật toán...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-indigo-200 group-hover:rotate-12 transition-transform" />
                <span>Phân tích & Tối ưu Code</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-mono tracking-tight text-white/90">
                  Ctrl + Enter
                </span>
              </>
            )}
          </button>

          {!canAnalyze && (
            <p className="text-xs text-slate-500">
              Vui lòng nhập cả đề bài và mã nguồn C++ để bắt đầu phân tích.
            </p>
          )}
        </div>

        {/* Results Section */}
        <div ref={resultRef} className="pt-2">
          <ResultPanel
            result={result}
            isLoading={isLoading}
            error={error}
            onRetry={handleAnalyze}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Trợ lý Phân tích Thuật toán & Tối ưu Lập trình — Xây dựng cho Học sinh Giỏi Tin học & Lập trình Thi đấu.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Mô hình: <strong className="text-indigo-400">{model}</strong></span>
            <span>•</span>
            <span>Phân tích TLE & Tràn số</span>
            <span>•</span>
            <span>Code chuẩn Full AC</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={userApiKey}
        onSaveApiKey={handleSaveApiKey}
        model={model}
        onSaveModel={handleSaveModel}
        hasEnvKey={hasEnvKey}
      />
    </div>
  );
}
