import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AnalyzePayload {
  problemText: string;
  problemFiles?: Array<{
    name: string;
    mimeType: string;
    base64: string;
    extractedText?: string;
  }>;
  codeText: string;
  userApiKey?: string;
  model?: string;
  problemCodeName?: string;
  testCases?: Array<{
    name: string;
    category?: string;
    input: string;
    expectedOutput: string;
    description?: string;
  }>;
}

export const SYSTEM_INSTRUCTION = `Bạn là chuyên gia lập trình thi đấu (Competitive Programming) và giáo viên bồi dưỡng học sinh giỏi Tin học hàng đầu.
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
Đánh giá chất lượng của bộ test hiện có theo đầy đủ các tiêu chuẩn vàng trong chấm thi HSG:
1. **Tính Đúng / Sai & Chuẩn xác:** Đáp án test có chuẩn 100% không? Test ví dụ có khớp đề bài không? BẮT BUỘC CHỐT RÕ RÀNG DÒNG: **"🎯 Chốt kết quả: Đúng X/Y test chuẩn xác (Z%)"** (Đưa ra con số cụ thể số test hợp lệ, đúng đáp án / tổng số test đang có).
2. **Có Test Đặc biệt không? Có Test Biên không?** Đã có test cận dưới $N=0, 1$, cận trên $N_{max}$, số âm, số 0, mảng bằng nhau, và đặc biệt là bẫy tràn số 32-bit (vượt $2 \\cdot 10^9$ buộc dùng \`long long\`) chưa?
3. **Phân chia Subtask:** Các ngưỡng test có chia điểm công bằng giữa vét cạn và tối ưu không?
4. **Test Bẫy Logic, Anti-Greedy & Chống TLE:** Có test bẫy thuật toán tham lam sai, chống Quicksort suy biến hoặc bẫy băm không?
5. **Định dạng chuẩn Themis/CMS:** Tên file, khoảng trắng cuối dòng, kết thúc dòng.
6. **Mô phỏng kết quả chấm từng Test:** Dự đoán code học sinh sẽ PASS hay FAIL (WA / TLE / Overflow) ở từng test cụ thể, CHỐT RÕ: **"⚡ Chốt kết quả chấm: Đạt X/Y test (X0/100 điểm)"** và đề xuất bổ sung các testcase còn thiếu!`;

