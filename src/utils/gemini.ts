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

export interface ParsedAnalysis {
  rawMarkdown: string;
  tabs: {
    specAndConstraints: string;
    studentReview: string;
    bugLocations: string;
    stepByStepGuide: string;
    fullAcCode: string;
    testSuiteAudit: string;
  };
  scoreEstimate?: string;
  complexity?: {
    time: string;
    space: string;
  };
  acCodeOnly?: string;
}

/**
 * Parses raw AI Markdown response into 6 structured tabs for the UI.
 */
export function parseAnalysisMarkdown(markdown: string): ParsedAnalysis {
  const clean = markdown.trim();

  const sections: {
    specAndConstraints: string;
    studentReview: string;
    bugLocations: string;
    stepByStepGuide: string;
    fullAcCode: string;
    testSuiteAudit: string;
  } = {
    specAndConstraints: "",
    studentReview: "",
    bugLocations: "",
    stepByStepGuide: "",
    fullAcCode: "",
    testSuiteAudit: "",
  };

  const getSection = (titleRegex: RegExp, nextRegexes: RegExp[]): string => {
    const match = clean.match(titleRegex);
    if (!match || match.index === undefined) return "";
    const start = match.index + match[0].length;

    let end = clean.length;
    for (const nextRegex of nextRegexes) {
      const nextMatch = clean.slice(start).match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        const candidateEnd = start + nextMatch.index;
        if (candidateEnd < end) {
          end = candidateEnd;
        }
      }
    }

    return clean.slice(start, end).trim();
  };

  sections.specAndConstraints = getSection(
    /#{1,4}\s*(?:1[\.:\)]|\bPhần 1\b|\bMục 1\b)?\s*(?:Bảng\s*)?(?:Phân tích\s*(?:bài toán|yêu cầu)?|Ràng buộc|Đặc tả|Specification)/i,
    [
      /#{1,4}\s*(?:2[\.:\)]|\bPhần 2\b|\bMục 2\b)?\s*Đánh giá/i,
      /#{1,4}\s*(?:3[\.:\)]|\bPhần 3\b|\bMục 3\b)?\s*(?:Vị trí sai|Chỉ ra lỗi|Lỗi sai)/i,
      /#{1,4}\s*(?:4[\.:\)]|\bPhần 4\b|\bMục 4\b)?\s*Hướng dẫn/i,
      /#{1,4}\s*(?:5[\.:\)]|\bPhần 5\b|\bMục 5\b)?\s*Mã nguồn/i,
      /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*Thẩm định/i,
    ]
  );

  sections.studentReview = getSection(
    /#{1,4}\s*(?:2[\.:\)]|\bPhần 2\b|\bMục 2\b)?\s*Đánh giá\s*(?:code|mã nguồn)?/i,
    [
      /#{1,4}\s*(?:3[\.:\)]|\bPhần 3\b|\bMục 3\b)?\s*(?:Vị trí sai|Chỉ ra lỗi|Lỗi sai)/i,
      /#{1,4}\s*(?:4[\.:\)]|\bPhần 4\b|\bMục 4\b)?\s*Hướng dẫn/i,
      /#{1,4}\s*(?:5[\.:\)]|\bPhần 5\b|\bMục 5\b)?\s*Mã nguồn/i,
      /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*Thẩm định/i,
    ]
  );

  sections.bugLocations = getSection(
    /#{1,4}\s*(?:3[\.:\)]|\bPhần 3\b|\bMục 3\b)?\s*(?:Vị trí sai|Chỉ ra lỗi|Lỗi sai|Điểm chưa tối ưu)/i,
    [
      /#{1,4}\s*(?:4[\.:\)]|\bPhần 4\b|\bMục 4\b)?\s*Hướng dẫn/i,
      /#{1,4}\s*(?:5[\.:\)]|\bPhần 5\b|\bMục 5\b)?\s*Mã nguồn/i,
      /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*Thẩm định/i,
    ]
  );

  sections.stepByStepGuide = getSection(
    /#{1,4}\s*(?:4[\.:\)]|\bPhần 4\b|\bMục 4\b)?\s*(?:Hướng dẫn|Tư duy thuật toán|Các bước tối ưu)/i,
    [
      /#{1,4}\s*(?:5[\.:\)]|\bPhần 5\b|\bMục 5\b)?\s*Mã nguồn/i,
      /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*Thẩm định/i,
    ]
  );

  sections.fullAcCode = getSection(
    /#{1,4}\s*(?:5[\.:\)]|\bPhần 5\b|\bMục 5\b)?\s*(?:Mã nguồn|Code C\+\+|Full AC|Giải pháp hoàn chỉnh)/i,
    [
      /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*(?:Thẩm định|Bộ test|Tiêu chí chấm)/i,
    ]
  );

  sections.testSuiteAudit = getSection(
    /#{1,4}\s*(?:6[\.:\)]|\bPhần 6\b|\bMục 6\b)?\s*(?:Thẩm định|Bộ test|Tiêu chí chấm|Đánh giá test)/i,
    []
  );

  // Fallback: If section headings weren't matched perfectly, assign full markdown to spec
  if (
    !sections.specAndConstraints &&
    !sections.studentReview &&
    !sections.bugLocations &&
    !sections.stepByStepGuide &&
    !sections.fullAcCode &&
    !sections.testSuiteAudit
  ) {
    sections.specAndConstraints = clean;
  }

  // Extract C++ code block from the Full AC section or entire markdown
  let acCodeOnly = "";
  const codeSource = sections.fullAcCode || clean;
  const cppBlockMatch = codeSource.match(/```(?:cpp|c\+\+|c)?\n([\s\S]*?)```/i);
  if (cppBlockMatch && cppBlockMatch[1]) {
    acCodeOnly = cppBlockMatch[1].trim();
  }

  // Extract score estimate if present
  let scoreEstimate = undefined;
  const scoreMatch = clean.match(/(?:Điểm dự kiến|Ước lượng điểm|Dự đoán|Score):\s*([^\n\r]+)/i);
  if (scoreMatch && scoreMatch[1]) {
    scoreEstimate = scoreMatch[1].trim();
  }

  return {
    rawMarkdown: clean,
    tabs: sections,
    scoreEstimate,
    acCodeOnly,
  };
}
