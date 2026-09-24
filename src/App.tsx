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
  ShieldCheck,
  Columns,
  LayoutGrid,
} from "lucide-react";
import { Header } from "./components/Header";
import { ProblemInputPanel } from "./components/ProblemInputPanel";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { ResultPanel } from "./components/ResultPanel";
import { ThemisTestPanel } from "./components/ThemisTestPanel";
import { SettingsModal } from "./components/SettingsModal";
import { AttachedFile, ParsedAnalysis, ThemisTestCase } from "./types";
import { SAMPLE_PROBLEMS } from "./data/sampleProblems";
import { parseAnalysisMarkdown } from "./utils/parser";
import { executeDirectGeminiAnalysis } from "./utils/gemini";

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

  // Themis test suite state
  const [testCases, setTestCases] = useState<ThemisTestCase[]>(() => {
    const cached = localStorage.getItem("cp_themis_tests");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return SAMPLE_PROBLEMS[0].testCases || [];
  });

  const [problemCodeName, setProblemCodeName] = useState<string>(() => {
    return localStorage.getItem("cp_problem_codename") || "MAXSUB";
  });

  // Workspace Mode: 'code_analysis' (2 columns: Problem & Code) vs 'test_audit' (3 columns: Problem, Code [optional], & Themis Tests)
  const [workspaceMode, setWorkspaceMode] = useState<"code_analysis" | "test_audit">(() => {
    const cached = localStorage.getItem("cp_workspace_mode");
    return cached === "code_analysis" ? "code_analysis" : "test_audit";
  });

  // Settings states
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("cp_user_api_key") || "";
  });
  const [model, setModel] = useState<string>(() => {
    const saved = localStorage.getItem("cp_selected_model");
    if (!saved || saved === "gemini-2.5-flash" || saved === "gemini-3.1-flash-lite") {
      localStorage.setItem("cp_selected_model", "gemini-3.8-flash");
      return "gemini-3.8-flash";
    }
    return saved;
  });
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Analysis states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Đang phân tích...");
  const [error, setError] = useState<string | null>(null);
  const [resultDefaultTab, setResultDefaultTab] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  useEffect(() => {
    localStorage.setItem("cp_themis_tests", JSON.stringify(testCases));
  }, [testCases]);

  useEffect(() => {
    localStorage.setItem("cp_problem_codename", problemCodeName);
  }, [problemCodeName]);

  useEffect(() => {
    localStorage.setItem("cp_workspace_mode", workspaceMode);
  }, [workspaceMode]);

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
    if (sample.testCases) {
      setTestCases(sample.testCases);
    }
    if (sample.problemCodeName) {
      setProblemCodeName(sample.problemCodeName);
    }
    setError(null);
  };

  // Trigger analysis call (code analysis or test audit)
  const handleAnalyze = useCallback(
    async (actionType: "code" | "test" = "code") => {
      const hasProblem = problemText.trim().length > 0 || attachedFiles.length > 0;
      const hasCode = codeText.trim().length > 0;
      const hasTests = testCases.length > 0;

      if (actionType === "code") {
        if (!hasCode) {
          setError("Vui lòng nhập mã nguồn C++ của học sinh để phân tích và tối ưu.");
          return;
        }
        if (!hasProblem) {
          setError("Vui lòng cung cấp đề bài (nhập văn bản hoặc tải file đính kèm/ảnh chụp).");
          return;
        }
        setResultDefaultTab(1);
        setLoadingMessage("Đang phân tích thuật toán & tối ưu mã nguồn C++...");
      } else {
        // actionType === "test" (Thẩm định bộ test: có code hoặc không có code chuẩn đều thẩm định được)
        if (!hasProblem && !hasTests) {
          setError("Vui lòng cung cấp đề bài hoặc nạp danh sách test case để thẩm định bộ test.");
          return;
        }
        setResultDefaultTab(5);
        setWorkspaceMode("test_audit"); // Bố cục 3 cột chuyên dùng cho thẩm định test
        setLoadingMessage(
          hasCode
            ? "Đang thẩm định bộ test Themis theo 6 tiêu chuẩn & đối chiếu với code hiện có..."
            : "Đang thẩm định bộ test Themis độc lập theo đề bài & tạo code chuẩn AC đối chứng..."
        );
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
            extractedText: f.extractedText,
          })),
          codeText: hasCode ? codeText : "",
          userApiKey,
          model,
          problemCodeName,
          testCases: testCases.map((t) => ({
            name: t.name,
            category: t.category,
            input: t.input,
            expectedOutput: t.expectedOutput,
            description: t.description,
          })),
        };

        let analysisText = "";

        // 1. First attempt: call backend API endpoint (/api/analyze)
        let apiSucceeded = false;
        let serverErrorMessage = "";
        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const rawText = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch {
            data = null;
          }

          if (response.ok && data && data.success && data.analysis) {
            analysisText = data.analysis;
            apiSucceeded = true;
          } else if (data && data.error) {
            serverErrorMessage = data.error;
            if (userApiKey) {
              console.log("Server error received, trying client-side direct SDK call...");
            }
          } else if (!response.ok) {
            serverErrorMessage = `Lỗi máy chủ (${response.status}): ${rawText || response.statusText}`;
          }
        } catch (fetchErr: any) {
          console.warn("API route fetch issue:", fetchErr?.message);
          serverErrorMessage = fetchErr?.message || "";
        }

        // 2. Fallback: If backend endpoint is unavailable or user provided custom key
        if (!apiSucceeded) {
          if (userApiKey) {
            // Execute directly on browser using Gemini SDK
            const directResult = await executeDirectGeminiAnalysis(payload, userApiKey);
            analysisText = directResult.analysis;
          } else if (serverErrorMessage) {
            throw new Error(serverErrorMessage);
          } else {
            throw new Error(
              "Không nhận được phản hồi từ hệ thống phân tích. Vui lòng thử lại sau vài giây hoặc cấu hình API Key cá nhân trong phần Cài đặt AI (bánh răng)."
            );
          }
        }

        const parsed = parseAnalysisMarkdown(analysisText);
        setResult(parsed);
        localStorage.setItem("cp_last_analysis", analysisText);

        // Smooth scroll to results
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (err: any) {
        setError(err?.message || "Đã xảy ra lỗi không mong muốn khi phân tích.");
      } finally {
        setIsLoading(false);
      }
    },
    [codeText, problemText, attachedFiles, userApiKey, model, problemCodeName, testCases]
  );

  // Global keyboard shortcut: Ctrl+Enter or Cmd+Enter to run analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (workspaceMode === "test_audit") {
          handleAnalyze("test");
        } else {
          handleAnalyze("code");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAnalyze, workspaceMode]);

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
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-5 space-y-5">
        {/* Sample Problems Bar + Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs">
          {/* Sample quick buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Đề mẫu có sẵn bộ test Themis:
            </span>
            {SAMPLE_PROBLEMS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample.id)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700/60 text-slate-300 transition-all active:scale-95 cursor-pointer font-medium flex items-center gap-1.5"
              >
                <span>{sample.title}</span>
                {sample.testCases && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                    {sample.testCases.length} tests
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mode Switcher: 2 Columns for Code Analysis vs 3 Columns for Test Audit */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setWorkspaceMode("code_analysis")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                workspaceMode === "code_analysis"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Chế độ 2 cột: Tập trung vào Đề bài & Code C++ học sinh"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Phân tích Code (2 Cột)</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceMode("test_audit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                workspaceMode === "test_audit"
                  ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Chế độ 3 cột: Dành riêng cho Thẩm định Bộ Test Themis (Đề bài | Code C++ | Bộ test 6 tiêu chí)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
              <span>Thẩm định Test (3 Cột)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-cyan-200 font-mono">
                {testCases.length} test
              </span>
            </button>
          </div>
        </div>

        {/* Input Panels Section */}
        {workspaceMode === "test_audit" ? (
          /* 3-Column Layout: Specifically for Test Suite Audit (Problem | Code [optional] | Themis Tests) */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-xs text-cyan-300/80 bg-cyan-950/30 border border-cyan-900/40 rounded-lg py-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <strong className="text-cyan-200">Chế độ Thẩm định Bộ Test (Bố cục 3 Cột):</strong> Có code học sinh hoặc không có code chuẩn đều thẩm định được! AI sẽ tự động sinh mã nguồn AC làm chuẩn đối chiếu.
              </span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                {testCases.length} testcase đang sẵn sàng
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Column 1: Problem Statement */}
              <div className="h-[540px] sm:h-[580px]">
                <ProblemInputPanel
                  problemText={problemText}
                  onChangeProblemText={setProblemText}
                  attachedFiles={attachedFiles}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                  onClearProblem={handleClearProblem}
                />
              </div>

              {/* Column 2: C++ Code (Optional in Test Audit Mode) */}
              <div className="h-[540px] sm:h-[580px]">
                <CodeInputPanel
                  codeText={codeText}
                  onChangeCodeText={setCodeText}
                  onClearCode={handleClearCode}
                  isOptional={true}
                />
              </div>

              {/* Column 3: Themis Test Suite (6 Criteria) */}
              <div className="h-[540px] sm:h-[580px]">
                <ThemisTestPanel
                  testCases={testCases}
                  onChangeTestCases={setTestCases}
                  problemCodeName={problemCodeName}
                  onChangeProblemCodeName={setProblemCodeName}
                  problemStatement={problemText}
                  studentCode={codeText}
                />
              </div>
            </div>
          </div>
        ) : (
          /* 2-Column Layout: Focused on Problem & Student Code */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-xs text-indigo-300/80 bg-indigo-950/30 border border-indigo-900/40 rounded-lg py-1.5">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                <strong className="text-indigo-200">Phân tích & Tối ưu Code (Bố cục 2 Cột):</strong> Nhập đề bài và code C++ học sinh để kiểm tra thuật toán, bắt lỗi TLE/WA/Tràn số và nhận code Full AC.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Column 1: Problem Statement */}
              <div className="h-[540px] sm:h-[580px]">
                <ProblemInputPanel
                  problemText={problemText}
                  onChangeProblemText={setProblemText}
                  attachedFiles={attachedFiles}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                  onClearProblem={handleClearProblem}
                />
              </div>

              {/* Column 2: Student C++ Code */}
              <div className="h-[540px] sm:h-[580px]">
                <CodeInputPanel
                  codeText={codeText}
                  onChangeCodeText={setCodeText}
                  onClearCode={handleClearCode}
                  isOptional={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="flex flex-col items-center justify-center py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Button 1: Code Analysis & Optimization */}
            <button
              type="button"
              onClick={() => handleAnalyze("code")}
              disabled={isLoading || !codeText.trim() || (!problemText.trim() && attachedFiles.length === 0)}
              className={`group relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xl transition-all cursor-pointer ${
                isLoading || !codeText.trim() || (!problemText.trim() && attachedFiles.length === 0)
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30 active:scale-98"
              }`}
            >
              {isLoading && resultDefaultTab === 1 ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
                  <span>Phân tích & Tối ưu Code</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-mono tracking-tight text-white/90">
                    Ctrl + Enter
                  </span>
                </>
              )}
            </button>

            {/* Button 2: Test Suite Audit (ONLY visible in 3-column Test Audit mode) */}
            {workspaceMode === "test_audit" && (
              <button
                type="button"
                onClick={() => handleAnalyze("test")}
                disabled={isLoading || (!problemText.trim() && attachedFiles.length === 0 && testCases.length === 0)}
                className={`group relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xl transition-all cursor-pointer ${
                  isLoading || (!problemText.trim() && attachedFiles.length === 0 && testCases.length === 0)
                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                    : "bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-cyan-600/30 active:scale-98"
                }`}
                title="Thẩm định bộ test theo 6 tiêu chuẩn vàng (có code hoặc không có code chuẩn đều thẩm định được)"
              >
                {isLoading && resultDefaultTab === 5 ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="leading-tight">Thẩm định Bộ Test (6 Tiêu chí)</span>
                      <span className="text-[10px] font-normal text-emerald-200/90 leading-tight">
                        Có code hoặc không có code chuẩn đều được
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-black/20 text-[11px] font-mono tracking-tight text-emerald-200">
                      {testCases.length} test
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            {workspaceMode === "code_analysis" ? (
              <span>💡 <strong>Mẹo:</strong> Bấm <em>"Phân tích & Tối ưu Code"</em> (hoặc nhấn Ctrl + Enter) để AI rà soát lỗi logic, TLE, tràn số int và viết lại code C++ Full AC.</span>
            ) : (
              <span>💡 <strong>Mẹo:</strong> Bấm <em>"Thẩm định Bộ Test (6 Tiêu chí)"</em> để AI chấm điểm test biên, tràn số, subtask và tự sinh code AC đối chứng ngay cả khi chưa có code.</span>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div ref={resultRef} className="pt-2">
          <ResultPanel
            result={result}
            isLoading={isLoading}
            error={error}
            onRetry={() => handleAnalyze(resultDefaultTab === 5 ? "test" : "code")}
            onOpenSettings={() => setIsSettingsOpen(true)}
            testCases={testCases}
            problemCodeName={problemCodeName}
            defaultTab={resultDefaultTab}
            workspaceMode={workspaceMode}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Trợ lý Phân tích Thuật toán & Tối ưu Lập trình — Thiết kế lại Hệ Tiêu Chí Thẩm Định Bộ Test Chuẩn Themis & CMS (6 Tiêu Chí).
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Mô hình: <strong className="text-indigo-400">{model}</strong></span>
            <span>•</span>
            <span>6 Tiêu chuẩn Bộ Test</span>
            <span>•</span>
            <span>Xuất ZIP Themis</span>
            <span>•</span>
            <span>Code C++ Full AC</span>
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
