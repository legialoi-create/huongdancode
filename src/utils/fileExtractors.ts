import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

// Set up worker for pdfjs in browser if available
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch {
    // Worker fallback
  }
}

/**
 * Normalizes file MIME types based on file extension and provided type.
 * Fixes cases where browsers provide empty string "" or "application/octet-stream" for .pdf, .txt, .docx
 */
export function normalizeMimeType(fileName: string, rawMime?: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (["txt", "inp", "out", "cpp", "c", "py", "pas", "java", "md", "text", "csv", "log"].includes(ext)) {
    return "text/plain";
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  }

  if (rawMime && rawMime !== "application/octet-stream") {
    return rawMime;
  }

  return "application/octet-stream";
}

/**
 * Unescapes XML entities commonly found in Word documents
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extracts plain text from a Word paragraph XML string, including:
 * - <w:t> text nodes
 * - <m:t> Office Math equation text (variables, math operators, constraints)
 * - <w:br/> and <w:cr/> line breaks
 * - <w:tab/> tabs
 */
function extractTextFromParagraph(pXml: string): string {
  // Convert breaks and tabs
  const processed = pXml
    .replace(/<w:br(?:\s[^>]*)?\/>/g, "\n")
    .replace(/<w:cr(?:\s[^>]*)?\/>/g, "\n")
    .replace(/<w:tab(?:\s[^>]*)?\/>/g, "    ");

  // Extract both standard Word text <w:t> AND Word Math equations <m:t>
  const tMatches = processed.match(/<(?:w|m):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|m):t>/g) || [];
  const words = tMatches.map((t) => {
    const raw = t.replace(/^<(?:w|m):t(?:\s[^>]*)?>/, "").replace(/<\/(?:w|m):t>$/, "");
    return unescapeXml(raw);
  });
  return words.join("");
}

/**
 * Parses Word Document XML into structured text, converting <w:tbl> into Markdown tables
 * so input/output examples and subtask limit tables in CP problems are preserved cleanly!
 */
export function parseDocxXml(xml: string): string {
  const elements: string[] = [];
  const bodyMatch = xml.match(/<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  // Split into top-level blocks: <w:tbl> (tables) and <w:p> (paragraphs)
  const blockRegex = /(<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>)/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(bodyXml)) !== null) {
    const blockXml = match[1];

    if (blockXml.startsWith("<w:tbl")) {
      // Table block: extract rows and cells
      const rows: string[][] = [];
      const trMatches = blockXml.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) || [];

      for (const trXml of trMatches) {
        const cells: string[] = [];
        const tcMatches = trXml.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || [];

        for (const tcXml of tcMatches) {
          const pList = tcXml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [];
          const cellText = pList
            .map(extractTextFromParagraph)
            .filter((t) => t.trim().length > 0)
            .join(" ");
          cells.push(cellText.trim().replace(/\|/g, "\\|"));
        }

        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        // Render as clean Markdown table
        const maxCols = Math.max(...rows.map((r) => r.length));
        const normalizedRows = rows.map((r) => {
          const rowCopy = [...r];
          while (rowCopy.length < maxCols) rowCopy.push("");
          return rowCopy;
        });

        const header = "| " + normalizedRows[0].join(" | ") + " |";
        const separator = "| " + normalizedRows[0].map(() => "---").join(" | ") + " |";
        const body = normalizedRows.slice(1).map((r) => "| " + r.join(" | ") + " |").join("\n");
        elements.push(header + "\n" + separator + (body ? "\n" + body : ""));
      }
    } else {
      // Paragraph block
      const pText = extractTextFromParagraph(blockXml).trim();
      if (pText) {
        elements.push(pText);
      }
    }
  }

  return elements.join("\n\n");
}

/**
 * Extracts plain text from a Word .docx document using high-fidelity JSZip XML parser.
 * Handles Office Math, formulas, constraints, and tables.
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file("word/document.xml");

    if (docXmlFile) {
      const xml = await docXmlFile.async("string");
      const mainText = parseDocxXml(xml);

      // Check if there are footnotes or endnotes
      const extraTexts: string[] = [];
      const footnoteFile = zip.file("word/footnotes.xml");
      if (footnoteFile) {
        const fnXml = await footnoteFile.async("string");
        const fnText = parseDocxXml(fnXml);
        if (fnText.trim()) extraTexts.push(fnText.trim());
      }

      const combined = [mainText, ...extraTexts].filter(Boolean).join("\n\n");
      if (combined.trim().length > 0) {
        return combined.trim();
      }
    }
  } catch (err) {
    console.warn("Lỗi khi đọc file .docx bằng JSZip XML parser:", err);
  }

  return "";
}

/**
 * Extracts text from legacy binary Word 97-2003 .doc files:
 * 1. Checks if file is actually a renamed .docx (ZIP magic number PK\x03\x04)
 * 2. Scans UTF-16LE and UTF-8/CP1258 character sequences including Vietnamese accents & math symbols
 */
