#include <bits/stdc++.h>
using namespace std;

using ll = long long;
using vi = vector<int>;

const int MAXN = 100000;
vector<int> divisors[MAXN + 1];

void buildDivisors() {
    for (int i = 1; i <= MAXN; i++) {
        for (int j = i; j <= MAXN; j += i) {
            divisors[j].push_back(i);
        }
    }
}

struct custom_hash {
    static uint64_t splitmix64(uint64_t x) {
        x += 0x9e3779b97f4a7c15;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
        x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
        return x ^ (x >> 31);
    }

    size_t operator()(uint64_t x) const {
        static const uint64_t FIXED_RANDOM =
            chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + FIXED_RANDOM);
    }
};

void solve() {
    int n, q;
    cin >> n >> q;

    vi nums(n);
    unordered_map<int, vi, custom_hash> memo;

    memo.reserve(n * 2 + 10);
    memo.max_load_factor(0.7f);

    for (int i = 0; i < n; ++i) {
        cin >> nums[i];
        memo[nums[i]].push_back(i);
    }

    while (q--) {
        int k, l, r;
        cin >> k >> l >> r;
        --l, --r;

        vi arr;
        arr.reserve(divisors[k].size());

        for (int d : divisors[k]) {
            auto itMap = memo.find(d);
            if (itMap == memo.end()) continue;

            auto &vec = itMap->second;
            auto it = lower_bound(vec.begin(), vec.end(), l);
            if (it != vec.end() && *it <= r) {
                arr.push_back(*it);
            }
        }

        sort(arr.begin(), arr.end());

        ll ans = 0;
        int pv = l;

        for (int ind : arr) {
            ans += 1LL * k * (ind - pv);

            if (nums[ind] != 1) {
                while (k % nums[ind] == 0) {
                    k /= nums[ind];
                }
            }

            pv = ind;
        }

        ans += 1LL * (r - pv + 1) * k;
        cout << ans << '\n';
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    buildDivisors();

    int T = 1;
    cin >> T;
    while (T--) solve();
    return 0;
}