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
    n,x,y = list(map(int, sys.stdin.readline().split()))   
    nums = list(map(int, sys.stdin.readline().split()))  
    new = []
    x -= 1
    y -= 1
    mn = inf
    for i in range(x  + 1,y + 1):
        mn = min(mn,nums[i])
        if nums[i] == mn:
            ind = i
    new = nums[ind: y + 1] + nums[x + 1:ind] 
    S = nums[:x + 1] + nums[y + 1:]
    p = next((i for i, v in enumerate(S) if v > new[0]), len(S))
    ans = S[:p] + new + S[p:]
    return min(nums, ans)
    



    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(*solve())
