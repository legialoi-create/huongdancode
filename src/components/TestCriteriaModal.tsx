import React from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  FolderTree,
  Target,
  Sparkles,
  Info,
} from "lucide-react";

interface TestCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestCriteriaModal: React.FC<TestCriteriaModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Hệ Tiêu Chí Chuẩn Bộ Test Themis & CMS (Dữ Liệu Chấm HSG)
              </h3>
              <p className="text-xs text-slate-400">
                Tiêu chuẩn thẩm định đề thi & bộ test dùng trong các kỳ thi Học sinh Giỏi Tin học
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs sm:text-sm">
          {/* Intro Box */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-slate-300 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Vì sao bộ test chuẩn là linh hồn của một bài toán lập trình thi đấu?</span>
            </div>
            <p className="text-xs text-slate-300">
              Một thuật toán sai, chưa tối ưu hoặc dính tràn số chỉ có thể bị phát hiện nếu bộ test được thiết kế đủ chặt chẽ. Hệ thống thẩm định tự động theo 6 tiêu chuẩn cốt lõi sau:
            </p>
          </div>

          {/* 6 Core Criteria Cards */}
          <div className="space-y-4">
            {/* Criterion 1 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  1. Tính Đúng / Sai & Chuẩn xác (Correctness & Verifiability)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Trọng số 25%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • <strong>Test ví dụ (Sample Test):</strong> Bắt buộc phải có đúng các test ví dụ trong đề bài để học sinh đối chiếu đầu tiên.
                <br />
                • <strong>Đáp án chuẩn 100%:</strong> Kết quả đầu ra (Output) phải được sinh từ thuật toán chuẩn (AC Solution) hoặc kiểm chứng bằng 2 thuật toán độc lập (Stress Testing).
                <br />
                • <strong>Không có Output rỗng:</strong> Tuyệt đối không để sót test thiếu kết quả mong đợi.
              </p>
            </div>

            {/* Criterion 2 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  2. Có Test Đặc Biệt & Test Biên Không? (Corner & Boundary Cases)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Trọng số 25%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • <strong>Biên cận dưới cực tiểu ({"$N_{min}$"}):</strong> $N = 0$, $N = 1$, $K = 0$, mảng 1 phần tử, đồ thị 1 đỉnh. (Bắt lỗi vòng lặp không chạy, truy cập mảng rỗng `a[0]`).
                <br />
                • <strong>Biên cận trên cực đại ({"$N_{max}$"}):</strong> $N = 10^5, 10^6$ hoặc giá trị lớn nhất trong ràng buộc để ép thời gian chạy $O(N)$ và kiểm tra tràn bộ nhớ mảng.
                <br />
                • <strong>Bẫy tràn số (Integer Overflow):</strong> Test có tổng hoặc tích vượt $2 \cdot 10^9$ buộc học sinh phải dùng <code>long long</code> thay vì <code>int</code> 32-bit.
                <br />
                • <strong>Dữ liệu đặc biệt:</strong> Toàn số âm, toàn số 0, toàn các số bằng nhau, dãy số đơn điệu tăng ngặt hoặc giảm ngặt.
              </p>
            </div>

            {/* Criterion 3 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  3. Phân chia Subtask & Thang Điểm Rõ Ràng (Subtask Hierarchy)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Trọng số 15%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • <strong>Subtask 1 (30% - 40% điểm):</strong> $N$ nhỏ ($N \le 20$ hoặc $N \le 10^3$) dành cho học sinh duyệt vét cạn $O(2^N)$ hoặc $O(N^2)$.
                <br />
                • <strong>Subtask 2 (30% điểm):</strong> $N$ trung bình ($N \le 10^5$) dành cho thuật toán $O(N \log N)$ (chặt nhị phân, sắp xếp).
                <br />
                • <strong>Subtask 3 (30% - 40% điểm):</strong> $N$ tối đa ($N \le 10^6$) đòi hỏi thuật toán tối ưu $O(N)$ hoặc cấu trúc dữ liệu nâng cao (Two Pointers, DP, Segment Tree).
              </p>
            </div>

            {/* Criterion 4 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  4. Test Bẫy Logic, Anti-Greedy & Chống TLE (Robustness & Traps)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Trọng số 15%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • <strong>Chống thuật toán tham lam sai (Counter-examples):</strong> Cung cấp các ca thử mà cách suy nghĩ tham lam ngây thơ sẽ đưa ra kết quả sai.
                <br />
                • <strong>Chống Quicksort suy biến:</strong> Mảng đã sắp xếp sẵn hoặc đảo ngược khiến thuật toán sắp xếp không chọn ngẫu nhiên pivot bị thoái hóa $O(N^2)$ dính TLE.
                <br />
                • <strong>Chống băm (Hash Collision):</strong> Bẫy hàm băm bảng <code>unordered_map</code> rơi vào độ phức tạp xấu nhất $O(N)$.
              </p>
            </div>

            {/* Criterion 5 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <FolderTree className="w-4 h-4" />
                  5. Định dạng Chuẩn Themis / CMS & File I/O
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Trọng số 10%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • Cấu trúc thư mục Themis: <code>Test01/</code>, <code>Test02/</code> ... chứa đúng cặp tệp <code>TENBAI.INP</code> và <code>TENBAI.OUT</code>.
                <br />
                • Tên file viết hoa thống nhất (ví dụ: <code>MAXSUB.INP</code>).
                <br />
                • Loại bỏ khoảng trắng thừa ở cuối mỗi dòng và dùng ký tự xuống dòng chuẩn Unix <code>\n</code> để không bị lỗi Presentation Error (PE).
              </p>
            </div>

            {/* Criterion 6 */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  6. Độ Bao Phủ & Đa Dạng Dữ Liệu (Test Coverage & Volume)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Trọng số 10%
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                • Đủ số lượng test (tối thiểu 15-20 test) để học sinh không thể gian lận bằng hardcode điều kiện hoặc chạy thử ngẫu nhiên.
                <br />
                • Dữ liệu ngẫu nhiên đa dạng, phân bố đều trên toàn miền giá trị đề bài.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Hỗ trợ xuất file ZIP chuẩn Themis tương thích 100% phần mềm chấm thi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md active:scale-95"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
