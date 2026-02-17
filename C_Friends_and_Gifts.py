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
    indices = [i for i in range(n) if nums[i] == 0]
    arr = [False] * (n + 1)
    for num in nums:
        arr[num] = True
    new = [i for i in range(len(arr)) if not arr[i]]
    j = 0
    new = new[1:] + [new[0]]
    for i in range(len(new)):
        nums[indices[j]] = new[i]
        j += 1
    return nums

    
print(*solve())
