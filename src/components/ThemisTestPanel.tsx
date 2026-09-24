import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Upload,
  ClipboardPaste,
  Trash2,
  HelpCircle,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  Target,
  FileCode2,
  FolderArchive,
  RefreshCw,
} from "lucide-react";
import { ThemisTestCase, TestCaseCategory, ThemisTestCriteriaReport } from "../types";
import {
  extractSampleTestsFromProblem,
  parseRawThemisText,
  formatTestCasesToRaw,
  evaluateTestCriteria,
  generateComprehensiveThemisSuite,
  downloadThemisZip,
} from "../utils/testSuiteEvaluator";
import { TestCriteriaModal } from "./TestCriteriaModal";
import JSZip from "jszip";

interface ThemisTestPanelProps {
  testCases: ThemisTestCase[];
  onChangeTestCases: (tests: ThemisTestCase[]) => void;
  problemCodeName?: string;
  onChangeProblemCodeName?: (name: string) => void;
  problemStatement?: string;
  studentCode?: string;
  onClearTests?: () => void;
}

export const ThemisTestPanel: React.FC<ThemisTestPanelProps> = ({
  testCases,
  onChangeTestCases,
  problemCodeName = "BAI",
  onChangeProblemCodeName,
  problemStatement = "",
  studentCode = "",
  onClearTests,
}) => {
  const [activeTab, setActiveTab] = useState<"list" | "criteria" | "raw" | "generator">("list");
  const [rawText, setRawText] = useState<string>("");
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeName, setCodeName] = useState<string>(problemCodeName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCodeName(problemCodeName);
  }, [problemCodeName]);

  const handleUpdateCodeName = (newName: string) => {
    const formatted = newName.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    setCodeName(formatted);
    onChangeProblemCodeName?.(formatted);
  };

  // Evaluate test criteria live
  const criteriaReport: ThemisTestCriteriaReport = useMemo(() => {
    return evaluateTestCriteria(testCases, codeName);
  }, [testCases, codeName]);

  // Total lines of test data calculation (as seen in user screenshot "34 dòng test")
  const totalTestLines = useMemo(() => {
    return testCases.reduce((acc, t) => {
      const inLines = t.input ? t.input.trim().split("\n").length : 0;
      const outLines = t.expectedOutput ? t.expectedOutput.trim().split("\n").length : 0;
      return acc + inLines + outLines;
    }, 0);
  }, [testCases]);

  // Sync testCases to rawText when switching to raw tab
  const handleSwitchToRaw = () => {
    setRawText(formatTestCasesToRaw(testCases));
    setActiveTab("raw");
  };

  // Sync rawText back to testCases
  const handleApplyRawText = (text: string) => {
    setRawText(text);
    const parsed = parseRawThemisText(text);
    onChangeTestCases(parsed);
  };

  // Extract sample test from problem
  const handleExtractSample = () => {
    const samples = extractSampleTestsFromProblem(problemStatement);
    if (samples.length > 0) {
      // Merge without duplicating existing sample ids
      const existing = testCases.filter((t) => t.category !== "sample");
      onChangeTestCases([...samples, ...existing]);
      setActiveTab("list");
    } else {
      // Create a default sample test if not found in problem text
      const newTest: ThemisTestCase = {
        id: `sample-${Date.now()}`,
        name: `Test ${(testCases.length + 1).toString().padStart(2, "0")} (Mẫu)`,
        category: "sample",
        input: "5\n2 -3 4 -1 5",
        expectedOutput: "8",
        description: "Test ví dụ mẫu",
        subtask: 1,
        points: 10,
      };
      onChangeTestCases([newTest, ...testCases]);
      setActiveTab("list");
    }
  };

  // Add a specific boundary test
  const handleAddBoundaryTest = () => {
    const newTest: ThemisTestCase = {
      id: `boundary-${Date.now()}`,
      name: `Test ${(testCases.length + 1).toString().padStart(2, "0")} (Biên N=1)`,
      category: "boundary",
      input: "1\n-100",
      expectedOutput: "-100",
      description: "Test biên cận dưới N=1 phần tử âm",
      subtask: 1,
      points: 10,
    };
    onChangeTestCases([...testCases, newTest]);
    setActiveTab("list");
  };

  // Add overflow test
  const handleAddOverflowTest = () => {
    const newTest: ThemisTestCase = {
      id: `overflow-${Date.now()}`,
      name: `Test ${(testCases.length + 1).toString().padStart(2, "0")} (Tràn số 64-bit)`,
      category: "overflow",
      input: "3\n1000000000 1000000000 1000000000",
      expectedOutput: "3000000000",
      description: "Bẫy tràn số int 32-bit: Tổng vượt 2*10^9 buộc dùng long long",
      subtask: 2,
      points: 10,
    };
    onChangeTestCases([...testCases, newTest]);
    setActiveTab("list");
  };

  // Generate full comprehensive 12-test suite
  const handleGenerateFullSuite = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Find sample output if available
      let sampleIn = "5\n2 -3 4 -1 5";
      let sampleOut = "8";
      const detected = extractSampleTestsFromProblem(problemStatement);
      if (detected.length > 0) {
        sampleIn = detected[0].input;
        sampleOut = detected[0].expectedOutput;
      }

      const suite = generateComprehensiveThemisSuite(codeName, sampleIn, sampleOut);
      onChangeTestCases(suite);
      setIsGenerating(false);
      setActiveTab("criteria");
    }, 300);
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const parsed = parseRawThemisText(text);
        if (parsed.length > 0) {
          onChangeTestCases([...testCases, ...parsed]);
        } else {
          // Add as single test
          const newTest: ThemisTestCase = {
            id: `paste-${Date.now()}`,
            name: `Test ${(testCases.length + 1).toString().padStart(2, "0")}`,
            category: "random",
            input: text.trim(),
            expectedOutput: "",
            description: "Dán từ clipboard",
          };
          onChangeTestCases([...testCases, newTest]);
        }
      }
    } catch {
      // Fallback
      setActiveTab("raw");
    }
  };

  // Upload file (zip or text file)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".zip")) {
      try {
        const zip = await JSZip.loadAsync(file);
        const newTests: ThemisTestCase[] = [];
        const testFolders = new Set<string>();

        zip.forEach((path) => {
          const parts = path.split("/");
          if (parts.length >= 2 && parts[0].toLowerCase().includes("test")) {
            testFolders.add(parts[0]);
          }
        });

        const sortedFolders = Array.from(testFolders).sort();
        for (let i = 0; i < sortedFolders.length; i++) {
          const folder = sortedFolders[i];
          let inputContent = "";
          let outputContent = "";

          for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (path.startsWith(folder) && !zipEntry.dir) {
              const lower = path.toLowerCase();
              if (lower.endsWith(".inp") || lower.endsWith(".in")) {
                inputContent = await zipEntry.async("string");
              } else if (lower.endsWith(".out") || lower.endsWith(".ans")) {
                outputContent = await zipEntry.async("string");
              }
            }
          }

          if (inputContent || outputContent) {
            newTests.push({
              id: `zip-${folder}-${Date.now()}`,
              name: folder,
              category: i < 3 ? "sample" : i < 6 ? "boundary" : "subtask2",
              input: inputContent.trim(),
              expectedOutput: outputContent.trim(),
              description: `Nạp từ tệp zip: ${folder}`,
            });
          }
        }

        if (newTests.length > 0) {
          onChangeTestCases(newTests);
        }
      } catch (err) {
        console.error("Lỗi đọc file ZIP:", err);
      }
    } else {
      // Plain text file
      const text = await file.text();
      const parsed = parseRawThemisText(text);
      if (parsed.length > 0) {
        onChangeTestCases(parsed);
      }
    }
    e.target.value = "";
  };

  // Export Themis ZIP
  const handleDownloadZip = async () => {
    if (testCases.length === 0) return;
    await downloadThemisZip(testCases, codeName);
  };

  // Copy single test
  const handleCopyTest = (test: ThemisTestCase) => {
    const text = `INPUT:\n${test.input}\n\nOUTPUT:\n${test.expectedOutput}`;
    navigator.clipboard.writeText(text);
    setCopiedId(test.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Delete single test
  const handleDeleteTest = (id: string) => {
    onChangeTestCases(testCases.filter((t) => t.id !== id));
  };

  // Category badge colors
  const getCategoryBadge = (cat: TestCaseCategory) => {
    switch (cat) {
      case "sample":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Mẫu đề bài</span>;
      case "boundary":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Biên N min/max</span>;
      case "overflow":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">Tràn số int64</span>;
      case "anti_hack":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">Bẫy logic / TLE</span>;
      case "special":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Đặc biệt</span>;
      case "subtask1":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Subtask 1</span>;
      case "subtask2":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Subtask 2</span>;
      case "subtask3":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">Subtask 3</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">Ngẫu nhiên</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* PANEL HEADER - EXACT REPRODUCTION & UPGRADE OF USER'S 1.PNG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 gap-2.5">
        {/* Left Title & Badges */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              3. Bộ test Themis (Dữ liệu chấm)
            </h2>

            {/* Test count badge as shown in screenshot */}
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {totalTestLines > 0 ? `${totalTestLines} dòng test` : `${testCases.length} test`}
            </span>

            {/* Quality Score Indicator */}
            {testCases.length > 0 && (
              <span
                onClick={() => setActiveTab("criteria")}
                className={`cursor-pointer px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all hover:scale-105 ${
                  criteriaReport.overallScore >= 80
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/40"
                    : criteriaReport.overallScore >= 50
                    ? "bg-amber-950/60 text-amber-300 border-amber-600/40"
                    : "bg-rose-950/60 text-rose-300 border-rose-600/40"
                }`}
                title="Bấm để xem chi tiết Bảng Thẩm Định 6 Tiêu Chí"
              >
                <span>{criteriaReport.overallScore}% Tiêu chí</span>
                <span>•</span>
                <span>{criteriaReport.rating}</span>
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Action Buttons (from 1.PNG: [?] [+ Mẫu test] [Tải tệp] [Dán] [Xóa]) */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {/* Help Button (?) */}
          <button
            type="button"
            onClick={() => setIsCriteriaModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xem Hệ Tiêu Chí Chuẩn Bộ Test Themis (6 Tiêu chuẩn Vàng)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* + Mẫu test Button */}
          <button
            type="button"
            onClick={handleExtractSample}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Tự động trích xuất test ví dụ từ đề bài"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mẫu test</span>
          </button>

          {/* Tải tệp Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".zip,.inp,.out,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Tải tệp .zip (thư mục Themis Test01...) hoặc file .inp/.out"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Tải tệp</span>
          </button>

          {/* Xuất ZIP Themis (Ready for Themis grader) */}
          {testCases.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Tải xuống tệp .ZIP thư mục Test01, Test02... chuẩn Themis"
            >
              <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Xuất Themis ZIP</span>
            </button>
          )}

          {/* Paste icon */}
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dán nhanh test từ clipboard"
          >
            <ClipboardPaste className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Delete icon */}
          {testCases.length > 0 && (
            <button
              type="button"
              onClick={onClearTests}
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Xóa toàn bộ test"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SUB-HEADER / TAB NAVIGATION */}
      <div className="flex items-center justify-between px-3 bg-slate-950/70 border-b border-slate-800/80 text-xs">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`py-2 px-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "list"
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Danh sách Test ({testCases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("criteria")}
            className={`py-2 px-2.5 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "criteria"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🎯 Thẩm định Tiêu chí</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
              {criteriaReport.overallScore}%
            </span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToRaw}
            className={`py-2 px-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "raw"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Soạn Raw Text
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={`py-2 px-2.5 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "generator"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ Sinh Test Tự Động
          </button>
        </div>

        {/* Quick Config: Problem Name for Themis */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Mã bài Themis:</span>
          <input
            type="text"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
            className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-[11px] uppercase focus:outline-none focus:border-indigo-500"
            placeholder="BAI"
            title="Tên file .INP/.OUT trên Themis (ví dụ: MAXSUB -> MAXSUB.INP)"
          />
        </div>
      </div>

      {/* PANEL BODY */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[360px]">
        {/* TAB 1: VISUAL TEST LIST */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 text-[11px] mr-1">Thêm nhanh test tiêu chí:</span>
                <button
                  type="button"
                  onClick={handleAddBoundaryTest}
                  className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer text-[11px] font-medium"
                >
                  + Test biên (N=1)
                </button>
                <button
                  type="button"
                  onClick={handleAddOverflowTest}
                  className="px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer text-[11px] font-medium"
                >
                  + Bẫy tràn số (int64)
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFullSuite}
                  className="px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer text-[11px] font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Sinh trọn bộ 12 test
                </button>
              </div>

              <span className="text-[11px] text-slate-500">
                {testCases.length} testcases • {totalTestLines} dòng
              </span>
            </div>

            {/* Test Cards List */}
            {testCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Chưa có dữ liệu chấm (Bộ test Themis)</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Nhập bộ test để kiểm tra code học sinh và đánh giá theo 6 tiêu chí chuẩn Themis (đúng/sai, test đặc biệt, test biên, tràn số, bẫy TLE).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExtractSample}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    Lấy Test Mẫu Từ Đề
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateFullSuite}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    Tự Động Sinh Trọn Bộ 12 Test
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {testCases.map((test, index) => {
                  const isExpanded = expandedTestId === test.id;
                  return (
                    <div
                      key={test.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/70 hover:border-slate-700 transition-all overflow-hidden"
                    >
                      {/* Test Summary Bar */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/60 select-none">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer flex-1"
                          onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                        >
                          <span className="font-mono text-xs font-bold text-slate-300">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {test.name}
                          </span>
                          {getCategoryBadge(test.category)}
                          {test.description && (
                            <span className="hidden md:inline text-[11px] text-slate-400 truncate max-w-xs">
                              • {test.description}
                            </span>
                          )}
                        </div>

                        {/* Test Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyTest(test)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Sao chép test"
                          >
                            {copiedId === test.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTest(test.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Xóa test này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Test Details (Inputs & Outputs) */}
                      {isExpanded && (
                        <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 space-y-2.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Input Column */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                <span className="font-semibold text-indigo-300 font-mono">
                                  Dữ liệu vào ({codeName}.INP):
                                </span>
                                <span>{test.input.split("\n").length} dòng</span>
                              </div>
                              <textarea
                                value={test.input}
                                onChange={(e) => {
                                  const updated = testCases.map((t) =>
                                    t.id === test.id ? { ...t, input: e.target.value } : t
                                  );
                                  onChangeTestCases(updated);
                                }}
                                rows={4}
                                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                                placeholder="Dữ liệu vào..."
                              />
                            </div>

                            {/* Output Column */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                <span className="font-semibold text-emerald-300 font-mono">
                                  Đáp án chuẩn ({codeName}.OUT):
                                </span>
                                <span>{test.expectedOutput.split("\n").length} dòng</span>
                              </div>
                              <textarea
                                value={test.expectedOutput}
                                onChange={(e) => {
                                  const updated = testCases.map((t) =>
                                    t.id === test.id ? { ...t, expectedOutput: e.target.value } : t
                                  );
                                  onChangeTestCases(updated);
                                }}
                                rows={4}
                                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                                placeholder="Kết quả mong đợi..."
                              />
                            </div>
                          </div>

                          {/* Test Tag & Subtask Editor */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>Phân loại:</span>
                              <select
                                value={test.category}
                                onChange={(e) => {
                                  const cat = e.target.value as TestCaseCategory;
                                  const updated = testCases.map((t) =>
                                    t.id === test.id ? { ...t, category: cat } : t
                                  );
                                  onChangeTestCases(updated);
                                }}
                                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                              >
                                <option value="sample">Test mẫu đề bài</option>
                                <option value="boundary">Test biên (N min/max)</option>
                                <option value="overflow">Bẫy tràn số (int64)</option>
                                <option value="anti_hack">Bẫy logic / Anti-hack</option>
                                <option value="special">Đặc biệt (0, số âm, bằng nhau)</option>
                                <option value="subtask1">Subtask 1 (vét cạn)</option>
                                <option value="subtask2">Subtask 2 (trung gian)</option>
                                <option value="subtask3">Subtask 3 (tối ưu toàn diện)</option>
                                <option value="random">Ngẫu nhiên</option>
                              </select>
                            </div>

                            <input
                              type="text"
                              value={test.description || ""}
                              onChange={(e) => {
                                const desc = e.target.value;
                                const updated = testCases.map((t) =>
                                  t.id === test.id ? { ...t, description: desc } : t
                                );
                                onChangeTestCases(updated);
                              }}
                              placeholder="Mô tả mục đích test (ví dụ: bẫy gán max=0)..."
                              className="flex-1 max-w-sm px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CRITERIA CHECKLIST & EVALUATION REPORT */}
        {activeTab === "criteria" && (
          <div className="space-y-4">
            {/* Health Score Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Thẩm Định Chất Lượng Bộ Test (Themis Criteria Report)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">
                    {criteriaReport.rating}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <h3 className="text-xl font-bold text-white">
                    Điểm Thẩm Định: {criteriaReport.overallScore}/100
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Chốt: Đúng {criteriaReport.validTestsCount}/{criteriaReport.totalTests} test chuẩn ({criteriaReport.totalTests > 0 ? Math.round((criteriaReport.validTestsCount / criteriaReport.totalTests) * 100) : 0}%)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">
                  Đánh giá toàn diện dựa trên 6 tiêu chí chuẩn HSG: Đúng/sai, có test đặc biệt không, có test biên không, phân chia subtask, bẫy TLE, và định dạng Themis.
                </p>
              </div>

              {/* Progress Circle & Quick Fix */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateFullSuite}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tự động tối ưu 100% Tiêu chí</span>
                </button>
              </div>
            </div>

            {/* Missing Edge Cases Warning if any */}
            {criteriaReport.missingEdgeCases.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Phát hiện các góc khuất / Test biên đang bị thiếu:</span>
                </div>
                <ul className="text-xs text-amber-200/90 space-y-1 list-disc list-inside">
                  {criteriaReport.missingEdgeCases.map((miss, idx) => (
                    <li key={idx}>{miss}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6 Criteria Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(criteriaReport.criteria).map(([key, item]) => {
                const isPass = item.status === "pass";
                const isWarn = item.status === "warning";
                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {item.name}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPass
                            ? "bg-emerald-500/20 text-emerald-300"
                            : isWarn
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {item.score}%
                      </span>
                    </div>

                    {/* Prominent Correctness Summary for Criterion 1 */}
                    {key === "correctness" && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/50 border border-emerald-800/60 shadow-inner">
                        <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Chốt kết quả kiểm định:</span>
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                          Đúng {criteriaReport.validTestsCount}/{criteriaReport.totalTests} test ({criteriaReport.totalTests > 0 ? Math.round((criteriaReport.validTestsCount / criteriaReport.totalTests) * 100) : 0}%)
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-slate-300">
                      {item.details.map((d, i) => (
                        <div key={i} className="leading-relaxed">
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {criteriaReport.recommendations.length > 0 && (
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-1.5">
                <div className="font-bold text-xs text-indigo-300">
                  Khuyến nghị nâng cấp bộ test:
                </div>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {criteriaReport.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW TEXT EDITOR */}
        {activeTab === "raw" && (
          <div className="space-y-2 flex flex-col h-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Định dạng: `=== TEST 01 (Mô tả) ===` [Input] `--- OUTPUT ---` [Output]</span>
              <button
                type="button"
                onClick={() => handleApplyRawText(rawText)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Áp dụng dữ liệu
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => handleApplyRawText(e.target.value)}
              rows={14}
              placeholder={`=== TEST 01 (Mẫu) ===
5
2 -3 4 -1 5
--- OUTPUT ---
8

=== TEST 02 (Biên N=1) ===
1
-42
--- OUTPUT ---
-42

=== TEST 03 (Tràn số) ===
2
1000000000 1000000000
--- OUTPUT ---
2000000000`}
              className="flex-1 w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* TAB 4: AUTO GENERATOR / C++ SCRIPT */}
        {activeTab === "generator" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Trình Sinh Bộ Test Chuẩn Themis Tự Động
                </h4>
                <button
                  type="button"
                  onClick={handleGenerateFullSuite}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Sinh Ngay Trọn Bộ 12 Test Tiêu Chuẩn</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tự động tạo bộ test đầy đủ các ca: Test mẫu, Test biên $N=1$, Test biên {"$N_{max}$"}, Test mảng toàn số âm, Test số 0, Test bẫy tràn số $10^{"{18}"}$, Test bẫy Quicksort suy biến, và Test ngẫu nhiên phân bố đều.
              </p>
            </div>

            {/* C++ Test Generator Code snippet for offline use */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-indigo-400" />
                  Mã nguồn C++ sinh test Themis (Dành cho giáo viên/ra đề):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const code = `// C++ Test Generator for Themis
#include <bits/stdc++.h>
using namespace std;

mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
long long randVal(long long l, long long r) {
    return uniform_int_distribution<long long>(l, r)(rng);
}

int main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    // Sinh file INP: ví dụ N = 100000, A_i trong [-1e9, 1e9]
    int n = 100000;
    cout << n << "\\n";
    for (int i = 0; i < n; i++) {
        cout << randVal(-1000000000LL, 1000000000LL) << (i + 1 == n ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`;
                    navigator.clipboard.writeText(code);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Copy C++ Generator
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`// C++ Test Generator for Themis
#include <bits/stdc++.h>
using namespace std;

mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
long long randVal(long long l, long long r) {
    return uniform_int_distribution<long long>(l, r)(rng);
}

int main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    int n = 100000;
    cout << n << "\\n";
    for (int i = 0; i < n; i++) {
        cout << randVal(-1000000000LL, 1000000000LL) << (i + 1 == n ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>{testCases.length} Testcases</span>
          <span>•</span>
          <span className="text-slate-400 font-mono">Chuẩn Themis: {codeName}.INP / {codeName}.OUT</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCriteriaModalOpen(true)}
            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tiêu chí chuẩn 1. đúng/sai 2. test đặc biệt 3. subtask...</span>
          </button>
        </div>
      </div>

      {/* Criteria Info Modal */}
      <TestCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
      />
    </div>
  );
};
