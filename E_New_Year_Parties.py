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
    arr = [0] * (n + 2)
    for num in nums: arr[num] += 1
    cnt = 0
    i = 0
    while i < len(arr):
        if arr[i]:
            i += 3
            cnt += 1
        else:
            i += 1

    ans = len(arr) - arr.count(0)
    
    c = 0
    s = 0
    p = False
    ans = 0
    for i in range(len(arr)):
        if arr[i] >= 1:
            c += 1
            s += arr[i]
            ans += 1
            if c == 1:
                if arr[i - 1] == 0:
                    p = True 
        elif arr[i] == 0:
            if s > c:
                arr[i] = -1
                ans += 1

                if p and s > c + 1:
                    ans += 1
                    p = False
            s = 0
            c = 0
        

                    



    return [cnt,ans]

    
print(*solve())
