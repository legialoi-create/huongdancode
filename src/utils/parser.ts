import { ParsedAnalysis } from "../types";

export function parseAnalysisMarkdown(rawMarkdown: string): ParsedAnalysis {
  if (!rawMarkdown) {
    return {
      section1_Overview: "",
      section2_Flaws: "",
      section3_Guide: "",
      section4_FullAcCode: "",
      rawMarkdown: "",
      detectedTags: [],
    };
  }

  // Regex patterns to detect section headers in Markdown
  // 1. Phân tích bài toán
  // 2. Đánh giá code học sinh
  // 3. Vị trí sai & Chỗ chưa tối ưu
  // 4. Hướng dẫn sửa chi tiết
  // 5. Mã nguồn C++ hoàn thiện (Full AC)

  const header1Regex = /(?:###?\s*1[.\s]|###?\s*Phân tích bài toán)/i;
  const header2Regex = /(?:###?\s*2[.\s]|###?\s*Đánh giá code học sinh)/i;
  const header3Regex = /(?:###?\s*3[.\s]|###?\s*Vị trí sai|###?\s*Lỗi & Điểm nghẽn)/i;
  const header4Regex = /(?:###?\s*4[.\s]|###?\s*Hướng dẫn sửa)/i;
  const header5Regex = /(?:###?\s*5[.\s]|###?\s*Mã nguồn C\+\+|###?\s*Code chuẩn Full AC)/i;
  const header6Regex = /(?:###?\s*6[.\s]|###?\s*Thẩm định Bộ Test|###?\s*Đánh giá bộ test|###?\s*Tiêu chí bộ test)/i;

  // Split content based on headers if standard
  let section1 = "";
  let section2 = "";
  let section3 = "";
  let section4 = "";
  let section5_TestSuiteEvaluation = "";

  // Helper to find slice between headers
  const match1 = rawMarkdown.search(header1Regex);
  const match2 = rawMarkdown.search(header2Regex);
  const match3 = rawMarkdown.search(header3Regex);
  const match4 = rawMarkdown.search(header4Regex);
  const match5 = rawMarkdown.search(header5Regex);
  const match6 = rawMarkdown.search(header6Regex);

  if (match1 !== -1 && match3 !== -1) {
    // Section 1: Overview & Student Code Evaluation (Mục 1 + Mục 2)
    const end1 = match3;
    section1 = rawMarkdown.slice(match1, end1).trim();

    // Section 2: Flaws & Bottlenecks (Mục 3)
    const start2 = match3;
    const end2 = match4 !== -1 ? match4 : (match5 !== -1 ? match5 : (match6 !== -1 ? match6 : rawMarkdown.length));
    section2 = rawMarkdown.slice(start2, end2).trim();

    // Section 3: Step-by-step Guide (Mục 4)
    if (match4 !== -1) {
      const start3 = match4;
      const end3 = match5 !== -1 ? match5 : (match6 !== -1 ? match6 : rawMarkdown.length);
      section3 = rawMarkdown.slice(start3, end3).trim();
    }

    // Section 4: Full AC Code (Mục 5)
    if (match5 !== -1) {
      const start4 = match5;
      const end4 = match6 !== -1 ? match6 : rawMarkdown.length;
      section4 = rawMarkdown.slice(start4, end4).trim();
    }

    // Section 5 (Mục 6): Test Suite Evaluation
    if (match6 !== -1) {
      section5_TestSuiteEvaluation = rawMarkdown.slice(match6).trim();
    }
  } else {
    // Fallback: divide into parts if headers aren't standard or single text
    section1 = rawMarkdown;
    section2 = "Vui lòng xem chi tiết trong báo cáo tổng quan.";
    section3 = "Vui lòng xem chi tiết trong báo cáo tổng quan.";
    section4 = "Vui lòng xem chi tiết trong báo cáo tổng quan.";
  }

  // Extract C++ code specifically from Section 4 or rawMarkdown
  let acCodeOnly = "";
  const codeBlockMatch = (section4 || rawMarkdown).match(/```(?:cpp|c\+\+)?([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    acCodeOnly = codeBlockMatch[1].trim();
  }

  // Detect competitive programming tags
  const detectedTags: string[] = [];
  const lower = rawMarkdown.toLowerCase();

  // Check if problem and code are unrelated
  const isMismatch =
    lower.includes("không phải là của cùng một bài") ||
    lower.includes("không phải của 1 bài") ||
    lower.includes("không phải cùng một bài") ||
    lower.includes("nộp nhầm code") ||
    lower.includes("nộp sai code") ||
    lower.includes("không liên quan") ||
    (lower.includes("cảnh báo") && lower.includes("bài toán khác"));

  if (isMismatch) {
    detectedTags.push("⚠️ Đề và Code không khớp bài");
  }

  if (lower.includes("freopen") || lower.includes(".inp") || lower.includes(".out") || lower.includes("file i/o") || lower.includes("vào/ra tệp")) {
    detectedTags.push("File I/O (freopen .INP/.OUT)");
  }
  if (lower.includes("tràn số") || lower.includes("long long") || lower.includes("overflow") || lower.includes("ép kiểu")) {
    detectedTags.push("Tràn số (Integer Overflow)");
  }
  if (lower.includes("tle") || lower.includes("quá thời gian") || lower.includes("o(n^2)") || lower.includes("o(n²)")) {
    detectedTags.push("TLE (Time Limit Exceeded)");
  }
  if (lower.includes("cin.tie") || lower.includes("fast i/o") || lower.includes("sync_with_stdio") || lower.includes("endl")) {
    detectedTags.push("Tối ưu I/O (cin.tie)");
  }
  if (lower.includes("kadane") || lower.includes("quy hoạch động") || lower.includes("dp")) {
    detectedTags.push("Quy hoạch động (DP)");
  }
  if (lower.includes("sàng") || lower.includes("sieve") || lower.includes("eratosthenes")) {
    detectedTags.push("Sàng số nguyên tố");
  }
  if (lower.includes("hai con trỏ") || lower.includes("two pointer") || lower.includes("chặt nhị phân") || lower.includes("binary search")) {
    detectedTags.push("Hai con trỏ / Binary Search");
  }
  if (lower.includes("n = 1") || lower.includes("n=1") || lower.includes("trường hợp biên") || lower.includes("corner case") || lower.includes("edge case")) {
    detectedTags.push("Trường hợp biên (Edge Cases)");
  }

  // Attempt to extract score (e.g. 30/100, 40%, 60/100)
  let estimatedScore: string | undefined;
  const scoreMatch = rawMarkdown.match(/(\d+\s*\/\s*100|\d+%\s*số điểm|\d+\s*\/\s*\d+\s*test)/i);
  if (scoreMatch) {
    estimatedScore = scoreMatch[1];
  }

  if (section5_TestSuiteEvaluation || lower.includes("bộ test") || lower.includes("tiêu chí")) {
    detectedTags.push("Thẩm định Bộ Test Themis");
  }

  return {
    section1_Overview: section1,
    section2_Flaws: section2,
    section3_Guide: section3,
    section4_FullAcCode: section4,
    section5_TestSuiteEvaluation,
    rawMarkdown,
    detectedTags,
    estimatedScore,
    acCodeOnly,
    isMismatch,
  };
}
