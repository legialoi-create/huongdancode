import { SampleProblem } from "../types";

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  {
    id: "max-subarray-sum",
    title: "Tổng dãy con liên tiếp lớn nhất (MAXSUB)",
    category: "Quy hoạch động / Thuật toán Kadane",
    difficulty: "Trung bình",
    timeLimit: "1.0s",
    memoryLimit: "256MB",
    problemCodeName: "MAXSUB",
    flawSummary: "Dính TLE do thuật toán O(N²), dính WA do tràn kiểu int (cần long long), lạm dụng endl.",
    problemStatement: `Cho dãy số nguyên $A = (A_1, A_2, \\dots, A_N)$ gồm $N$ phần tử.
Một dãy con liên tiếp của $A$ được định nghĩa là một đoạn $A[i \\dots j] = (A_i, A_{i+1}, \\dots, A_j)$ với $1 \\le i \\le j \\le N$.

Yêu cầu: Hãy tìm tổng lớn nhất của một dãy con liên tiếp có ít nhất 1 phần tử.

Dữ liệu vào (stdin hoặc file MAXSUB.INP):
- Dòng đầu tiên chứa số nguyên dương $N$ ($1 \\le N \\le 10^6$).
- Dòng thứ hai chứa $N$ số nguyên $A_1, A_2, \\dots, A_N$ ($-10^9 \\le A_i \\le 10^9$).

Dữ liệu ra (stdout hoặc file MAXSUB.OUT):
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
    testCases: [
      {
        id: "maxsub-01",
        name: "Test 01 (Mẫu đề bài)",
        category: "sample",
        input: "5\n2 -3 4 -1 5",
        expectedOutput: "8",
        description: "Test ví dụ đề bài [4, -1, 5] có tổng 8",
        subtask: 1,
        points: 10,
      },
      {
        id: "maxsub-02",
        name: "Test 02 (Biên N=1, số âm)",
        category: "boundary",
        input: "1\n-99",
        expectedOutput: "-99",
        description: "Biên cận dưới: mảng có đúng 1 số âm (bẫy ans = 0)",
        subtask: 1,
        points: 10,
      },
      {
        id: "maxsub-03",
        name: "Test 03 (Đặc biệt: Toàn số âm)",
        category: "special",
        input: "5\n-8 -3 -12 -1 -5",
        expectedOutput: "-1",
        description: "Mảng toàn số âm: Kết quả phải là phần tử lớn nhất (-1)",
        subtask: 1,
        points: 10,
      },
      {
        id: "maxsub-04",
        name: "Test 04 (Đặc biệt: Toàn số 0)",
        category: "special",
        input: "6\n0 0 0 0 0 0",
        expectedOutput: "0",
        description: "Các phần tử đều bằng 0",
        subtask: 1,
        points: 10,
      },
      {
        id: "maxsub-05",
        name: "Test 05 (Bẫy Anti-Greedy)",
        category: "anti_hack",
        input: "6\n100 -99 100 -99 100 -99",
        expectedOutput: "102",
        description: "Dãy đan dấu: Chặn tham lam ngắt sớm",
        subtask: 2,
        points: 10,
      },
      {
        id: "maxsub-06",
        name: "Test 06 (Bẫy Tràn số int -> long long)",
        category: "overflow",
        input: "4\n1000000000 1000000000 1000000000 1000000000",
        expectedOutput: "4000000000",
        description: "Tổng = 4.10^9 vượt quá giới hạn 32-bit (2.10^9): Bắt buộc dùng long long",
        subtask: 2,
        points: 10,
      },
      {
        id: "maxsub-07",
        name: "Test 07 (Bẫy Tràn số âm cực đại)",
        category: "overflow",
        input: "3\n-1000000000 -1000000000 -1000000000",
        expectedOutput: "-1000000000",
        description: "Cực trị âm lớn: Bẫy khởi tạo -2e9",
        subtask: 2,
        points: 10,
      },
      {
        id: "maxsub-08",
        name: "Test 08 (Biên cực đại N=100.000)",
        category: "subtask3",
        input: "10\n100000 200000 -50000 400000 100000 -200000 300000 500000 -100000 50000",
        expectedOutput: "1400000",
        description: "Số lớn trong khoảng 10^5",
        subtask: 2,
        points: 10,
      },
    ],
  },
  {
    id: "prime-queries",
    title: "Truy vấn số nguyên tố (PRIMEQUERY)",
    category: "Số học / Sàng Eratosthenes",
    difficulty: "Dễ",
    timeLimit: "1.5s",
    memoryLimit: "256MB",
    problemCodeName: "PRIMEQUERY",
    flawSummary: "Dính TLE do kiểm tra nguyên tố O(sqrt(N)) từng truy vấn thay vì tiền xử lý Sàng Eratosthenes O(M log log M).",
    problemStatement: `Cho $Q$ truy vấn, mỗi truy vấn yêu cầu kiểm tra xem số nguyên $X$ có phải là số nguyên tố hay không.

Dữ liệu vào (stdin hoặc file PRIMEQUERY.INP):
- Dòng đầu chứa số $Q$ ($1 \\le Q \\le 2 \\cdot 10^5$).
- $Q$ dòng tiếp theo, mỗi dòng chứa một số nguyên $X$ ($0 \\le X \\le 10^7$).

Dữ liệu ra (stdout hoặc file PRIMEQUERY.OUT):
- Với mỗi truy vấn, in ra "YES" nếu $X$ là số nguyên tố, ngược lại in ra "NO".

Ràng buộc:
- Subtask 1 (40% điểm): $Q \\le 10^3, X \\le 10^5$.
- Subtask 2 (60% điểm): $Q \\le 2 \\cdot 10^5, X \\le 10^7$.

Ví dụ:
Input:
4
0
1
2
7

Output:
NO
NO
YES
YES`,
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
    testCases: [
      {
        id: "prime-01",
        name: "Test 01 (Mẫu đề bài)",
        category: "sample",
        input: "4\n0\n1\n2\n7",
        expectedOutput: "NO\nNO\nYES\nYES",
        description: "Test ví dụ đề bài kiểm tra 0, 1, 2, 7",
        subtask: 1,
        points: 10,
      },
      {
        id: "prime-02",
        name: "Test 02 (Biên X=0 & X=1)",
        category: "boundary",
        input: "2\n0\n1",
        expectedOutput: "NO\nNO",
        description: "Cận dưới X < 2 không phải là số nguyên tố",
        subtask: 1,
        points: 10,
      },
      {
        id: "prime-03",
        name: "Test 03 (Đặc biệt: Số 2 số chẵn duy nhất)",
        category: "special",
        input: "3\n2\n4\n6",
        expectedOutput: "YES\nNO\nNO",
        description: "Số 2 là số nguyên tố chẵn duy nhất",
        subtask: 1,
        points: 10,
      },
      {
        id: "prime-04",
        name: "Test 04 (Bẫy Số chính phương)",
        category: "anti_hack",
        input: "4\n9\n25\n49\n121",
        expectedOutput: "NO\nNO\nNO\nNO",
        description: "Bẫy số chính phương căn bậc 2",
        subtask: 1,
        points: 10,
      },
      {
        id: "prime-05",
        name: "Test 05 (Biên cực đại X=9999991)",
        category: "subtask2",
        input: "2\n9999991\n10000000",
        expectedOutput: "YES\nNO",
        description: "Số nguyên tố cực đại gần 10^7 kiểm thử TLE",
        subtask: 2,
        points: 10,
      },
    ],
  },
  {
    id: "two-sum-target",
    title: "Cặp số có tổng bằng K (TWOSUM)",
    category: "Hai con trỏ / Binary Search / Hash Map",
    difficulty: "Trung bình",
    timeLimit: "1.0s",
    memoryLimit: "256MB",
    problemCodeName: "TWOSUM",
    flawSummary: "Duyệt trâu O(N²) với N = 2*10⁵ bị TLE nặng; thiếu cin.tie(0) và tối ưu I/O.",
    problemStatement: `Cho mảng gồm $N$ số nguyên và một số nguyên $K$.
Hãy đếm số cặp chỉ số $(i, j)$ với $1 \\le i < j \\le N$ sao cho $A_i + A_j = K$.

Dữ liệu vào (stdin hoặc file TWOSUM.INP):
- Dòng 1 chứa hai số nguyên $N, K$ ($1 \\le N \\le 2 \\cdot 10^5, -10^9 \\le K \\le 10^9$).
- Dòng 2 chứa $N$ số nguyên $A_1, A_2, \\dots, A_N$ ($-10^9 \\le A_i \\le 10^9$).

Dữ liệu ra (stdout hoặc file TWOSUM.OUT):
- In ra một số nguyên duy nhất là số cặp thỏa mãn. Chú ý số lượng cặp có thể lên tới $N(N-1)/2 \\approx 2 \\cdot 10^{10}$, cần dùng kiểu dữ liệu phù hợp.

Ví dụ:
Input:
6 8
3 5 3 5 2 6

Output:
5`,
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
    testCases: [
      {
        id: "twosum-01",
        name: "Test 01 (Mẫu đề bài)",
        category: "sample",
        input: "6 8\n3 5 3 5 2 6",
        expectedOutput: "5",
        description: "Test ví dụ đề bài",
        subtask: 1,
        points: 10,
      },
      {
        id: "twosum-02",
        name: "Test 02 (Biên N=2 không có cặp nào)",
        category: "boundary",
        input: "2 10\n4 5",
        expectedOutput: "0",
        description: "N=2 và tổng không bằng K",
        subtask: 1,
        points: 10,
      },
      {
        id: "twosum-03",
        name: "Test 03 (Bẫy Tràn số đếm cặp int -> long long)",
        category: "overflow",
        input: "5 6\n3 3 3 3 3",
        expectedOutput: "10",
        description: "Mảng toàn phần tử bằng nhau (5*4/2 = 10 cặp)",
        subtask: 2,
        points: 10,
      },
    ],
  },
];
