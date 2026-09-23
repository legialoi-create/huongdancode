import React, { useState } from "react";
import katex from "katex";
import { Check, Copy, Code2, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Function to process markdown text containing KaTeX math expressions securely
function formatTextWithMath(rawText: string): string {
  if (!rawText) return "";

  // 1. Stash Math expressions into placeholders to protect from markdown regex corruption
  const mathPlaceholders: string[] = [];

  // Protect block math $$...$$
  let text = rawText.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => {
    let rendered = "";
    try {
      rendered = `<div class="katex-display my-3 overflow-x-auto py-1 px-3 bg-slate-900/60 rounded-md border border-slate-800 text-center">${katex.renderToString(
        expr.trim(),
        { displayMode: true, throwOnError: false, output: "html" }
      )}</div>`;
    } catch {
      rendered = `$$${expr}$$`;
    }
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(rendered);
    return `@@MATH_BLOCK_${idx}@@`;
  });

  // Protect inline math $...$ (ensure not escaped with \$)
  text = text.replace(/(?<!\\)\$([^\$\n\r]+?)\$/g, (_match, expr) => {
    let rendered = "";
    try {
      rendered = katex.renderToString(expr.trim(), {
        displayMode: false,
        throwOnError: false,
        output: "html",
      });
    } catch {
      rendered = `$${expr}$`;
    }
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(rendered);
    return `@@MATH_INLINE_${idx}@@`;
  });

  // 2. Parse inline Markdown on safe non-math text
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
    .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<em class='text-slate-200 italic'>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-xs font-mono font-medium border border-slate-700/50'>$1</code>");

  // 3. Restore all Math placeholders with rendered KaTeX HTML
  html = html.replace(/@@MATH_(?:BLOCK|INLINE)_(\d+)@@/g, (_match, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return mathPlaceholders[idx] || "";
  });

  return html;
}

export const CodeBlock: React.FC<{ code: string; language?: string }> = ({
  code,
  language = "cpp",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="relative my-4 rounded-xl border border-slate-700/80 bg-slate-950 shadow-2xl overflow-hidden group">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="uppercase tracking-wider font-mono text-[11px] text-indigo-300 font-semibold">
            {language}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{lines.length} dòng</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Sao chép toàn bộ code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Đã chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="overflow-x-auto p-4 text-xs sm:text-sm font-mono leading-relaxed max-h-[550px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                <td className="w-10 pr-4 text-right text-slate-600 select-none align-top border-r border-slate-800/60 font-mono text-xs">
                  {idx + 1}
                </td>
                <td className="pl-4 text-slate-200 whitespace-pre font-mono">
                  {highlightCppTokens(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Syntax high-contrast token coloring for C++
function highlightCppTokens(line: string): React.ReactNode {
  // If line is a comment
  if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
    return <span className="text-emerald-400/90 italic">{line}</span>;
  }

  // If line is preprocessor #include, #define
  if (line.trim().startsWith("#")) {
    return <span className="text-pink-400 font-semibold">{line}</span>;
  }

  // Tokenize words
  const parts = line.split(/(\b(?:int|long\s+long|double|float|bool|char|void|auto|vector|string|map|set|pair|queue|stack|priority_queue|struct|class|public|private|return|if|else|for|while|do|break|continue|switch|case|const|sizeof|cin|cout|endl|ios_base|true|false)\b)/g);

  return parts.map((part, i) => {
    if (
      /^(int|long\s+long|double|float|bool|char|void|auto|vector|string|map|set|pair|queue|stack|priority_queue|struct|class)$/.test(
        part
      )
    ) {
      return (
        <span key={i} className="text-cyan-400 font-semibold">
          {part}
        </span>
      );
    }
    if (/^(return|if|else|for|while|do|break|continue|switch|case|const|sizeof)$/.test(part)) {
      return (
        <span key={i} className="text-purple-400 font-semibold">
          {part}
        </span>
      );
    }
    if (/^(cin|cout|endl|ios_base)$/.test(part)) {
      return (
        <span key={i} className="text-amber-400 font-semibold">
          {part}
        </span>
      );
    }
    if (/^(true|false)$/.test(part)) {
      return (
        <span key={i} className="text-rose-400 font-semibold">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Split content by code blocks ```lang ... ```
  const segments: { type: "text" | "code"; content: string; lang?: string }[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\+\-]+)?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      lang: match[1] || "cpp",
      content: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return (
    <div className={`text-slate-200 space-y-3 leading-relaxed text-sm md:text-base ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === "code") {
          return <CodeBlock key={idx} code={seg.content} language={seg.lang} />;
        }

        // Render formatted text with headings, lists, bold, math
        return (
          <div key={idx} className="space-y-2">
            {renderFormattedText(seg.content)}
          </div>
        );
      })}
    </div>
  );
};

function renderFormattedText(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      nodes.push(<div key={i} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      const title = trimmed.replace(/^###\s+/, "");
      nodes.push(
        <h3
          key={i}
          className="text-lg md:text-xl font-bold text-indigo-300 mt-4 mb-2 flex items-center gap-2 border-b border-slate-800/80 pb-1.5"
          dangerouslySetInnerHTML={{ __html: formatTextWithMath(title) }}
        />
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const title = trimmed.replace(/^##\s+/, "");
      nodes.push(
        <h2
          key={i}
          className="text-xl md:text-2xl font-extrabold text-white mt-5 mb-2 flex items-center gap-2 border-b border-slate-700/60 pb-2"
          dangerouslySetInnerHTML={{ __html: formatTextWithMath(title) }}
        />
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      const title = trimmed.replace(/^#\s+/, "");
      nodes.push(
        <h1
          key={i}
          className="text-2xl md:text-3xl font-extrabold text-white mt-6 mb-3"
          dangerouslySetInnerHTML={{ __html: formatTextWithMath(title) }}
        />
      );
      continue;
    }

    // Bullet list items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const itemContent = trimmed.replace(/^[-*•]\s+/, "");
      nodes.push(
        <li
          key={i}
          className="ml-5 list-disc text-slate-300 pl-1 leading-relaxed marker:text-indigo-400"
          dangerouslySetInnerHTML={{
            __html: formatTextWithMath(itemContent),
          }}
        />
      );
      continue;
    }

    // Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2.5 ml-2 my-1.5">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">
            {numMatch[1]}
          </span>
          <div
            className="text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatTextWithMath(numMatch[2]),
            }}
          />
        </div>
      );
      continue;
    }

    // Standard paragraph with inline formatting & KaTeX
    nodes.push(
      <p
        key={i}
        className="text-slate-300 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: formatTextWithMath(rawLine),
        }}
      />
    );
  }

  return nodes;
}
