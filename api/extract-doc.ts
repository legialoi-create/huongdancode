import JSZip from "jszip";
import mammoth from "mammoth";

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

function extractTextFromParagraph(pXml: string): string {
  const processed = pXml
    .replace(/<w:br(?:\s[^>]*)?\/>/g, "\n")
    .replace(/<w:cr(?:\s[^>]*)?\/>/g, "\n")
    .replace(/<w:tab(?:\s[^>]*)?\/>/g, "    ");

  const tMatches = processed.match(/<(?:w|m):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|m):t>/g) || [];
  return tMatches
    .map((t) => unescapeXml(t.replace(/^<(?:w|m):t(?:\s[^>]*)?>/, "").replace(/<\/(?:w|m):t>$/, "")))
    .join("");
}

function parseDocxXml(xml: string): string {
  const elements: string[] = [];
  const bodyMatch = xml.match(/<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  const blockRegex = /(<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>)/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(bodyXml)) !== null) {
    const blockXml = match[1];
    if (blockXml.startsWith("<w:tbl")) {
      const rows: string[][] = [];
      const trMatches = blockXml.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) || [];
      for (const trXml of trMatches) {
        const cells: string[] = [];
        const tcMatches = trXml.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || [];
        for (const tcXml of tcMatches) {
          const pList = tcXml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [];
          const cellText = pList.map(extractTextFromParagraph).filter((t) => t.trim().length > 0).join(" ");
          cells.push(cellText.trim().replace(/\|/g, "\\|"));
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) {
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
      const pText = extractTextFromParagraph(blockXml).trim();
      if (pText) elements.push(pText);
    }
  }
  return elements.join("\n\n");
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileName = "", base64 = "" } = req.body || {};
    if (!base64) {
      return res.status(400).json({ error: "Thiếu dữ liệu base64" });
    }

    const buf = Buffer.from(base64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

    // 1. Word .docx (or zip-based)
    if (ext === "docx" || isZip) {
      try {
        const zip = await JSZip.loadAsync(buf);
        const docXml = zip.file("word/document.xml");
        if (docXml) {
          const xml = await docXml.async("string");
          const parsed = parseDocxXml(xml);
          if (parsed && parsed.trim().length > 0) {
            return res.json({
              success: true,
              text: parsed.trim(),
              charCount: parsed.trim().length,
              fileName,
            });
          }
        }
      } catch (zipErr) {
        console.warn("JSZip extraction notice:", zipErr);
      }

      // Fallback mammoth
      try {
        const mResult = await mammoth.extractRawText({ buffer: buf });
        if (mResult && mResult.value && mResult.value.trim().length > 0) {
          return res.json({
            success: true,
            text: mResult.value.trim(),
            charCount: mResult.value.trim().length,
            fileName,
          });
        }
      } catch (mErr) {
        console.warn("Mammoth extraction error:", mErr);
      }
    }

    // 2. Word .doc binary (Word 97-2003)
    let utf16Text = "";
    let currentLine = "";
    for (let i = 0; i < buf.length - 1; i += 2) {
      const code = buf[i] | (buf[i + 1] << 8);
      const isValidChar =
        (code >= 32 && code <= 126) ||
        code === 10 ||
        code === 13 ||
        code === 9 ||
        (code >= 0x00c0 && code <= 0x024f) ||
        (code >= 0x1ea0 && code <= 0x1ef9) ||
        (code >= 0x2200 && code <= 0x22ff) ||
        (code >= 0x2010 && code <= 0x2026);

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

    const lines16 = utf16Text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 3);

    if (lines16.length >= 2) {
      const text = lines16.join("\n");
      return res.json({
        success: true,
        text,
        charCount: text.length,
        fileName,
      });
    }

    // 3. Fallback UTF-8 text decode
    const cleanLines = buf
      .toString("utf-8")
      .replace(/[^\x20-\x7E\xC0-\xFF\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9\n\r\t]/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 5);

    if (cleanLines.length >= 2) {
      const text = cleanLines.join("\n");
      return res.json({
        success: true,
        text,
        charCount: text.length,
        fileName,
      });
    }

    return res.json({
      success: false,
      text: "",
      charCount: 0,
      fileName,
      message: "Không tìm thấy văn bản khả đọc trong tài liệu.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Lỗi xử lý file" });
  }
}
