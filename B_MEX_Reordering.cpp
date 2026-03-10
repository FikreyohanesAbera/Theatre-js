
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
static const int MOD = 1'000'000'007;

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
void solve() {
    int n;
    cin >> n;
    vi a(n);
    for (auto &x: a) cin >> x;
    
    int zero = count(a.begin(),a.end(),0);
    int one = count(a.begin(),a.end(),1);
    if (zero == 0) cout << "NO" << endl;
    else if (zero == 1) cout << "YES" << endl;
    else{
        (one >= 1)? cout << "YES" << endl : cout << "NO" << endl;
    }

}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T = 1;
    cin >> T;
    while (T--) solve();
    return 0;
}