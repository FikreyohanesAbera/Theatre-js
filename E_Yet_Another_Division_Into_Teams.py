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
    nums = [(nums[i],i) for i in range(n)]
    nums.sort()
    def helper(k):
        three = [0] * n
        for i in range(n - 1,-1,-1):
            if (n - (i)) % 3 == 0:
                three[i] = nums[i + 2][0] - nums[i][0] 
        dp = [0] * n
        dp[n - k] = [nums[n - k + k - 1][0] - nums[n - k][0] + (three[n - k + k] if n - k + k < n else 0) , n - k]
        for i in range(n - k - 3,-1,-1):
            if (n - (i + k)) % 3 == 0:
                if nums[i + k - 1][0] - nums[i][0] + three[i + k - 1] < dp[i + k - 1][0] + nums[i + 2][0] - nums[i][0] :
                    dp[i] = [nums[i + k - 1][0] - nums[i][0] + (three[i + k] if i + k < n else 0) , i]
                else:
                    dp[i] = [dp[i + k - 1][0] + nums[i + 2][0] - nums[i][0] ,dp[i + k - 1][1]]
            else:
                dp[i] = dp[i + 1]
        return dp
    if n % 3 == 0:
        ans = [0] * n
        res = 0
        for i in range(n):
            num,ind = nums[i]
            ans[ind] = i // 3 + 1
            if i % 3 == 2:
                res += num - nums[i - 2][0]
        print(res,n // 3)
        print(*ans)
    elif n % 3 == 1:
        dp = helper(4)
        s = dp[0][1]
        mn = dp[0][0]
        ans = [0] * n
        i = 0
        gr = 0
        for _ in range(n // 3):
            gr += 1
            k = 3
            if i == s:
                k = 4
            for _ in range(k):
                ans[nums[i][1]] = gr
                i += 1
        print(mn,gr)
        print(*ans)

        
    else:
        dp = helper(5)
        five = dp[0][0]
        five_start = dp[0][1]
        res = 0
        dp = helper(4)
        mn = inf
        fir = 0
        sec = 0
        for i in range(n - 7):
            if i % 3 == 0:
                if res + nums[i + 3][0] - nums[i][0] + dp[i + 4][0] < mn:
                    mn = res + nums[i + 3][0] - nums[i][0] + dp[i + 4][0]
                    fir = i
                    sec = dp[i + 4][1] 
            elif i % 3 == 2:
                res += nums[i][0] - nums[i - 2][0]
            
        if mn < five:
            mn = five
            ans = [0] * n
            i = 0
            gr = 0
            for _ in range(n // 3):
                gr += 1
                k = 3
                if i == fir or i == sec:
                    k = 4
                for _ in range(k):
                    ans[nums[i][1]] = gr
                    i += 1
            print(mn,gr)
            print(*ans)




        else:
            s = five_start
            mn = five
            ans = [0] * n
            i = 0
            gr = 0
            for _ in range(n // 3):
                gr += 1
                k = 3
                if i == s:
                    k = 5
                for _ in range(k):
                    ans[nums[i][1]] = gr
                    i += 1
            print(mn,gr)
            print(*ans)

            






    
    
     
    
solve()