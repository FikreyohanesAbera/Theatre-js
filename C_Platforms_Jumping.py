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
    n,m,d = list(map(int, sys.stdin.readline().split()))   
    nums = list(map(int, sys.stdin.readline().split()))  
    S = sum(nums)
    rem = n - S
    if (m + 1) * (d - 1) < n - S:
        print("NO")
        return
    ans = [0] * n
    s = 1
    cnt = 0
    for i in range(m):
        cnt += 1
        mn = min(rem,d - 1)
        s += mn
        rem -= mn
        for _ in range(nums[i]):
            ans[s - 1] = cnt
            s += 1
    print("YES")
    print(*ans)

    
    
     
    
(solve())
