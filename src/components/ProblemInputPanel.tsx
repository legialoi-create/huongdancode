import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Image as ImageIcon,
  FileCode,
  X,
  FileSpreadsheet,
  File,
  Sparkles,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { AttachedFile } from "../types";

interface ProblemInputPanelProps {
  problemText: string;
  onChangeProblemText: (text: string) => void;
  attachedFiles: AttachedFile[];
  onAddFiles: (files: AttachedFile[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearProblem: () => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process files (extract text or convert to Base64)
  const processFiles = async (fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip prefix data:...;base64,
          const base64 = result.split(",")[1] || "";
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      // If text file, optionally append to problem text or attach
      if (file.type === "text/plain") {
        try {
          const text = await file.text();
          if (!problemText.trim()) {
            onChangeProblemText(text);
          }
        } catch {
          // ignore
        }
      }

      newFiles.push({
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        base64: base64Data,
        previewUrl,
      });
    }

    if (newFiles.length > 0) {
      onAddFiles(newFiles);
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
      const imageFiles: File[] = [];
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const file = e.clipboardData.files[i];
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        await processFiles(imageFiles);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-rose-400" />;
    if (mimeType.includes("word") || mimeType.includes("document"))
      return <FileText className="w-4 h-4 text-blue-400" />;
    return <File className="w-4 h-4 text-indigo-400" />;
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
              onClick={onClearProblem}
              title="Xóa đề bài"
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

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

💡 Mẹo: Bạn cũng có thể nhấn Ctrl+V / Cmd+V để dán trực tiếp ảnh chụp màn hình đề bài!`}
              className="flex-1 w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 font-sans text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 px-1">
              <span>{problemText.length} ký tự</span>
              <span className="text-slate-400">Hỗ trợ LaTeX công thức toán $...$</span>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200 text-center mb-1">
              Kéo & thả file đề bài vào đây
            </p>
            <p className="text-xs text-slate-400 text-center max-w-xs mb-4">
              Hỗ trợ file ảnh chụp (<span className="text-indigo-300 font-medium">.png, .jpg, .jpeg</span>), tài liệu{" "}
              <span className="text-indigo-300 font-medium">.pdf, .txt, .docx</span>
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
              accept="image/*,.pdf,.txt,.docx"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Chọn file từ máy tính
            </button>
          </div>
        )}

        {/* Attached Files List */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>File đính kèm ({attachedFiles.length}):</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Thêm file khác
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs group hover:border-slate-700"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-8 h-8 rounded object-cover border border-slate-800 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-slate-200 font-medium truncate max-w-[130px]" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
