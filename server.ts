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
      } = req.body;

      const hasCodeText = codeText && typeof codeText === "string" && codeText.trim().length > 0;
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
Nhiệm vụ của bạn là nhận đề bài, code C++ của học sinh và (nếu có) bộ test chấm Themis, sau đó phân tích và xuất kết quả chuẩn Markdown theo đúng 6 mục:

⚠️ QUY TẮC ĐẶC BIỆT - KIỂM TRA ĐỘ TƯƠNG QUAN GIỮA ĐỀ VÀ CODE:
- Trước tiên, hãy đối chiếu kỹ đề bài (hoặc hình ảnh/tệp đề) và code C++ nộp lên.
- NẾU ĐỀ BÀI VÀ CODE HOÀN TOÀN KHÔNG LIÊN QUAN ĐẾN NHAU (học sinh nộp nhầm code của bài khác, ví dụ: đề yêu cầu tính tổng dãy con lớn nhất nhưng code lại đi tìm ước chung lớn nhất hoặc sắp xếp đồ thị):
  + BẮT BUỘC BÁO RÕ RÀNG: "⚠️ CẢNH BÁO: Đề bài và mã nguồn C++ nộp lên KHÔNG PHẢI LÀ CỦA CÙNG MỘT BÀI TOÁN! (Code nộp lên đang giải quyết một bài toán khác hoàn toàn so với yêu cầu đề bài)."
  + Ghi rõ ở Mục 2 & Mục 3 cảnh báo nộp nhầm bài này và ước lượng điểm là "0/100 test (Do nộp sai code của bài khác)".
  + Tại Mục 5: Cung cấp mã nguồn C++ Full AC hoàn chỉnh để giải quyết ĐÚNG ĐỀ BÀI mà đề bài yêu cầu.

