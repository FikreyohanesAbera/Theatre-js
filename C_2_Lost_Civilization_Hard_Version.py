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

class SegTreeMin:
    def __init__(self, arr):
        self.n = len(arr)
        self.size = 1
        while self.size < self.n:
            self.size <<= 1

        INF = 10**18
        self.INF = INF
        self.seg = [INF] * (2 * self.size)

        # build (0-indexed input)
        for i, v in enumerate(arr):
            self.seg[self.size + i] = v
        for i in range(self.size - 1, 0, -1):
            self.seg[i] = min(self.seg[2 * i], self.seg[2 * i + 1])

    def update(self, idx, value):
        """Point update: arr[idx] = value (0-indexed)."""
        i = self.size + idx
        self.seg[i] = value
        i //= 2
        while i:
            self.seg[i] = min(self.seg[2 * i], self.seg[2 * i + 1])
            i //= 2

    def query(self, l, r):
        """Range minimum on [l, r] inclusive (0-indexed)."""
        l += self.size
        r += self.size
        res = self.INF
        while l <= r:
            if l % 2 == 1:
                res = min(res, self.seg[l])
                l += 1
            if r % 2 == 0:
                res = min(res, self.seg[r])
                r -= 1
            l //= 2
            r //= 2
        return res



def solve():
    n = int(sys.stdin.readline().strip())  
    nums = list(map(int, sys.stdin.readline().split()))  
    memo = defaultdict(lambda: -1)
    tree = SegTreeMin([-1] * n)
    ans = 0
    for i in range(n):
        if memo[nums[i] - 1] != -1:
            mn = tree.query(memo[nums[i] - 1] + 1,i - 1)
            if mn >= memo[nums[i] - 1]:
                tree.update(i,memo[nums[i] - 1])
        memo[nums[i]] = i
    for i in range(n):
        x = tree.query(i,i) 
        ans += (i - x) * (n - i)



        
    return ans
    
    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())