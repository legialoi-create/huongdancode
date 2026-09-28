import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
} from "docx";

export interface DocxExportOptions {
  problemCodeName: string;
  section1_Overview?: string;
  section2_Flaws?: string;
  section3_Guide?: string;
  section4_FullAcCode?: string;
  acCodeOnly?: string;
  rawMarkdown?: string;
  targetSectionOnly?: "section3" | "all";
}

// Helper to convert markdown lines to docx Paragraphs and Tables
function parseMarkdownToDocxParagraphs(markdownText: string): (Paragraph | Table)[] {
  if (!markdownText) return [];

  const elements: (Paragraph | Table)[] = [];
  const lines = markdownText.split("\n");

  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block start/end
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        // Output code table/box
        const codePara = new Paragraph({
          children: codeBuffer.map(
            (codeLine, idx) =>
              new TextRun({
                text: codeLine + (idx < codeBuffer.length - 1 ? "\n" : ""),
                font: "Consolas",
                size: 19, // 9.5 pt
                color: "1e293b",
              })
          ),
          spacing: { before: 100, after: 100, line: 240 },
        });

        const codeCell = new TableCell({
          children: [codePara],
          shading: { fill: "f8fafc" },
          margins: {
            top: convertInchesToTwip(0.12),
            bottom: convertInchesToTwip(0.12),
            left: convertInchesToTwip(0.15),
            right: convertInchesToTwip(0.15),
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "cbd5e1" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "cbd5e1" },
            left: { style: BorderStyle.SINGLE, size: 24, color: "4f46e5" }, // Indigo left border
            right: { style: BorderStyle.SINGLE, size: 6, color: "cbd5e1" },
          },
        });

        const codeTable = new Table({
          rows: [new TableRow({ children: [codeCell] })],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });

        elements.push(codeTable);
        elements.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      elements.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      continue;
    }

    // Markdown Table parsing (| col1 | col2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [trimmed];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|") && lines[i + 1].trim().endsWith("|")) {
        i++;
        tableLines.push(lines[i].trim());
      }

      if (tableLines.length >= 2) {
        const rows: TableRow[] = [];
        let isFirstRow = true;

        for (let rIdx = 0; rIdx < tableLines.length; rIdx++) {
          const rowText = tableLines[rIdx];
          // Skip separator row (|---|---|)
          if (/^\|(\s*[-:]+\s*\|)+$/.test(rowText)) {
            continue;
          }

          const cellsText = rowText
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());

          const cells: TableCell[] = cellsText.map((cellStr) => {
            const cellPara = new Paragraph({
              children: parseInlineFormatting(cellStr),
              spacing: { before: 60, after: 60 },
            });

            return new TableCell({
              children: [cellPara],
              shading: isFirstRow ? { fill: "e0e7ff" } : { fill: rIdx % 2 === 0 ? "f8fafc" : "ffffff" },
              margins: {
                top: convertInchesToTwip(0.08),
                bottom: convertInchesToTwip(0.08),
                left: convertInchesToTwip(0.1),
                right: convertInchesToTwip(0.1),
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
              },
            });
          });

          rows.push(new TableRow({ children: cells }));
          isFirstRow = false;
        }

        if (rows.length > 0) {
          elements.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          );
          elements.push(new Paragraph({ text: "", spacing: { after: 120 } }));
          continue;
        }
      }
    }

    // Block LaTeX Equation ($$...$$)
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: trimmed, // Keeps $$ at beginning and end
              font: "Cambria Math",
              bold: true,
              size: 23,
              color: "1e1b4b",
            }),
          ],
          spacing: { before: 140, after: 140 },
        })
      );
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith("# ")) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed.replace(/^#\s+/, "")),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 140 },
        })
      );
      continue;
    }

    // Heading 2 (## ...)
    if (trimmed.startsWith("## ")) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed.replace(/^##\s+/, "")),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // Heading 3 (### ...)
    if (trimmed.startsWith("### ")) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed.replace(/^###\s+/, "")),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    // Heading 4 (#### ...)
    if (trimmed.startsWith("#### ")) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed.replace(/^####\s+/, "")),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    // Bullet points (- or * or +)
    if (/^[-*+]\s+/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[-*+]\s+/, "");
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(itemContent),
          bullet: { level: 0 },
          spacing: { before: 40, after: 60, line: 280 },
        })
      );
      continue;
    }

    // Numbered lists (1. , 2. ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed),
          spacing: { before: 60, after: 60, line: 280 },
        })
      );
      continue;
    }

    // Standard Paragraph
    elements.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
        spacing: { before: 60, after: 80, line: 280 },
      })
    );
  }

  return elements;
}

