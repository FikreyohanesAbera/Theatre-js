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
    n, m = map(int, sys.stdin.readline().split())
    nums = list(map(int, sys.stdin.readline().split()))
    b = list(map(int, sys.stdin.readline().split()))
    N = n + m

    fb = [0] * (N + 1)
    for x in b:
        fb[x] += 1

    seen = set()
    for num in set(nums):
        for j in range(num, N + 1, num):
            if fb[j]:
                seen.add(Wrapper(j))
    alice = 0
    bob = 0
    l = 1
    for num in nums:
        g = math.gcd(l, num)
        l = (l // g) * num
        if l > N:
            l = N + 1
            break
    for num in b:
        if l <= N and num % l == 0:
            alice += 1
        if Wrapper(num) not in seen:
            bob += 1
    if (m - (alice + bob)) % 2 == 0:
        return "Alice" if alice > bob else "Bob"
    else:
        return "Alice" if alice >= bob else "Bob"

t = int(sys.stdin.readline())
for _ in range(t):
    print(solve())