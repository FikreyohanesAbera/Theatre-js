#include <bits/stdc++.h>
using namespace std;

static uint32_t RANDOM_SEED;

struct Wrapper {
    int v;
    Wrapper(int x = 0) : v(x) {}
    bool operator==(Wrapper const& other) const noexcept { return v == other.v; }
};

struct WrapperHash {
    size_t operator()(Wrapper const& w) const noexcept {
        return std::hash<int>{}(w.v) ^ (size_t)RANDOM_SEED;
    }
};

static inline long long gcdll(long long a, long long b) {
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

string solve_one() {
    int n, m;
    cin >> n >> m;
    vector<int> nums(n), b(m);
    for (int i = 0; i < n; i++) cin >> nums[i];
    for (int i = 0; i < m; i++) cin >> b[i];
    int N = n + m;

    vector<int> fb(N + 1, 0);
    for (int x : b) fb[x]++;

    unordered_set<Wrapper, WrapperHash> seen;
    seen.reserve((size_t)m * 2 + 8);
    seen.max_load_factor(0.7f);

    vector<int> uniq = nums;
    sort(uniq.begin(), uniq.end());
    uniq.erase(unique(uniq.begin(), uniq.end()), uniq.end());

    for (int num : uniq) {
        for (int j = num; j <= N; j += num) {
            if (fb[j]) seen.insert(Wrapper(j));
        }
    }

    long long l = 1;
    for (int num : nums) {
        long long g = gcdll(l, (long long)num);
        long long nl = (l / g) * (long long)num;
        if (nl > N) { l = (long long)N + 1; break; }
        l = nl;
    }

    int alice = 0, bob = 0;
    for (int num : b) {
        if (l <= N && num % l == 0) alice++;
        if (seen.find(Wrapper(num)) == seen.end()) bob++;
    }

    if ((m - (alice + bob)) % 2 == 0) {
        return (alice > bob) ? "Alice" : "Bob";
    } else {
        return (alice >= bob) ? "Alice" : "Bob";
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    std::mt19937 rng((uint32_t)chrono::high_resolution_clock::now().time_since_epoch().count());
    RANDOM_SEED = rng();

    int t;
    cin >> t;
    while (t--) {
        cout << solve_one() << "\n";
    }
    return 0;
}