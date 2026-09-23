import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `Bạn là chuyên gia lập trình thi đấu (Competitive Programming) và giáo viên bồi dưỡng học sinh giỏi Tin học hàng đầu.
Nhiệm vụ của bạn là nhận đề bài và code C++ của học sinh, sau đó phân tích và xuất kết quả chuẩn Markdown theo đúng 5 mục:

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
- Giải thích cặn kẽ vì sao cách làm cũ bị sai và tư duy cải tiến từng bước rõ ràng để học sinh hiểu bản chất.

### 5. Mã nguồn C++ hoàn thiện (Full AC)
**QUY TẮC BẮT BUỘC VỀ CODE FULL AC (TAB 4):**
1. **CHUẨN FILE I/O THEO ĐÚNG ĐỀ BÀI**: Nếu đề bài yêu cầu tệp vào/ra (ví dụ \`BAI1.INP\` / \`BAI1.OUT\`), code Full AC BẮT BUỘC phải có cặp lệnh \`freopen("BAI1.INP", "r", stdin); freopen("BAI1.OUT", "w", stdout);\` đúng chuẩn thi HSG. Nếu trong code học sinh đã có dòng freopen thì giữ nguyên tên file đó hoặc sửa đúng theo đề.
2. **PHONG CÁCH HỌC SINH ĐI THI (MỘC MẠC, TRỰC DIỆN, HIỆU QUẢ)**: Viết code theo đúng tư duy và thói quen làm bài thực tế của học sinh thi HSG/Competitive Programming (mộc mạc, ngắn gọn, dễ đọc, trực diện, không rườm rà).
3. **GIỮ NGUYÊN 100% TÊN BIẾN CỦA HỌC SINH (KHI CODE KHỚP ĐỀ)**: Tuyệt đối KHÔNG tự ý đổi tên biến quen thuộc của học sinh (kể cả tên biến viết tắt hay không chuẩn tiếng Anh như \`a, b, res, ans, dp, tong, dem, n, m, k, f, s, d, cnt, vt, tam, dau, cuoi\`...).
4. **QUY TẮC ĐẶT BIẾN MỚI (NẾU CẦN THÊM HOẶC KHI VIẾT CODE MỚI CHO ĐỀ)**: Biến mới BẮT BUỘC phải ngắn gọn từ 1 đến 3 ký tự và mang phong cách Việt hóa / chữ cái quen thuộc của học sinh (ví dụ: \`i, j, k, n, m, s, d, dem, tong, ans, res, vt, tam, dau, cuoi, max, min, l, r, mid\`...). TUYỆT ĐỐI KHÔNG dùng tên biến tiếng Anh học thuật dài dòng hay chuẩn clean code doanh nghiệp phức tạp (tránh đặt kiểu \`totalAccumulator\`, \`studentResultIndex\`, \`temporaryStorage\`...).
5. **CHÚ THÍCH CỤ THỂ TỪNG DÒNG SỬA**: Đặt comment ngắn gọn, rõ ràng ngay tại các dòng code đã được sửa/thêm mới để học sinh đối chiếu thấy ngay điểm khác biệt giữa code cũ và code mới.
6. **FULL AC 100%**: Code phải hoàn chỉnh, có đầy đủ \`#include\`, tối ưu Fast I/O và sẵn sàng nộp chấm đạt tối đa 100 điểm.`;

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      problemText,
      problemFiles,
      codeText,
      userApiKey,
      model = "gemini-2.5-flash",
    } = req.body || {};

    if (!codeText || typeof codeText !== "string" || !codeText.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập mã nguồn C++ của học sinh." });
    }

    const hasProblemText = problemText && typeof problemText === "string" && problemText.trim().length > 0;
    const hasProblemFiles = Array.isArray(problemFiles) && problemFiles.length > 0;

    if (!hasProblemText && !hasProblemFiles) {
      return res.status(400).json({ error: "Vui lòng cung cấp đề bài (nhập văn bản hoặc tải file đính kèm)." });
    }

    const effectiveApiKey = (userApiKey && typeof userApiKey === "string" && userApiKey.trim())
      ? userApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return res.status(401).json({
        error: "Chưa cấu hình Gemini API Key. Vui lòng bấm vào biểu tượng Cài đặt (bánh răng) ở góc phải để nhập API Key của bạn, hoặc cấu hình biến môi trường GEMINI_API_KEY trên Vercel Settings.",
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

    const parts: any[] = [];

    if (hasProblemFiles) {
      for (const file of problemFiles) {
        if (file.base64 && file.mimeType) {
          if (
            file.mimeType.startsWith("image/") ||
            file.mimeType === "application/pdf"
          ) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.base64,
              },
            });
          } else if (file.mimeType.startsWith("text/")) {
            try {
              const textContent = Buffer.from(file.base64, "base64").toString("utf-8");
              parts.push({
                text: `[Nội dung file đính kèm: ${file.name}]\n${textContent}\n`,
              });
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const promptText = `Sau đây là thông tin bài toán và code C++ của học sinh cần chấm và phân tích:

=== ĐỀ BÀI (PROBLEM STATEMENT) ===
${hasProblemText ? problemText : "(Chi tiết đề bài nằm trong file đính kèm phía trên)"}

=== CODE C++ CỦA HỌC SINH (STUDENT C++ CODE) ===
\`\`\`cpp
${codeText}
\`\`\`

YÊU CẦU QUAN TRỌNG VỀ MỤC 5 (CODE FULL AC):
- Bạn PHẢI tuyệt đối giữ nguyên tên biến (như các biến n, m, a, b, res, ans, dp, tong, dem...) và phong cách viết code gốc của học sinh.
- KHÔNG thay thế bằng phong cách viết hoàn toàn mới hay đặt lại tên biến khác lạ.
- Nếu cần đặt biến mới, chỉ dùng biến 1-3 ký tự quen thuộc của học sinh (i, j, k, vt, tam, dau, cuoi, ans, res, tong, dem...).
- Chỉ sửa đúng các vị trí lỗi, giữ nguyên khung chương trình của học sinh kèm comment giải thích rõ ràng tại các dòng sửa.

Hãy phân tích toàn diện và xuất báo cáo chuẩn xác theo đúng cấu trúc 5 mục được yêu cầu. Chú ý sử dụng công thức toán LaTeX định dạng $công_thức$ cho các biểu thức toán và độ phức tạp $O(...)$. Trong mục 5, hãy cung cấp mã nguồn C++ hoàn chỉnh đặt trong khối \`\`\`cpp ... \`\`\`.`;

    parts.push({ text: promptText });

    const requestedModel = model || "gemini-2.5-flash";
    const candidateModels = Array.from(
      new Set([
        requestedModel,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-pro",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
      ])
    );

    let response: any = null;
    let usedModel = requestedModel;
    let lastError: any = null;

    for (const candidate of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: candidate,
          contents: { parts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
          },
        });
        usedModel = candidate;
        break;
      } catch (candidateErr: any) {
        lastError = candidateErr;
        const errStr = candidateErr?.message || "";
        const isRetryable =
          errStr.includes("429") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("Quota exceeded") ||
          errStr.includes("503") ||
          errStr.includes("404") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("high demand") ||
          errStr.includes("overloaded") ||
          errStr.includes("no longer available");

        if (isRetryable) {
          continue;
        } else {
          throw candidateErr;
        }
      }
    }

    if (!response) {
      throw lastError;
    }

    const analysisMarkdown = response.text || "";

    return res.status(200).json({
      success: true,
      model: usedModel,
      analysis: analysisMarkdown,
    });
  } catch (err: any) {
    let rawMsg = err?.message || "";
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
        // ignore
      }
    }

    let userFriendlyMessage = rawMsg;
    if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("Quota exceeded")) {
      userFriendlyMessage = "Hạn mức API tạm thời chạm giới hạn (Rate limit 429). Vui lòng thử lại sau 30-60 giây hoặc vào Cài đặt để nhập API Key cá nhân của bạn.";
    } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("API key not valid")) {
      userFriendlyMessage = "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại khóa API trong phần Cài đặt.";
    }

    return res.status(500).json({ error: userFriendlyMessage });
  }
}