// Parse bold **text**, inline code `code`, LaTeX math $...$ and $$...$$, and italic *text*
// Retains the dollar sign $ at the start and end of all LaTeX math expressions
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Regex to match block math $$...$$, inline math $...$, bold **...**, code `...`, italic *...*
  const regex = /(\$\$[^\$]+\$\$|\$[^\$]+\$|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("$$") && part.endsWith("$$")) {
      // Block LaTeX math: retain $$ at beginning and end
      runs.push(
        new TextRun({
          text: part,
          font: "Cambria Math",
          bold: true,
          size: 21,
          color: "1e1b4b",
        })
      );
    } else if (part.startsWith("$") && part.endsWith("$")) {
      // Inline LaTeX math: retain $ at beginning and end (e.g. $O(N \log N)$, $10^9$, $A[i]$)
      runs.push(
        new TextRun({
          text: part,
          font: "Cambria Math",
          size: 21,
          color: "1e1b4b",
        })
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: "Segoe UI",
          size: 21,
          color: "0f172a",
        })
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: "Consolas",
          size: 20,
          color: "4338ca",
          shading: { fill: "f1f5f9" },
        })
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
          font: "Segoe UI",
          size: 21,
          color: "334155",
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          font: "Segoe UI",
          size: 21, // 10.5pt
          color: "334155",
        })
      );
    }
  }

  return runs.length > 0
    ? runs
    : [
        new TextRun({
          text: text,
          font: "Segoe UI",
          size: 21,
          color: "334155",
        }),
      ];
}

/**
 * Generate and download Word (.docx) document
 */
export async function downloadAnalysisDocx(options: DocxExportOptions): Promise<void> {
  const {
    problemCodeName = "BAI",
    section1_Overview = "",
    section2_Flaws = "",
    section3_Guide = "",
    section4_FullAcCode = "",
    rawMarkdown = "",
    targetSectionOnly,
  } = options;

  const children: (Paragraph | Table)[] = [];

  // Document Cover / Title Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: `HƯỚNG DẪN THUẬT TOÁN & TỐI ƯU C++: BÀI TOÁN ${problemCodeName.toUpperCase()}`,
          bold: true,
          font: "Segoe UI",
          size: 34, // 17pt
          color: "1e1b4b",
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 280 },
      children: [
        new TextRun({
          text: `Tài liệu bồi dưỡng Học sinh giỏi & Olympic Tin học • Xuất từ Trợ lý Lập trình C++`,
          font: "Segoe UI",
          size: 19, // 9.5pt
          italics: true,
          color: "64748b",
        }),
      ],
    })
  );

  if (targetSectionOnly === "section3") {
    // Only Export Section 4 (Guide & Math thinking) + Code if available
    const contentToParse =
      (section3_Guide ? `### 4. Hướng dẫn sửa từng bước & Tư duy thuật toán\n\n${section3_Guide}` : "") +
      (section4_FullAcCode ? `\n\n### 5. Mã nguồn C++ Full AC 100%\n\n${section4_FullAcCode}` : "");

    const parsedElements = parseMarkdownToDocxParagraphs(contentToParse || rawMarkdown);
    children.push(...parsedElements);
  } else {
    // Export Full Structured Document
    const fullMarkdownContent =
      rawMarkdown ||
      [section1_Overview, section2_Flaws, section3_Guide, section4_FullAcCode]
        .filter(Boolean)
        .join("\n\n---\n\n");

    const parsedElements = parseMarkdownToDocxParagraphs(fullMarkdownContent);
    children.push(...parsedElements);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Bài ${problemCodeName.toUpperCase()} • Hướng dẫn giải & Code C++ Full AC`,
                    font: "Segoe UI",
                    size: 17,
                    color: "94a3b8",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Trang ",
                    font: "Segoe UI",
                    size: 17,
                    color: "94a3b8",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Segoe UI",
                    size: 17,
                    color: "94a3b8",
                  }),
                  new TextRun({
                    text: " / ",
                    font: "Segoe UI",
                    size: 17,
                    color: "94a3b8",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: "Segoe UI",
                    size: 17,
                    color: "94a3b8",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${problemCodeName.toLowerCase()}_huong_dan_thuat_toan.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
