import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import JSZip from "jszip";

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

async function extractWordFromBuffer(buf: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

  if (ext === "docx" || isZip) {
    try {
      const zip = await JSZip.loadAsync(buf);
      const docXml = zip.file("word/document.xml");
      if (docXml) {
        const xml = await docXml.async("string");
        const parsed = parseDocxXml(xml);
        if (parsed.trim().length > 0) return parsed.trim();
      }
    } catch (e) {
      console.warn("JSZip parse error on server:", e);
    }

    try {
      const mResult = await mammoth.extractRawText({ buffer: buf });
      if (mResult && mResult.value && mResult.value.trim().length > 0) {
        return mResult.value.trim();
      }
    } catch {}
  }

  // Scan .doc binary UTF-16LE / UTF-8
  try {
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
    if (lines16.length >= 2) return lines16.join("\n");

    const cleanLines = buf
      .toString("utf-8")
      .replace(/[^\x20-\x7E\xC0-\xFF\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9\n\r\t]/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 5);
    if (cleanLines.length >= 2) return cleanLines.join("\n");
  } catch {}

  return "";
}

dotenv.config();

// AI Studio and Cloud Run container architecture:
// In AI Studio Dev/Preview: Nginx runs on 8080 and forwards to DEFAULT_APP_PORT (3000).
// In standalone Cloud Run / Container direct: process.env.PORT is 8080 or custom without Nginx.
// If DEFAULT_APP_PORT is defined, prioritize it; otherwise use PORT or 3000.
const PORT = Number(process.env.DEFAULT_APP_PORT || (process.env.CONTROL_PLANE_PORT ? 3000 : (process.env.PORT || 3000)));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const app = express();

  // Allow larger payloads for multimodal base64 files (PDF, images)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasEnvKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Dedicated Word/Document Text Extraction endpoint
  app.post("/api/extract-doc", async (req, res) => {
    try {
      const { fileName = "", base64 = "" } = req.body || {};
      if (!base64) {
        return res.status(400).json({ error: "Thiếu dữ liệu base64" });
      }

      const buf = Buffer.from(base64, "base64");
      const text = await extractWordFromBuffer(buf, fileName);

      if (text && text.trim().length > 0) {
        return res.json({
          success: true,
          text: text.trim(),
          charCount: text.trim().length,
          fileName,
        });
      }

      return res.json({
        success: false,
        text: "",
        charCount: 0,
        fileName,
        message: "Không tìm thấy nội dung văn bản khả đọc trong file.",
      });
    } catch (err: any) {
      console.error("Lỗi trích xuất file tại /api/extract-doc:", err);
      return res.status(500).json({ error: err.message || "Lỗi xử lý file" });
    }
  });

  // Dedicated AI Problem Reformulation & Standardization endpoint
  app.post("/api/reformulate-problem", async (req, res) => {
    try {
      const {
        problemText = "",
        problemFiles = [],
        userApiKey,
        model = "gemini-3.8-flash",
      } = req.body || {};

      const hasProblemText = problemText && typeof problemText === "string" && problemText.trim().length > 0;
      const hasProblemFiles = Array.isArray(problemFiles) && problemFiles.length > 0;

      if (!hasProblemText && !hasProblemFiles) {
        return res.status(400).json({ error: "Vui lòng cung cấp văn bản đề bài hoặc tải lên file đề (PDF, Word, Ảnh...)" });
      }

      const effectiveApiKey = (userApiKey && typeof userApiKey === "string" && userApiKey.trim())
        ? userApiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!effectiveApiKey) {
        return res.status(401).json({
          error: "Chưa cấu hình Gemini API Key. Vui lòng bấm vào biểu tượng Cài đặt (bánh răng) để nhập API Key của bạn.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Bạn là chuyên gia thẩm định và biên soạn đề thi Học sinh giỏi Tin học & Olympic Tin học (Competitive Programming) hàng đầu.
Nhiệm vụ của bạn là nhận tài liệu đề bài (từ văn bản thô, file PDF scan/text, file Word .docx/.doc, hoặc ảnh chụp đề thi) và TỰ ĐỘNG CHUẨN HÓA & TÁI TẠO LẠI THÀNH BẢN ĐỀ BÀI CHUẨN MỰC, CHÍNH XÁC, DỄ HIỂU NHẤT.

⚡ NGUYÊN TẮC BIÊN SOẠN & CHUẨN HÓA:
1. ĐÚNG NỘI DUNG 100%: Tuyệt đối giữ nguyên vẹn bản chất toán học, các điều kiện logic, giới hạn dữ liệu (constraints) và các bộ test ví dụ. Không làm biến dạng hay đổi đề.
2. SỬA LỖI OCR & KÝ TỰ LẠ: Tự động phát hiện và khắc phục các lỗi chính tả, lỗi vỡ chữ, ký tự lạ do quá trình đọc file PDF/ảnh scan (ví dụ: "O ( N )", "1 0 ^ 5", "a [ i ]", "≤" bị biến thành "?", thiếu dấu tiếng Việt...).
3. TRÌNH BÀY CHUẨN OLYMPIAD: Sử dụng chuẩn Markdown kết hợp công thức toán học LaTeX ($...$) cho mọi biến và biểu thức toán.
4. ĐẦY ĐỦ CÁC MỤC THEO QUY CÁCH:
   - # TÊN BÀI TOÁN (VIẾT HOA)
   - Thông tin định danh: Mã bài (Problem Code), Tệp vào (TENBAI.INP), Tệp ra (TENBAI.OUT), Giới hạn Thời gian (Time limit) & Bộ nhớ (Memory limit).
   - ## 1. Đề bài / Yêu cầu
   - ## 2. Dữ liệu vào (Input)
   - ## 3. Dữ liệu ra (Output)
   - ## 4. Ràng buộc & Subtask (Constraints)
   - ## 5. Ví dụ (Sample Test) kèm bảng dữ liệu và phần Giải thích chi tiết từng test.

5. NẾU TÀI LIỆU CÓ NHIỀU BÀI / NHIỀU CÂU TRONG ĐỀ THI: Hãy chuẩn hóa rõ ràng từng câu (Bài 1, Bài 2, Bài 3...) với tiêu đề và mã tệp vào/ra riêng biệt cho từng bài để học sinh chọn lựa dễ dàng.`;

      const parts: any[] = [];

      if (hasProblemFiles) {
        for (const file of problemFiles) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          let normMime = file.mimeType;
          if (ext === "pdf") normMime = "application/pdf";
          else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) normMime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          else if (["txt", "inp", "out", "cpp", "c", "py", "pas", "md", "csv", "log"].includes(ext)) normMime = "text/plain";

          if (file.extractedText && file.extractedText.trim().length > 0) {
            parts.push({
              text: `\n=== VĂN BẢN TRÍCH XUẤT TỪ FILE [${file.name}] ===\n${file.extractedText.trim()}\n=== HẾT FILE [${file.name}] ===\n`,
            });
          }

          if (normMime.startsWith("image/") || normMime === "application/pdf") {
            if (file.base64) {
              parts.push({
                inlineData: {
                  mimeType: normMime,
                  data: file.base64,
                },
              });
            }
          } else if (!file.extractedText && (ext === "docx" || ext === "doc" || normMime.includes("word") || normMime.includes("msword"))) {
            try {
              const buf = Buffer.from(file.base64, "base64");
              const wordText = await extractWordFromBuffer(buf, file.name);
              if (wordText && wordText.trim().length > 0) {
                parts.push({
                  text: `\n=== VĂN BẢN TRÍCH XUẤT TỪ FILE WORD [${file.name}] ===\n${wordText.trim()}\n=== HẾT FILE WORD [${file.name}] ===\n`,
                });
              }
            } catch (wErr) {
              console.warn("Lỗi đọc Word docx/doc:", wErr);
            }
          }
        }
      }

      const promptText = `Dưới đây là nội dung đề bài được nạp từ người dùng hoặc tài liệu đính kèm (PDF/Word/Ảnh):
=== NỘI DUNG GỐC ===
${hasProblemText ? problemText : "(Nội dung nằm trong tài liệu đính kèm bên trên)"}
=== HẾT NỘI DUNG GỐC ===

YÊU CẦU:
Hãy đọc thật kỹ, đối chiếu công thức, bảng test và viết lại đề bài hoàn chỉnh, chuẩn mực, rõ ràng, dễ hiểu nhất theo đúng chuẩn Markdown và LaTeX $...$. Tự động xác định tên tệp vào/ra (.INP / .OUT) và mã bài toán.`;

      parts.push({ text: promptText });

      let requestedModel = model || "gemini-3.8-flash";
      if (requestedModel === "gemini-3.1-pro" || requestedModel === "gemini-2.5-pro" || requestedModel === "gemini-pro") {
        requestedModel = "gemini-3.1-pro-preview";
      } else if (requestedModel === "gemini-2.5-flash" || requestedModel === "gemini-flash" || requestedModel === "gemini-flash-latest") {
        requestedModel = "gemini-3.8-flash";
      }

      // Problem reformulation works best with high-throughput flash models (gemini-3.8-flash, gemini-3.1-flash-lite)
      const candidateModels = Array.from(
        new Set([
          "gemini-3.8-flash",
          requestedModel,
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview",
        ])
      );

      let response: any = null;
      let usedModel = "gemini-3.8-flash";

      for (const candidate of candidateModels) {
        try {
          console.log(`[AI Problem Reformulation] Requesting from ${candidate}...`);
          const resGen = await ai.models.generateContent({
            model: candidate,
            contents: { parts },
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });

          if (resGen && resGen.text) {
            response = resGen;
            usedModel = candidate;
            break;
          }
        } catch (e: any) {
          console.warn(`[AI Problem Reformulation] ${candidate} failed:`, e?.message || e);
          // Continue to next candidate model immediately
        }
      }

      if (!response || !response.text) {
        return res.status(500).json({ error: "Không thể chuẩn hóa đề bài bằng AI. Vui lòng thử lại sau vài giây." });
      }

      const reformulatedText = response.text.trim();

      // Extract detected problem code (e.g. `TENBAI` or `TENBAI.INP`)
      let detectedCode = "MAXSUB";
      const codeMatch = reformulatedText.match(/(?:Mã bài|Problem Code|Tệp vào|Input file)[:\s*`]+([A-Za-z0-9_]+)(?:\.INP)?/i);
      if (codeMatch && codeMatch[1]) {
        detectedCode = codeMatch[1].toUpperCase();
      }

      // Extract problem title
      let problemTitle = "Bài toán đã chuẩn hóa";
      const titleMatch = reformulatedText.match(/^#\s*([^\n\r]+)/m);
      if (titleMatch && titleMatch[1]) {
        problemTitle = titleMatch[1].replace(/[*_#`]/g, "").trim();
      }

      return res.json({
        success: true,
        model: usedModel,
        reformulatedText,
        problemTitle,
        problemCode: detectedCode,
      });
    } catch (err: any) {
      console.error("Lỗi khi chuẩn hóa đề bài qua Gemini API:", err);
      return res.status(500).json({ error: err?.message || "Lỗi xử lý chuẩn hóa đề bài" });
    }
  });

  // AI Code Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const {
        problemText,
        problemFiles,
        codeText,
        userApiKey,
        model = "gemini-3.8-flash",
        testCases,
        problemCodeName,
        selectedQuestionTitle,
        feedbackData,
      } = req.body;

      // Smart check if user actually inputted real code in Column 2 (or only empty/boilerplate)
      const isRealCandidateCode = (code: string | undefined): boolean => {
        if (!code || typeof code !== "string") return false;
        const trimmed = code.trim();
        if (trimmed.length < 15) return false;
        const stripped = trimmed
          .replace(/\/\/[^\n]*/g, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\s+/g, "");
        if (
          stripped === "#include<iostream>usingnamespacestd;intmain(){intn;if(cin>>n){}return0;}" ||
          stripped === "#include<iostream>usingnamespacestd;intmain(){return0;}" ||
          stripped === "#include<bits/stdc++.h>usingnamespacestd;intmain(){return0;}" ||
          stripped === "intmain(){return0;}"
        ) {
          return false;
        }
        return true;
      };

      const hasRealCode = isRealCandidateCode(codeText);
      const hasProblemText = problemText && typeof problemText === "string" && problemText.trim().length > 0;
      const hasProblemFiles = Array.isArray(problemFiles) && problemFiles.length > 0;
      const hasTestCases = Array.isArray(testCases) && testCases.length > 0;

      if (!hasProblemText && !hasProblemFiles && !hasTestCases) {
        return res.status(400).json({ error: "Vui lòng cung cấp đề bài (nhập văn bản hoặc tải file đính kèm)." });
      }

      const effectiveApiKey = (userApiKey && typeof userApiKey === "string" && userApiKey.trim())
        ? userApiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!effectiveApiKey) {
        return res.status(401).json({
          error: "Chưa cấu hình Gemini API Key. Vui lòng bấm vào biểu tượng Cài đặt (bánh răng) ở góc phải để nhập API Key của bạn, hoặc cấu hình GEMINI_API_KEY trong hệ thống.",
        });
      }

      // Initialize GoogleGenAI SDK with required aistudio-build telemetry header
      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Bạn là chuyên gia lập trình thi đấu (Competitive Programming) và giáo viên bồi dưỡng học sinh giỏi Tin học hàng đầu.
Nhiệm vụ của bạn là nhận đề bài (có thể là 1 bài riêng lẻ hoặc một tài liệu ĐỀ THI GỒM NHIỀU BÀI/NHIỀU CÂU) và mã nguồn C++ của học sinh, sau đó phân tích và xuất kết quả chuẩn Markdown theo đúng 5 mục:

⚡ NGUYÊN TẮC BẮT BUỘC - LUÔN PHÂN TÍCH ĐẦY ĐỦ TẤT CẢ CÁC BƯỚC:
- DÙ CỘT CODE C++ CỦA HỌC SINH CÓ ĐẦY ĐỦ, CÓ LỖI (LỖI CÚ PHÁP, LỖI BIÊN DỊCH COMPILE ERROR, LOGIC SAI, TRÀN SỐ, TLE), THIẾU DÒNG HOẶC HOÀN TOÀN CHƯA CÓ CODE (ĐỂ TRỐNG / KHUNG MẪU RỖNG): BẠN VẪN BẮT BUỘC PHẢI PHÂN TÍCH ĐẦY ĐỦ VÀ CHI TIẾT THEO ĐÚNG 5 MỤC TỪNG BƯỚC MỘT, KHÔNG ĐƯỢC BỎ BẤT KỲ MỤC NÀO!

🎯 QUY TẮC ĐẶC BIỆT 1 - TỰ ĐỘNG CHỌN ĐÚNG BÀI TOÁN KHI TẬP TIN ĐÍNH KÈM CHỨA NHIỀU CÂU / ĐỀ THI NHIỀU BÀI:
- Khi tài liệu đính kèm (Word .docx/.doc, PDF, text) hoặc văn bản đề bài chứa TOÀN BỘ ĐỀ THI GỒM NHIỀU CÂU (ví dụ: Bài 1, Bài 2, Bài 3, Bài 4...):
  + Hãy quét qua toàn bộ tài liệu để xác định danh sách các bài toán và tệp vào/ra tương ứng của từng bài (ví dụ: Bài 1: TONG.INP, Bài 2: DEM.INP, Bài 3: BIENDO.INP...).
  + Đối chiếu với mã nguồn C++ của học sinh (nếu có): Tìm lệnh \`freopen("...", "r", stdin)\`, tên tệp \`.INP\` / \`.OUT\`, tên biến, thuật toán hoặc mã bài toán được cung cấp.
  + ⚡ BẮT BUỘC TỰ ĐỘNG CHỌN VÀ TẬP TRUNG PHÂN TÍCH ĐÚNG BÀI CÓ TỆP INPUT/OUTPUT TRÙNG KHỚP VỚI CODE C++ ĐANG XỬ LÝ!
  + Tại Mục 1 (Phân tích bài toán & Ràng buộc cốt lõi), mở đầu bằng dòng thông báo rõ ràng:
    "📌 **Tự động nhận diện bài toán:** Đã trích xuất và chọn đúng **[Bài X: TÊN BÀI (Tệp: TENBAI.INP / TENBAI.OUT)]** từ tài liệu đề thi nhiều câu để đối chiếu với mã nguồn C++."
  + Toàn bộ 5 mục phân tích, chỉ ra lỗi và mã nguồn Full AC (Mục 5) ĐỀU PHẢI THỰC HIỆN TRÊN ĐÚNG BÀI TOÁN ĐƯỢC CHỌN NÀY!

⚠️ QUY TẮC ĐẶC BIỆT 2 - KIỂM TRA ĐỘ TƯƠNG QUAN GIỮA ĐỀ VÀ CODE:
- NẾU ĐỀ BÀI (kể cả sau khi đã quét toàn bộ các câu trong đề thi) VÀ CODE HOÀN TOÀN KHÔNG LIÊN QUAN ĐẾN NHAU (học sinh nộp nhầm code của một kỳ thi khác hoặc bài khác không có trong đề):
  + BẮT BUỘC BÁO RÕ RÀNG: "⚠️ CẢNH BÁO: Mã nguồn C++ nộp lên KHÔNG KHỚP với bất kỳ câu nào trong đề bài/đề thi được cung cấp!"
  + Ghi rõ ở Mục 2 & Mục 3 cảnh báo nộp nhầm bài này và ước lượng điểm là "0/100 test (Do nộp sai code)".
  + Tại Mục 5: Cung cấp mã nguồn C++ Full AC hoàn chỉnh để giải quyết bài toán tương ứng trong đề.

### 1. Phân tích bài toán & Ràng buộc cốt lõi
- Tóm tắt yêu cầu chính của bài toán (ghi rõ bài nào nếu đề có nhiều câu).
- Ràng buộc dữ liệu (Time limit, Memory limit, giới hạn $N, M$, các subtask...).
- Quy cách vào/ra (File I/O hay Standard I/O): Chú ý đọc kỹ đề bài xem có yêu cầu đọc ghi qua tệp không (ví dụ: \`TENBAI.INP\` và \`TENBAI.OUT\`).
- Độ phức tạp thời gian/không gian chuẩn để đạt Full điểm (ví dụ: $O(N \\log N)$).

### 2. Đánh giá code học sinh
- **Nếu Cột 2 có code (kể cả code có lỗi cú pháp/logic/thiếu):** Tóm tắt ý tưởng/thuật toán mà học sinh đang tiếp cận đối với bài toán tương ứng, ưu điểm và ước lượng điểm/số test pass (ví dụ: 40/100 test do dính TLE ở subtask 2, 0/100 do tràn số/lỗi biên dịch/quên mở file).
- **Nếu Cột 2 chưa có code hoặc chỉ có khung sườn rỗng:** Ghi nhận rõ tình trạng "Học sinh chưa hoàn thiện mã nguồn tại Cột 2 (chưa có code hoặc chỉ có khung sườn mẫu). Hệ thống sẽ phân tích các bẫy sai phổ biến, hướng dẫn tư duy thuật toán từng bước và cung cấp mã nguồn C++ Full AC hoàn chỉnh ở các mục tiếp theo."

### 3. Vị trí sai & Chỗ chưa tối ưu
- **Nếu Cột 2 có code (kể cả lỗi cú pháp, compile error, logic sai):**
  + **Lỗi cú pháp / Compile Error:** Chỉ rõ chính xác dòng lỗi (thiếu chấm phẩy, thiếu ngoặc, khai báo sai kiểu, thiếu include...).
  + **Quy cách Vào/Ra Tệp (File I/O):** ĐỐI CHIẾU KỸ GIỮA ĐỀ VÀ CODE: Nếu đề bài yêu cầu nộp file (ví dụ: \`TENBAI.INP\` / \`TENBAI.OUT\`) mà code học sinh quên mở file bằng \`freopen\` hoặc mở sai tên file $\\rightarrow$ Chỉ rõ lỗi này khiến bài nhận 0/100 điểm trên hệ thống chấm thi HSG (Themis/CMS).
  + **Lỗi logic / Tràn số:** Chỉ rõ chính xác dòng nào sai, cần ép kiểu ra sao (đặc biệt chú ý \`long long\`, khởi tạo mảng, chia dư, tràn số khi nhân hai số \`int\`, xử lý biên $N=0, 1$).
  + **Độ phức tạp & TLE:** Giải thích vì sao thuật toán hiện tại bị quá thời gian chạy.
  + **Tối ưu I/O:** \`ios_base::sync_with_stdio(0); cin.tie(0);\` và tránh dùng \`endl\`.
- **Nếu Cột 2 chưa có code hoặc code thiếu:**
  + Phân tích cặn kẽ các **bẫy thuật toán phổ biến** và **các lỗi sai học sinh hay mắc phải nhất** khi giải dạng bài này (ví dụ: bẫy tràn số $2 \\cdot 10^9$ buộc dùng long long, thuật toán ngây thơ $O(N^2)$ bị TLE với $N = 10^5$, bẫy biên $N=1$, xử lý số âm, bẫy chia cho 0, quên mở file I/O...).

### 4. Hướng dẫn sửa từng bước & Tư duy thuật toán
- **Giải thích cặn kẽ bản chất:** Phân tích lý do vì sao cách làm cũ/ngây thơ bị quá thời gian (TLE) hoặc sai đáp án (WA), từ đó dẫn dắt học sinh tới tư duy tối ưu một cách tự nhiên, sư phạm và dễ hiểu nhất.
- **Công thức Toán học chuẩn xác (LaTeX $...$):** Mọi biểu thức toán học, công thức mảng tiền tố, giá trị lớn nhất/nhỏ nhất, hệ thức truy hồi hay độ phức tạp BẮT BUỘC viết đúng chuẩn LaTeX trong cặp dấu $...$ (ví dụ: $pre[i] = pre[i-1] + a[i]$, $\\max_{j=i+K-1}^N pre[j]$, $O(N \\log N)$).
- **Hướng dẫn từng bước (Step-by-Step) - BẮT BUỘC ĐẦY ĐỦ 4 BƯỚC:**
  + **Bước 1: Chuyển đổi bài toán & Thiết lập công thức toán:** Biến đổi yêu cầu đề bài thành biểu thức toán hoặc bài toán tối ưu cụ thể.
  + **Bước 2: Lựa chọn phương pháp & Cấu trúc dữ liệu:** Chỉ rõ kỹ thuật tối ưu phù hợp (Prefix Sum, Hai con trỏ Two Pointers, Tìm kiếm nhị phân Binary Search, Quy hoạch động DP, Mảng hậu tố Suffix Max/Min, Monotonic Queue/Stack...).
  + **Bước 3: Các bước thực hiện chi tiết:** Hướng dẫn từng bước cách khởi tạo mảng, xử lý dữ liệu và tính toán kết quả kèm ví dụ minh họa ngắn gọn với test nhỏ để học sinh dễ hình dung.
  + **Bước 4: Đánh giá độ phức tạp:** Đưa ra độ phức tạp thời gian $O(...)$ và bộ nhớ $O(...)$ để khẳng định giải pháp đạt Full 100/100 điểm.

### 5. Mã nguồn C++ hoàn thiện (Full AC)
**QUY TẮC BẮT BUỘC VỀ CODE FULL AC (TAB 4):**
1. **CHUẨN FILE I/O THEO ĐÚNG ĐỀ BÀI**: Nếu đề bài yêu cầu tệp vào/ra (ví dụ \`BAI1.INP\` / \`BAI1.OUT\`), code Full AC BẮT BUỘC phải có cặp lệnh \`freopen("BAI1.INP", "r", stdin); freopen("BAI1.OUT", "w", stdout);\` đúng chuẩn thi HSG. Nếu trong code học sinh đã có dòng freopen thì giữ nguyên tên file đó hoặc sửa đúng theo đề.
2. **PHONG CÁCH HỌC SINH ĐI THI (MỘC MẠC, TRỰC DIỆN, HIỆU QUẢ)**: Viết code theo đúng tư duy và thói quen làm bài thực tế của học sinh thi HSG/Competitive Programming (mộc mạc, ngắn gọn, dễ đọc, trực diện, không rườm rà).
3. **GIỮ NGUYÊN 100% TÊN BIẾN CỦA HỌC SINH (KHI CODE KHỚP ĐỀ)**: Tuyệt đối KHÔNG tự ý đổi tên biến quen thuộc của học sinh (kể cả tên biến viết tắt hay không chuẩn tiếng Anh như \`a, b, res, ans, dp, tong, dem, n, m, k, f, s, d, cnt, vt, tam, dau, cuoi\`...).
4. **QUY TẮC ĐẶT BIẾN MỚI (NẾU CẦN THÊM HOẶC KHI VIẾT CODE MỚI CHO ĐỀ)**: Biến mới BẮT BUỘC phải ngắn gọn từ 1 đến 3 ký tự và mang phong cách Việt hóa / chữ cái quen thuộc của học sinh (ví dụ: \`i, j, k, n, m, s, d, dem, tong, ans, res, vt, tam, dau, cuoi, max, min, l, r, mid\`...).
5. **CHÚ THÍCH CỤ THỂ TỪNG DÒNG SỬA**: Đặt comment ngắn gọn, rõ ràng ngay tại các dòng code đã được sửa/thêm mới để học sinh đối chiếu thấy ngay điểm khác biệt giữa code cũ và code mới.
6. **FULL AC 100%**: Code phải hoàn chỉnh, có đầy đủ \`#include\`, tối ưu Fast I/O và sẵn sàng nộp chấm đạt tối đa 100 điểm.`;

      // Build parts payload
      const parts: any[] = [];

      // Add attached files if any
      if (hasProblemFiles) {
        for (const file of problemFiles) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          let normMime = file.mimeType;
          if (ext === "pdf") normMime = "application/pdf";
          else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) normMime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          else if (["txt", "inp", "out", "cpp", "c", "py", "pas", "md", "csv", "log"].includes(ext)) normMime = "text/plain";

          // 1. If text was extracted from file (Word .docx/.doc, PDF, or text file)
          if (file.extractedText && file.extractedText.trim().length > 0) {
            parts.push({
              text: `\n=== NỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ FILE ĐÍNH KÈM [${file.name}] ===\n${file.extractedText.trim()}\n=== HẾT NỘI DUNG FILE [${file.name}] ===\n`,
            });
          }

          // 2. Images or PDF: send inlineData for multimodal processing
          if (normMime.startsWith("image/") || normMime === "application/pdf") {
            if (file.base64) {
              parts.push({
                inlineData: {
                  mimeType: normMime,
                  data: file.base64,
                },
              });
            }
          }
          // 3. Fallback for Word .docx / .doc if extractedText was missing
          else if (!file.extractedText && (ext === "docx" || ext === "doc" || normMime.includes("word") || normMime.includes("msword"))) {
            try {
              const buf = Buffer.from(file.base64, "base64");
              const wordText = await extractWordFromBuffer(buf, file.name);
              if (wordText && wordText.trim().length > 0) {
                parts.push({
                  text: `\n=== NỘI DUNG TRÍCH XUẤT TỪ FILE WORD [${file.name}] ===\n${wordText.trim()}\n=== HẾT FILE WORD [${file.name}] ===\n`,
                });
              }
            } catch (docxErr) {
              console.warn("Lỗi đọc Word docx/doc trên server:", docxErr);
            }
          }
          // 4. Fallback for text files if extractedText was missing
          else if (!file.extractedText && (normMime.startsWith("text/") || ["txt", "inp", "out", "cpp", "c", "py", "md"].includes(ext))) {
            try {
              const textContent = Buffer.from(file.base64, "base64").toString("utf-8");
              if (textContent) {
                parts.push({
                  text: `\n=== NỘI DUNG FILE VĂN BẢN [${file.name}] ===\n${textContent}\n=== HẾT FILE [${file.name}] ===\n`,
                });
              }
            } catch {
              // fallback
            }
          }
        }
      }

      const studentCodeSection = hasRealCode
        ? `=== [MÃ NGUỒN C++ CỦA HỌC SINH TẠI CỘT 2] ===\n\`\`\`cpp\n${codeText}\n\`\`\`\n(Hãy rà soát kỹ thuật toán, chỉ ra các dòng bị lỗi cú pháp, logic sai, tràn số, TLE và viết lại mã nguồn C++ Full AC tối ưu 100/100 điểm tại Mục 5)`
        : `=== [CỘT 2 CHƯA CÓ CODE HOẶC CHỈ CÓ KHUNG MẪU RỖNG] ===\n(Học sinh chưa hoàn thiện code tại Cột 2. Hãy phân tích các bẫy thuật toán phổ biến, hướng dẫn tư duy giải toán 4 bước chi tiết và xây dựng Mã nguồn C++ Full AC tối ưu 100/100 điểm tại Mục 5)`;

      let problemHeaderContext = "";
      const codeName = (problemCodeName || "MAXSUB").trim().toUpperCase();
      problemHeaderContext = `\n📌 THÔNG TIN ĐỊNH DANH BÀI TOÁN & QUY CÁCH TỆP VÀO/RA:\n- Mã bài (Problem Code): ${codeName}\n- Tệp dữ liệu vào (Input File): ${codeName}.INP\n- Tệp dữ liệu ra (Output File): ${codeName}.OUT${selectedQuestionTitle ? `\n- Câu đã chọn trong tài liệu đề: ${selectedQuestionTitle}` : ""}\n`;

      // Add prompt text with problem statement & student code
      const promptText = `Sau đây là thông tin đề bài (hoặc tập tài liệu đề thi có thể gồm nhiều câu) và trạng thái mã nguồn C++ tại Cột 2:
${problemHeaderContext}
=== ĐỀ BÀI (PROBLEM STATEMENT) ===
${hasProblemText ? problemText : "(Chi tiết đề bài nằm trong file đính kèm phía trên)"}

${studentCodeSection}

YÊU CẦU QUAN TRỌNG:
- ĐÚNG TÊN FILE VÀO/RA (.INP/.OUT): Tệp vào là "${codeName}.INP" và tệp ra là "${codeName}.OUT".
  + Khi kiểm tra code học sinh (Mục 3): Kiểm tra xem code có dùng đúng freopen("${codeName}.INP", "r", stdin) và freopen("${codeName}.OUT", "w", stdout) hay không. Nếu học sinh dùng tên file khác hoặc dùng cin/cout thông thường khi đề yêu cầu file, hãy nhắc nhở rõ lỗi này sẽ bị 0 điểm khi chấm thi HSG.
  + Khi viết Code C++ Full AC (Mục 5): BẮT BUỘC dùng chính xác freopen("${codeName}.INP", "r", stdin); freopen("${codeName}.OUT", "w", stdout);
- NGUYÊN TẮC QUAN TRỌNG: Dù Cột 2 có code đúng, code có lỗi (cú pháp, biên dịch compile error, logic, tràn số, TLE, thiếu dòng), hoặc hoàn toàn để trống: AI BẮT BUỘC LUÔN PHÂN TÍCH ĐẦY ĐỦ TẤT CẢ 5 MỤC TỪNG BƯỚC MỘT, hướng dẫn tư duy thuật toán chi tiết và cung cấp mã nguồn Full AC 100%.
- NẾU TÀI LIỆU ĐỀ THI GỒM NHIỀU CÂU/NHIỀU BÀI: Hãy tự động tìm câu có tệp vào/ra (.INP/.OUT) hoặc tên bài trùng khớp với code C++ (freopen) để tiến hành phân tích đúng câu đó. Nêu rõ câu được chọn ngay đầu Mục 1.
- Ở Mục 5 (CODE FULL AC): Viết mã nguồn C++ hoàn chỉnh đạt 100/100 điểm, có đầy đủ #include, freopen("${codeName}.INP", "r", stdin), freopen("${codeName}.OUT", "w", stdout) và fast I/O. Nếu có code học sinh gửi kèm, giữ nguyên tên biến và phong cách của học sinh, chỉ sửa đúng vị trí lỗi kèm chú thích. Nếu chưa có code gửi kèm, viết code chuẩn chỉnh, mộc mạc và tối ưu cho đề bài.

Hãy phân tích toàn diện và xuất báo cáo chuẩn xác theo đúng cấu trúc 5 mục được yêu cầu. Chú ý sử dụng công thức toán LaTeX định dạng $công_thức$ cho các biểu thức toán và độ phức tạp $O(...)$. Trong mục 5, hãy cung cấp mã nguồn C++ hoàn chỉnh đặt trong khối \`\`\`cpp ... \`\`\`.`;

      parts.push({ text: promptText });

      // Dynamic candidate models list for automatic fallback
      let requestedModel = model || "gemini-3.8-flash";
      if (requestedModel === "gemini-3.1-pro" || requestedModel === "gemini-2.5-pro" || requestedModel === "gemini-pro") {
        requestedModel = "gemini-3.1-pro-preview";
      } else if (requestedModel === "gemini-2.5-flash" || requestedModel === "gemini-flash" || requestedModel === "gemini-flash-latest") {
        requestedModel = "gemini-3.8-flash";
      }

      const candidateModels = Array.from(
        new Set([
          requestedModel,
          "gemini-3.8-flash",
          "gemini-3.1-pro-preview",
          "gemini-3.1-flash-lite",
        ])
      );

      let response: any = null;
      let usedModel = requestedModel;
      let lastError: any = null;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Attempt generation with automatic model switching & backoff on 503/429
      for (let pass = 0; pass < 2 && !response; pass++) {
        for (let i = 0; i < candidateModels.length; i++) {
          const candidate = candidateModels[i];

          // Try up to 2 attempts per model with short jitter backoff on 503/429
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              console.log(
                `[AI Analysis] Pass ${pass + 1}, Requesting from ${candidate} (attempt ${attempt + 1})...`
              );

              const modelConfig: any = {
                systemInstruction,
                temperature: 0.1, // Very low temperature for maximum arithmetic precision and consistency
              };

              const resGen = await ai.models.generateContent({
                model: candidate,
                contents: { parts },
                config: modelConfig,
              });

              if (resGen && resGen.text) {
                response = resGen;
                usedModel = candidate;
                console.log(`[AI Analysis] Successfully generated response using: ${candidate}`);
                break;
              }
            } catch (candidateErr: any) {
              lastError = candidateErr;
              const errStr = candidateErr?.message || "";
              const isDemandSpike =
                errStr.includes("503") ||
                errStr.includes("UNAVAILABLE") ||
                errStr.includes("high demand") ||
                errStr.includes("overloaded");
              const isQuotaExceeded =
                errStr.includes("429") ||
                errStr.includes("RESOURCE_EXHAUSTED") ||
                errStr.includes("Quota exceeded");
              const isNotFound =
                errStr.includes("404") ||
                errStr.includes("not found") ||
                errStr.includes("no longer available");

              if (isQuotaExceeded) {
                console.warn(
                  `[AI Analysis] Model ${candidate} quota exhausted (429). Switching immediately to next available model...`
                );
                break;
              } else if (isDemandSpike) {
                const backoff = 600 * (attempt + 1) + Math.random() * 400;
                console.warn(
                  `[AI Analysis] Model ${candidate} transient 503 spike on attempt ${attempt + 1}. Backing off ${Math.round(backoff)}ms...`
                );
                await sleep(backoff);
              } else if (isNotFound) {
                console.warn(`[AI Analysis] Model ${candidate} not found. Skipping to next candidate...`);
                break;
              } else {
                // Fatal non-retryable error (e.g. invalid API key)
                throw candidateErr;
              }
            }
          }

          if (response) {
            break;
          }
        }

        if (!response && pass === 0) {
          console.warn("[AI Analysis] All candidates in pass 1 hit transient issues. Pausing 1000ms before pass 2...");
          await sleep(1000);
        }
      }

      if (!response) {
        const rawMsg = lastError?.message || "";
        if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
          return res.status(503).json({
            error: "Hệ thống AI hiện đang có lượng truy cập tăng đột biến tạm thời (503 High Demand). Vui lòng nhấn nút 'Phân tích lại' sau vài giây.",
          });
        }
        if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
          return res.status(429).json({
            error: "Hạn mức API tạm thời chạm giới hạn (429 Rate limit). Vui lòng đợi 15-30 giây rồi thử lại.",
          });
        }
        throw lastError;
      }

      const analysisMarkdown = response.text || "";

      return res.json({
        success: true,
        model: usedModel,
        analysis: analysisMarkdown,
      });
    } catch (err: any) {
      console.error("Lỗi khi phân tích code qua Gemini API:", err);
      let rawMsg = err?.message || "";

      // Try to parse nested JSON error from Google RPC
      if (rawMsg.includes('"message"')) {
        try {
          const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error?.message) {
              rawMsg = parsed.error.message;
            }
          }
        } catch {
          // ignore json parse error
        }
      }

      let userFriendlyMessage = rawMsg;
      if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand") || rawMsg.includes("overloaded")) {
        userFriendlyMessage = "Hệ thống AI hiện đang có lượng truy cập tăng đột biến tạm thời (503 Service Unavailable / High Demand). Hệ thống đã tự động thử các mô hình dự phòng nhưng chưa hoàn tất. Vui lòng bấm 'Phân tích' lại sau 5-10 giây.";
      } else if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("Quota exceeded")) {
        userFriendlyMessage = "Hạn mức yêu cầu miễn phí (Free Tier) đã tạm thời chạm giới hạn hoặc đang bị giới hạn tốc độ (Rate limit 429). Vui lòng thử lại sau 30-60 giây, hoặc bấm biểu tượng Cài đặt (bánh răng) ở góc phải để nhập Gemini API Key cá nhân của bạn để tiếp tục không bị gián đoạn.";
      } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("API key not valid")) {
        userFriendlyMessage = "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại khóa API trong phần Cài đặt.";
      }

      return res.status(500).json({ error: userFriendlyMessage });
    }
  });

  // Vite middleware for dev or static serving for prod
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  if (isProd && fs.existsSync(indexPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) {
            next(err);
          }
        });
      } else {
        next();
      }
    });
  } else {
    // In development mode, always mount Vite middlewares for real-time compilation and HMR
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server error caught:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err?.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`C++ Judge & AI Optimizer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
