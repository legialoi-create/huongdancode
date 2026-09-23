import React, { useRef, useState } from "react";
import {
  Code2,
  ClipboardPaste,
  Upload,
  Trash2,
  FileCode2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

interface CodeInputPanelProps {
  codeText: string;
  onChangeCodeText: (code: string) => void;
  onClearCode: () => void;
}

export const CodeInputPanel: React.FC<CodeInputPanelProps> = ({
  codeText,
  onChangeCodeText,
  onClearCode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  // Handle Tab key indentation (4 spaces)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = codeText.substring(0, start) + "    " + codeText.substring(end);
      onChangeCodeText(newCode);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChangeCodeText(text);
      }
    } catch {
      // Focus textarea so user can press Ctrl+V if permission blocked
      textareaRef.current?.focus();
    }
  };

  // Upload .cpp file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onChangeCodeText(content);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load standard CP template
  const handleInsertTemplate = () => {
    const template = `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void solve() {
    int n;
    if (!(cin >> n)) return;
    
    // Thuật toán của bạn tại đây
}

int main() {
    // Tối ưu nhập xuất C++
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    // cin >> t; // Bỏ comment nếu bài có nhiều test cases
    while (t--) {
        solve();
    }
    return 0;
}`;
    onChangeCodeText(template);
  };

  const lineCount = codeText ? codeText.split("\n").length : 0;

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              2. Code C++ của học sinh
            </h2>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Dán nhanh mã nguồn từ bộ nhớ tạm"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Dán nhanh</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".cpp,.cc,.cxx,.h,.hpp,.txt"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Tải file .cpp từ máy tính"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Tải file .cpp</span>
          </button>

          {codeText && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Sao chép code hiện tại"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onClearCode}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Xóa toàn bộ code"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col p-4 space-y-2 min-h-[360px]">
        <div className="flex-1 flex relative rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30">
          {/* Line Numbers Bar */}
          <div className="w-10 py-3.5 bg-slate-950/70 border-r border-slate-800/60 select-none text-right pr-2 text-slate-600 font-mono text-xs overflow-hidden leading-relaxed">
            {Array.from({ length: Math.max(lineCount, 16) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea Code Input */}
          <textarea
            ref={textareaRef}
            value={codeText}
            onChange={(e) => onChangeCodeText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={`// Dán mã nguồn C++ của học sinh tại đây...
#include <iostream>
using namespace std;

int main() {
    // Code cần kiểm tra lỗi, TLE hoặc tràn số
    return 0;
}`}
            className="flex-1 p-3.5 bg-transparent text-slate-100 placeholder:text-slate-700 font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none whitespace-pre overflow-x-auto"
          />
        </div>

        {/* Editor Footer Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-3">
            <span>{lineCount} dòng</span>
            <span>{codeText.length} ký tự</span>
            <span className="text-slate-400 font-mono">C++17 / C++20</span>
          </div>

          {!codeText && (
            <button
              type="button"
              onClick={handleInsertTemplate}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> Chèn template CP chuẩn
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
