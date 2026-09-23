import { SampleProblem } from "../types";

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  {
    id: "max-subarray-sum",
    title: "Tổng dãy con liên tiếp lớn nhất (MAXSUB)",
    category: "Quy hoạch động / Thuật toán Kadane",
    difficulty: "Trung bình",
    timeLimit: "1.0s",
    memoryLimit: "256MB",
    flawSummary: "Dính TLE do thuật toán O(N²), dính WA do tràn kiểu int (cần long long), lạm dụng endl.",
    problemStatement: `Cho dãy số nguyên $A = (A_1, A_2, \\dots, A_N)$ gồm $N$ phần tử.
Một dãy con liên tiếp của $A$ được định nghĩa là một đoạn $A[i \\dots j] = (A_i, A_{i+1}, \\dots, A_j)$ với $1 \\le i \\le j \\le N$.

Yêu cầu: Hãy tìm tổng lớn nhất của một dãy con liên tiếp có ít nhất 1 phần tử.

Dữ liệu vào (stdin):
- Dòng đầu tiên chứa số nguyên dương $N$ ($1 \\le N \\le 10^6$).
- Dòng thứ hai chứa $N$ số nguyên $A_1, A_2, \\dots, A_N$ ($-10^9 \\le A_i \\le 10^9$).

Dữ liệu ra (stdout):
- In ra một số nguyên duy nhất là tổng lớn nhất tìm được.

Ràng buộc subtask:
- Subtask 1 (30% số điểm): $N \\le 10^3$.
- Subtask 2 (70% số điểm): $N \\le 10^6$.

Ví dụ:
Input:
5
2 -3 4 -1 5

Output:
8 (Đoạn chọn là [4, -1, 5] có tổng = 8)`,
    studentCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }

    // Thuật toán duyệt mọi cặp (i, j)
    int max_sum = -1e9;
    for (int i = 0; i < n; i++) {
        int cur_sum = 0;
        for (int j = i; j < n; j++) {
            cur_sum += a[j];
            if (cur_sum > max_sum) {
                max_sum = cur_sum;
            }
        }
    }

    cout << max_sum << endl;
    return 0;
}`,
  },
  {
    id: "prime-queries",
    title: "Truy vấn số nguyên tố (PRIMEQUERY)",
    category: "Số học / Sàng Eratosthenes",
    difficulty: "Dễ",
    timeLimit: "1.5s",
    memoryLimit: "256MB",
    flawSummary: "Dính TLE do kiểm tra nguyên tố O(sqrt(N)) từng truy vấn thay vì tiền xử lý Sàng Eratosthenes O(M log log M).",
    problemStatement: `Cho $Q$ truy vấn, mỗi truy vấn yêu cầu kiểm tra xem số nguyên $X$ có phải là số nguyên tố hay không.

Dữ liệu vào:
- Dòng đầu chứa số $Q$ ($1 \\le Q \\le 2 \\cdot 10^5$).
- $Q$ dòng tiếp theo, mỗi dòng chứa một số nguyên $X$ ($0 \\le X \\le 10^7$).

Dữ liệu ra:
- Với mỗi truy vấn, in ra "YES" nếu $X$ là số nguyên tố, ngược lại in ra "NO".

Ràng buộc:
- Subtask 1 (40% điểm): $Q \\le 10^3, X \\le 10^5$.
- Subtask 2 (60% điểm): $Q \\le 2 \\cdot 10^5, X \\le 10^7$.`,
    studentCode: `#include <iostream>
using namespace std;

bool checkPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int q;
    cin >> q;
    while (q--) {
        int x;
        cin >> x;
        if (checkPrime(x)) {
            cout << "YES" << endl;
        } else {
            cout << "NO" << endl;
        }
    }
    return 0;
}`,
  },
  {
    id: "two-sum-target",
    title: "Cặp số có tổng bằng K (TWOSUM)",
    category: "Hai con trỏ / Binary Search / Hash Map",
    difficulty: "Trung bình",
    timeLimit: "1.0s",
    memoryLimit: "256MB",
    flawSummary: "Duyệt trâu O(N²) với N = 2*10⁵ bị TLE nặng; thiếu cin.tie(0) và tối ưu I/O.",
    problemStatement: `Cho mảng gồm $N$ số nguyên và một số nguyên $K$.
Hãy đếm số cặp chỉ số $(i, j)$ với $1 \\le i < j \\le N$ sao cho $A_i + A_j = K$.

Dữ liệu vào:
- Dòng 1 chứa hai số nguyên $N, K$ ($1 \\le N \\le 2 \\cdot 10^5, -10^9 \\le K \\le 10^9$).
- Dòng 2 chứa $N$ số nguyên $A_1, A_2, \\dots, A_N$ ($-10^9 \\le A_i \\le 10^9$).

Dữ liệu ra:
- In ra một số nguyên duy nhất là số cặp thỏa mãn. Chú ý số lượng cặp có thể lên tới $N(N-1)/2 \\approx 2 \\cdot 10^{10}$, cần dùng kiểu dữ liệu phù hợp.`,
    studentCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }

    int count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (a[i] + a[j] == k) {
                count++;
            }
        }
    }

    cout << count << endl;
    return 0;
}`,
  },
];
