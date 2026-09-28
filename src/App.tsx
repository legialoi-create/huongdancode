import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  FileCode,
} from "lucide-react";
import { Header } from "./components/Header";
import { ProblemInputPanel } from "./components/ProblemInputPanel";
import { CodeInputPanel } from "./components/CodeInputPanel";
import { ResultPanel } from "./components/ResultPanel";
import { SettingsModal } from "./components/SettingsModal";
import { AttachedFile, ParsedAnalysis } from "./types";
import { SAMPLE_PROBLEMS } from "./data/sampleProblems";
import { parseAnalysisMarkdown } from "./utils/parser";
import {
  detectCodeIo,
  detectProblemsInText,
  matchProblemWithCode,
} from "./utils/problemDetector";
import {
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
} from "./utils/safeStorage";
import { isRealCandidateCode } from "./utils/codeChecker";

export default function App() {
  // Input states
  const [problemText, setProblemText] = useState<string>(() => {
    return safeGetItem("cp_problem_text") || "";
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [codeText, setCodeText] = useState<string>(() => {
    return (
      safeGetItem("cp_code_text") ||
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

  const [problemCodeName, setProblemCodeName] = useState<string>(() => {
    return safeGetItem("cp_problem_codename") || "MAXSUB";
  });

  // Settings states
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return safeGetItem("cp_user_api_key") || "";
  });
  const [model, setModel] = useState<string>(() => {
    const saved = safeGetItem("cp_selected_model");
    if (!saved || saved.includes("gemini-2.5") || saved.includes("gemini-2.0") || saved.includes("gemini-1.5") || saved.includes("gemini-3.1-pro")) {
      safeSetItem("cp_selected_model", "gemini-3.8-flash");
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
  const [resultDefaultTab, setResultDefaultTab] = useState<1 | 2 | 3 | 4>(1);
  const [result, setResult] = useState<ParsedAnalysis | null>(() => {
    const cached = safeGetItem("cp_last_analysis");
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

  // Aggregate all problem text (direct input + text extracted from attached documents)
  const fullProblemText = React.useMemo(() => {
    let combined = problemText;
    attachedFiles.forEach((f) => {
      if (f.extractedText && f.extractedText.trim().length > 0) {
        combined += `\n\n=== FILE ĐÍNH KÈM: ${f.name} ===\n${f.extractedText.trim()}`;
      }
    });
    return combined;
  }, [problemText, attachedFiles]);

  // Detect individual problems/questions in contest document
  const detectedProblems = React.useMemo(() => {
    return detectProblemsInText(fullProblemText);
  }, [fullProblemText]);

  // Detect freopen I/O from student code
  const codeIo = React.useMemo(() => {
    return detectCodeIo(codeText);
  }, [codeText]);

  // Match corresponding problem based on freopen I/O or problem code
  const matchedProblem = React.useMemo(() => {
    return matchProblemWithCode(detectedProblems, codeText, [], problemCodeName);
  }, [detectedProblems, codeText, problemCodeName]);

  // Auto-sync problem code name from matched problem or code freopen if appropriate
  useEffect(() => {
    if (matchedProblem?.problemCode) {
      setProblemCodeName(matchedProblem.problemCode);
    } else if (codeIo.problemCode) {
      setProblemCodeName(codeIo.problemCode);
    }
  }, [matchedProblem, codeIo.problemCode]);

  // Save drafts to safeStorage
  useEffect(() => {
    safeSetItem("cp_problem_text", problemText);
  }, [problemText]);

  useEffect(() => {
    safeSetItem("cp_code_text", codeText);
  }, [codeText]);

  useEffect(() => {
    safeSetItem("cp_problem_codename", problemCodeName);
  }, [problemCodeName]);

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    safeSetItem("cp_user_api_key", key);
  };

  const handleSaveModel = (newModel: string) => {
    setModel(newModel);
    safeSetItem("cp_selected_model", newModel);
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
    safeRemoveItem("cp_problem_text");
  };

  const handleClearCode = () => {
    setCodeText("");
    safeRemoveItem("cp_code_text");
  };

  const handleResetAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn làm mới toàn bộ đề bài và code?")) {
      handleClearProblem();
      handleClearCode();
      setResult(null);
      setError(null);
      safeRemoveItem("cp_last_analysis");
    }
  };

  // Load sample problem
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_PROBLEMS.find((p) => p.id === sampleId);
    if (!sample) return;

    setProblemText(sample.problemStatement);
    setCodeText(sample.studentCode);
    setAttachedFiles([]);
    if (sample.problemCodeName) {
      setProblemCodeName(sample.problemCodeName);
    }
    setError(null);
  };

  // Trigger code analysis call
  const handleAnalyze = useCallback(async () => {
    const hasProblem = problemText.trim().length > 0 || attachedFiles.length > 0;
    const hasRealCode = isRealCandidateCode(codeText);

    if (!hasProblem && !hasRealCode) {
      setError("Vui lòng cung cấp đề bài (nhập văn bản hoặc tải file đính kèm) hoặc code C++ để phân tích.");
      return;
    }

    setResultDefaultTab(1);
    setLoadingMessage(
      hasRealCode
        ? "Đang phân tích thuật toán & tối ưu mã nguồn C++..."
        : "Cột 2 chưa có code: AI đang phân tích đề bài, hướng dẫn thuật toán từng bước & tạo mã nguồn C++ Full AC 100%..."
    );

    setIsLoading(true);
    setError(null);

    try {
      const selectedProblem = detectedProblems.find((p) => p.id === selectedProblemId);
      const activeProblem = selectedProblem || matchedProblem;

      const payload: any = {
        problemText: selectedProblem ? selectedProblem.content : problemText,
        problemFiles: attachedFiles.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          base64: f.base64,
          extractedText: f.extractedText,
        })),
        codeText: hasRealCode ? codeText : "",
        userApiKey,
        model,
        problemCodeName: activeProblem?.problemCode || problemCodeName,
        selectedQuestionTitle: activeProblem
          ? `${activeProblem.label}: ${activeProblem.title}`
          : undefined,
      };

      let analysisText = "";

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
      } else if (data && data.error) {
        throw new Error(data.error);
      } else if (!response.ok) {
        if (response.status === 503) {
          throw new Error(
            "Hệ thống AI hiện đang có lượng truy cập tăng đột biến tạm thời (503 High Demand). Vui lòng nhấn nút 'Thử lại ngay' sau vài giây."
          );
        }
        throw new Error(`Lỗi máy chủ (${response.status}): ${rawText || response.statusText}`);
      } else {
        throw new Error("Không nhận được phản hồi từ hệ thống phân tích AI. Vui lòng thử lại.");
      }

      const parsed = parseAnalysisMarkdown(analysisText);
      setResult(parsed);
      safeSetItem("cp_last_analysis", analysisText);

      // Smooth scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi không mong muốn khi phân tích.");
    } finally {
      setIsLoading(false);
    }
  }, [
    codeText,
    problemText,
    attachedFiles,
    userApiKey,
    model,
    problemCodeName,
    detectedProblems,
    selectedProblemId,
    matchedProblem,
  ]);

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
        {/* Sample Problems Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Đề mẫu rèn luyện thuật toán:
            </span>
            {SAMPLE_PROBLEMS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSelectSample(sample.id)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600 hover:text-white border border-slate-700/60 text-slate-300 transition-all active:scale-95 cursor-pointer font-medium flex items-center gap-1.5"
              >
                <span>{sample.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Workspace Layout */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-indigo-300/80 bg-indigo-950/30 border border-indigo-900/40 rounded-lg py-1.5">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <strong className="text-indigo-200">Không gian Phân tích Thuật toán & Mã nguồn C++:</strong> Nạp đề bài ở Cột 1 (tự động đọc PDF, Word, Ảnh & AI tự chuẩn hóa đề hiển thị trực tiếp bên dưới) và code C++ học sinh ở Cột 2 để tối ưu và nhận code Full AC.
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
                detectedProblems={detectedProblems}
                selectedProblemId={selectedProblemId}
                onSelectProblem={(prob) => setSelectedProblemId(prob ? prob.id : null)}
                matchedProblem={matchedProblem}
                codeIo={codeIo}
                userApiKey={userApiKey}
                model={model}
                onReformulateSuccess={(newText, codeName) => {
                  setProblemText(newText);
                  if (codeName) setProblemCodeName(codeName);
                }}
              />
            </div>

            {/* Column 2: Student C++ Code */}
            <div className="h-[540px] sm:h-[580px]">
              <CodeInputPanel
                codeText={codeText}
                onChangeCodeText={setCodeText}
                onClearCode={handleClearCode}
              />
            </div>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="flex flex-col items-center justify-center py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Direct Analysis Button */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading || (!problemText.trim() && attachedFiles.length === 0 && !codeText.trim())}
              className={`group relative flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xl transition-all cursor-pointer ${
                isLoading || (!problemText.trim() && attachedFiles.length === 0 && !codeText.trim())
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30 active:scale-98"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">Phân tích & Tối ưu Code</span>
                    <span className="text-[10px] font-normal text-indigo-200/90 leading-tight">
                      Thiếu hoặc code sai vẫn phân tích đủ các bước & tạo mã Full AC
                    </span>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-mono tracking-tight text-white/90">
                    Ctrl + Enter
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div ref={resultRef} className="pt-2">
          <ResultPanel
            result={result}
            isLoading={isLoading}
            error={error}
            onRetry={handleAnalyze}
            onOpenSettings={() => setIsSettingsOpen(true)}
            problemCodeName={problemCodeName}
            defaultTab={resultDefaultTab}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Trợ lý Phân tích Thuật toán & Tối ưu Lập trình C++ — Hướng dẫn tư duy giải toán, bắt lỗi TLE/Tràn số và cung cấp mã nguồn Full AC.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Mô hình: <strong className="text-indigo-400">{model}</strong></span>
            <span>•</span>
            <span>Tối ưu Fast I/O</span>
            <span>•</span>
            <span>Bắt lỗi Overflow & TLE</span>
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
