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

def sieve_spf(limit: int) -> list[int]:
    if limit < 1:
        return [0] * (limit + 1)

    spf = list(range(limit + 1))
    spf[0] = 0
    if limit >= 1:
        spf[1] = 0

    for i in range(4, limit + 1, 2):
        spf[i] = 2

    p = 3
    while p * p <= limit:
        if spf[p] == p:  
            step = 2 * p
            start = p * p
            for x in range(start, limit + 1, step):
                if spf[x] == x:
                    spf[x] = p
        p += 2

    return spf

spf = sieve_spf(1_000_000)
def uniq(n):
    if n == 1:
        return []

    factors = []
    last = None
    while n > 1:
        p = spf[n]
        if p == 0: 
            break
        if p != last:
            factors.append(p)
            last = p
        n //= p
    return factors



def solve():
    n = int(sys.stdin.readline().strip())  
    nums = list(map(int, sys.stdin.readline().split()))  
    if nums == sorted(nums):
        return "Bob"
    new = []
    for i in range(n):
        if nums[i] == 1:
            new.append(1)
            continue
        cnt = uniq(nums[i])
        if len(cnt) > 1:
            return "Alice"
        new.append(cnt[0])
    return "Bob" if sorted(new) == new else "Alice"
    
    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())
