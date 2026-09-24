import { ThemisTestCase, ThemisTestCriteriaReport, TestCaseCategory } from "../types";
import JSZip from "jszip";

/**
 * Automatically extracts Sample Tests from markdown / text problem description.
 */
export function extractSampleTestsFromProblem(problemText: string): ThemisTestCase[] {
  if (!problemText) return [];

  const tests: ThemisTestCase[] = [];
  const lines = problemText.split("\n");

  let currentInput: string[] = [];
  let currentOutput: string[] = [];
  let mode: "none" | "input" | "output" = "none";
  let sampleCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    // Detect Input header
    if (
      lower.startsWith("ví dụ:") ||
      lower.startsWith("ví dụ 1:") ||
      lower.startsWith("ví dụ 2:") ||
      lower.startsWith("input:") ||
      lower.startsWith("dữ liệu vào:") ||
      lower.includes("input:")
    ) {
      if (currentInput.length > 0 && currentOutput.length > 0) {
        tests.push({
          id: `sample-${Date.now()}-${sampleCount}`,
          name: `Test ${sampleCount.toString().padStart(2, "0")} (Mẫu đề bài)`,
          category: "sample",
          input: currentInput.join("\n").trim(),
          expectedOutput: currentOutput.join("\n").trim(),
          description: "Test ví dụ được trích xuất từ đề bài",
          subtask: 1,
          points: 10,
        });
        sampleCount++;
        currentInput = [];
        currentOutput = [];
      }

      if (lower.startsWith("input:") || lower.includes("input:")) {
        mode = "input";
        const afterColon = line.split(/input:/i)[1]?.trim();
        if (afterColon) currentInput.push(afterColon);
        continue;
      }
    }

    // Detect Output header
    if (
      lower.startsWith("output:") ||
      lower.startsWith("dữ liệu ra:") ||
      lower.includes("output:")
    ) {
      mode = "output";
      const afterColon = line.split(/output:/i)[1]?.trim();
      if (afterColon) {
        // Strip explanations like (Đoạn chọn là [4, -1, 5] ...)
        const cleanVal = afterColon.split("(")[0].trim();
        currentOutput.push(cleanVal);
      }
      continue;
    }

    if (mode === "input") {
      if (line.startsWith("```")) continue;
      if (line.length === 0) continue;
      currentInput.push(lines[i]);
    } else if (mode === "output") {
      if (line.startsWith("```")) {
        mode = "none";
        continue;
      }
      if (line.length === 0 && currentOutput.length > 0) {
        mode = "none";
        continue;
      }
      const cleanVal = line.split("(")[0].trim();
      if (cleanVal) currentOutput.push(cleanVal);
    }
  }

  // Push last sample if found
  if (currentInput.length > 0 && currentOutput.length > 0) {
    tests.push({
      id: `sample-${Date.now()}-${sampleCount}`,
      name: `Test ${sampleCount.toString().padStart(2, "0")} (Mẫu đề bài)`,
      category: "sample",
      input: currentInput.join("\n").trim(),
      expectedOutput: currentOutput.join("\n").trim(),
      description: "Test ví dụ được trích xuất từ đề bài",
      subtask: 1,
      points: 10,
    });
  }

  return tests;
}

/**
 * Parse raw text containing testcases into ThemisTestCase array.
 * Supports patterns:
 * === TEST 01 === or === TEST 1 (Mẫu) ===
 * [Input]
 * ...
 * --- OUTPUT --- or [Output]
 * ...
 */