export async function extractTextFromDoc(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(arrayBuffer);

  // Check if actually a .docx renamed to .doc (starts with PK\x03\x04)
  if (uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4b && uint8[2] === 0x03 && uint8[3] === 0x04) {
    return extractTextFromDocx(arrayBuffer);
  }

  try {
    // 1. Scan for UTF-16LE text sequences (standard in Word 97-2003 OLE WordDocument stream)
    let utf16Text = "";
    let currentLine = "";

    for (let i = 0; i < uint8.length - 1; i += 2) {
      const code = uint8[i] | (uint8[i + 1] << 8);

      // Valid character: ASCII, newline, tabs, or Vietnamese Unicode & math symbols
      const isValidChar =
        (code >= 32 && code <= 126) ||
        code === 10 ||
        code === 13 ||
        code === 9 ||
        (code >= 0x00c0 && code <= 0x024f) || // Latin Extended (Vietnamese accents)
        (code >= 0x1ea0 && code <= 0x1ef9) || // Vietnamese Unicode block (ạ, ả, ấ...)
        (code >= 0x2200 && code <= 0x22ff) || // Math symbols (≤, ≥, ≠, ∈...)
        (code >= 0x2010 && code <= 0x2026); // Punctuation dashes, quotes

      if (isValidChar) {
        if (code === 13 || code === 10) {
          if (currentLine.trim().length > 0) {
            utf16Text += currentLine.trim() + "\n";
            currentLine = "";
          }
        } else {
          currentLine += String.fromCharCode(code);
        }
      } else {
        if (currentLine.trim().length >= 3) {
          utf16Text += currentLine.trim() + "\n";
        }
        currentLine = "";
      }
    }

    if (currentLine.trim().length >= 3) {
      utf16Text += currentLine.trim() + "\n";
    }

    const lines16 = utf16Text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 3 && !/^[\x00-\x1F]+$/.test(l));

    if (lines16.length >= 2) {
      return lines16.join("\n");
    }

    // 2. Fallback: Scan UTF-8 / Windows-1258 8-bit text
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(uint8);
    const cleanLines = raw
      .replace(/[^\x20-\x7E\xC0-\xFF\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9\n\r\t]/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 5);

    if (cleanLines.length >= 2) {
      return cleanLines.join("\n");
    }
  } catch (err) {
    console.warn("Lỗi khi quét văn bản file .doc:", err);
  }

  return "";
}

/**
 * Extracts plain text from a PDF document using pdfjs-dist
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageItems = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || "")
        .join(" ");

      const trimmed = pageItems.trim().replace(/\s{2,}/g, " ");
      if (trimmed.length > 0) {
        pageTexts.push(
          pdfDoc.numPages > 1 ? `[Trang ${pageNum}/${pdfDoc.numPages}]\n${trimmed}` : trimmed
        );
      }
    }

    return pageTexts.join("\n\n");
  } catch (err) {
    console.warn("Không thể trích xuất văn bản từ PDF (có thể là PDF scan ảnh):", err);
    return "";
  }
}

/**
 * Helper to call server-side /api/extract-doc if available to get the highest quality parsed text
 */
async function tryServerExtract(fileName: string, base64: string): Promise<string | null> {
  try {
    const res = await fetch("/api/extract-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, base64 }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.text && typeof data.text === "string" && data.text.trim().length > 0) {
        return data.text.trim();
      }
    }
  } catch {
    // Server endpoint optional or running client-only
  }
  return null;
}

/**
 * Master file text extraction function: reads Word (.docx, .doc), PDF (.pdf), and all Text formats (.txt, .inp, .out, .cpp, .md)
 */
export async function extractTextFromFile(
  file: File,
  arrayBuffer: ArrayBuffer,
  base64?: string
): Promise<{ text: string; mimeType: string }> {
  const mimeType = normalizeMimeType(file.name, file.type);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // 1. Text files (.txt, .inp, .out, .md, .cpp, .py, etc.)
  if (mimeType.startsWith("text/") || ["txt", "inp", "out", "cpp", "c", "py", "pas", "md", "text", "csv", "log"].includes(ext)) {
    try {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const text = decoder.decode(new Uint8Array(arrayBuffer));
      return { text: text.trim(), mimeType: "text/plain" };
    } catch {
      const fallbackText = await file.text();
      return { text: fallbackText.trim(), mimeType: "text/plain" };
    }
  }

  // 2. Word documents (.docx)
  if (ext === "docx" || mimeType.includes("wordprocessingml")) {
    // Try client-side JSZip XML parser first (handles tables, math formulas, and text)
    let text = await extractTextFromDocx(arrayBuffer);

    // If client parsed or if base64 available, check server endpoint for potential enhancement
    if (base64) {
      const serverText = await tryServerExtract(file.name, base64);
      if (serverText && serverText.length > text.length) {
        text = serverText;
      }
    }

    return { text, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }

  // 3. Word documents (.doc)
  if (ext === "doc" || mimeType.includes("msword")) {
    let text = "";

    // Try server endpoint first if base64 is available (server has full Node buffer capabilities)
    if (base64) {
      const serverText = await tryServerExtract(file.name, base64);
      if (serverText) {
        text = serverText;
      }
    }

    if (!text) {
      text = await extractTextFromDoc(arrayBuffer);
    }

    return { text, mimeType: "application/msword" };
  }

  // 4. PDF documents (.pdf)
  if (ext === "pdf" || mimeType === "application/pdf") {
    const text = await extractTextFromPdf(arrayBuffer);
    return { text, mimeType: "application/pdf" };
  }

  return { text: "", mimeType };
}
