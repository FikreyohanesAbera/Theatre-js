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
    s = input()
    n = len(s)
    t = sum(int(c) for c in s)
    memo = [0] * 10
    for c in s:
        memo[int(c)] += 1
    if len(s) == 1:
        return s
    for c in range(1,9 * n + 1):
        x = c
        summ = x 
        while True:
            summ += sum(int(i) for i in str(x))
            if x <= 9: break
            x = sum(int(i) for i in str(x))
        if summ == t:
            x = c
            ans = []
            while x > 9:
                ans.append(str(x))
                x = sum(int(i) for i in str(x))     
            ans.append(str(x))
            cp = memo[:]
            for ch in ''.join(ans):
                cp[int(ch)] -= 1
                if cp[int(ch)] < 0:
                    break
            else:
                summ = 0
                rem = []
                for i in range(9,-1,-1):
                    summ += i * cp[i]
                    rem.append(str(i) * cp[i])
                if summ == c:
                    res = ''.join(rem) + "".join(ans)
                    if res[0] != "0":
                        return res


        



    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(solve())