export function parseRawThemisText(rawText: string): ThemisTestCase[] {
  if (!rawText.trim()) return [];

  const tests: ThemisTestCase[] = [];
  const testBlocks = rawText.split(/(?:={3,}|#{3,})\s*TEST\s*(\d+)?\s*(?:\(([^)]+)\))?\s*(?:={3,}|#{3,})/i);

  if (testBlocks.length > 1) {
    // Structured format
    let testIndex = 1;
    for (let i = 1; i < testBlocks.length; i += 3) {
      const explicitNum = testBlocks[i] ? parseInt(testBlocks[i]) : testIndex;
      const explicitCategory = (testBlocks[i + 1] || "").trim();
      const content = (testBlocks[i + 2] || "").trim();

      const ioSplit = content.split(/(?:---|===|###)\s*(?:OUTPUT|OUT|ĐÁP ÁN|RA)\s*(?:---|===|###)/i);
      const input = (ioSplit[0] || "").trim();
      const output = (ioSplit[1] || "").trim();

      let category: TestCaseCategory = "random";
      const catLower = explicitCategory.toLowerCase();
      if (catLower.includes("mẫu") || catLower.includes("sample")) category = "sample";
      else if (catLower.includes("biên") || catLower.includes("boundary")) category = "boundary";
      else if (catLower.includes("đặc biệt") || catLower.includes("special")) category = "special";
      else if (catLower.includes("tràn") || catLower.includes("overflow")) category = "overflow";
      else if (catLower.includes("bẫy") || catLower.includes("anti")) category = "anti_hack";
      else if (catLower.includes("sub 1") || catLower.includes("subtask 1")) category = "subtask1";
      else if (catLower.includes("sub 2") || catLower.includes("subtask 2")) category = "subtask2";
      else if (catLower.includes("sub 3") || catLower.includes("subtask 3")) category = "subtask3";

      tests.push({
        id: `parsed-${Date.now()}-${explicitNum}`,
        name: `Test ${explicitNum.toString().padStart(2, "0")}${explicitCategory ? ` (${explicitCategory})` : ""}`,
        category,
        input,
        expectedOutput: output,
        description: explicitCategory || `Testcase số ${explicitNum}`,
        points: 5,
      });

      testIndex++;
    }
  } else {
    // Simple fallback: If input and output are separated by --- or user just pasted one test
    const parts = rawText.split(/(?:---|===)\s*(?:OUTPUT|OUT)\s*(?:---|===)/i);
    if (parts.length >= 2) {
      tests.push({
        id: `raw-${Date.now()}-1`,
        name: "Test 01",
        category: "boundary",
        input: parts[0].trim(),
        expectedOutput: parts[1].trim(),
        description: "Test nạp từ văn bản trực tiếp",
        points: 10,
      });
    } else {
      // Just single input block
      tests.push({
        id: `raw-${Date.now()}-1`,
        name: "Test 01",
        category: "sample",
        input: rawText.trim(),
        expectedOutput: "",
        description: "Dữ liệu vào (Input)",
        points: 10,
      });
    }
  }

  return tests;
}

/**
 * Format ThemisTestCase[] back into editable raw string.
 */
export function formatTestCasesToRaw(tests: ThemisTestCase[]): string {
  return tests
    .map((t, idx) => {
      const catLabel =
        t.category === "sample"
          ? "Mẫu đề bài"
          : t.category === "boundary"
          ? "Test biên N min/max"
          : t.category === "special"
          ? "Test đặc biệt"
          : t.category === "overflow"
          ? "Tràn số 64-bit"
          : t.category === "anti_hack"
          ? "Bẫy logic / Anti-hack"
          : t.category === "subtask1"
          ? "Subtask 1"
          : t.category === "subtask2"
          ? "Subtask 2"
          : t.category === "subtask3"
          ? "Subtask 3"
          : "Ngẫu nhiên";

      return `=== TEST ${(idx + 1).toString().padStart(2, "0")} (${catLabel}) ===\n${t.input}\n--- OUTPUT ---\n${t.expectedOutput}`;
    })
    .join("\n\n");
}

/**
 * Deep Criteria Evaluator:
 * Evaluates the 6 Core Themis Test Suite Criteria.
 * 1. Đúng / Sai (Correctness & Verifiability)
 * 2. Test Đặc biệt & Test Biên (Corner & Boundary Cases)
 * 3. Phân chia Subtask & Thang điểm (Subtask Grading)
 * 4. Test Bẫy Logic & Anti-Hack / Chống TLE (Robustness & Trap cases)
 * 5. Định dạng Chuẩn Themis / CMS & File I/O
 * 6. Độ bao phủ & Đa dạng dữ liệu (Coverage & Quantity)
 */
export function evaluateTestCriteria(
  tests: ThemisTestCase[],
  problemCodeName: string = "BAI"
): ThemisTestCriteriaReport {
  const total = tests.length;
  const missingEdgeCases: string[] = [];
  const recommendations: string[] = [];

  // --- 1. CRITERION 1: ĐÚNG / SAI & CHUẨN XÁC ---
  let correctnessScore = 0;
  const correctnessDetails: string[] = [];
  const hasSample = tests.some((t) => t.category === "sample" || t.name.toLowerCase().includes("mẫu"));
  const allHaveOutput = total > 0 && tests.every((t) => t.expectedOutput.trim().length > 0);
  const allHaveInput = total > 0 && tests.every((t) => t.input.trim().length > 0);

  // Thống kê số test hợp lệ (có đủ input & expected output)
  const validCount = tests.filter(
    (t) => t.input.trim().length > 0 && t.expectedOutput.trim().length > 0
  ).length;

  // Thống kê số test đã chấm đạt nếu có trạng thái test
  const testedCount = tests.filter((t) => t.status && t.status !== "untested").length;
  const passedCount = tests.filter((t) => t.status === "pass").length;

  if (total === 0) {
    correctnessDetails.push("Chưa có testcase nào trong bộ test (0/0 test).");
  } else {
    // Chốt rõ ràng số test đúng/hợp lệ trên tổng số test
    if (validCount === total) {
      correctnessDetails.push(`🎯 Chốt kết quả: Đúng ${validCount}/${total} test chuẩn xác (100% testcase hợp lệ sẵn sàng chấm thi).`);
    } else {
      correctnessDetails.push(`⚠️ Chốt kết quả: Đúng ${validCount}/${total} test (${Math.round((validCount / total) * 100)}% - còn ${total - validCount} test thiếu đáp án hoặc input rỗng).`);
    }

    if (testedCount > 0) {
      correctnessDetails.push(`⚡ Chốt kết quả chấm bài: Đạt ${passedCount}/${total} test (${Math.round((passedCount / total) * 100)}% số điểm).`);
    }

    if (hasSample) {
      correctnessScore += 40;
      correctnessDetails.push("✓ Đã có test ví dụ (Sample Test) khớp với đề bài.");
    } else {
      correctnessDetails.push("⚠️ Thiếu test ví dụ (Sample) từ đề bài để học sinh đối chiếu kết quả đầu tiên.");
      recommendations.push("Thêm ít nhất 1-2 test ví dụ (Sample Test) khớp 100% với ví dụ trong đề bài.");
    }

    if (allHaveOutput) {
      correctnessScore += 40;
      correctnessDetails.push(`✓ 100% (${validCount}/${total}) testcase có đầy đủ đáp án chuẩn (Expected Output).`);
    } else {
      const missingCount = tests.filter((t) => !t.expectedOutput.trim()).length;
      correctnessDetails.push(`⚠️ Có ${missingCount}/${total} testcase chưa có đáp án ngõ ra (Output rỗng).`);
      recommendations.push("Cần sinh hoặc nhập đầy đủ đáp án ngõ ra (Expected Output) cho toàn bộ các test.");
    }

    if (allHaveInput) {
      correctnessScore += 20;
      correctnessDetails.push(`✓ Dữ liệu vào (Input) hợp lệ cho cả ${total}/${total} test, không bị rỗng.`);
    }
  }

  // --- 2. CRITERION 2: TEST ĐẶC BIỆT & TEST BIÊN ---
  let boundaryScore = 0;
  const boundaryDetails: string[] = [];
  
  // Check for N_min (1 or 0)
  const hasMinBoundary = tests.some((t) => {
    const lines = t.input.trim().split("\n");
    const firstTokens = lines[0]?.trim().split(/\s+/) || [];
    return (
      firstTokens.includes("0") ||
      firstTokens.includes("1") ||
      t.input.trim() === "0" ||
      t.input.trim() === "1" ||
      t.category === "boundary"
    );
  });

  // Check for large boundary (N >= 1000 or values >= 10^5)
  const hasMaxBoundary = tests.some((t) => {
    return (
      t.input.includes("100000") ||
      t.input.includes("1000000") ||
      t.input.length > 500 ||
      t.category === "boundary" ||
      t.category === "subtask3"
    );
  });

  // Check for negative numbers or zero
  const hasNegative = tests.some((t) => t.input.includes("-"));
  const hasZero = tests.some((t) => /\b0\b/.test(t.input));

  // Check for potential 32-bit overflow (numbers > 2*10^9 or values like 10^9 producing sum/product > 2*10^9)
  const hasOverflowTest = tests.some((t) => {
    return (
      t.category === "overflow" ||
      t.name.toLowerCase().includes("tràn") ||
      t.name.toLowerCase().includes("overflow") ||
      t.input.includes("1000000000") ||
      t.input.includes("2000000000") ||
      t.expectedOutput.length > 10 // result > 10 digits
    );
  });

  // Check special cases (all equal, single element)
  const hasSpecial = tests.some((t) => t.category === "special" || t.name.toLowerCase().includes("đặc biệt"));

  if (hasMinBoundary) {
    boundaryScore += 20;
    boundaryDetails.push("✓ Có test cận dưới cực tiểu ($N=0, 1$ hoặc mảng 1 phần tử).");
  } else {
    boundaryDetails.push("⚠️ Thiếu test biên cận dưới cực tiểu ($N=1, N=0$).");
    missingEdgeCases.push("Test biên cực tiểu: $N=1, N=0$ để bắt lỗi khởi tạo mảng, vòng lặp for không chạy.");
  }

  if (hasMaxBoundary) {
    boundaryScore += 25;
    boundaryDetails.push("✓ Có test cận trên cực đại ($N_{max} = 10^5 - 10^6$) kiểm thử TLE & bộ nhớ.");
  } else {
    boundaryDetails.push("⚠️ Thiếu test cận trên cực đại ($N_{max}$) để ép thời gian chạy và kiểm tra tràn mảng.");
    missingEdgeCases.push("Test cực đại: $N = N_{max}$ ($10^5 - 10^6$) dữ liệu lớn để kiểm tra TLE.");
  }

  if (hasNegative || hasZero) {
    boundaryScore += 20;
    boundaryDetails.push("✓ Có test chứa số âm ($-$) hoặc số 0 để kiểm tra thuật toán cực trị.");
  } else {
    boundaryDetails.push("⚠️ Chưa phát hiện test có số âm hoặc giá trị 0.");
    missingEdgeCases.push("Test số âm: Mảng toàn số âm hoặc đan dấu để bắt lỗi gán `ans = 0` thay vì `-INF`.");
  }

  if (hasOverflowTest) {
    boundaryScore += 25;
    boundaryDetails.push("✓ Có test kiểm tra bẫy tràn số 32-bit (buộc dùng `long long` 64-bit).");
  } else {
    boundaryDetails.push("⚠️ Thiếu test bẫy tràn số int 32-bit (kết quả vượt $2 \\cdot 10^9$).");
    missingEdgeCases.push("Test tràn số: Dữ liệu cực trị cho kết quả vượt $2 \\cdot 10^9$ để trừ điểm code dùng `int`.");
  }

  if (hasSpecial) {
    boundaryScore += 10;
    boundaryDetails.push("✓ Có test trường hợp đặc biệt (các phần tử bằng nhau, mảng đối xứng).");
  }

  // --- 3. CRITERION 3: PHÂN CHIA SUBTASK & THANG ĐIỂM ---
  let subtaskScore = 0;
  const subtaskDetails: string[] = [];
  const subtasksPresent = new Set<number>();
  tests.forEach((t) => {
    if (t.subtask) subtasksPresent.add(t.subtask);
    if (t.category === "subtask1") subtasksPresent.add(1);
    if (t.category === "subtask2") subtasksPresent.add(2);
    if (t.category === "subtask3") subtasksPresent.add(3);
  });

  if (subtasksPresent.size >= 3) {
    subtaskScore = 100;
    subtaskDetails.push("✓ Phân bố đầy đủ 3 Subtask: Sub 1 (vét cạn), Sub 2 (trung gian), Sub 3 (tối ưu toàn diện).");
  } else if (subtasksPresent.size === 2) {
    subtaskScore = 75;
    subtaskDetails.push("✓ Phân chia 2 Subtask (chia thang điểm nhỏ và lớn).");
  } else if (total >= 10) {
    subtaskScore = 60;
    subtaskDetails.push("ℹ️ Số lượng test tương đối nhưng chưa gán nhãn phân cấp Subtask rõ ràng.");
    recommendations.push("Nên phân chia các test thành các Subtask (30% điểm vét cạn, 70% điểm tối ưu).");
  } else {
    subtaskScore = 30;
    subtaskDetails.push("⚠️ Chưa phân chia Subtask theo quy chuẩn thi HSG.");
  }

  // --- 4. CRITERION 4: TEST BẪY LOGIC, ANTI-HACK & CHỐNG TLE ---
  let trapScore = 0;
  const trapDetails: string[] = [];
  const hasAntiHack = tests.some(
    (t) =>
      t.category === "anti_hack" ||
      t.name.toLowerCase().includes("bẫy") ||
      t.name.toLowerCase().includes("anti") ||
      t.name.toLowerCase().includes("quicksort")
  );

  if (hasAntiHack) {
    trapScore = 100;
    trapDetails.push("✓ Có test bẫy logic (Anti-greedy, chống Quicksort suy biến, mảng đã sắp xếp ngược).");
  } else if (total >= 12) {
    trapScore = 65;
    trapDetails.push("ℹ️ Bộ test có kích thước khá, nên bổ sung thêm 1-2 test phản ví dụ cho thuật toán tham lam sai.");
    recommendations.push("Thêm test bẫy: Phản ví dụ cho thuật toán tham lam ngây thơ hoặc mảng sắp xếp ngược.");
  } else {
    trapScore = 35;
    trapDetails.push("⚠️ Chưa có test bẫy (Anti-hack) để chặn các thuật toán tham lam sai hoặc ngẫu nhiên.");
    missingEdgeCases.push("Test bẫy Anti-hack: Dữ liệu bẫy thuật tham lam ngây thơ (Counter-example).");
  }

  // --- 5. CRITERION 5: ĐỊNH DẠNG CHUẨN THEMIS / CMS & FILE I/O ---
  let formatScore = 100;
  const formatDetails: string[] = [];
  const hasWhitespaceBug = tests.some((t) => /[ \t]+$/.test(t.input) || /[ \t]+$/.test(t.expectedOutput));
  const hasCleanNewlines = tests.every((t) => !t.input.includes("\r\n") && !t.expectedOutput.includes("\r\n"));

  formatDetails.push(`✓ Quy chuẩn tên file: ${problemCodeName.toUpperCase()}.INP & ${problemCodeName.toUpperCase()}.OUT.`);
  if (hasWhitespaceBug) {
    formatScore -= 20;
    formatDetails.push("⚠️ Phát hiện có ký tự khoảng trắng thừa (trailing spaces) ở cuối dòng trong một số test.");
    recommendations.push("Xóa khoảng trắng thừa ở cuối các dòng để tránh lỗi Presentation Error (PE) trên Themis.");
  } else {
    formatDetails.push("✓ Không có khoảng trắng rác ở cuối dòng.");
  }

  if (hasCleanNewlines) {
    formatDetails.push("✓ Chuẩn hóa xuống dòng ký tự LF (\\n) mượt mà trên cả Linux/Windows.");
  }

  // --- 6. CRITERION 6: ĐỘ BAO PHỦ & ĐA DẠNG DỮ LIỆU ---
  let coverageScore = 0;
  const coverageDetails: string[] = [];

  if (total >= 20) {
    coverageScore = 100;
    coverageDetails.push(`✓ Bộ test lớn với ${total} testcase (đạt chuẩn tuyệt đối đề thi HSG Quốc gia/Tỉnh).`);
  } else if (total >= 12) {
    coverageScore = 85;
    coverageDetails.push(`✓ Bộ test gồm ${total} testcase (đạt chuẩn đề thi HSG cấp Trường/Tỉnh cơ bản).`);
  } else if (total >= 6) {
    coverageScore = 60;
    coverageDetails.push(`ℹ️ Có ${total} testcase (đủ kiểm thử sơ bộ, nên mở rộng lên 12-20 test).`);
    recommendations.push("Mở rộng bộ test lên ít nhất 15-20 testcase để bao phủ toàn bộ các góc khuất.");
  } else {
    coverageScore = 30;
    coverageDetails.push(`⚠️ Số lượng test hiện tại quá ít (${total} testcase), dễ bị học sinh mò test hoặc hardcode.`);
    recommendations.push("Số lượng test tối thiểu cho 1 bài thi Themis nên từ 10 đến 20 test.");
  }

  // OVERALL WEIGHTED CALCULATION
  // Correctness: 25%, Boundary & Special: 25%, Subtask: 15%, Trap/Anti-hack: 15%, Format: 10%, Coverage: 10%
  const overallScore = Math.round(
    correctnessScore * 0.25 +
    boundaryScore * 0.25 +
    subtaskScore * 0.15 +
    trapScore * 0.15 +
    formatScore * 0.10 +
    coverageScore * 0.10
  );

  let rating: ThemisTestCriteriaReport["rating"] = "Chưa đạt chuẩn";
  if (overallScore >= 88) rating = "Xuất sắc";
  else if (overallScore >= 72) rating = "Đạt chuẩn Themis";
  else if (overallScore >= 50) rating = "Cần bổ sung test";

  return {
    overallScore,
    rating,
    totalTests: total,
    validTestsCount: validCount,
    passedTestsCount: passedCount,
    criteria: {
      correctness: {
        name: "1. Tính Đúng / Sai & Chuẩn xác (Correctness)",
        score: correctnessScore,
        status: correctnessScore >= 80 ? "pass" : correctnessScore >= 50 ? "warning" : "fail",
        summary: hasSample && allHaveOutput ? "Đáp án chuẩn xác, có test ví dụ" : "Cần bổ sung đáp án chuẩn",
        details: correctnessDetails,
      },
      boundaryAndSpecial: {
        name: "2. Test Đặc biệt & Test Biên (Corner & Boundary)",
        score: boundaryScore,
        status: boundaryScore >= 75 ? "pass" : boundaryScore >= 45 ? "warning" : "fail",
        summary: `${boundaryScore}% - ${hasMinBoundary ? "Đã có N_min" : "Thiếu N_min"}, ${hasOverflowTest ? "Đã có bẫy tràn số" : "Thiếu bẫy tràn số"}`,
        details: boundaryDetails,
      },
      subtaskDivision: {
        name: "3. Phân chia Subtask & Thang điểm (Subtasks)",
        score: subtaskScore,
        status: subtaskScore >= 75 ? "pass" : subtaskScore >= 50 ? "warning" : "fail",
        summary: subtasksPresent.size >= 2 ? `Đã phân chia ${subtasksPresent.size} Subtask` : "Chưa chia Subtask rõ ràng",
        details: subtaskDetails,
      },
      trapsAndAntiHack: {
        name: "4. Test Bẫy Logic, Anti-Greedy & Chống TLE",
        score: trapScore,
        status: trapScore >= 75 ? "pass" : trapScore >= 45 ? "warning" : "fail",
        summary: hasAntiHack ? "Đã có test bẫy chống thuật toán ngây thơ" : "Cần thêm test bẫy phản ví dụ",
        details: trapDetails,
      },
      themisFormat: {
        name: "5. Định dạng Chuẩn Themis / CMS & File I/O",
        score: formatScore,
        status: formatScore >= 85 ? "pass" : "warning",
        summary: `Tên tệp ${problemCodeName.toUpperCase()}.INP/.OUT, định dạng sạch`,
        details: formatDetails,
      },
      coverageAndDiversity: {
        name: "6. Độ Bao phủ & Đa dạng Dữ liệu (Coverage)",
        score: coverageScore,
        status: coverageScore >= 80 ? "pass" : coverageScore >= 55 ? "warning" : "fail",
        summary: `${total} testcase (Khuyến nghị 15-20 test/bài)`,
        details: coverageDetails,
      },
    },
    recommendations: Array.from(new Set(recommendations)),
    missingEdgeCases: Array.from(new Set(missingEdgeCases)),
  };
}

/**
 * Generate a complete ready-made Themis Suite covering all 6 criteria for standard problems.
 */
export function generateComprehensiveThemisSuite(
  problemCodeName: string = "MAXSUB",
  sampleInput: string = "5\n2 -3 4 -1 5",
  sampleOutput: string = "8"
): ThemisTestCase[] {
  const code = problemCodeName.toUpperCase();

  return [
    // Subtask 1: Test mẫu & Test nhỏ (30% điểm)
    {
      id: "gen-01",
      name: "Test 01 (Mẫu đề bài)",
      category: "sample",
      input: sampleInput.trim(),
      expectedOutput: sampleOutput.trim(),
      description: "Test ví dụ chính xác theo đề bài",
      subtask: 1,
      points: 10,
    },
    {
      id: "gen-02",
      name: "Test 02 (Biên N=1, số dương)",
      category: "boundary",
      input: "1\n42",
      expectedOutput: "42",
      description: "Biên cận dưới: mảng chỉ có đúng 1 phần tử dương",
      subtask: 1,
      points: 10,
    },
    {
      id: "gen-03",
      name: "Test 03 (Biên N=1, số âm)",
      category: "boundary",
      input: "1\n-99",
      expectedOutput: "-99",
      description: "Biên cận dưới: mảng có 1 phần tử âm (bẫy gán ans = 0)",
      subtask: 1,
      points: 10,
    },
    {
      id: "gen-04",
      name: "Test 04 (Đặc biệt: Toàn số âm)",
      category: "special",
      input: "5\n-8 -3 -12 -1 -5",
      expectedOutput: "-1",
      description: "Toàn bộ số âm: Bắt lỗi học sinh khởi tạo max = 0 thay vì -INF",
      subtask: 1,
      points: 10,
    },
    {
      id: "gen-05",
      name: "Test 05 (Đặc biệt: Toàn số 0 & số bằng nhau)",
      category: "special",
      input: "6\n0 0 0 0 0 0",
      expectedOutput: "0",
      description: "Tất cả phần tử bằng nhau và bằng 0",
      subtask: 1,
      points: 10,
    },

    // Subtask 2: N trung bình & Bẫy logic (30% điểm)
    {
      id: "gen-06",
      name: "Test 06 (Bẫy Anti-Greedy)",
      category: "anti_hack",
      input: "6\n100 -99 100 -99 100 -99",
      expectedOutput: "102",
      description: "Dãy đan dấu: Chặn thuật toán tham lam ngắt sớm",
      subtask: 2,
      points: 10,
    },
    {
      id: "gen-07",
      name: "Test 07 (Bẫy Quicksort: Mảng đã sắp xếp)",
      category: "anti_hack",
      input: "8\n-10 -5 -2 0 3 7 12 20",
      expectedOutput: "42",
      description: "Dãy tăng dần ngặt: Bẫy thuật toán sắp xếp chọn pivot đầu dính O(N²)",
      subtask: 2,
      points: 10,
    },
    {
      id: "gen-08",
      name: "Test 08 (Bẫy Tràn số 32-bit int -> long long)",
      category: "overflow",
      input: "4\n1000000000 1000000000 1000000000 1000000000",
      expectedOutput: "4000000000",
      description: "Tổng = 4.10^9 vượt quá 2^31 - 1: Bắt buộc dùng long long",
      subtask: 2,
      points: 10,
    },
    {
      id: "gen-09",
      name: "Test 09 (Bẫy Tràn số âm cực đại)",
      category: "overflow",
      input: "3\n-1000000000 -1000000000 -1000000000",
      expectedOutput: "-1000000000",
      description: "Cực trị âm lớn: Tránh tràn số khi khởi tạo -2e9",
      subtask: 2,
      points: 10,
    },

    // Subtask 3: N cực đại & Hiệu năng TLE (40% điểm)
    {
      id: "gen-10",
      name: "Test 10 (Subtask 3: Cận trên N=100.000)",
      category: "subtask3",
      input: `10000\n${Array.from({ length: 1000 }, () => "5 -2 3 -1 8 -10 12 4 -3 1").join(" ")}`,
      expectedOutput: "17000",
      description: "N lớn: Ép thời gian chạy, chặn thuật toán O(N²)",
      subtask: 3,
      points: 10,
    },
    {
      id: "gen-11",
      name: "Test 11 (Subtask 3: Test ngẫu nhiên phân bố đều)",
      category: "random",
      input: "20\n14 -25 36 -11 82 -90 45 12 -63 77 -8 99 -54 23 11 -7 48 -32 60 -19",
      expectedOutput: "258",
      description: "Dữ liệu ngẫu nhiên đa dạng trong khoảng [-100, 100]",
      subtask: 3,
      points: 10,
    },
    {
      id: "gen-12",
      name: "Test 12 (Subtask 3: Cực đại tối đa Full test)",
      category: "subtask3",
      input: `50000\n${Array.from({ length: 500 }, () => "1000000 -500000 800000 -200000 300000").join(" ")}`,
      expectedOutput: "700000000000",
      description: "N cực đại + Tràn số cực lớn (7.10^11): Kiểm tra toàn diện AC",
      subtask: 3,
      points: 10,
    },
  ];
}

/**
 * Creates and downloads a standard Themis .zip file:
 * - Test01/BAI.INP, Test01/BAI.OUT
 * - Test02/BAI.INP, Test02/BAI.OUT
 * ...
 */
export async function downloadThemisZip(
  tests: ThemisTestCase[],
  problemCodeName: string = "BAI"
): Promise<void> {
  const zip = new JSZip();
  const cleanCode = problemCodeName.trim().toUpperCase() || "BAI";

  tests.forEach((t, idx) => {
    const folderName = `Test${(idx + 1).toString().padStart(2, "0")}`;
    const folder = zip.folder(folderName);
    if (folder) {
      folder.file(`${cleanCode}.INP`, t.input.trim() + "\n");
      folder.file(`${cleanCode}.OUT`, t.expectedOutput.trim() + "\n");
    }
  });

  // Also include a summary meta file
  const metaText = `BỘ TEST THEMIS - BÀI: ${cleanCode}
Tổng số test: ${tests.length}
Ngày tạo: ${new Date().toLocaleDateString("vi-VN")}
Được sinh bởi Hệ thống Thẩm định & Tối ưu Thuật toán HSG Tin học.
--------------------------------------------------
Danh sách test:
${tests.map((t, idx) => `Test ${(idx + 1).toString().padStart(2, "0")}: [${t.category.toUpperCase()}] ${t.name} - ${t.description || ""}`).join("\n")}
`;
  zip.file("README_THEMIS.txt", metaText);

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Themis_Tests_${cleanCode}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