### 1. Phân tích bài toán & Ràng buộc cốt lõi
- Tóm tắt yêu cầu chính của bài toán.
- Ràng buộc dữ liệu (Time limit, Memory limit, giới hạn $N, M$, các subtask...).
- Quy cách vào/ra (File I/O hay Standard I/O): Chú ý đọc kỹ đề bài xem có yêu cầu đọc ghi qua tệp không (ví dụ: \`TENBAI.INP\` và \`TENBAI.OUT\`).
- Độ phức tạp thời gian/không gian chuẩn để đạt Full điểm (ví dụ: $O(N \\log N)$).

### 2. Đánh giá code học sinh
- Tóm tắt ý tưởng/thuật toán mà học sinh đang tiếp cận. (Nếu phát hiện code không khớp với đề bài, hãy cảnh báo ngay tại đây).
- Ưu điểm và ước lượng điểm/số test pass (ví dụ: 40/100 test do dính TLE ở subtask 2, 0/100 do tràn số/quên mở file, hoặc 0/100 do code không khớp với đề).

### 3. Vị trí sai & Chỗ chưa tối ưu
- **Kiểm tra tính tương thích Đề - Code:** Nhắc nhở rõ nếu code giải sai bài toán.
- **Quy cách Vào/Ra Tệp (File I/O):** ĐỐI CHIẾU KỸ GIỮA ĐỀ VÀ CODE:
  + Nếu đề bài yêu cầu nộp file (ví dụ: \`TENBAI.INP\` / \`TENBAI.OUT\`) mà code học sinh quên mở file bằng \`freopen\` hoặc mở sai tên file $\\rightarrow$ Chỉ rõ lỗi này khiến bài nhận 0/100 điểm trên hệ thống chấm thi HSG (Themis/CMS).
  + Nếu đề bài dùng Standard I/O (bàn phím/màn hình) mà học sinh lại mở file (hoặc ngược lại) thì phải nhắc nhở chính xác.
- **Lỗi cú pháp / Logic / Tràn số:** Chỉ rõ chính xác dòng nào sai, cần ép kiểu ra sao (đặc biệt chú ý \`long long\`, khởi tạo mảng, chia dư, tràn số khi nhân hai số \`int\`, xử lý biên $N=0, 1$).
- **Độ phức tạp & TLE:** Giải thích vì sao thuật toán hiện tại bị quá thời gian chạy.
- **Tối ưu I/O:** \`ios_base::sync_with_stdio(0); cin.tie(0);\` và tránh dùng \`endl\`.

### 4. Hướng dẫn sửa từng bước & Tư duy thuật toán
- **Giải thích cặn kẽ bản chất:** Phân tích lý do vì sao cách làm cũ/ngây thơ bị quá thời gian (TLE) hoặc sai đáp án (WA), từ đó dẫn dắt học sinh tới tư duy tối ưu một cách tự nhiên, sư phạm và dễ hiểu nhất.
- **Công thức Toán học chuẩn xác (LaTeX $...$):** Mọi biểu thức toán học, công thức mảng tiền tố, giá trị lớn nhất/nhỏ nhất, hệ thức truy hồi hay độ phức tạp BẮT BUỘC viết đúng chuẩn LaTeX trong cặp dấu $...$ (ví dụ: $pre[i] = pre[i-1] + a[i]$, $\max_{j=i+K-1}^N pre[j]$, $O(N \log N)$).
- **Hướng dẫn từng bước (Step-by-Step):**
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
6. **FULL AC 100%**: Code phải hoàn chỉnh, có đầy đủ \`#include\`, tối ưu Fast I/O và sẵn sàng nộp chấm đạt tối đa 100 điểm.

### 6. Thẩm định Bộ Test Themis & Tiêu chí Chấm
Đánh giá chất lượng của bộ test hiện có theo 6 tiêu chuẩn vàng:
1. **Đúng / Sai & Chuẩn xác:** Đáp án test có chuẩn không? Có test ví dụ đề bài không? BẮT BUỘC CHỐT RÕ RÀNG DÒNG: **"🎯 Chốt kết quả: Đúng X/Y test chuẩn xác (Z%)"** (Đưa ra con số cụ thể số test hợp lệ, đúng đáp án / tổng số test đang có).
2. **Có Test Đặc biệt không? Có Test Biên không?** ($N_{min}, N_{max}$, số âm, số 0, bẫy tràn số 32-bit buộc dùng long long).
3. **Phân chia Subtask:** Có đủ các mức $N$ cho vét cạn và full tối ưu không?
4. **Test Bẫy Logic, Anti-Greedy & Chống TLE:** Chống thuật toán tham lam sai, chống quicksort suy biến.
5. **Định dạng chuẩn Themis/CMS:** Tên file, ký tự ngắt dòng.
6. **Mô phỏng kết quả chấm từng Test & Đề xuất bổ sung:** Test nào học sinh ăn điểm, test nào dính WA/TLE/Overflow, CHỐT RÕ: **"⚡ Chốt kết quả chấm: Đạt X/Y test (X0/100 điểm)"**.`;

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

      let testCasesBlock = "";
      if (hasTestCases) {
        const formatted = testCases
          .map((t: any, i: number) => {
            return `Test ${(i + 1).toString().padStart(2, "0")} [${t.category || "General"}]:\n- INPUT:\n${t.input}\n- OUTPUT CHUẨN:\n${t.expectedOutput}${t.description ? `\n- Mục đích: ${t.description}` : ""}`;
          })
          .join("\n\n");
        testCasesBlock = `\n\n=== BỘ TEST THEMIS HIỆN CÓ (${testCases.length} TESTCASES) ===\n${formatted}\n\nHÃY THẨM ĐỊNH BỘ TEST NÀY THEO 6 TIÊU CHÍ VÀNG Ở MỤC 6: 1. Đúng/Sai 2. Test đặc biệt & Test biên (N=0, 1, cực đại, số âm, bẫy tràn số int64) 3. Subtask 4. Bẫy TLE & Anti-hack 5. Format Themis 6. Đề xuất bổ sung test thiếu.`;
      }

      const studentCodeSection = hasCodeText
        ? `=== CODE C++ CỦA HỌC SINH / MÃ NGUỒN THỬ NGHIỆM ===\n\`\`\`cpp\n${codeText}\n\`\`\`\n(Lưu ý: Mã nguồn này có thể là code đang giải dở, dính TLE/WA, hoặc chưa phải code chuẩn AC. Hãy thẩm định bộ test xem bộ test có phát hiện được lỗi trong code này không, và viết lại Code Chuẩn Full AC hoàn thiện)`
        : `=== MÃ NGUỒN C++ ===\n(Hiện tại chưa cung cấp mã nguồn hoặc người dùng chưa có code chuẩn. Hãy thẩm định bộ test độc lập dựa trên Đề bài theo 6 tiêu chuẩn, tự động tính toán output chuẩn cho từng test để kiểm tra tính đúng/sai của test, và viết mã nguồn C++ Full AC hoàn thiện đạt 100/100 điểm làm chuẩn đối chiếu)`;

      // Add prompt text with problem statement & student code
      const promptText = `Sau đây là thông tin bài toán, mã nguồn C++ (nếu có) và bộ test chấm Themis:

=== ĐỀ BÀI (PROBLEM STATEMENT) ===
${hasProblemText ? problemText : "(Chi tiết đề bài nằm trong file đính kèm phía trên)"}

${studentCodeSection}${testCasesBlock}

YÊU CẦU QUAN TRỌNG:
- Ở Mục 5 (CODE FULL AC): Viết mã nguồn C++ hoàn chỉnh đạt 100/100 điểm, có đầy đủ #include, freopen và fast I/O. Nếu có code học sinh gửi kèm, giữ nguyên tên biến và phong cách của học sinh, chỉ sửa đúng vị trí lỗi kèm chú thích. Nếu chưa có code gửi kèm, viết code chuẩn chỉnh, mộc mạc và tối ưu cho đề bài.
- Ở Mục 6 (THẨM ĐỊNH BỘ TEST THEMIS): Dù CÓ CODE hay KHÔNG CÓ CODE CHUẨN, hãy thẩm định kỹ càng bộ test theo 6 tiêu chuẩn (1. Đúng/Sai 2. Test đặc biệt & Test biên N=1, Nmax, tràn số int64 3. Subtask 4. Bẫy TLE & Anti-hack 5. Định dạng Themis 6. Độ bao phủ & đề xuất test thiếu). Đưa ra nhận xét cụ thể và số điểm đánh giá cho bộ test.

Hãy phân tích toàn diện và xuất báo cáo chuẩn xác theo đúng cấu trúc 6 mục được yêu cầu. Chú ý sử dụng công thức toán LaTeX định dạng $công_thức$ cho các biểu thức toán và độ phức tạp $O(...)$. Trong mục 5, hãy cung cấp mã nguồn C++ hoàn chỉnh đặt trong khối \`\`\`cpp ... \`\`\`.`;

      parts.push({ text: promptText });

      // Candidate models to try with automatic fallback
      const requestedModel = model || "gemini-3.8-flash";
      const candidateModels = Array.from(
        new Set([
          requestedModel,
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
        ])
      );

      let response: any = null;
      let usedModel = requestedModel;
      let lastError: any = null;

      for (let i = 0; i < candidateModels.length; i++) {
        const candidate = candidateModels[i];
        let modelSuccess = false;

        try {
          console.log(`Requesting analysis from model: ${candidate}...`);
          
          const modelConfig: any = {
            systemInstruction,
            temperature: 0.2, // Low temperature for deterministic, accurate code review
          };

          // Set thinking level based on model capabilities
          if (candidate.includes("flash-lite")) {
            modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
          } else if (candidate.includes("3.8-flash") || candidate.includes("3.1")) {
            modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          response = await ai.models.generateContent({
            model: candidate,
            contents: { parts },
            config: modelConfig,
          });

          usedModel = candidate;
          console.log(`Successfully received analysis using: ${candidate}`);
          modelSuccess = true;
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

          if (isDemandSpike || isQuotaExceeded || isNotFound) {
            console.warn(
              `Model ${candidate} encountered transient issue (${errStr.slice(0, 100)}). Automatically switching to next candidate model...`
            );
            // Immediately continue to the next model in the fallback chain
            continue;
          } else {
            // Fatal non-retryable error (e.g. invalid auth)
            throw candidateErr;
          }
        }

        if (modelSuccess && response) {
          break;
        }
      }

      if (!response) {
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