export function buildGeminiPayload(payload: AnalyzePayload) {
  const { problemText, problemFiles, codeText } = payload;
  const hasProblemText = problemText && typeof problemText === "string" && problemText.trim().length > 0;
  const hasProblemFiles = Array.isArray(problemFiles) && problemFiles.length > 0;

  const parts: any[] = [];

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
      // 3. Fallback for text files if extractedText was not already present
      else if (!file.extractedText && (normMime.startsWith("text/") || ["txt", "inp", "out", "cpp", "c", "py", "md"].includes(ext))) {
        try {
          let textContent = "";
          if (typeof Buffer !== "undefined") {
            textContent = Buffer.from(file.base64, "base64").toString("utf-8");
          } else if (typeof atob === "function") {
            const binary = atob(file.base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            textContent = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          }
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

  const hasTestCases = Array.isArray(payload.testCases) && payload.testCases.length > 0;
  let testCasesBlock = "";
  if (hasTestCases) {
    const formatted = payload.testCases!
      .map((t, i) => {
        return `Test ${(i + 1).toString().padStart(2, "0")} [${t.category || "General"}]:\n- INPUT:\n${t.input}\n- OUTPUT CHUẨN:\n${t.expectedOutput}${t.description ? `\n- Mục đích: ${t.description}` : ""}`;
      })
      .join("\n\n");
    testCasesBlock = `\n\n=== BỘ TEST THEMIS HIỆN CÓ (${payload.testCases!.length} TESTCASES) ===\n${formatted}\n\nHÃY THẨM ĐỊNH BỘ TEST NÀY THEO 6 TIÊU CHÍ VÀNG Ở MỤC 6: 1. Đúng/Sai 2. Test đặc biệt & Test biên (N=0, 1, cực đại, số âm, bẫy tràn số int64) 3. Subtask 4. Bẫy TLE & Anti-hack 5. Format Themis 6. Đề xuất bổ sung test thiếu.`;
  }

  const hasCodeText = codeText && typeof codeText === "string" && codeText.trim().length > 0;
  const studentCodeSection = hasCodeText
    ? `=== CODE C++ CỦA HỌC SINH / MÃ NGUỒN THỬ NGHIỆM ===\n\`\`\`cpp\n${codeText}\n\`\`\`\n(Lưu ý: Mã nguồn này có thể là code đang giải dở, dính TLE/WA, hoặc chưa phải code chuẩn AC. Hãy thẩm định bộ test xem bộ test có phát hiện được lỗi trong code này không, và viết lại Code Chuẩn Full AC hoàn thiện)`
    : `=== MÃ NGUỒN C++ ===\n(Hiện tại chưa cung cấp mã nguồn hoặc người dùng chưa có code chuẩn. Hãy thẩm định bộ test độc lập dựa trên Đề bài theo 6 tiêu chuẩn, tự động tính toán output chuẩn cho từng test để kiểm tra tính đúng/sai của test, và viết mã nguồn C++ Full AC hoàn thiện đạt 100/100 điểm làm chuẩn đối chiếu)`;

  const promptText = `Sau đây là thông tin bài toán, mã nguồn C++ (nếu có) và bộ test chấm Themis:

=== ĐỀ BÀI (PROBLEM STATEMENT) ===
${hasProblemText ? problemText : "(Chi tiết đề bài nằm trong file đính kèm phía trên)"}

${studentCodeSection}${testCasesBlock}

YÊU CẦU QUAN TRỌNG:
- Ở Mục 5 (CODE FULL AC): Viết mã nguồn C++ hoàn chỉnh đạt 100/100 điểm, có đầy đủ #include, freopen và fast I/O. Nếu có code học sinh gửi kèm, giữ nguyên tên biến và phong cách của học sinh, chỉ sửa đúng vị trí lỗi kèm chú thích. Nếu chưa có code gửi kèm, viết code chuẩn chỉnh, mộc mạc và tối ưu cho đề bài.
- Ở Mục 6 (THẨM ĐỊNH BỘ TEST THEMIS): Dù CÓ CODE hay KHÔNG CÓ CODE CHUẨN, hãy thẩm định kỹ càng bộ test theo 6 tiêu chuẩn (1. Đúng/Sai 2. Test đặc biệt & Test biên N=1, Nmax, tràn số int64 3. Subtask 4. Bẫy TLE & Anti-hack 5. Định dạng Themis 6. Độ bao phủ & đề xuất test thiếu). Đưa ra nhận xét cụ thể và số điểm đánh giá cho bộ test.

Hãy phân tích toàn diện và xuất báo cáo chuẩn xác theo đúng cấu trúc 6 mục được yêu cầu. Chú ý sử dụng công thức toán LaTeX định dạng $công_thức$ cho các biểu thức toán và độ phức tạp $O(...)$. Trong mục 5, hãy cung cấp mã nguồn C++ hoàn chỉnh đặt trong khối \`\`\`cpp ... \`\`\`.`;

  parts.push({ text: promptText });

  return parts;
}

/**
 * Execute Gemini analysis directly from client or serverless function with multi-model fallback.
 */
export async function executeDirectGeminiAnalysis(
  payload: AnalyzePayload,
  apiKey: string
): Promise<{ success: boolean; model: string; analysis: string }> {
  if (!apiKey) {
    throw new Error("Chưa cấu hình Gemini API Key. Vui lòng vào Cài đặt (bánh răng) để nhập API Key của bạn.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const parts = buildGeminiPayload(payload);

  // Dynamic fallback model chain: Starts with requested model or gemini-3.8-flash
  const requested = payload.model || "gemini-3.8-flash";
  const candidateModels = Array.from(
    new Set([
      requested,
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ])
  );

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const candidate = candidateModels[i];

    try {
      console.log(`[Gemini Optimizer] Trying model: ${candidate}...`);
      const modelConfig: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      };

      if (candidate.includes("flash-lite")) {
        modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (candidate.includes("3.8-flash") || candidate.includes("3.1")) {
        modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model: candidate,
        contents: { parts },
        config: modelConfig,
      });

      const analysis = response.text || "";
      if (analysis) {
        return {
          success: true,
          model: candidate,
          analysis,
        };
      }
    } catch (err: any) {
      lastError = err;
      const errStr = err?.message || "";
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
          `[Gemini Optimizer] Model ${candidate} returned transient error: ${errStr.slice(0, 100)}. Switching to next candidate...`
        );
        continue;
      } else {
        // Fatal error like invalid API key
        throw err;
      }
    }
  }

  if (lastError) {
    let rawMsg = lastError?.message || "";
    if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
      throw new Error("Hệ thống AI hiện đang có lượng truy cập tăng đột biến tạm thời (503 High Demand). Vui lòng thử bấm 'Phân tích' lại sau 5-10 giây.");
    } else if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Hạn mức API tạm thời chạm giới hạn (429 Rate limit). Vui lòng đợi 30 giây rồi thử lại.");
    }
    throw lastError;
  }

  throw new Error("Không nhận được phản hồi từ các mô hình Gemini.");
}
