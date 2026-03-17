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
    a,b,c,m = list(map(int, sys.stdin.readline().split())) 
    three = m // math.lcm(a , b , c)
    
    ab = (m // math.lcm(a , b)) - three
    ac = (m // math.lcm(a , c)) - three
    al = (m // a) - ab - ac - three

    bc = m // (math.lcm(b,c)) - three
    bob = m // b - ab - bc - three
    ca = m // c - ac - bc - three

    return [al * 6 + ab * 3 + ac * 3 + three * 2, bob * 6 + ab * 3 + bc * 3 + three * 2  , ca * 6 + ac * 3 + bc * 3 + three * 2]

    
    
     
    
for _ in range(int(sys.stdin.readline().strip())):  
    print(*solve())
