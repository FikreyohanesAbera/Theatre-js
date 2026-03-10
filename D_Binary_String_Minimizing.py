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
    n ,k = list(map(int, sys.stdin.readline().split()))   
    s = input()
    ans = []
    one = 0
    for i in range(n):
        if s[i] == "1": one += 1
        else:
            if one >= k:
                ans.append((one - k) * '1' + '0' + "1" * (k))
                ans.append(s[i + 1:])
                break

            else:
                ans.append('0')
                k -= one
    else:
        ans.append("1" * one)
    return ''.join(ans)

            
            


    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())
