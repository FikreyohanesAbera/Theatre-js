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
    def helper(s):
        if s == n - 1:
            return
        mn = inf
        mn_ind = s
        for i in range(s,n):
            mn = min(nums[i],mn)
            if mn == nums[i]:
                mn_ind = i
        for i in range(mn_ind,s,-1):
            nums[i],nums[i - 1] = nums[i - 1],nums[i]
        if mn_ind != s:
            helper(mn_ind)
        else:
            helper(mn_ind + 1)
    helper(0)
    return nums


    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(*solve())
