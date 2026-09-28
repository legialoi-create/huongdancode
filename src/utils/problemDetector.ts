/**
 * Utility for detecting multiple questions/problems in a contest document (Word/PDF/Text)
 * and automatically matching the correct problem with student C++ code based on Input/Output files.
 */

export interface DetectedProblem {
  id: string;
  index: number;
  label: string; // e.g. "Bài 1", "Câu 2", "Problem 3"
  title: string; // e.g. "TỔNG NGUYÊN TỐ", "ĐẾM ĐOẠN CON"
  problemCode?: string; // e.g. "TONG", "DEM", "BAI1"
  inputFile?: string; // e.g. "TONG.INP", "BAI1.INP"
  outputFile?: string; // e.g. "TONG.OUT", "BAI1.OUT"
  timeLimit?: string;
  memoryLimit?: string;
  content: string; // text of this specific problem
}

export interface CodeIoDetection {
  inputFile?: string;
  outputFile?: string;
  problemCode?: string;
  hasFileIo: boolean;
}

/**
 * Extracts freopen file names and code name from student C++ code.
 */
export function detectCodeIo(codeText: string): CodeIoDetection {
  if (!codeText) return { hasFileIo: false };

  let inputFile: string | undefined;
  let outputFile: string | undefined;

  // Match freopen("BAI.INP", "r", stdin)
  const inpMatch = codeText.match(/freopen\s*\(\s*["']([^"']+\.(?:INP|inp|TXT|txt|in))["']\s*,\s*["']r["']\s*,\s*stdin\s*\)/i) ||
                   codeText.match(/freopen\s*\(\s*["']([^"']+\.(?:INP|inp|TXT|txt|in))["']/i);
  if (inpMatch) {
    inputFile = inpMatch[1].trim();
  }

  // Match freopen("BAI.OUT", "w", stdout)
  const outMatch = codeText.match(/freopen\s*\(\s*["']([^"']+\.(?:OUT|out|TXT|txt))["']\s*,\s*["']w["']\s*,\s*stdout\s*\)/i) ||
                    codeText.match(/freopen\s*\(\s*["']([^"']+\.(?:OUT|out|TXT|txt))["']/i);
  if (outMatch) {
    outputFile = outMatch[1].trim();
  }

  // Extract base problem code from inputFile (e.g. "DEM.INP" -> "DEM")
  let problemCode: string | undefined;
  if (inputFile) {
    problemCode = inputFile.replace(/\.[^.]+$/, "").toUpperCase();
  } else if (outputFile) {
    problemCode = outputFile.replace(/\.[^.]+$/, "").toUpperCase();
  }

  return {
    inputFile,
    outputFile,
    problemCode,
    hasFileIo: !!(inputFile || outputFile),
  };
}

/**
 * Detects whether a problem statement contains multiple questions/problems
 * and extracts individual problem metadata.
 */
export function detectProblemsInText(text: string): DetectedProblem[] {
  if (!text || text.trim().length < 40) return [];

  const cleanText = text.trim();

  // Pattern matching question headings:
  // e.g.: "Bài 1: TỔNG NGUYÊN TỐ", "BÀI 1. TỔNG DÃY", "Câu 2: ĐẾM", "Problem 3: Shortest Path", "Task 1: ..."
  const headerRegex = /(?:^|\n)\s*(?:#{1,3}\s*)?(B[àa]i\s*[0-9A-Z\.]+|C[âa]u\s*[0-9A-Z\.]+|Problem\s*[0-9A-Z\.]+|Task\s*[0-9A-Z\.]+)\s*[:\.\-–—\s]+([^\n\r]+)/gi;

  const matches: Array<{
    label: string;
    rawTitle: string;
    startIndex: number;
    headerLength: number;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cleanText)) !== null) {
    const fullMatch = m[0];
    const label = m[1].trim();
    const rawTitle = m[2].trim();
    const startIndex = m.index + (fullMatch.startsWith("\n") ? 1 : 0);

    matches.push({
      label,
      rawTitle,
      startIndex,
      headerLength: fullMatch.length,
    });
  }

  if (matches.length <= 1) {
    // Check if there are multiple "Tên file: BAI1.INP", "File: BAI2.INP" markers
    const fileIoRegex = /(?:T[êe]n\s*t[ệe]p|T[ệe]p\s*v[àa]o|T[ệe]p|File\s*input|Input\s*file|File)[\s\:\-]+([A-Za-z0-9_\-]+\.(?:INP|inp|TXT|txt))/gi;
    const fileMatches: string[] = [];
    let fm: RegExpExecArray | null;
    while ((fm = fileIoRegex.exec(cleanText)) !== null) {
      const fileName = fm[1].trim();
      if (!fileMatches.includes(fileName.toUpperCase())) {
        fileMatches.push(fileName.toUpperCase());
      }
    }

    if (fileMatches.length <= 1 && matches.length === 0) {
      return [];
    }
  }

  const detected: DetectedProblem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : cleanText.length;
    const problemContent = cleanText.slice(current.startIndex, nextStart).trim();

    // Extract input/output files inside this problem's content
    let inputFile: string | undefined;
    let outputFile: string | undefined;

    const inpMatch = problemContent.match(/(?:T[ệe]p\s*v[àa]o|File\s*input|Input\s*file|D[ữuu]\s*li[ệe]u\s*v[àa]o|File|T[ệe]p)[\s\:\-]*`?([A-Za-z0-9_\-]+\.(?:INP|inp|TXT|txt|in))`?/i);
    if (inpMatch) {
      inputFile = inpMatch[1].trim();
    }

    const outMatch = problemContent.match(/(?:T[ệe]p\s*ra|File\s*output|Output\s*file|D[ữuu]\s*li[ệe]u\s*ra|K[ếe]t\s*qu[ảa]|Output)[\s\:\-]*`?([A-Za-z0-9_\-]+\.(?:OUT|out|TXT|txt))`?/i);
    if (outMatch) {
      outputFile = outMatch[1].trim();
    }

    // Try extracting problemCode from title or file (e.g. "BÀI 1: TONG" -> "TONG")
    let problemCode = "";
    if (inputFile) {
      problemCode = inputFile.replace(/\.[^.]+$/, "").toUpperCase();
    } else {
      const titleCodeMatch = current.rawTitle.match(/^([A-Za-z0-9_]+)\b/);
      if (titleCodeMatch && titleCodeMatch[1].length >= 2) {
        problemCode = titleCodeMatch[1].toUpperCase();
      } else {
        problemCode = current.label.replace(/\s+/g, "").toUpperCase();
      }
    }

    // Clean title
    const cleanTitle = current.rawTitle
      .replace(/\s*\([^\)]*\)/g, "")
      .replace(/[\(\)\[\]\{\}]/g, "")
      .trim();

    detected.push({
      id: `prob_${i + 1}`,
      index: i + 1,
      label: current.label,
      title: cleanTitle || current.label,
      problemCode,
      inputFile,
      outputFile,
      content: problemContent,
    });
  }

  return detected;
}

/**
 * Finds the exact matching problem among detected questions based on student code, testcases, or problem code name.
 */
export function matchProblemWithCode(
  detectedProblems: DetectedProblem[],
  codeText: string,
  testCases?: Array<{ name?: string; input?: string; expectedOutput?: string }>,
  problemCodeName?: string
): DetectedProblem | null {
  if (detectedProblems.length === 0) return null;
  if (detectedProblems.length === 1) return detectedProblems[0];

  const codeIo = detectCodeIo(codeText);

  // 1. Priority 1: Match by exact input file in freopen (e.g. "DEM.INP")
  if (codeIo.inputFile) {
    const codeInpUpper = codeIo.inputFile.toUpperCase();
    const match = detectedProblems.find(
      (p) =>
        p.inputFile?.toUpperCase() === codeInpUpper ||
        p.content.toUpperCase().includes(codeInpUpper) ||
        (p.problemCode && codeInpUpper.startsWith(p.problemCode))
    );
    if (match) return match;
  }

  // 2. Priority 2: Match by exact output file in freopen (e.g. "DEM.OUT")
  if (codeIo.outputFile) {
    const codeOutUpper = codeIo.outputFile.toUpperCase();
    const match = detectedProblems.find(
      (p) =>
        p.outputFile?.toUpperCase() === codeOutUpper ||
        p.content.toUpperCase().includes(codeOutUpper)
    );
    if (match) return match;
  }

  // 3. Priority 3: Match by explicit problem code name (e.g. "DEM")
  const targetCode = (problemCodeName || codeIo.problemCode || "").toUpperCase().trim();
  if (targetCode) {
    const match = detectedProblems.find(
      (p) =>
        p.problemCode?.toUpperCase() === targetCode ||
        p.label.toUpperCase().replace(/\s+/g, "") === targetCode ||
        p.title.toUpperCase().includes(targetCode) ||
        p.content.toUpperCase().includes(targetCode)
    );
    if (match) return match;
  }

  // 4. Priority 4: Match by testcase names or content
  if (testCases && testCases.length > 0) {
    for (const tc of testCases) {
      if (tc.name) {
        const tcNameUpper = tc.name.toUpperCase();
        const match = detectedProblems.find((p) =>
          p.problemCode && tcNameUpper.includes(p.problemCode.toUpperCase())
        );
        if (match) return match;
      }
    }
  }

  // Default to first problem if no explicit match found
  return detectedProblems[0];
}
