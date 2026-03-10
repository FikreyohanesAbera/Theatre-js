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
    n,m = list(map(int, sys.stdin.readline().split())) 
    nums = []
    q = []
    for _ in range(n):
        x,y = list(map(int, sys.stdin.readline().split())) 
        nums.append((x,y))
    for _ in range(m):
        x,y = list(map(int, sys.stdin.readline().split())) 
        q.append((x,y))
    heap = []
    heapify(heap)
    
    
    summ = [0] * (n + 2)
    minim = [inf] * (n + 2)
    S = 0
    exist = set(y for x,y in nums)
    remain = set(range(0,n + 1)) - exist
    for y in remain:
        nums.append((0,y))
    nums.sort(key = lambda x: x[1])


    for i in range(len(nums) - 1,-1,-1):
        x,y = nums[i]
        if len(heap) > y + 1:
            S -= heappop(heap)
            summ[len(heap)] = S

        if len(heap) == y + 1:
            v = heappop(heap)
            S -= v
            heappush(heap,max(x,v))
            S += max(x,v)
        else:
            heappush(heap,x)
            S += x
        summ[y + 1] = S 
        if len(heap) == y + 1:
            minim[y + 1] = heap[0] 
    defau = max(summ)

    for x,y in q:
        print(max(defau,summ[y + 1] + x - minim[y + 1]),end = ' ')
        
    print()
        

        


    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    (solve())
