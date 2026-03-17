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

def solve():
    n = int(sys.stdin.readline().strip())
    arr = []  
    for _ in range(n):
        s = input()
        arr.append(s)
    edges = []
    for u in range(n):
        for v in range(n):
            if u == v or arr[u][v] == "0":
                continue

            direct = True
            for w in range(n):
                if w != u and w != v and arr[u][w] == "1" and arr[w][v] == "1":
                    direct = False
                    break
            if direct:
                edges.append((u, v))
    if len(edges) != n - 1:
        print("NO")
        return 
    tree = [[] for _ in range(n)]
    for u, v in edges:
        tree[u].append(v)
        tree[v].append(u)

    vis = [False] * n
    stack = [0]
    vis[0] = True
    while stack:
        u = stack.pop()
        for v in tree[u]:
            if not vis[v]:
                vis[v] = True
                stack.append(v)

    if not all(vis):
        print("NO")
        return
    tree = [[] for _ in range(n)]
    for u, v in edges:
        tree[u].append(v)

    for s in range(n):
        vis = [False] * n
        stack = [s]
        vis[s] = True
        while stack:
            u = stack.pop()
            for v in tree[u]:
                if not vis[v]:
                    vis[v] = True
                    stack.append(v)

        for t in range(n):
            if vis[t] != (arr[s][t] == "1"):
                print("NO")
                return
    print("YES")
    for u,v in edges:
        print(u + 1,v + 1)


 
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    (solve())
