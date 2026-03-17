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
    n ,k,p,m = list(map(int, sys.stdin.readline().split())) 
    p -= 1
    nums = list(map(int, sys.stdin.readline().split())) 
    cost = 0
    cnt = 0
    while cost < m:
        if p <= k - 1:
            new = []
            v = nums[p]
            for i in range(k):
                if i == p:
                    continue
                new.append(nums[i])
            new += nums[k:]
            new.append(v)
            if cost + v > m:
                return cnt
            cost += v
            cnt += 1
            p = n - 1



        else:

            mn = min(nums[:k])
            new = []
            found = False
            for i in range(k):
                if nums[i] == mn and not found:
                    found = True
                    continue
                new.append(nums[i])
            new += nums[k:]
            new.append(mn)
            if cost + mn > m:
                return cnt
            cost += mn
            p -= 1
        nums = new
    return cnt
    

    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())
