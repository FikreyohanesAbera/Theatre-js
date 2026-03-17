
#include <bits/stdc++.h>
using namespace std;

// ---------- Type aliases ----------
using ll = long long;
using ull = unsigned long long;
using ld = long double;
using pii = pair<int,int>;
using pll = pair<ll,ll>;
using vi = vector<int>;
using vll = vector<ll>;

// ---------- Constants ----------
static const int INF = 1e9;
static const ll LINF = (ll)4e18;
static const int MOD = 998244353;

// ---------- Debug  ----------
#ifndef ONLINE_JUDGE
template <class T>
void _dbg_print(const T& x) { cerr << x; }

template <class A, class B>
void _dbg_print(const pair<A,B>& p) {
    cerr << "("; _dbg_print(p.first); cerr << ", "; _dbg_print(p.second); cerr << ")";
}

template <class T>
void _dbg_print(const vector<T>& v) {
    cerr << "[";
    for (int i = 0; i < (int)v.size(); i++) {
        if (i) cerr << ", ";
        _dbg_print(v[i]);
    }
    cerr << "]";
}

template <class T>
void _dbg_print(const set<T>& s) {
    cerr << "{";
    bool first = true;
    for (auto &x : s) {
        if (!first) cerr << ", ";
        first = false;
        _dbg_print(x);
    }
    cerr << "}";
}

template <class K, class V>
void _dbg_print(const map<K,V>& m) {
    cerr << "{";
    bool first = true;
    for (auto &kv : m) {
        if (!first) cerr << ", ";
        first = false;
        _dbg_print(kv);
    }
    cerr << "}";
}

#define dbg(x) do { cerr << "[DBG] " << #x << " = "; _dbg_print(x); cerr << "\n"; } while(0)
#else
#define dbg(x) do {} while(0)
#endif

// ---------- Utility ----------
template <class T>
inline bool chmin(T& a, const T& b) { if (b < a) { a = b; return true; } return false; }
template <class T>
inline bool chmax(T& a, const T& b) { if (a < b) { a = b; return true; } return false; }

// ---------- Solve ----------
const int MAX = 3000;

vector<vector<int>> divisors(MAX + 1);

void precompute() {
    for (int i = 1; i <= MAX; i++) {
        for (int j = i; j <= MAX; j += i) {
            divisors[j].push_back(i);
        }
    }
}

void solve() {
    int n, m;
    cin >> n >> m;

    vi nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    if (nums[0] != 1 && nums[0] != 0) {
        cout << 0 << '\n';
        return;
    }

    vector<vector<int>> dp(n, vector<int>(m + 1, 0));

    if (nums[n - 1] == 0) {
        for (int j = 1; j <= m; j++) {
            dp[n - 1][j] = 1;
        }
    } else {
        if (nums[n - 1] >= 1 && nums[n - 1] <= m) {
            dp[n - 1][nums[n - 1]] = 1;
        }
    }

    for (int i = n - 2; i >= 0; i--) {
        if (nums[i] == 0) {
            for (int j = 1; j <= m; j++) {
                for (int d : divisors[j]) {
                    if (j + d <= m) dp[i][j] = (dp[i][j] + dp[i + 1][j+d]) % MOD;
                }
            }
        } else {
            int j = nums[i];
            if (j >= 1 && j <= m) {
                for (int d : divisors[j]) {
                    if (j + d <= m) dp[i][j] = (dp[i][j] + dp[i + 1][j+d]) % MOD;
                }
            }
        }
    }

    cout << dp[0][1] << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    precompute();

    int T = 1;
    cin >> T;
    while (T--) solve();

    return 0;
}