#include <bits/stdc++.h>
using namespace std;

// ---------- Type aliases ----------
using ll = long long;
using ull = unsigned long long;
using ld = long double;
using pii = pair<int, int>;
using pll = pair<ll, ll>;
using vi = vector<int>;
using vll = vector<ll>;

// ---------- Constants ----------
static const int INF = 1e9;
static const ll LINF = (ll)4e18;
static const int MOD = 1'000'000'007;

// ---------- Debug ----------
#ifndef ONLINE_JUDGE
template <class T>
void _dbg_print(const T& x) { cerr << x; }

template <class A, class B>
void _dbg_print(const pair<A, B>& p) {
    cerr << "(";
    _dbg_print(p.first);
    cerr << ", ";
    _dbg_print(p.second);
    cerr << ")";
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
    for (auto& x : s) {
        if (!first) cerr << ", ";
        first = false;
        _dbg_print(x);
    }
    cerr << "}";
}

template <class K, class V>
void _dbg_print(const map<K, V>& m) {
    cerr << "{";
    bool first = true;
    for (auto& kv : m) {
        if (!first) cerr << ", ";
        first = false;
        _dbg_print(kv);
    }
    cerr << "}";
}

#define dbg(x) do { cerr << "[DBG] " << #x << " = "; _dbg_print(x); cerr << "\n"; } while (0)
#else
#define dbg(x) do {} while (0)
#endif

// ---------- Utility ----------
template <class T>
inline bool chmin(T& a, const T& b) {
    if (b < a) {
        a = b;
        return true;
    }
    return false;
}

template <class T>
inline bool chmax(T& a, const T& b) {
    if (a < b) {
        a = b;
        return true;
    }
    return false;
}

// ---------- Factor sieve ----------
const int MAXN = 1000000;
vector<vector<int>> factors(MAXN + 1);

void build_factors() {
    for (int i = 1; i <= MAXN; i++) {
        for (int j = i; j <= MAXN; j += i) {
            factors[j].push_back(i);
        }
    }
}

// ---------- Helper ----------
// Minimum operations to make 1 -> N using multiplication by a <= k,
// which is equivalent to making N -> 1 using division by a <= k.
ll helper(int N, int k) {
    if (N <= 0 || N > MAXN) return -1;
    if (N == 1) return 0;

    const vector<int>& divs = factors[N];
    int n = (int)divs.size();

    unordered_map<int, int> mp;
    mp.reserve(n * 2);

    for (int i = 0; i < n; i++) {
        mp[divs[i]] = i;
    }

    vi dp(n, INF);
    dp[mp[1]] = 0;

    for (int i = 0; i < n; i++) {
        int cur = divs[i];
        if (dp[i] == INF) continue;

        // Next multiplier must divide N / cur
        int rem = N / cur;

        for (int mul : factors[rem]) {
            if (mul > k) break;

            int nxt = cur * mul;
            chmin(dp[mp[nxt]], dp[i] + 1);
        }
    }

    int ans = dp[mp[N]];
    return (ans == INF ? -1 : ans);
}

// ---------- Solve ----------
void solve() {
    int x, y, k;
    cin >> x >> y >> k;

    int g = gcd(x, y);
    x /= g;
    y /= g;

    ll one = helper(x, k);
    if (one == -1) {
        cout << -1 << '\n';
        return;
    }

    ll two = helper(y, k);
    if (two == -1) {
        cout << -1 << '\n';
        return;
    }

    cout << one + two << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    build_factors();

    int T = 1;
    cin >> T;
    while (T--) solve();

    return 0;
}