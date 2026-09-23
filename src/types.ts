export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  previewUrl?: string;
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
}

export interface ParsedAnalysis {
  section1_Overview: string;
  section2_Flaws: string;
  section3_Guide: string;
  section4_FullAcCode: string;
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
