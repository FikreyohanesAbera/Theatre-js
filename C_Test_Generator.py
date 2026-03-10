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
    s,m = map(int, sys.stdin.readline().split()) 
    arr = []
    for i in range(65,0,-1):
        x = 1 << (i - 1)
        if m & x:
            arr.append(x)
    rem = s
    values = []
    for i in range(len(arr)):
        values.append(rem // arr[i])
        rem %= arr[i]
    return max(values) if rem == 0 else -1
    

    


    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())
