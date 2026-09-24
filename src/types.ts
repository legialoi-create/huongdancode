export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  previewUrl?: string;
  extractedText?: string;
}

export type TestCaseCategory =
  | "sample" // Test ví dụ trong đề
  | "boundary" // Test biên N=1, N=0, N_max
  | "special" // Test đặc biệt: số âm, 0, xâu rỗng, mảng bằng nhau
  | "overflow" // Test tràn số 32-bit (vượt 2*10^9)
  | "anti_hack" // Test bẫy tham lam / bẫy TLE / Quicksort suy biến
  | "subtask1" // Subtask 1 (vét cạn)
  | "subtask2" // Subtask 2 (thuật toán trung bình)
  | "subtask3" // Subtask 3 (tối ưu toàn diện)
  | "random"; // Test ngẫu nhiên phân bố đều

export interface ThemisTestCase {
  id: string;
  name: string;
  category: TestCaseCategory;
  input: string;
  expectedOutput: string;
  description?: string;
  subtask?: number;
  points?: number;
  status?: "untested" | "pass" | "wa" | "tle";
}

export interface ThemisTestCriteriaItem {
  name: string;
  score: number; // 0 - 100
  status: "pass" | "warning" | "fail";
  summary: string;
  details: string[];
}

export interface ThemisTestCriteriaReport {
  overallScore: number; // 0 - 100
  rating: "Xuất sắc" | "Đạt chuẩn Themis" | "Cần bổ sung test" | "Chưa đạt chuẩn";
  totalTests: number;
  validTestsCount: number; // Number of tests with valid input & expected output
  passedTestsCount?: number; // Number of tests with pass status
  criteria: {
    correctness: ThemisTestCriteriaItem;
    boundaryAndSpecial: ThemisTestCriteriaItem;
    subtaskDivision: ThemisTestCriteriaItem;
    trapsAndAntiHack: ThemisTestCriteriaItem;
    themisFormat: ThemisTestCriteriaItem;
    coverageAndDiversity: ThemisTestCriteriaItem;
  };
  recommendations: string[];
  missingEdgeCases: string[];
}

export interface SampleProblem {
  id: string;
  title: string;
  category: string;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  timeLimit: string;
  memoryLimit: string;
  problemStatement: string;
  studentCode: string;
  flawSummary: string;
  problemCodeName?: string; // e.g. "MAXSUB"
  testCases?: ThemisTestCase[];
}

export interface ParsedAnalysis {
  section1_Overview: string;
  section2_Flaws: string;
  section3_Guide: string;
  section4_FullAcCode: string;
  section5_TestSuiteEvaluation?: string;
  rawMarkdown: string;
  detectedTags: string[];
  estimatedScore?: string;
  acCodeOnly?: string;
  isMismatch?: boolean;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  fontSize: "sm" | "base" | "lg";
}

