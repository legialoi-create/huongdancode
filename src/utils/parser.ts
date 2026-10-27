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

  // Resilient regex patterns to detect the 5 sections in Markdown
  const header1Regex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?1[.\s):]+(?:Phân tích bài toán|Tóm tắt|Tổng quan)/i;
  const header2Regex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?2[.\s):]+(?:Đánh giá code|Nhận xét code)/i;
  const header3Regex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?3[.\s):]+(?:Vị trí sai|Lỗi & Điểm nghẽn|Chi tiết lỗi)/i;
  const header4Regex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?4[.\s):]+(?:Hướng dẫn sửa|Tư duy thuật toán)/i;
  const header5Regex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?5[.\s):]+(?:Mã nguồn C\+\+|Code chuẩn Full AC|Code Full AC)/i;

  let section1 = "";
  let section2 = "";
  let section3 = "";
  let section4 = "";

  const match1 = rawMarkdown.search(header1Regex);
  const match2 = rawMarkdown.search(header2Regex);
  const match3 = rawMarkdown.search(header3Regex);
  const match4 = rawMarkdown.search(header4Regex);
  const match5 = rawMarkdown.search(header5Regex);

  if (match3 !== -1) {
    const start1 = match1 !== -1 ? match1 : 0;
    section1 = rawMarkdown.slice(start1, match3).trim();

    const start2 = match3;
    const end2 = match4 !== -1 ? match4 : match5 !== -1 ? match5 : rawMarkdown.length;
    section2 = rawMarkdown.slice(start2, end2).trim();

    if (match4 !== -1) {
      const start3 = match4;
      const end3 = match5 !== -1 ? match5 : rawMarkdown.length;
      section3 = rawMarkdown.slice(start3, end3).trim();
    }

    if (match5 !== -1) {
      section4 = rawMarkdown.slice(match5).trim();
    }
  } else if (match1 !== -1 || match2 !== -1) {
    section1 = rawMarkdown;
    section2 = rawMarkdown;
    section3 = rawMarkdown;
    section4 = rawMarkdown;
  } else {
    section1 = rawMarkdown;
    section2 = rawMarkdown;
    section3 = rawMarkdown;
    section4 = rawMarkdown;
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
    lower.includes("không khớp với bất kỳ câu nào") ||
    (lower.includes("cảnh báo") && lower.includes("bài toán khác"));

  if (isMismatch) {
    detectedTags.push("Đề và Code không khớp bài");
  }

  if (lower.includes("freopen") || lower.includes(".inp") || lower.includes(".out") || lower.includes("file i/o") || lower.includes("vào/ra tệp")) {
    detectedTags.push("File I/O (.INP/.OUT)");
  }
  if (lower.includes("tràn số") || lower.includes("long long") || lower.includes("overflow") || lower.includes("ép kiểu")) {
    detectedTags.push("Chống Tràn số (64-bit)");
  }
  if (lower.includes("tle") || lower.includes("quá thời gian") || lower.includes("o(n^2)") || lower.includes("o(n²)")) {
    detectedTags.push("Khắc phục TLE");
  }
  if (lower.includes("cin.tie") || lower.includes("fast i/o") || lower.includes("sync_with_stdio") || lower.includes("endl")) {
    detectedTags.push("Fast I/O");
  }
  if (lower.includes("kadane") || lower.includes("quy hoạch động") || lower.includes("dp")) {
    detectedTags.push("Quy hoạch động (DP)");
  }
  if (lower.includes("mảng cộng dồn") || lower.includes("prefix sum") || lower.includes("mảng tiền tố")) {
    detectedTags.push("Mảng cộng dồn (Prefix Sum)");
  }
  if (lower.includes("sàng") || lower.includes("sieve") || lower.includes("eratosthenes")) {
    detectedTags.push("Sàng số nguyên tố");
  }
  if (lower.includes("hai con trỏ") || lower.includes("two pointer") || lower.includes("chặt nhị phân") || lower.includes("binary search")) {
    detectedTags.push("Hai con trỏ / Binary Search");
  }
  if (lower.includes("n = 1") || lower.includes("n=1") || lower.includes("trường hợp biên") || lower.includes("corner case") || lower.includes("edge case")) {
    detectedTags.push("Xử lý biên (Edge Cases)");
  }

  // Attempt to extract score (e.g. 30/100, 40%, 60/100)
  let estimatedScore: string | undefined;
  const scoreMatch = rawMarkdown.match(/(\d+\s*\/\s*100|\d+%\s*số điểm|\d+\s*\/\s*\d+\s*test)/i);
  if (scoreMatch) {
    estimatedScore = scoreMatch[1];
  }

  return {
    section1_Overview: section1,
    section2_Flaws: section2,
    section3_Guide: section3,
    section4_FullAcCode: section4,
    rawMarkdown,
    detectedTags,
    estimatedScore,
    acCodeOnly,
    isMismatch,
  };
}
