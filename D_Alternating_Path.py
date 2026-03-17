import sys,threading
from collections import defaultdict, Counter, deque
from bisect import bisect_left, bisect_right, insort
import random
import math
from heapq import heapify, heappush, heappop
from random import getrandbits
from itertools import accumulate
from functools import reduce
from operator import add, sub, mul, truediv, floordiv, mod, pow, neg, and_, or_, xor, inv, lshift, rshift
RANDOM = getrandbits(32)
MOD = 10 ** 9 + 7
inf = float('inf')
def precision(val, x):
    return f"{val:.{x}f}"
class Wrapper(int):
    def __init__(self, x):
        int.__init__(x)
    def __hash__(self):
        return super(Wrapper, self).__hash__() ^ RANDOM

sys.setrecursionlimit(10**7)
def solve():
    n, m = map(int, sys.stdin.readline().split())
    graph = [[] for _ in range(n + 1)]

    for _ in range(m):
        u, v = map(int, sys.stdin.readline().split())
        graph[u].append(v)
        graph[v].append(u)

    visited = [False] * (n + 1)
    conn_components = []

    def dfs(root, cp):
        visited[root] = True
        cp.append(root)
        for nei in graph[root]:
            if not visited[nei]:
                dfs(nei, cp)

    for node in range(1, n + 1):
        if not visited[node]:
            cp = []
            dfs(node, cp)
            conn_components.append(cp)

    def is_bipartite_component(cp, graph):
        color = {}
        st = cp[0]
        q = deque([st])
        color[st] = 0
        c0, c1 = 1, 0      
        while q:
            u = q.popleft()
            for v in graph[u]:
                if v not in color:
                    color[v] = 1 - color[u]
                    if color[v] == 0: c0 += 1
                    else: c1 += 1
                    q.append(v)
                elif color[v] == color[u]:
                    return False, 0, 0
        return True, c0, c1

    ans = 0
    for cp in conn_components:
        is_bip, cnt0, cnt1 = is_bipartite_component(cp, graph)
        if is_bip:
            ans += max(cnt0, cnt1)
    return ans


for _ in range(int(sys.stdin.readline())):
    print(solve())
