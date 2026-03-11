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
    nums = list(map(int, sys.stdin.readline().split()))
    sett = set(nums)
    req = [0] * n
    ans = [10**9] * n
    for i in range(n):
        x = nums[i]
        k = n - i
        req[i] = (x - k + 1,x,i)
    req.sort(key=lambda x: (x[1],x[0],x[2]))
    mex = 0
    while mex in sett:
        mex += 1
    cnt = 0
    print(req)
    for r,x,ind in req:
        if r > ind + 1:
            print("NO")
            return
        last = -1
        while cnt < r:
            while mex in sett:
                mex += 1
            ans[cnt] = mex
            last = mex
            mex += 1
            cnt += 1
        if cnt > ind + 1 or last >= x:
            print("NO")
            return
        print(ans)
    print("YES")
    print(*ans)
        
        





    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    (solve())
