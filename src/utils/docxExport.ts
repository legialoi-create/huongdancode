import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import { ParsedAnalysis } from "../types";

// Helper function to clean markdown math symbols for Word readability
function cleanMathNotation(text: string): string {
  return text
    .replace(/\\\lceil/g, "⌈")
    .replace(/\\\rceil/g, "⌉")
    .replace(/\\\lfloor/g, "⌊")
    .replace(/\\\rfloor/g, "⌋")
    .replace(/\\le|\\leq/g, "≤")
    .replace(/\\ge|\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\dots|\\ldots/g, "...")
    .replace(/\\in/g, "∈")
    .replace(/\\approx/g, "≈")
    .replace(/\\left|\\right/g, "")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^\{([0-9]+)\}/g, "^$1")
    .replace(/\$([^$]+)\$/g, "$1"); // remove single dollar signs around inline math
}

// Parse formatted inline text containing **bold**, `code`, and plain text
function parseFormattedInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const cleaned = cleanMathNotation(text);

  // Regex to split by bold (**text**) or inline code (`text`)
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = cleaned.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: "Arial",
          size: 22, // 11pt
          color: "1E293B",
        })
      );
    } else if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      runs.push(
        new TextRun({
          text: ` ${part.slice(1, -1)} `,
          font: "Consolas",
          size: 20, // 10pt
          color: "2563EB",
          shading: {
            type: ShadingType.CLEAR,
            fill: "F1F5F9",
            color: "auto",
          },
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          font: "Arial",
          size: 22, // 11pt
          color: "334155",
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: cleaned,
        font: "Arial",
        size: 22,
        color: "334155",
      })
    );
  }

  return runs;
}

// Convert markdown text into an array of docx Paragraphs and Tables
function markdownToDocxElements(markdown: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block fence
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block: render as formatted code box table
        const codeText = codeBuffer.join("\n");
        elements.push(createCodeBlockTable(codeText));
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      // Empty line spacing
      elements.push(
        new Paragraph({
          spacing: { after: 120 },
        })
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: cleanMathNotation(trimmed.replace(/^###\s+/, "")),
              bold: true,
              size: 26, // 13pt
              color: "1E40AF",
              font: "Arial",
            }),
          ],
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: cleanMathNotation(trimmed.replace(/^##\s+/, "")),
              bold: true,
              size: 28, // 14pt
              color: "0F172A",
              font: "Arial",
            }),
          ],
          spacing: { before: 300, after: 140 },
        })
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: cleanMathNotation(trimmed.replace(/^#\s+/, "")),
              bold: true,
              size: 32, // 16pt
              color: "1E3A8A",
              font: "Arial",
            }),
          ],
          spacing: { before: 360, after: 160 },
        })
      );
      continue;
    }

    // Callout quote / blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed.replace(/^>\s*/, "");
      elements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: "FEF3C7", // warm amber
                    color: "auto",
                  },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.SINGLE, size: 24, color: "F59E0B" },
                  },
                  margins: {
                    top: convertInchesToTwip(0.08),
                    bottom: convertInchesToTwip(0.08),
                    left: convertInchesToTwip(0.15),
                    right: convertInchesToTwip(0.15),
                  },
                  children: [
                    new Paragraph({
                      children: parseFormattedInline(quoteText),
                      spacing: { after: 0, before: 0 },
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
      continue;
    }

    // Bullet points (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const bulletContent = trimmed.slice(2);
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseFormattedInline(bulletContent),
          spacing: { after: 80, before: 40 },
        })
      );
      continue;
    }

    // Numbered list (e.g. 1. or Bước 1:)
    const numberedMatch = trimmed.match(/^(\d+[\.\)]|\bBước\s+\d+:?)\s+(.*)/i);
    if (numberedMatch) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${numberedMatch[1]} `,
              bold: true,
              font: "Arial",
              color: "1D4ED8",
              size: 22,
            }),
            ...parseFormattedInline(numberedMatch[2]),
          ],
          spacing: { after: 90, before: 50 },
        })
      );
      continue;
    }

    // Normal paragraph
    elements.push(
      new Paragraph({
        children: parseFormattedInline(trimmed),
        spacing: { after: 120, before: 40, line: 280 }, // 1.15 line height
      })
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(createCodeBlockTable(codeBuffer.join("\n")));
  }

  return elements;
}

// Helper to create a stylish Code Block table with light gray background and Consolas font
function createCodeBlockTable(code: string): Table {
  const codeLines = code.split("\n");
  const paragraphs = codeLines.map((line) => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line.length === 0 ? " " : line,
          font: "Consolas",
          size: 19, // 9.5pt
          color: "0F172A",
        }),
      ],
      spacing: { after: 20, before: 0, line: 240 },
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              type: ShadingType.CLEAR,
              fill: "F8FAFC",
              color: "auto",
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
              left: { style: BorderStyle.SINGLE, size: 20, color: "3B82F6" }, // Blue accent bar on left
              right: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
            },
            margins: {
              top: convertInchesToTwip(0.12),
              bottom: convertInchesToTwip(0.12),
              left: convertInchesToTwip(0.15),
              right: convertInchesToTwip(0.15),
            },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

// Generate header section box for the document
function createDocHeader(title: string, subtitle?: string): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          font: "Arial",
          size: 34, // 17pt
          color: "1E3A8A",
        }),
      ],
      spacing: { before: 100, after: 80 },
    }),
  ];

  if (subtitle) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            font: "Arial",
            size: 22,
            color: "64748B",
          }),
        ],
        spacing: { after: 160 },
      })
    );
  }

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Ngày tạo: ${new Date().toLocaleDateString("vi-VN")} | Trợ lý Phân tích Thuật toán Lập trình Thi đấu`,
          font: "Arial",
          size: 18,
          color: "94A3B8",
        }),
      ],
      spacing: { after: 260 },
    })
  );

  return paras;
}

/**
 * Export specifically the Step-by-Step Guide & Algorithm Thinking (Mục 4 / Tab 3) to .docx
 */
export async function exportGuideToWord(guideContent: string, problemTitle?: string): Promise<void> {
  const elements = markdownToDocxElements(guideContent);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          ...createDocHeader(
            "TÀI LIỆU HƯỚNG DẪN SỬA TỪNG BƯỚC & TƯ DUY THUẬT TOÁN",
            problemTitle ? `Bài toán: ${problemTitle}` : "Phân tích và tối ưu thuật toán Competitive Programming"
          ),
          ...elements,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownloadBlob(blob, `Huong_Dan_Thuat_Toan_${getFormattedTimestamp()}.docx`);
}

/**
 * Export the Complete Analysis Report & Solution to .docx
 */
export async function exportFullReportToWord(
  result: ParsedAnalysis,
  problemTitle?: string
): Promise<void> {
  const contentToExport = result.rawMarkdown || [
    result.section1_Overview,
    result.section2_Flaws,
    result.section3_Guide,
    result.section4_FullAcCode,
  ].filter(Boolean).join("\n\n---\n\n");

  const elements = markdownToDocxElements(contentToExport);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          ...createDocHeader(
            "BÁO CÁO PHÂN TÍCH THUẬT TOÁN & HƯỚNG DẪN FULL AC",
            problemTitle ? `Đề bài: ${problemTitle}` : "Tối ưu hóa mã nguồn C++ & Chống tràn số, TLE"
          ),
          ...elements,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownloadBlob(blob, `Bao_Cao_Huong_Dan_Giai_${getFormattedTimestamp()}.docx`);
}

function getFormattedTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}`;
}

function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
