import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Image as ImageIcon,
  FileCode,
  X,
  File as GenericFileIcon,
  Trash2,
  CheckCircle2,
  Loader2,
  Eye,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { AttachedFile } from "../types";
import { extractTextFromFile } from "../utils/fileExtractors";

interface ProblemInputPanelProps {
  problemText: string;
  onChangeProblemText: (text: string) => void;
  attachedFiles: AttachedFile[];
  onAddFiles: (files: AttachedFile[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearProblem: () => void;
}

interface BannerNotification {
  fileName: string;
  text: string;
  charCount: number;
  autoApplied?: boolean;
}

export const ProblemInputPanel: React.FC<ProblemInputPanelProps> = ({
  problemText,
  onChangeProblemText,
  attachedFiles,
  onAddFiles,
  onRemoveFile,
  onClearProblem,
}) => {
  const [activeTab, setActiveTab] = useState<"text" | "upload">("text");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<BannerNotification | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; text: string } | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process files (extract text from PDF, Word .docx/.doc, text files, and images)
  const processFiles = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    const newFiles: AttachedFile[] = [];
    let extractedFromFile: { name: string; text: string } | null = null;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        setProcessingStatus(`Đang đọc và phân tích file: ${file.name}...`);

        // Read ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Convert to Base64 safely
        let base64Data = "";
        try {
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = "";
          const chunkSize = 8192;
          for (let j = 0; j < uint8.length; j += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(j, j + chunkSize)));
          }
          base64Data = btoa(binary);
        } catch {
          base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(",")[1] || "");
            };
            reader.readAsDataURL(file);
          });
        }

        // Preview URL for images
        let previewUrl: string | undefined;
        if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
          previewUrl = URL.createObjectURL(file);
        }

        // Extract textual content from Word (.docx, .doc), PDF, or Text files
        const { text: extractedText, mimeType } = await extractTextFromFile(file, arrayBuffer, base64Data);

        if (extractedText && extractedText.trim().length > 0) {
          if (!extractedFromFile) {
            extractedFromFile = { name: file.name, text: extractedText.trim() };
          }
        }

        newFiles.push({
          id,
          name: file.name,
          size: file.size,
          mimeType,
          base64: base64Data,
          previewUrl,
          extractedText: extractedText ? extractedText.trim() : undefined,
        });
      }

      // Handle extracted text notification and auto-application
      if (extractedFromFile) {
        const charCount = extractedFromFile.text.length;

        // If problemText is empty or very short, auto-fill it
        if (!problemText.trim() || problemText.trim().length < 20) {
          onChangeProblemText(extractedFromFile.text);
          setActiveTab("text");
          setBannerNotice({
            fileName: extractedFromFile.name,
            text: extractedFromFile.text,
            charCount,
            autoApplied: true,
          });
        } else {
          // If problemText already has content, show prominent banner with options
          setBannerNotice({
            fileName: extractedFromFile.name,
            text: extractedFromFile.text,
            charCount,
            autoApplied: false,
          });
        }
      }

      if (newFiles.length > 0) {
        onAddFiles(newFiles);
      }
    } catch (err: any) {
      console.error("Lỗi khi xử lý file tải lên:", err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Re-extract a specific file if needed
  const handleReExtract = async (file: AttachedFile) => {
    if (!file.base64) return;
    setIsProcessing(true);
    setProcessingStatus(`Đang đọc lại nội dung file ${file.name}...`);
    try {
      const binaryString = atob(file.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const dummyFile = new File([bytes], file.name, { type: file.mimeType });
      const { text } = await extractTextFromFile(dummyFile, bytes.buffer, file.base64);

      if (text && text.trim().length > 0) {
        file.extractedText = text.trim();
        setBannerNotice({
          fileName: file.name,
          text: text.trim(),
          charCount: text.trim().length,
          autoApplied: false,
        });
      }
    } catch (e) {
      console.warn("Lỗi đọc lại file:", e);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste listener for direct image pasting (Ctrl+V screenshot of problem)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        files.push(e.clipboardData.files[i]);
      }
      if (files.length > 0) {
        e.preventDefault();
        await processFiles(files);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    }
    if (mimeType === "application/pdf" || ext === "pdf") {
      return <FileText className="w-4 h-4 text-rose-400" />;
    }
    if (ext === "docx" || ext === "doc" || mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("msword")) {
      return (
        <span className="w-4 h-4 rounded bg-blue-600/30 text-blue-400 font-bold text-[9px] flex items-center justify-center border border-blue-500/40">
          W
        </span>
      );
    }
    if (mimeType.startsWith("text/") || ["txt", "inp", "out", "cpp", "c", "py", "pas", "md"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-cyan-400" />;
    }
    return <GenericFileIcon className="w-4 h-4 text-indigo-400" />;
  };

  const handleReplaceProblem = (text: string) => {
    onChangeProblemText(text);
    setActiveTab("text");
    setBannerNotice(null);
  };

  const handleAppendProblem = (text: string) => {
    if (!problemText.trim()) {
      onChangeProblemText(text);
    } else {
      onChangeProblemText(`${problemText}\n\n=== NỘI DUNG TỪ FILE ĐÍNH KÈM ===\n${text}`);
    }
    setActiveTab("text");
    setBannerNotice(null);
  };

  const handleCopyPreview = () => {
    if (previewFile?.text) {
      navigator.clipboard.writeText(previewFile.text);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              1. Đề bài (Problem Statement)
            </h2>
          </div>
        </div>

        {/* Tab switch / action */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("text")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === "text"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Nhập văn bản
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Đính kèm file</span>
              {attachedFiles.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {attachedFiles.length}
                </span>
              )}
            </button>
          </div>

          {(problemText || attachedFiles.length > 0) && (
            <button
              onClick={() => {
                onClearProblem();
                setBannerNotice(null);
              }}
              title="Xóa đề bài và file đính kèm"
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Actionable Banner for Extracted Document */}
      {bannerNotice && (
        <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-slate-900 border-b border-indigo-500/30 px-3.5 py-2.5 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div className="truncate text-xs">
              {bannerNotice.autoApplied ? (
                <span>
                  <strong className="text-emerald-300">Đã tự động nạp đề bài</strong> từ file{" "}
                  <code className="text-indigo-300 font-mono font-semibold">{bannerNotice.fileName}</code>{" "}
                  ({bannerNotice.charCount.toLocaleString()} ký tự).
                </span>
              ) : (
                <span>
                  Đã đọc thành công file{" "}
                  <code className="text-indigo-300 font-mono font-semibold">{bannerNotice.fileName}</code>{" "}
                  ({bannerNotice.charCount.toLocaleString()} ký tự). Bạn muốn:
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!bannerNotice.autoApplied && (
              <>
                <button
                  type="button"
                  onClick={() => handleReplaceProblem(bannerNotice.text)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Thay thế đề bài
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendProblem(bannerNotice.text)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                >
                  Nối thêm
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setPreviewFile({ name: bannerNotice.fileName, text: bannerNotice.text })}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-indigo-300 hover:text-white hover:bg-indigo-900/50 border border-indigo-700/50 transition-all cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Xem trước
            </button>
            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 space-y-3 min-h-[360px]">
        {activeTab === "text" ? (
          <div className="flex-1 flex flex-col relative">
            <textarea
              value={problemText}
              onChange={(e) => onChangeProblemText(e.target.value)}
              onPaste={handlePaste}
              placeholder={`Dán nội dung đề bài tại đây...
(Bao gồm: Yêu cầu bài toán, Input/Output, Ràng buộc Time/Memory limit, Giới hạn N, M, Subtask...)

💡 Mẹo: 
- Bạn có thể chuyển sang tab "Đính kèm file" để tải file Word (.docx, .doc), PDF (.pdf) hoặc Text (.txt, .inp). Hệ thống sẽ tự động đọc toàn bộ đề bài và công thức toán!
- Hoặc dán trực tiếp ảnh chụp màn hình đề bài bằng phím Ctrl+V / Cmd+V!`}
              className="flex-1 w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 font-sans text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 px-1">
              <span>{problemText.length.toLocaleString()} ký tự</span>
              <span className="text-slate-400">Hỗ trợ LaTeX công thức toán $...$ & Markdown</span>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all relative ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-slate-200">
                  {processingStatus || "Đang đọc nội dung file..."}
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Hệ thống đang tự động trích xuất đề bài, công thức Word Equation ($m:oMath$) và bảng dữ liệu...
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200 text-center mb-1">
                  Kéo & thả file đề bài vào đây
                </p>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-4 leading-relaxed">
                  Hỗ trợ trực tiếp văn bản{" "}
                  <span className="text-blue-400 font-semibold">Word (.docx, .doc)</span>,{" "}
                  <span className="text-rose-400 font-semibold">PDF (.pdf)</span>,{" "}
                  <span className="text-cyan-400 font-semibold">Text (.txt, .inp, .md)</span>, và ảnh chụp đề (<span className="text-emerald-400 font-semibold">.png, .jpg</span>)
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFiles(e.target.files);
                      e.target.value = "";
                    }
                  }}
                  multiple
                  accept=".docx,.doc,.pdf,.txt,.inp,.out,.cpp,.c,.py,.pas,.md,.text,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn file từ máy tính</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Attached Files List */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>File đính kèm ({attachedFiles.length}):</span>
                {attachedFiles.some((f) => f.extractedText) && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã đọc văn bản từ tài liệu
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                + Thêm file khác
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {attachedFiles.map((file) => {
                const isWord =
                  file.name.endsWith(".docx") ||
                  file.name.endsWith(".doc") ||
                  file.mimeType.includes("word") ||
                  file.mimeType.includes("document");

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                      {file.previewUrl ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-8 h-8 rounded object-cover border border-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.name, file.mimeType)}
                        </div>
                      )}
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span>{formatFileSize(file.size)}</span>
                          {file.extractedText ? (
                            <span className="text-emerald-400 font-mono font-medium">
                              • Đã đọc {file.extractedText.length.toLocaleString()} ký tự
                            </span>
                          ) : isWord ? (
                            <span className="text-amber-400">
                              • Đang phân tích...
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {file.extractedText ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewFile({ name: file.name, text: file.extractedText! })
                            }
                            title="Xem trước nội dung trích xuất"
                            className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplaceProblem(file.extractedText!)}
                            title="Đưa nội dung file này vào ô Đề bài"
                            className="px-2 py-0.8 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-800/60 transition-all cursor-pointer"
                          >
                            Đưa vào đề
                          </button>
                        </>
                      ) : isWord ? (
                        <button
                          type="button"
                          onClick={() => handleReExtract(file)}
                          title="Thử trích xuất lại nội dung Word"
                          className="px-1.5 py-0.8 rounded text-[10px] font-medium bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800/60 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Đọc lại
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Xóa file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal for Extracted Document Text */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                    Nội dung trích xuất: {previewFile.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewFile.text.length.toLocaleString()} ký tự • Đã tự động chuyển đổi công thức và bảng dữ liệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950/50 selection:bg-indigo-600 selection:text-white">
              {previewFile.text}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyPreview}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPreview ? "Đã sao chép!" : "Sao chép toàn bộ"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAppendProblem(previewFile.text);
                    setPreviewFile(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  Nối thêm vào đề
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReplaceProblem(previewFile.text);
                    setPreviewFile(null);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Áp dụng làm đề bài</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
