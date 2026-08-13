# SEQUENCES, INFINITE SERIES, IMPROPER INTEGRALS

## 10.1 Zeno's paradox

The principal subject matter of this chapter had its beginning nearly 2400 years ago when the Greek philosopher Zeno of Elea (495–435 B.C.) precipitated a crisis in ancient mathematics by setting forth a number of ingenious paradoxes. One of these, often called the racecourse paradox, may be described as follows:

A runner can never reach the end of a racecourse because he must cover half of any distance before he covers the whole. That is to say, having covered the first half he still has the second half before him. When half of this is covered, one-fourth yet remains. When half of this one-fourth is covered, there remains one-eighth, and so on, ad infinitum.

Zeno was referring, of course, to an idealized situation in which the runner is to be thought of as a particle or point moving from one end of a line segment to the other. We can formulate the paradox in another way. Assume that the runner starts at the point marked 1 in Figure 10.1 and runs toward the goal marked 0. The positions labeled $\frac{1}{2}$ , $\frac{1}{4}$ , $\frac{1}{8}$ , etc., indicate the fraction of the course yet to be covered when these points are reached. These fractions, each of which is half the previous one, subdivide the whole course into an endless number of smaller portions. A positive amount of time is required to cover each portion separately, and the time required for the whole course is the sum total of all these amounts. To say that the runner can never reach the goal is to say that he never arrives there in a finite length of time; or, in other words, that the sum of an endless number of positive time intervals cannot possibly be finite.

This assertion was rejected 2000 years after Zeno's time when the theory of infinite series was created. In the 17th and 18th centuries, mathematicians began to realize that it is possible to extend the ideas of ordinary addition from finite collections of numbers to infinite collections so that sometimes infinitely many positive numbers have a finite “sum.” To see how this extension might come about and to get an idea of some of the difficulties that might be encountered in making the extension, let us analyze Zeno's paradox in more detail.

Suppose the aforementioned runner travels at a constant speed and suppose it takes him T minutes to cover the first half of the course. The next quarter of the course will take

T/2 minutes, the next eighth will take T/4 minutes, and, in general, the portion from $1/2^{n}$ to $1/2^{n+1}$ will take $T/2^{n}$ minutes. The “sum” of all these time intervals may be indicated symbolically by writing the following expression:

$$
T + \frac {T}{2} + \frac {T}{4} + \dots + \frac {T}{2 ^ {n}} + \dots .\tag{10.1}
$$

This is an example of what is known as an infinite series, and the problem here is to decide whether there is some reasonable way to assign a number which may be called the sum of this series.

Our physical experience tells us that a runner who travels at a constant speed should reach his goal in twice the time it takes for him to reach the halfway point. Since it takes

![](images/70de3b83652177150bcc9a08eda58bbd0d398648224c43e587d4262cba120d74.jpg)  
FIGURE 10.1 The racecourse paradox.

T minutes to cover half the course, it should require 2T minutes for the whole course. This line of reasoning strongly suggests that we should assign the “sum” 2T to the series in (10.1), and it leads us to expect that the equation

$$
T + \frac {T}{2} + \frac {T}{4} + \dots + \frac {T}{2 ^ {n}} + \dots = 2 T\tag{10.2}
$$

should be “true” in some sense.

The theory of infinite series tells us exactly how to interpret this equation. The idea is this: First we add a finite number of the terms, say the first n, and denote their sum by $s_{n}$ . Thus we have

$$
s _ {n} = T + \frac {T}{2} + \frac {T}{4} + \dots + \frac {T}{2 ^ {n - 1}}.\tag{10.3}
$$

This is called the nth partial sum of the series. Now we study the behavior of $s_{n}$ as n takes larger and larger values. In particular, we try to determine whether the partial sums $s_{n}$ approach a finite limit as n increases without bound.

In this example it is easy to see that 2T is the limiting value of the partial sums. In fact, if we calculate a few of these partial sums, we find that

$$
s _ {1} = T, \quad s _ {2} = T + \frac {T}{2} = \frac {3}{2} T, \quad s _ {3} = T + \frac {T}{2} + \frac {T}{4} = \frac {7}{4} T,
$$

$$
s _ {4} = T + \frac {T}{2} + \frac {T}{4} + \frac {T}{8} = \frac {1 5}{8} T.
$$

Now, observe that these results may be expressed as follows:

$$
s _ {1} = (2 - 1) T, \quad s _ {2} = (2 - \frac {1}{2}) T, \quad s _ {3} = (2 - \frac {1}{4}) T, \quad s _ {4} = (2 - \frac {1}{8}) T.
$$

This leads us to conjecture the following general formula:

$$
s _ {n} = \left(2 - \frac {1}{2 ^ {n - 1}}\right) T \quad \text {   for   all   positive   integers   } n.\tag{10.4}
$$

Formula (10.4) is easily verified by induction. Since $1/2^{n-1} \rightarrow 0$ as n increases indefinitely, this shows that $s_{n} \rightarrow 2T$ . Therefore, Equation (10.2) is “true” if we interpret it to mean that 2T is the limit of the partial sums $s_{n}$ . This limit process seems to invalidate the assertion that the sum of an infinite number of time intervals can never be finite.

Now we shall give an argument which lends considerable support to Zeno's point of view. Suppose we make a small but important change in the foregoing analysis of the racecourse paradox. Instead of assuming that the speed of the runner is constant, let us suppose that his speed gradually decreases in such a way that he requires T minutes to go from 1 to 1/2, T/2 minutes to go from 1/2 to 1/4, T/3 minutes to go from 1/4 to 1/8, and, in general, T/n minutes to go from $1/2^{n-1}$ to $1/2^{n}$ . The “total time” for the course may now be represented by the following infinite series:

$$
T + \frac {T}{2} + \frac {T}{3} + \dots + \frac {T}{n} + \dots .\tag{10.5}
$$

In this case, our physical experience does not suggest any natural or obvious “sum” to assign to this series, and hence we must rely entirely on mathematical analysis to deal with this example.

Let us proceed as before and introduce the partial sums $s_{n}$ . That is, let

$$
s _ {n} = T + \frac {T}{2} + \frac {T}{3} + \dots + \frac {T}{n}.\tag{10.6}
$$

Our object is to decide what happens to $s_{n}$ for larger and larger values of n. These partial sums are not as easy to study as those in (10.3) because there is no simple formula analogous to (10.4) for simplifying the expression on the right of (10.6). Nevertheless, it is easy to obtain an estimate for the size of $s_{n}$ if we compare the partial sum with an appropriate integral.

Figure 10.2 shows the graph of the function $f(x) = 1 / x$ for $x > 0$ . (The scale is distorted along the $y$ -axis.) The rectangles shown there have a total area equal to the sum

$$
1 + \frac {1}{2} + \frac {1}{3} + \dots + \frac {1}{n}.\tag{10.7}
$$

The area of the shaded region is $\int_{1}^{n + 1}x^{-1}dx = \log (n + 1)$ . Since this area cannot exceed the sum of the areas of the rectangles, we have the inequality

$$
1 + \frac {1}{2} + \frac {1}{3} + \dots + \frac {1}{n} \geq \log (n + 1).\tag{10.8}
$$

Multiplying both sides by T, we obtain $s_{n} \geq T \log (n + 1)$ . In other words, if the runner's speed decreases in the manner described above, the time required to reach the point $1/2^{n}$ is at least $T \log (n + 1)$ minutes. Since $\log (n + 1)$ increases without bound as n increases, we must agree with Zeno and conclude that the runner cannot reach his goal in any finite time.

The general theory of infinite series makes a distinction between series like (10.1) whose partial sums tend to a finite limit, and those like (10.5) whose partial sums have no finite

![](images/dad4faf9526f4a64225b0afc5ae87d7f2b1f3f3118fcb0fc4575875066486b88.jpg)  
FIGURE 10.2 Geometric meaning of the inequality $1 + 1/2 + \cdots + 1/n \geq \log(n + 1)$ .

limit. The former are called convergent, the latter divergent. Early investigators in the field paid little or no attention to questions of convergence or divergence. They treated infinite series as though they were ordinary finite sums, subject to the usual laws of algebra, not realizing that these laws cannot be universally extended to infinite series. Therefore, it is not surprising that some of the results they obtained were later shown to be incorrect. Fortunately, many of the early pioneers possessed unusual intuition and skill which prevented them from arriving at too many false conclusions, even though they could not justify all their methods. Foremost among these men was Leonard Euler who discovered one beautiful formula after another and at the same time used infinite series as a unifying idea to bring together many branches of mathematics, hitherto unrelated. The great quantity of Euler's work that has survived the test of history is a tribute to his remarkable instinct for what is mathematically correct.

to be a landmark in the history of mathematics. A special case of the binomial series is the now-familiar binomial theorem which states that

$$
(1 + x) ^ {n} = \sum_ {k = 0} ^ {n} {\binom {n} {k}} x ^ {k},
$$

where x is an arbitrary real number, n is a nonnegative integer, and $\binom{n}{k}$ is the binomial coefficient. Newton found that this formula could be extended from integer values of the exponent n to arbitrary real values of n by replacing the finite sum on the right by a suitable infinite series, although he gave no proof of this fact. Actually, a careful treatment of the binomial series raises some rather delicate questions of convergence that could not have been answered in Newton's time.

Shortly after Euler's death in 1783, the flood of new discoveries began to recede and the formal period in the history of series came to a close. A new and more critical period began in 1812 when Gauss published a celebrated memoir which contained, for the first time in history, a thorough and rigorous treatment of the convergence of a particular infinite series. A few years later Cauchy introduced an analytic definition of the limit concept in his treatise Cours d'analyse algébrique (published in 1821) and laid the foundations of the modern theory of convergence and divergence. The rudiments of that theory are discussed in the sections that follow.

## 10.2 Sequences

In everyday usage of the English language, the words “sequence” and “series” are synonyms, and they are used to suggest a succession of things or events arranged in some order. In mathematics these words have special technical meanings. The word “sequence” is employed as in the common use of the term to convey the idea of a set of things arranged in order, but the word “series” is used in a somewhat different sense. The concept of a sequence will be discussed in this section, and series will be defined in Section 10.5.

If for every positive integer $n$ there is associated a real or complex number $a_{n}$ , then the ordered set

$$
a _ {1}, a _ {2}, a _ {3}, \ldots , a _ {n}, \ldots
$$

is said to define an infinite sequence. The important thing here is that each member of the set has been labeled with an integer so that we may speak of the first term $a_{1}$ , the second term $a_{2}$ , and, in general, the nth term $a_{n}$ . Each term $a_{n}$ has a successor $a_{n+1}$ and hence there is no “last” term.

The most common examples of sequences can be constructed if we give some rule or formula for describing the nth term. Thus, for example, the formula $a_{n} = 1/n$ defines a sequence whose first five terms are

$$
1, \frac {1}{2}, \frac {1}{3}, \frac {1}{4}, \frac {1}{5}.
$$

Sometimes two or more formulas may be employed as, for example,

$$
a _ {2 n - 1} = 1, \quad a _ {2 n} = 2 n ^ {2},
$$

the first few terms in this case being

$$
\begin{array}{l} 1, 2, 1, 8, 1, 1 8, 1, 3 2, 1. \end{array}
$$

Another common way to define a sequence is by a set of instructions which explains how to carry on after a given start. Thus we may have

$$
a _ {1} = a _ {2} = 1, \quad a _ {n + 1} = a _ {n} + a _ {n - 1} \quad \text { for } n \geq 2.
$$

This particular rule is known as a recursion formula, and it defines a famous sequence whose terms are called the Fibonacci† numbers. The first few terms are

$$
1, 1, 2, 3, 5, 8, 1 3, 2 1, 3 4.
$$

In any sequence the essential thing is that there be some function f defined on the positive integers such that $f(n)$ is the nth term of the sequence for each $n = 1, 2, 3, \ldots$ . In fact, this is probably the most convenient way to state a technical definition of sequence.

DEFINITION. A function $f$ whose domain is the set of all positive integers 1, 2, 3, ... is called an infinite sequence. The function value $f(n)$ is called the nth term of the sequence.

The range of the function (that is, the set of function values) is usually displayed by writing the terms in order, thus:

$$
f (1), f (2), f (3), \dots , f (n), \dots .
$$

For brevity, the notation $\{f(n)\}$ is used to denote the sequence whose nth term is $f(n)$ . Very often the dependence on n is denoted by using subscripts, and we write $a_{n}, s_{n}, x_{n}, u_{n}$ , or something similar instead of $f(n)$ . Unless otherwise specified, all sequences in this chapter are assumed to have real or complex terms.

The main question we are concerned with here is to decide whether or not the terms $f(n)$ tend to a finite limit as n increases indefinitely. To treat this problem, we must extend the limit concept to sequences. This is done as follows.

DEFINITION. A sequence $\{f(n)\}$ is said to have a limit L if, for every positive number $\epsilon$ , there is another positive number N (which may depend on $\epsilon$ ) such that

$$
| f (n) - L | <   \epsilon \quad \text {   for   all   } n \geq N.
$$

In this case, we say the sequence $\{f(n)\}$ converges to $L$ and we write

$$
\lim _ {n \rightarrow \infty} f (n) = L, \quad o r \quad f (n) \rightarrow L \quad a s \quad n \rightarrow \infty .
$$

A sequence which does not converge is called divergent.

In this definition the function values $f(n)$ and the limit $L$ may be real or complex numbers. If $f$ and $L$ are complex, we may decompose them into their real and imaginary parts, say $f = u + iv$ and $L = a + ib$ . Then we have $f(n) - L = u(n) - a + i[v(n) - b]$ . The

inequalities

$$
| u (n) - a | \leq | f (n) - L | \quad \text { and } \quad | v (n) - b | \leq | f (n) - L |
$$

show that the relation $f(n) \to L$ implies $u(n) \to a$ and $v(n) \to b$ as $n \to \infty$ . Conversely, the inequality

$$
| f (n) - L | \leq | u (n) - a | + | v (n) - b |
$$

shows that the two relations $u(n) \to a$ and $v(n) \to b$ imply $f(n) \to L$ as $n \to \infty$ . In other words, a complex-valued sequence f converges if and only if both the real part u and the imaginary part v converge separately, in which case we have

$$
\lim _ {n \to \infty} f (n) = \lim _ {n \to \infty} u (n) + i \lim _ {n \to \infty} v (n).
$$

It is clear that any function defined for all positive real x may be used to construct a sequence by restricting x to take only integer values. This explains the strong analogy between the definition just given and the one in Section 7.14 for more general functions. The analogy carries over to infinite limits as well, and we leave it for the reader to define the symbols

$$
\lim _ {n \rightarrow \infty} f (n) = + \infty \quad \text { and } \quad \lim _ {n \rightarrow \infty} f (n) = - \infty
$$

as was done in Section 7.15 when $f$ is real-valued. If $f$ is complex, we write $f(n) \to \infty$ as $n \to \infty$ if $|f(n)| \to +\infty$ .

The phrase “convergent sequence” is used only for a sequence whose limit is finite. A sequence with an infinite limit is said to diverge. There are, of course, divergent sequences that do not have infinite limits. Examples are defined by the following formulas:

$$
f (n) = (- 1) ^ {n}, \qquad f (n) = \sin {\frac {n \pi}{2}}, \qquad f (n) = (- 1) ^ {n} \bigg (1 + \frac {1}{n} \bigg), \qquad f (n) = e ^ {\pi i n / 2}.
$$

The basic rules for dealing with limits of sums, products, etc., also hold for limits of convergent sequences. The reader should have no difficulty in formulating these theorems for himself. Their proofs are somewhat similar to those given in Section 3.5.

The convergence or divergence of many sequences may be determined by using properties of familiar functions that are defined for all positive x. We mention a few important examples of real-valued sequences whose limits may be found directly or by using some of the results derived in Chapter 7.

(10.9)

$$
\lim _ {n \rightarrow \infty} \frac {1}{n ^ {\alpha}} = 0 \quad \text { if } \quad \alpha > 0.\tag{10.10}
$$

$$
\lim _ {n \to \infty} x ^ {n} = 0 \quad \text { if } \quad | x | <   1.\tag{10.11}
$$

$$
\lim _ {n \rightarrow \infty} \frac {(\log n) ^ {a}}{n ^ {b}} = 0 \quad \text { for   all } a > 0, b > 0.\tag{10.12}
$$

$$
\lim _ {n \to \infty} n ^ {1 / n} = 1.\tag{10.13}
$$

$$
\lim _ {n \rightarrow \infty} \left(1 + \frac {a}{n}\right) ^ {n} = e ^ {a} \quad \text {   for   all   real   } a.
$$

## 10.3 Monotonic sequences of real numbers

A sequence $\{f(n)\}$ is said to be increasing if

$$
f (n) \leq f (n + 1) \quad \text {   for   all   } n \geq 1.
$$

We indicate this briefly by writing $f(n)\nearrow$ . If, on the other hand, we have

$$
f (n) \geq f (n + 1) \quad \text { for   all } n \geq 1,
$$

we call the sequence decreasing and write $f(n) \searrow$ . A sequence is called monotonic if it is increasing or if it is decreasing.

Monotonic sequences are pleasant to work with because their convergence or divergence is particularly easy to determine. In fact, we have the following simple criterion.

## THEOREM 10.1. A monotonic sequence converges if and only if it is bounded.

Note: A sequence $\{f(n)\}$ is called bounded if there exists a positive number M such that $|f(n)| \leq M$ for all n. A sequence that is not bounded is called unbounded.

Proof. It is clear that an unbounded sequence cannot converge. Therefore, all we need to prove is that a bounded monotonic sequence must converge.

Assume $f(n) \nearrow$ and let $L$ denote the least upper bound of the set of function values. (Since the sequence is bounded, it has a least upper bound by Axiom 10 of the real-number

![](images/ae638562e2b97b8b986676f4fdccf415747198eb3e71bf6d3fea106f9f1f85dd.jpg)  
FIGURE 10.3 A bounded increasing sequence converges to its least upper bound.

system.) Then $f(n) \leq L$ for all $n$ , and we shall prove that the sequence converges to $L$ . Choose any positive number $\epsilon$ . Since $L - \epsilon$ cannot be an upper bound for all numbers $f(n)$ , we must have $L - \epsilon < f(N)$ for some $N$ . (This $N$ may depend on $\epsilon$ .) If $n \geq N$ , we have $f(N) \leq f(n)$ since $f(n) \nearrow$ . Hence, we have $L - \epsilon < f(n) \leq L$ for all $n \geq N$ , as illustrated in Figure 10.3. From these inequalities we find that

$$
0 \leq L - f (n) <   \epsilon \quad \text {   for   all   } n \geq N
$$

and this means that the sequence converges to L, as asserted.

If $f(n) \searrow$ , the proof is similar, the limit in this case being the greatest lower bound of the set of function values.

## 10.4 Exercises

In Exercises 1 through 22, a sequence $\{f(n)\}$ is defined by the formula given. In each case, (a) determine whether the sequence converges or diverges, and (b) find the limit of each convergent sequence. In some cases it may be helpful to replace the integer n by an arbitrary positive real x and to study the resulting function of x by the methods of Chapter 7. You may use formulas (10.9) through (10.13) listed at the end of Section 10.2.

1. $f(n) = \frac{n}{n + 1} -\frac{n + 1}{n}$

12. $f(n) = \frac{3^n + (-2)^n}{3^{n + 1} + (-2)^{n + 1}}.$

2. $f(n) = \frac{n^2}{n + 1} -\frac{n^2 + 1}{n}$

13. $f(n) = \sqrt{n + 1} -\sqrt{n}$

3. $f(n) = \cos \frac{n\pi}{2}$ .

14. $f(n) = na^n$ , where $|a| < 1$ .

4. $f(n) = \frac{n^2 + 3n - 2}{5n^2}$ .

15. $f(n) = \frac{\log_a n}{n}$ , $a > 1$ .

5. $f(n) = \frac{n}{2^n}$ .

16. $f(n) = \frac{100,000n}{1 + n^2}$ .

6. $f(n) = 1 + (-1)^{n}$ .

17. $f(n) = \left(1 + \frac{2}{n}\right)^n$ .

7. $f(n) = \frac{1 + (-1)^n}{n}$ .

18. $f(n) = 1 + \frac{n}{n + 1}\cos \frac{n\pi}{2}.$

8. $f(n) = \frac{(-1)^n}{n} +\frac{1 + (-1)^n}{2}$

19. $f(n) = \left(1 + \frac{i}{2}\right)^{-n}$ .

9. $f(n) = 2^{1 / n}$ .

20. $f(n) = e^{-\pi in / 2}$ .

10. $f(n) = n^{(-1)^n}$ .

21. $f(n) = \frac{1}{n} e^{-\pi in / 2}$ .

11. $f(n) = \frac{n^{2 / 3}\sin(n!)}{n + 1}$ .

22. $f(n) = ne^{-\pi in / 2}$ .

Each of the sequences $\{a_n\}$ in Exercises 23 through 28 is convergent. Therefore, for every preassigned $\epsilon > 0$ , there exists an integer $N$ (depending on $\epsilon$ ) such that $|a_n - L| < \epsilon$ if $n \geq N$ , where $L = \lim_{n \to \infty} a_n$ . In each case, determine a value of $N$ that is suitable for each of the following values of $\epsilon: \epsilon = 1, 0.1, 0.01, 0.001, 0.0001$ .

23. $a_{n} = \frac{1}{n}$

26. $a_{n} = \frac{1}{n!}$ .

24. $a_{n} = \frac{n}{n + 1}$

27. $a_{n} = \frac{2n}{n^{3} + 1}$ .

25. $a_{n} = \frac{(-1)^{n + 1}}{n}$

28. $a_{n} = (-1)^{n}\left(\frac{9}{10}\right)^{n}$ .

29. Prove that a sequence cannot converge to two different limits.

30. Assume $\lim_{n\to \infty}a_n = 0$ . Use the definition of limit to prove that $\lim_{n\to \infty}a_n^2 = 0$ .

31. If $\lim_{n\to \infty}a_n = A$ and $\lim_{n\to \infty}b_n = B$ , use the definition of limit to prove that we have $\lim_{n\to \infty}(a_n + b_n) = A + B$ , and $\lim_{n\to \infty}(ca_n) = cA$ , where $c$ is a constant.

32. From the results of Exercises 30 and 31, prove that if $\lim_{n\to \infty}a_n = A$ then $\lim_{n\to \infty}a_n^2 = A^2$ . Then use the identity $2a_{n}b_{n} = (a_{n} + b_{n})^{2} - a_{n}^{2} - b_{n}^{2}$ to prove that $\lim_{n\to \infty}(a_nb_n) = AB$ if $\lim_{n\to \infty}a_n = A$ and $\lim_{n\to \infty}b_n = B$ .

33. If $\alpha$ is a real number and $n$ a nonnegative integer, the binomial coefficient $\binom{\alpha}{n}$ is defined by the equation

$$
\binom {\alpha} {n} = \frac {\alpha (\alpha - 1) (\alpha - 2) \cdot \cdot \cdot (\alpha - n + 1)}{n !}.
$$

(a) When $\alpha = -\frac{1}{2}$ , show that

$$
\binom {\alpha} {1} = - \frac {1}{2}, \quad \binom {\alpha} {2} = \frac {3}{8}, \quad \binom {\alpha} {3} = - \frac {5}{1 6}, \quad \binom {\alpha} {4} = \frac {3 5}{1 2 8}, \quad \binom {\alpha} {5} = - \frac {6 3}{2 5 6}.
$$

(b) Let $a_{n} = (-1)^{n}\left(\frac{-1}{n} /2\right)$ . Prove that $a_{n} > 0$ and that $a_{n + 1} < a_{n}$ .

34. Let $f$ be a real-valued function that is monotonic increasing and bounded on the interval [0, 1]. Define two sequences $\{s_n\}$ and $\{t_n\}$ as follows:

$$
s _ {n} = \frac {1}{n} \sum_ {k = 0} ^ {n - 1} f \left(\frac {k}{n}\right), \quad t _ {n} = \frac {1}{n} \sum_ {k = 1} ^ {n} f \left(\frac {k}{n}\right).
$$

(a) Prove that $s_n \leq \int_0^1 f(x) dx \leq t_n$ and that $0 \leq \int_0^1 f(x) dx - s_n \leq \frac{f(1) - f(0)}{n}$ .

(b) Prove that both sequences $\{s_n\}$ and $\{t_n\}$ converge to the limit $\int_0^1 f(x)dx$ .

(c) State and prove a corresponding result for the interval $[a, b]$ .

35. Use Exercise 34 to establish the following limit relations:

(a) $\lim_{n\to \infty}\frac{1}{n}\sum_{k = 1}^{n}\left(\frac{k}{n}\right)^2 = \frac{1}{3}.$

(d) $\lim_{n\to \infty}\sum_{k = 1}^{n}\frac{1}{\sqrt{n^2 + k^2}} = \log (1 + \sqrt{2}).$

(b) $\lim_{n\to \infty}\sum_{k = 1}^{n}\frac{1}{n + k} = \log 2.$

(e) $\lim_{n\to \infty}\sum_{k = 1}^{n}\frac{1}{n}\sin \frac{k\pi}{n} = \frac{2}{\pi}.$

(c) $\lim_{n\to\infty}\sum_{k=1}^{n}\frac{n}{n^{2}+k^{2}}=\frac{\pi}{4}.$

(f) $\lim_{n\to \infty}\sum_{k = 1}^{n}\frac{1}{n}\sin^2{\frac{k\pi}{n}} = \frac{1}{2}.$

## 10.5 Infinite series

From a given sequence of real or complex numbers, we can always generate a new sequence by adding together successive terms. Thus, if the given sequence has the terms

$$
a _ {1}, a _ {2}, \ldots , a _ {n}, \ldots ,
$$

we may form, in succession, the “partial sums”

$$
s _ {1} = a _ {1}, \qquad s _ {2} = a _ {1} + a _ {2}, \qquad s _ {3} = a _ {1} + a _ {2} + a _ {3},
$$

and so on, the partial sum $s_{n}$ of the first n terms being defined as follows:

$$
s _ {n} = a _ {1} + a _ {2} + \dots + a _ {n} = \sum_ {k = 1} ^ {n} a _ {k}.\tag{10.14}
$$

The sequence $\{s_{n}\}$ of partial sums is called an infinite series, or simply a series, and is also denoted by the following symbols:

$$
a _ {1} + a _ {2} + a _ {3} + \dots , \quad a _ {1} + a _ {2} + \dots + a _ {n} + \dots , \quad \sum_ {k = 1} ^ {\infty} a _ {k}.\tag{10.15}
$$

For example, the series $\sum_{k=1}^{\infty} 1/k$ represents the sequence $\{s_n\}$ for which

$$
s _ {n} = \sum_ {k = 1} ^ {n} \frac {1}{k}.
$$

The symbols in (10.15) are intended to remind us that the sequence of partial sums $\{s_n\}$ is obtained from the sequence $\{a_n\}$ by addition of successive terms.

If there is a real or complex number $S$ such that

$$
\lim _ {n \to \infty} s _ {n} = S,
$$

we say that the series $\sum_{k=1}^{\infty} a_k$ is convergent and has the sum $S$ , in which case we write

$$
\sum_ {k = 1} ^ {\infty} a _ {k} = S.
$$

If $\{s_n\}$ diverges, we say that the series $\sum_{k=1}^{\infty} a_k$ diverges and has no sum.

EXAMPLE 1. THE HARMONIC SERIES. In the discussion of Zeno's paradox, we showed that the partial sums $s_n$ of the series $\sum_{k=1}^{\infty} 1/k$ satisfy the inequality

$$
s _ {n} = \sum_ {k = 1} ^ {n} \frac {1}{k} \geq \log (n + 1).
$$

Since $\log(n+1)\to\infty$ as $n\to\infty$ , the same is true of $s_{n}$ , and hence the series $\sum_{k=1}^{\infty}1/k$ diverges. This series is called the harmonic series.

EXAMPLE 2. In the discussion of Zeno's paradox, we also encountered the partial sums of the series $1 + \frac{1}{2} + \frac{1}{4} + \cdots$ , given by the formula

$$
\sum_ {k = 1} ^ {n} \frac {1}{2 ^ {k - 1}} = 2 - \frac {1}{2 ^ {n - 1}},
$$

which is easily proved by induction. As $n \to \infty$ , these partial sums approach the limit 2, and hence the series converges and has sum 2. We may indicate this by writing

$$
1 + \frac {1}{2} + \frac {1}{4} + \dots = 2.\tag{10.16}
$$

The reader should realize that the word “sum” is used here in a very special sense. The sum of a convergent series is not obtained by ordinary addition but rather as the limit of the sequence of partial sums. Also, the reader should note that for a convergent series, the symbol $\sum_{k=1}^{\infty}a_{k}$ is used to denote both the series and its sum, even though the two are conceptually distinct. The sum represents a number and it is not capable of being convergent or divergent. Once the distinction between a series and its sum has been realized, the use of one symbol to represent both should cause no confusion.

As in the case of finite summation notation, the letter k used in the symbol $\sum_{k=1}^{\infty}a_{k}$ is a “dummy index” and may be replaced by any other convenient symbol. The letters n, m, and r are commonly used for this purpose. Sometimes it is desirable to start the summation from k=0 or from k=2 or from some other value of k. Thus, for example, the series in (10.16) could be written as $\sum_{k=0}^{\infty}1/2^{k}$ . In general, if $p\geq0$ , we define the symbol $\sum_{k=p}^{\infty}a_{k}$ to mean the same as $\sum_{k=1}^{\infty}b_{k}$ , where $b_{k}=a_{p+k-1}$ . Thus $b_{1}=a_{p}, b_{2}=a_{p+1}$ , etc. When there is no danger of confusion or when the starting point is unimportant, we write $\sum a_{k}$ instead of $\sum_{k=p}^{\infty}a_{k}$ .

It is easy to prove that the two series $\sum_{k=1}^{\infty}a_{k}$ and $\sum_{k=p}^{\infty}a_{k}$ both converge or both diverge. Suppose we let $s_{n}=a_{1}+\cdots+a_{n}$ and $t_{n}=a_{p}+a_{p+1}+\cdots+a_{p+n-1}$ . If p=0, we have $t_{n+1}=a_{0}+s_{n}$ , so if $s_{n}\to S$ as $n\to\infty$ , then $t_{n}\to a_{0}+S$ and, conversely, if $t_{n}\to T$ as $n\to\infty$ , then $s_{n}\to T-a_{0}$ . Therefore, both series converge or both diverge when p=0. The same holds true if $p\geq1$ . For p=1, we have $s_{n}=t_{n}$ , and for p>1, we have $t_{n}=s_{n+p-1}-s_{p-1}$ , and again it follows that the sequences $\{s_{n}\}$ and $\{t_{n}\}$ both converge or both diverge. This is often described by saying that a finite number of terms may be omitted or added at the beginning of a series without affecting its convergence or divergence.

## 10.6 The linearity property of convergent series

Ordinary finite sums have the following important properties:

$$
\sum_ {k = 1} ^ {n} \left(a _ {k} + b _ {k}\right) = \sum_ {k = 1} ^ {n} a _ {k} + \sum_ {k = 1} ^ {n} b _ {k} \quad (\text { additive   property })\tag{10.17}
$$

and

$$
\sum_ {k = 1} ^ {n} \left(c a _ {k}\right) = c \sum_ {k = 1} ^ {n} a _ {k} \quad (\text { homogeneous   property }).\tag{10.18}
$$

The next theorem provides a natural extension of these properties to convergent infinite series and thereby justifies many algebraic manipulations in which convergent series are treated as though they were finite sums. Both additivity and homogeneity may be combined into one property called linearity which may be described as follows:

THEOREM 10.2. Let $\sum a_{n}$ and $\sum b_{n}$ be convergent infinite series of complex terms and let $\alpha$ and $\beta$ be complex constants. Then the series $\sum (\alpha a_{n} + \beta b_{n})$ also converges, and its sum is given by the equation

$$
\sum_ {n = 1} ^ {\infty} (\alpha a _ {n} + \beta b _ {n}) = \alpha \sum_ {n = 1} ^ {\infty} a _ {n} + \beta \sum_ {n = 1} ^ {\infty} b _ {n}.\tag{10.19}
$$

Proof. Using (10.17) and (10.18), we may write

$$
\sum_ {k = 1} ^ {n} (\alpha a _ {k} + \beta b _ {k}) = \alpha \sum_ {k = 1} ^ {n} a _ {k} + \beta \sum_ {k = 1} ^ {n} b _ {k}.\tag{10.20}
$$

When $n \to \infty$ , the first term on the right of (10.20) tends to $\alpha \sum_{k=1}^{\infty} a_k$ and the second term tends to $\beta \sum_{k=1}^{\infty} b_k$ . Therefore the left-hand side tends to their sum, and this proves that the series $\sum (\alpha a_k + \beta b_k)$ converges to the sum indicated by (10.19).

Theorem 10.2 has an interesting corollary which is often used to establish the divergence of a series.

THEOREM 10.3. If $\sum a_{n}$ converges and if $\sum b_{n}$ diverges, then $\sum (a_{n} + b_{n})$ diverges.

Proof. Since $b_{n} = (a_{n} + b_{n}) - a_{n}$ , and since $\sum a_{n}$ converges, Theorem 10.2 tells us that convergence of $\sum (a_{n} + b_{n})$ implies convergence of $\sum b_{n}$ . Therefore, $\sum (a_{n} + b_{n})$ cannot converge if $\sum b_{n}$ diverges.

EXAMPLE. The series $\sum (1 / k + 1 / 2^k)$ diverges because $\sum 1 / k$ diverges and $\sum 1 / 2^k$ converges.

If $\sum a_{n}$ and $\sum b_{n}$ are both divergent, the series $\sum (a_{n} + b_{n})$ may or may not converge. For example, when $a_{n} = b_{n} = 1$ for all n, then $\sum (a_{n} + b_{n})$ diverges. But when $a_{n} = 1$ and $b_{n} = -1$ for all n, then $\sum (a_{n} + b_{n})$ converges.

## 10.7 Telescoping series

Another important property of finite sums is the telescoping property which states that

$$
\sum_ {k = 1} ^ {n} (b _ {k} - b _ {k + 1}) = b _ {1} - b _ {n + 1}.\tag{10.21}
$$

When we try to extend this property to infinite series we are led to consider those series $\sum a_{n}$ for which each term $a_{n}$ may be expressed as a difference of the form

$$
a _ {n} = b _ {n} - b _ {n + 1}.\tag{10.22}
$$

These series are known as telescoping series and their behavior is characterized by the following theorem.

THEOREM 10.4. Let $\{a_{n}\}$ and $\{b_{n}\}$ be two sequences of complex numbers such that

$$
a _ {n} = b _ {n} - b _ {n + 1} \quad f o r \quad n = 1, 2, 3, \dots .\tag{10.23}
$$

Then the series $\sum a_{n}$ converges if and only if the sequence $\{b_n\}$ converges, in which case we have

$$
\sum_ {n = 1} ^ {\infty} a _ {n} = b _ {1} - L, \quad \text { where } \quad L = \lim _ {n \to \infty} b _ {n}.\tag{10.24}
$$

Proof. Let $s_n$ denote the $n$ th partial sum of $\sum a_n$ . Then we have

$$
s _ {n} = \sum_ {k = 1} ^ {n} a _ {k} = \sum_ {k = 1} ^ {n} (b _ {k} - b _ {k + 1}) = b _ {1} - b _ {n + 1},
$$

because of (10.21). Therefore, both sequences $\{s_n\}$ and $\{b_n\}$ converge or both diverge. Moreover, if $b_{n} \to L$ as $n \to \infty$ , then $s_n \to b_1 - L$ , and this proves (10.24).

Note: Every series is telescoping because we can always satisfy (10.22) if we first choose $b_{1}$ to be arbitrary and then choose $b_{n+1} = b_{1} - s_{n}$ for $n \geq 1$ , where $s_{n} = a_{1} + \cdots + a_{n}$ .

EXAMPLE 1. Let $a_{n} = 1 / (n^{2} + n)$ . Then we have

$$
a _ {n} = \frac {1}{n (n + 1)} = \frac {1}{n} - \frac {1}{n + 1},
$$

and hence (10.23) holds with $b_{n} = 1 / n$ . Since $b_{1} = 1$ and $L = 0$ , we obtain

$$
\sum_ {n = 1} ^ {\infty} \frac {1}{n (n + 1)} = 1.
$$

EXAMPLE 2. If x is not a negative integer, we have the decomposition

$$
\frac {1}{(n + x) (n + x + 1) (n + x + 2)} = \frac {1}{2} \left(\frac {1}{(n + x) (n + x + 1)} - \frac {1}{(n + x + 1) (n + x + 2)}\right)
$$

for each integer $n \geq 1$ . Therefore, by the telescoping property, the following series converges and has the sum indicated:

$$
\sum_ {n = 1} ^ {\infty} \frac {1}{(n + x) (n + x + 1) (n + x + 2)} = \frac {1}{2 (x + 1) (x + 2)}.
$$

EXAMPLE 3. Since $\log [n / (n + 1)] = \log n - \log (n + 1)$ , and since $\log n \to \infty$ as $n \to \infty$ , the series $\sum \log [n / (n + 1)]$ diverges.

Note: Telescoping series illustrate an important difference between finite sums and infinite series. If we write (10.21) in extended form, it becomes

$$
\left(b _ {1} - b _ {2}\right) + \left(b _ {2} - b _ {3}\right) + \dots + \left(b _ {n} - b _ {n + 1}\right) = b _ {1} - b _ {n + 1}
$$

which can be verified by merely removing parentheses and canceling. Suppose now we perform the same operations on the infinite series

$$
(b _ {1} - b _ {2}) + (b _ {2} - b _ {3}) + (b _ {3} - b _ {4}) + \dots .
$$

We leave $b_{1}$ , cancel $b_{2}$ , cancel $b_{3}$ , and so on. For each $n > 1$ , at some stage we cancel $b_{n}$ . Thus every $b_{n}$ cancels with the exception of $b_{1}$ . This leads us to the conclusion that the sum of the series is $b_{1}$ . Because of Theorem 10.4, this conclusion is false unless $\lim_{n\to\infty}b_n=0$ . This shows that parentheses cannot always be removed in an infinite series as they can in a finite sum. (See also Exercise 24 in Section 10.9.)

## 10.8 The geometric series

The telescoping property of finite sums may be used to study a very important example known as the geometric series. This series is generated by successive addition of the terms in a geometric progression and has the form $\sum x^{n}$ , where the nth term $x^{n}$ is the nth power of a fixed real or complex number x. It is convenient to start this series with n = 0, with the understanding that the initial term, $x^{0}$ , is equal to 1.

Let $s_n$ denote the $n$ th partial sum of this series, so that

$$
s _ {n} = 1 + x + x ^ {2} + \dots + x ^ {n - 1}.
$$

If $x = 1$ , each term on the right is 1 and $s_n = n$ . In this case, the series diverges since $s_n \to \infty$ as $n \to \infty$ . If $x \neq 1$ , we may simplify the sum for $s_n$ by writing

$$
(1 - x) s _ {n} = (1 - x) \sum_ {k = 0} ^ {n - 1} x ^ {k} = \sum_ {k = 0} ^ {n - 1} (x ^ {k} - x ^ {k + 1}) = 1 - x ^ {n},
$$

since the last sum telescopes. Dividing by 1 - x, we obtain the formula

$$
s _ {n} = \frac {1 - x ^ {n}}{1 - x} = \frac {1}{1 - x} - \frac {x ^ {n}}{1 - x} \quad \text {if} x \neq 1.
$$

This shows that the behavior of $s_{n}$ for large n depends entirely on the behavior of $x^{n}$ . When $|x| < 1$ , then $x^{n} \to 0$ as $n \to \infty$ , and the series converges to the sum $1/(1 - x)$ .

Since $s_{n+1} - s_{n} = x^{n}$ , convergence of $\{s_{n}\}$ implies $x^{n} \to 0$ as $n \to \infty$ . Therefore, if $|x| \geq 1$ the sequence $\{s_{n}\}$ diverges since $x^{n}$ does not tend to 0 in this case. Thus we have proved the following theorem.

THEOREM 10.5. If $x$ is complex, with $|x| < 1$ , the geometric series $\sum_{n=0}^{\infty} x^n$ converges and has sum $1 / (1 - x)$ . That is to say, we have

$$
1 + x + x ^ {2} + \dots + x ^ {n} + \dots = \frac {1}{1 - x} \quad \text {if} | x | <   1.\tag{10.25}
$$

If $|x| \geq 1$ , the series diverges.

The geometric series, with $|x| < 1$ , is one of those rare examples whose sum we are able to determine by finding first a simple formula for its partial sums. (A special case with $x = \frac{1}{2}$ was encountered in Section 10.1 in connection with Zeno's paradox.) The real importance of this series lies in the fact that it may be used as a starting point for determining the sums of a large number of other interesting series. For example, if we assume $|x| < 1$ and replace $x$ by $x^2$ in (10.25), we obtain the formula

$$
1 + x ^ {2} + x ^ {4} + \dots + x ^ {2 n} + \dots = \frac {1}{1 - x ^ {2}} \quad \text { if } | x | <   1.\tag{10.26}
$$

Notice that this series contains those terms of $(10.25)$ with even exponents. To find the sum of the odd powers alone, we need only multiply both sides of $(10.26)$ by x to obtain

$$
x + x ^ {3} + x ^ {5} + \dots + x ^ {2 n + 1} + \dots = \frac {x}{1 - x ^ {2}} \quad \text { if } | x | <   1.\tag{10.27}
$$

If we replace $x$ by $-x$ in (10.25), we find that

$$
1 - x + x ^ {2} - x ^ {3} + \dots + (- 1) ^ {n} x ^ {n} + \dots = \frac {1}{1 + x} \quad \text {if} | x | <   1.\tag{10.28}
$$

Replacing $x$ by $x^2$ in (10.28), we find that

$$
1 - x ^ {2} + x ^ {4} - x ^ {6} + \dots + (- 1) ^ {n} x ^ {2 n} + \dots = \frac {1}{1 + x ^ {2}} \quad \text { if } | x | <   1.\tag{10.29}
$$

Multiplying both sides of (10.29) by $x$ , we obtain

$$
x - x ^ {3} + x ^ {5} - x ^ {7} + \dots + (- 1) ^ {n} x ^ {2 n + 1} + \dots = \frac {x}{1 + x ^ {2}} \quad \text {if} | x | <   1.\tag{10.30}
$$

If we replace $x$ by $2x$ in (10.26), we find that

$$
1 + 4 x ^ {2} + 1 6 x ^ {4} + \dots + 4 ^ {n} x ^ {2 n} + \dots = \frac {1}{1 - 4 x ^ {2}},
$$

which is valid if $|2x| < 1$ or, what is the same thing, if $|x| < \frac{1}{2}$ . It is clear that many other examples may be constructed by similar means.

All these series have the special form

$$
\sum_ {n = 0} ^ {\infty} a _ {n} x ^ {n}
$$

and are known as power series. The numbers $a_{0}, a_{1}, a_{2}, \ldots$ , which may be real or complex, are called coefficients of the power series. The geometric series is an example with all coefficients equal to 1. If x and all the coefficients are real, the series is called a real power series. We shall find later, when we discuss the general theory of real power series, that it is permissible to differentiate and to integrate both sides of each of the Equations (10.25) through (10.30), treating the left-hand members as though they were ordinary finite sums. These operations lead to many remarkable new formulas. For example, differentiation of (10.25) gives us

$$
1 + 2 x + 3 x ^ {2} + \dots + n x ^ {n - 1} + \dots = \frac {1}{(1 - x) ^ {2}} \quad \text { if } | x | <   1,\tag{10.31}
$$

whereas integration of $(10.28)$ yields the interesting formula

$$
x - \frac {x ^ {2}}{2} + \frac {x ^ {3}}{3} - \frac {x ^ {4}}{4} + \dots + \frac {(- 1) ^ {n} x ^ {n + 1}}{n + 1} + \dots = \log (1 + x)\tag{10.32}
$$

which expresses the logarithm as a power series. This is the discovery of Mercator and Brouncker (1668) that we mentioned earlier. Although each of the Equations (10.25) through (10.31) is valid for x in the open interval $-1 < x < +1$ , it turns out that the logarithmic series in (10.32) is valid at the endpoint $x = +1$ as well.

Another important example, which may be obtained by integration of $(10.29)$ , is the following power-series expansion for the inverse tangent, discovered in 1671 by James Gregory $(1638–1675)$ :

$$
x - \frac {x ^ {3}}{3} + \frac {x ^ {5}}{5} - \frac {x ^ {7}}{7} + \dots + \frac {(- 1) ^ {n} x ^ {2 n + 1}}{2 n + 1} + \dots = \arctan x.\tag{10.33}
$$

Gregory's series converges for each complex $x$ with $|x| < 1$ and also for $x = \pm 1$ . When $x$ is real, the series agrees with the inverse tangent function introduced in Chapter 6. The series can be used to extend the definition of the arctangent function from real values of $x$ to complex $x$ with $|x| < 1$ .

Many of the other elementary functions of calculus, such as the sine, cosine, and exponential, may also be represented by power series. This is not too surprising, in view of Taylor's formula which tells us that any function may be approximated by a Taylor polynomial in x of degree $\leq n$ if it has derivatives of order $n + 1$ in some neighborhood of the origin. In the examples given above, the partial sums of the power series are precisely the Taylor polynomials. When a function f has derivatives of every order in a neighborhood of the origin, then for every positive integer n Taylor's formula leads to an equation of the form

$$
f (x) = \sum_ {k = 0} ^ {n} a _ {k} x ^ {k} + E _ {n} (x),\tag{10.34}
$$

where the finite sum $\sum_{k=0}^{n}a_{k}x^{k}$ is a Taylor polynomial of degree $\leq n$ and $E_{n}(x)$ is the error for this approximation. If, now, we keep x fixed and let n increase without bound in (10.34) the Taylor polynomials give rise to a power series, namely $\sum_{k=0}^{\infty}a_{k}x^{k}$ , where each coefficient $a_{k}$ is determined as follows:

$$
a _ {k} = \frac {f ^ {(k)} (0)}{k !}.
$$

If, for some $x$ , the error $E_{n}(x)$ tends to 0 as $n \to \infty$ , then for this $x$ we may let $n \to \infty$ in (10.34) to obtain

$$
f (x) = \lim _ {n \to \infty} \sum_ {k = 0} ^ {n} a _ {k} x ^ {k} + \lim _ {n \to \infty} E _ {n} (x) = \sum_ {k = 0} ^ {\infty} a _ {k} x ^ {k}.
$$

In other words, the power series in question converges to $f(x)$ . If x is a point for which $E_{n}(x)$ does not tend to 0 as $n \to \infty$ , then the partial sums will not approach $f(x)$ . Conditions on f for guaranteeing that $E_{n}(x) \to 0$ will be discussed later in Section 11.10.

To lay a better foundation for the general theory of power series, we turn next to certain general questions related to the convergence and divergence of arbitrary series. We shall return to the subject of power series in Chapter 11.

## 10.9 Exercises

Each of the series in Exercises 1 through 10 is a telescoping series, or a geometric series, or some related series whose partial sums may be simplified. In each case, prove that the series converges and has the sum indicated.

1. $\sum_{n=1}^{\infty} \frac{1}{(2n - 1)(2n + 1)} = \frac{1}{2}$ .

6. $\sum_{n=1}^{\infty} \frac{n}{(n+1)(n+2)(n+3)} = \frac{1}{4}$ .

2. $\sum_{n = 1}^{\infty}\frac{2}{3^{n - 1}} = 3.$

7. $\sum_{n=1}^{\infty} \frac{2n + 1}{n^{2}(n + 1)^{2}} = 1.$

3. $\sum_{n=2}^{\infty} \frac{1}{n^{2}-1} = \frac{3}{4}$ .

8. $\sum_{n=1}^{\infty} \frac{2^n + n^2 + n}{2^{n+1} n(n + 1)} = 1$ .

4. $\sum_{n=1}^{\infty} \frac{2^n + 3^n}{6^n} = \frac{3}{2}$ .

9. $\sum_{n=1}^{\infty} \frac{(-1)^{n-1}(2n+1)}{n(n+1)} = 1$ .

5. $\sum_{n=1}^{\infty} \frac{\sqrt{n+1} - \sqrt{n}}{\sqrt{n^2 + n}} = 1.$

10. $\sum_{n=2}^{\infty} \frac{\log [(1 + 1/n)^n(1 + n)]}{(\log n^n)[\log (n + 1)^{n+1}]} = \log_2 \sqrt{e}$ .

Power series for $\log(1+x)$ and $\arctan x$ were obtained in Section 10.8 by performing various operations on the geometric series. In a similar manner, without attempting to justify the steps, obtain the formulas in Exercises 11 through 19. They are all valid at least for $|x|<1$ . (The theoretical justification is provided in Section 11.8.)

11. $\sum_{n=1}^{\infty} n x^{n} = \frac{x}{(1 - x)^{2}}$ .

16. $\sum_{n=1}^{\infty} \frac{x^{2n-1}}{2n-1} = \frac{1}{2} \log \frac{1 + x}{1 - x}$ .

12. $\sum_{n=1}^{\infty} n^{2} x^{n} = \frac{x^{2} + x}{(1 - x)^{3}}$ .

17. $\sum_{n=0}^{\infty}(n+1)x^{n}=\frac{1}{(1-x)^{2}}.$

13. $\sum_{n=1}^{\infty} n^{3} x^{n} = \frac{x^{3} + 4x^{2} + x}{(1 - x)^{4}}$ .

18. $\sum_{n=0}^{\infty} \frac{(n+1)(n+2)}{2!} x^n = \frac{1}{(1-x)^3}$ .

14. $\sum_{n=1}^{\infty} n^{4} x^{n} = \frac{x^{4} + 11x^{3} + 11x^{2} + x}{(1 - x)^{5}}$ .

19. $\sum_{n=0}^{\infty} \frac{(n+1)(n+2)(n+3)}{3!} x^n = \frac{1}{(1-x)^4}$ .

15. $\sum_{n=1}^{\infty} \frac{x^n}{n} = \log \frac{1}{1 - x}$ .

20. The results of Exercises 11 through 14 suggest that there exists a general formula of the form

$$
\sum_ {n = 1} ^ {\infty} n ^ {k} x ^ {n} = \frac {P _ {k} (x)}{(1 - x) ^ {k + 1}},
$$

where $P_{k}(x)$ is a polynomial of degree $k$ , the term of lowest degree being $x$ and that of highest degree being $x^{k}$ . Prove this by induction, without attempting to justify the formal manipulations with the series.

21. The results of Exercises 17 through 19 suggest the more general formula

$$
\sum_ {n = 0} ^ {\infty} \binom {n + k} {k} x ^ {n} = \frac {1}{(1 - x) ^ {k + 1}}, \quad \text { where } \quad \binom {n + k} {k} = \frac {(n + 1) (n + 2) \cdots (n + k)}{k !}.
$$

Prove this by induction, without attempting to justify the formal manipulations with the series.

22. Given that $\sum_{n=0}^{\infty} x^n / n! = e^x$ for all $x$ , find the sums of the following series, assuming it is permissible to operate on infinite series as though they were finite sums.

$$
\text {(a)} \sum_ {n = 2} ^ {\infty} \frac {n - 1}{n !}.
$$

$$
\text {(b)} \sum_ {n = 2} ^ {\infty} \frac {n + 1}{n !}.
$$

$$
\text {(c)} \sum_ {n = 2} ^ {\infty} \frac {(n - 1) (n + 1)}{n !}.
$$

23. (a) Given that $\sum_{n=0}^{\infty} x^n / n! = e^x$ for all $x$ , show that

$$
\sum_ {n = 1} ^ {\infty} \frac {n ^ {2} x ^ {n}}{n !} = (x ^ {2} + x) e ^ {x},
$$

assuming it is permissible to operate on these series as though they were finite sums.

(b) The sum of the series $\sum_{n=1}^{\infty} 1n^{3}/n!$ is $ke$ , where $k$ is a positive integer. Find the value of $k$ . Do not attempt to justify formal manipulations.

24. Two series $\sum_{n=1}^{\infty} a_n$ and $\sum_{n=1}^{\infty} b_n$ are called identical if $a_n = b_n$ for each $n \geq 1$ . For example, the series

$$
0 + 0 + 0 + \dots \quad \text { and } \quad (1 - 1) + (1 - 1) + (1 - 1) + \dots
$$

are identical, but the series

$$
1 + 1 + 1 + \dots \quad \text { and } \quad 1 + 0 + 1 + 0 + 1 + 0 + \dots
$$

are not identical. Determine whether or not the series are identical in each of the following pairs:

$$
\begin{array}{l l} \text {(a)} 1 - 1 + 1 - 1 + \dots & \text {and} \quad (2 - 1) - (3 - 2) + (4 - 3) - (5 - 4) + \dots . \\ \text {(b)} 1 - 1 + 1 - 1 + \dots & \text {and} \quad (1 - 1) + (1 - 1) + (1 - 1) + (1 - 1) + \dots . \\ \text {(c)} 1 - 1 + 1 - 1 + \dots & \text {and} \quad 1 + (- 1 + 1) + (- 1 + 1) + (- 1 + 1) + \dots . \\ \text {(d)} 1 + \frac {1}{2} + \frac {1}{4} + \frac {1}{8} + \dots & \text {and} \quad 1 + (1 - \frac {1}{2}) + (\frac {1}{2} - \frac {1}{4}) + (\frac {1}{4} - \frac {1}{8}) + \dots . \end{array}
$$

25. (a) Use (10.26) to prove that

$$
1 + 0 + x ^ {2} + 0 + x ^ {4} + \dots = \frac {1}{1 - x ^ {2}} \quad \text { if } | x | <   1.
$$

Note that, according to the definition given in Exercise 24, this series is not identical to the one in (10.26) if $x \neq 0$ .

(b) Apply Theorem 10.2 to the result in part (a) and to (10.25) to deduce (10.27).

(c) Show that Theorem 10.2 when applied directly to (10.25) and (10.26) does not yield (10.27). Instead, it yields the formula $\sum_{n=1}^{\infty}(x^n - x^{2n}) = x / (1 - x^2)$ , valid for $|x| < 1$ .

## \*10.10 Exercises on decimal expansions

Decimal representations of real numbers were introduced in Section I3.15. It was shown there that every positive real $x$ has a decimal representation of the form

$$
x = a _ {0} \cdot a _ {1} a _ {2} a _ {3} \dots ,
$$

where $0 \leq a_k \leq 9$ for each $k \geq 1$ . The number $x$ is related to the digits $a_0, a_1, a_2, \ldots$ by the inequalities

$$
a _ {0} + \frac {a _ {1}}{1 0} + \dots + \frac {a _ {n}}{1 0 ^ {n}} \leq x <   a _ {0} + \frac {a _ {1}}{1 0} + \dots + \frac {a _ {n - 1}}{1 0 ^ {n - 1}} + \frac {a _ {n} + 1}{1 0 ^ {n}}.\tag{10.35}
$$

If we let $s_n = \sum_{k=0}^{n} a_k / 10^k$ , and if we subtract $s_n$ from each member of (10.35), we obtain

$$
0 \leq x - s _ {n} <   1 0 ^ {- n}.
$$

This shows that $s_n \to x$ as $n \to \infty$ , and hence $x$ is given by the convergent series

$$
x = \sum_ {k = 0} ^ {\infty} \frac {a _ {k}}{1 0 ^ {k}}.\tag{10.36}
$$

Each of the infinite decimal expansions in Exercises 1 through 5 is understood to be repeated indefinitely as suggested. In each case, express the decimal as an infinite series, find the sum of the series, and thereby express $x$ as a quotient of two integers.

1. $x = 0.4444\ldots$

2. $x = 0.51515151\ldots$

$$
\begin{array}{l} 4. x = 0. 1 2 3 1 2 3 1 2 3 1 2 3 \dots \\ 5. x = 0. 1 4 2 8 5 7 1 4 2 8 5 7 1 4 2 8 5 7 1 4 2 8 5 7 \dots \end{array}
$$

3. $x = 2.02020202\ldots$

6. Prove that every repeating decimal represents a rational number.

7. If a number has a decimal expansion which ends in zeros, such as $\frac{1}{8} = 0.1250000\ldots$ , then this number can also be written as a decimal which ends in nines if we decrease the last nonzero digit by one unit. For example, $\frac{1}{8} = 0.1249999\ldots$ . Use infinite series to prove this statement.

The decimal representation in (10.36) may be generalized by replacing the integer 10 by any other integer b > 1. If x > 0, let $a_{0}$ denote the greatest integer in x; assuming that $a_{0}, a_{1}, \ldots, a_{n-1}$ have been defined, let $a_{n}$ denote the largest integer such that

$$
\sum_ {k = 0} ^ {n} \frac {a _ {k}}{b ^ {k}} \leq x.
$$

The following exercises refer to the sequence of integers $a_{0}$ , $a_{1}$ , $a_{2}$ , $\ldots$ so obtained.

8. Show that $0 \leq a_{k} \leq b - 1$ for each $k \geq 1$ .

9. Describe a geometric method for obtaining the numbers $a_0, a_1, a_2, \ldots$ .

10. Show that the series $\sum_{k=0}^{\infty} a_k / b^k$ converges and has sum $x$ . This provides a decimal expansion of $x$ in the scale of $b$ . Important special cases, other than $b = 10$ , are the binary scale, $b = 2$ , and the duodecimal scale, $b = 12$ .

## 10.11 Tests for convergence

In theory, the convergence or divergence of a particular series $\sum a_{n}$ is decided by examining its partial sums $s_{n}$ to see whether or not they tend to a finite limit as $n \to \infty$ . In some special cases, such as the geometric series, the sums defining $s_{n}$ may be simplified to the point where it becomes a simple matter to determine their behavior for large n. However, in the majority of cases there is no nice formula for simplifying $s_{n}$ and the convergence or divergence may be rather difficult to establish in a straightforward manner. Early investigators in the subject, notably Cauchy and his contemporaries, realized this difficulty and they developed a number of “convergence tests” that by-passed the need for an explicit knowledge of the partial sums. A few of the simplest and most useful of these tests will be discussed in this chapter, but first we want to make some general remarks about the nature of these tests.

Convergence tests may be broadly classified into three categories: (i) sufficient conditions; (ii) necessary conditions; (iii) necessary and sufficient conditions. A test of type (i) may be expressed symbolically as follows:

$$
\text {   "If   } C \text {   is   satisfied,   then   } \sum a _ {n} \text {   converges,"   }
$$

where $C$ stands for the condition in question. Tests of type (ii) have the form

$$
\text {   "If   } \sum a _ {n} \text {   converges,   then   } C \text {   is   satisfied,"   }
$$

whereas those of type (iii) may be written thus:

$$
" \sum a _ {n} \text {   converges   if   and   only   if   } C \text {   is   satisfied." }
$$

We shall see presently that there are tests of type (ii) that are not of type (i) (and vice versa). Beginners often use such tests incorrectly by failing to realize the difference between a necessary condition and a sufficient condition. Therefore the reader should make an effort to keep this distinction in mind when using a particular test in practice.

The simplest of all convergence tests gives a necessary condition for convergence and may be stated as follows.

THEOREM 10.6. If the series $\sum a_{n}$ converges, then its nth term tends to 0; that is,

$$
\lim _ {n \to \infty} a _ {n} = 0.\tag{10.37}
$$

Proof. Let $s_{n}=a_{1}+a_{2}+\cdots+a_{n}$ . Then $a_{n}=s_{n}-s_{n-1}$ . As $n\to\infty$ , both $s_{n}$ and $s_{n-1}$ tend to the same limit and hence $a_{n}\to0$ . This proves the theorem.

This is an example of a test of type (ii) which is not of type (i). Condition (10.37) is not sufficient for convergence. For example, when $a_{n} = 1/n$ , the condition $a_{n} \to 0$ is satisfied but the series $\sum 1/n$ diverges. The real usefulness of this test is that it gives us a sufficient condition for divergence. That is, if the terms $a_{n}$ of a series $\sum a_{n}$ do not tend to zero, then the series must diverge. This statement is logically equivalent to Theorem 10.6.

## 10.12 Comparison tests for series of nonnegative terms

In this section we shall be concerned with series having nonnegative terms, that is, series of the form $\sum a_{n}$ , where each $a_{n} \geq 0$ . Since the partial sums of such series are monotonic increasing, we may use Theorem 10.1 to obtain the following necessary and sufficient condition for convergence.

THEOREM 10.7. Assume that $a_{n} \geq 0$ for each $n \geq 1$ . Then the series $\sum a_{n}$ converges if and only if the sequence of its partial sums is bounded above.

If the partial sums are bounded above by a number $M$ , say, then the sum of the series cannot exceed $M$ .

EXAMPLE 1. Theorem 10.7 may be used to establish the convergence of the series $\sum_{n=1}^{\infty} 1/n!$ . We estimate the partial sums from above by using the inequality

$$
\frac {1}{k !} \leq \frac {1}{2 ^ {k - 1}},
$$

which is obviously true for all $k \geq 1$ since $k!$ consists of $k - 1$ factors, each $\geq 2$ . Therefore we have

$$
\sum_ {k = 1} ^ {n} \frac {1}{k !} \leq \sum_ {k = 1} ^ {n} \frac {1}{2 ^ {k - 1}} = \sum_ {k = 0} ^ {n - 1} \left(\frac {1}{2}\right) ^ {k} \leq \sum_ {k = 0} ^ {\infty} \left(\frac {1}{2}\right) ^ {k} = 2,
$$

the last series being a geometric series. The series $\sum_{n=1}^{\infty}1/n!$ is therefore convergent and has a sum $\leq2$ . We shall see later that the sum of this series is e-1, where e is the Euler number.

The convergence of the foregoing example was established by comparing the terms of the given series with those of a series known to converge. This idea may be pursued further to yield a number of tests known as comparison tests.

THEOREM 10.8. COMPARISON TEST. Assume $a_{n} \geq 0$ and $b_{n} \geq 0$ for all $n \geq 1$ . If there exists a positive constant $c$ such that

$$
a _ {n} \leq c b _ {n}\tag{10.38}
$$

for all $n$ , then convergence of $\sum b_n$ implies convergence of $\sum a_n$ .

Note: The conclusion may also be formulated as follows: “Divergence of $\sum a_{n}$ implies divergence of $\sum b_{n}$ .” This statement is logically equivalent to Theorem 10.8. When the inequality (10.38) is satisfied, we say that the series $\sum b_{n}$ dominates the series $\sum a_{n}$ .

Proof. Let $s_{n}=a_{1}+\cdots+a_{n}$ , $t_{n}=b_{1}+\cdots+b_{n}$ . Then (10.38) implies $s_{n}\leq ct_{n}$ . If $\sum b_{n}$ converges, its partial sums are bounded, say by M. Then $s_{n}\leq cM$ , and hence $\sum a_{n}$ is also convergent since its partial sums are bounded by cM. This completes the proof.

Omitting a finite number of terms at the beginning of a series does not affect its convergence or divergence. Therefore Theorem 10.8 still holds true if the inequality (10.38) is valid only for all $n \geq N$ for some N.

THEOREM 10.9. LIMIT COMPARISON TEST. Assume that $a_{n} > 0$ and $b_{n} > 0$ for all $n \geq 1$ , and suppose that

$$
\lim _ {n \rightarrow \infty} \frac {a _ {n}}{b _ {n}} = 1.\tag{10.39}
$$

Then $\sum a_{n}$ converges if and only if $\sum b_{n}$ converges.

Proof. There exists an N such that $n \geq N$ implies $\frac{1}{2} < a_{n}/b_{n} < \frac{3}{2}$ . Therefore $b_{n} < 2a_{n}$ and $a_{n} < \frac{3}{2}b_{n}$ for all $n \geq N$ , and the theorem follows by applying Theorem 10.8 twice.

Note that Theorem 10.9 also holds if $\lim_{n\to \infty}a_n / b_n = c$ , provided that $c > 0$ , because we then have $\lim_{n\to \infty}a_n / (cb_n) = 1$ and we may compare $\sum a_{n}$ with $\sum (cb_{n})$ . However, if $\lim_{n\to \infty}a_n / b_n = 0$ , we conclude only that convergence of $\sum b_{n}$ implies convergence of $\sum a_{n}$ .

DEFINITION. Two sequences $\{a_{n}\}$ and $\{b_{n}\}$ of complex numbers are said to be asymptotically equal if

$$
\lim _ {n \rightarrow \infty} \frac {a _ {n}}{b _ {n}} = 1.
$$

This relation is often indicated symbolically by writing

$$
a _ {n} \sim b _ {n} \quad \text { as } \quad n \rightarrow \infty .\tag{10.40}
$$

The notation $a_{n} \sim b_{n}$ is read “ $a_{n}$ is asymptotically equal to $b_{n}$ ,” and it is intended to suggest that $a_{n}$ and $b_{n}$ behave in essentially the same way for large n. Using this terminology, we may state the limit comparison test in the following manner.

THEOREM 10.10. Two series $\sum a_{n}$ and $\sum b_{n}$ with terms that are positive and asymptotically equal converge together or they diverge together.

EXAMPLE 2. THE RIEMANN ZETA-FUNCTION. In Example 1 of Section 10.7, we proved that $\sum 1/(n^{2}+n)$ is a convergent telescoping series. If we use this as a comparison series, it follows that $\sum 1/n^{2}$ is convergent, since $1/n^{2} \sim 1/(n^{2}+n)$ as $n \to \infty$ . Also, $\sum 1/n^{2}$ dominates $\sum 1/n^{s}$ for $s \geq 2$ , and therefore $\sum 1/n^{s}$ converges for every real $s \geq 2$ . We shall prove in the next section that this series also converges for every $s > 1$ . Its sum, denoted by $\zeta(s)$ ( $\zeta$ is the Greek letter zeta), defines an important function in analysis known as the Riemann zeta-function:

$$
\zeta (s) = \sum_ {n = 1} ^ {\infty} \frac {1}{n ^ {s}} \quad \text { if } \quad s > 1.
$$

Euler discovered many beautiful formulas involving $\zeta(s)$ . In particular, he found that $\zeta(2) = \pi^2/6$ , a result which is not easy to derive at this stage.

EXAMPLE 3. Since $\sum 1/n$ diverges, every series having positive terms asymptotically equal to 1/n must also diverge. For example, this is true of the two series

$$
\sum_ {n = 1} ^ {\infty} \frac {1}{\sqrt {n (n + 1 0)}} \quad \text { and } \quad \sum_ {n = 1} ^ {\infty} \sin \frac {1}{n}.
$$

The relation $\sin 1/n \sim 1/n$ follows from the fact that $(\sin x)/x \to 1$ as $x \to 0$ .

## 10.13 The integral test

To use comparison tests effectively, we must have at our disposal some examples of series of known behavior. The geometric series and the zeta-function are useful for this purpose. New examples can be obtained very simply by applying the integral test, first proved by Cauchy in 1837.

![](images/7a08e2cafcac5842b99cdb5e5a9d8353a49dd81b516cf87eb5afc86650749ba8.jpg)

![](images/66ad0375356ff30417c91fd85d40ef4c12a4f17c464407d4b9bad77ad2b6cfed.jpg)  
FIGURE 10.4 Proof of the integral test.

THEOREM 10.11. INTEGRAL TEST. Let $f$ be a positive decreasing function, defined for all real $x \geq 1$ . For each $n \geq 1$ , let

$$
s _ {n} = \sum_ {k = 1} ^ {n} f (k) \quad a n d \quad t _ {n} = \int_ {1} ^ {n} f (x) d x.
$$

Then both sequences $\{s_n\}$ and $\{t_n\}$ converge or both diverge.

Proof. By comparing f with appropriate step functions as suggested in Figure 10.4, we obtain the inequalities

$$
\sum_ {k = 2} ^ {n} f (k) \leq \int_ {1} ^ {n} f (x) d x \leq \sum_ {k = 1} ^ {n - 1} f (k)
$$

or $s_{n}-f(1)\leq t_{n}\leq s_{n-1}$ . Since both sequences $\{s_{n}\}$ and $\{t_{n}\}$ are monotonic increasing, these inequalities show that both are bounded above or both are unbounded. Therefore, both sequences converge or both diverge, as asserted.

EXAMPLE 1. The integral test enables us to prove that

$$
\sum_ {n = 1} ^ {\infty} \frac {1}{n ^ {s}} \quad \text { converges   if   and   only   if } \quad s > 1.
$$

Taking $f(x) = x^{-s}$ , we have

$$
t _ {n} = \int_ {1} ^ {n} \frac {1}{x ^ {s}} d x = \left\{ \begin{array}{l l} \frac {n ^ {1 - s} - 1}{1 - s} & \text {if} s \neq 1, \\ \log n & \text {if} s = 1. \end{array} \right.
$$

When $s > 1$ the term $n^{1 - s} \to 0$ as $n \to \infty$ and hence $\{t_n\}$ converges. By the integral test, this implies convergence of the series for $s > 1$ .

When $s \leq 1$ , then $t_n \to \infty$ and the series diverges. The special case $s = 1$ (the harmonic series) was discussed earlier in Section 10.5. Its divergence was known to Leibniz.

EXAMPLE 2. The same method may be used to prove that

$$
\sum_ {n = 2} ^ {\infty} \frac {1}{n (\log n) ^ {s}}
$$

converges if and only if $s > 1$ .

(We start the sum with $n = 2$ to avoid $n$ for which $\log n$ may be zero.)

The corresponding integral in this case is

$$
t _ {n} = \int_ {2} ^ {n} \frac {1}{x (\log x) ^ {s}} d x = \left\{ \begin{array}{l l} \frac {(\log n) ^ {1 - s} - (\log 2) ^ {1 - s}}{1 - s} & \text {if} s \neq 1, \\ \log (\log n) - \log (\log 2) & \text {if} s = 1. \end{array} \right.
$$

Thus $\{t_n\}$ converges if and only if $s > 1$ , and hence, by the integral test, the same holds true for the series in question.

## 10.14 Exercises

Test the following series for convergence or divergence. In each case, give a reason for your decision.

1. $\sum_{n=1}^{\infty} \frac{n}{(4n - 3)(4n - 1)}$ .

5. $\sum_{n=1}^{\infty} \frac{|\sin nx|}{n^2}$ .

2. $\sum_{n=1}^{\infty} \frac{\sqrt{2n-1} \log(4n+1)}{n(n+1)}$ .

6. $\sum_{n=1}^{\infty} \frac{2 + (-1)^n}{2^n}$ .

3. $\sum_{n=1}^{\infty} \frac{n+1}{2^n}$ .

7. $\sum_{n = 1}^{\infty}\frac{n!}{(n + 2)!}$ .

4. $\sum_{n=1}^{\infty} \frac{n^{2}}{2^{n}}$ .

8. $\sum_{n=2}^{\infty} \frac{\log n}{n\sqrt{n+1}}$ .

9. $\sum_{n=1}^{\infty} \frac{1}{\sqrt{n(n+1)}}$ .

14. $\sum_{n=1}^{\infty} \frac{n \cos^{2}(n\pi/3)}{2^{n}}$ .

10. $\sum_{n=1}^{\infty} \frac{1 + \sqrt{n}}{(n+1)^3 - 1}$ .

15. $\sum_{n=3}^{\infty} \frac{1}{n \log n (\log \log n)^s}$ .

11. $\sum_{n=2}^{\infty} \frac{1}{(\log n)^s}$ .

16. $\sum_{n=1}^{\infty} ne^{-n^2}$ .

12. $\sum_{n=1}^{\infty} \frac{|a_n|}{10^n}$ , $|a_n| < 10$ .

17. $\sum_{n=1}^{\infty} \int_{0}^{1/n} \frac{\sqrt{x}}{1 + x^2} dx.$

13. $\sum_{n=1}^{\infty} \frac{1}{1000n + 1}$ .

18. $\sum_{n=1}^{\infty} \int_{n}^{n+1} e^{-\sqrt{x}} dx.$

19. Assume $f$ is a nonnegative increasing function defined for all $x \geq 1$ . Use the method suggested by the proof of the integral test to show that

$$
\sum_ {k = 1} ^ {n - 1} f (k) \leq \int_ {1} ^ {n} f (x) d x \leq \sum_ {k = 2} ^ {n} f (k).
$$

Take $f(x) = \log x$ and deduce the inequalities

$$
e n ^ {n} e ^ {- n} <   n! <   e n ^ {n + 1} e ^ {- n}.\tag{10.41}
$$

These give a rough estimate of the order of magnitude of $n!$ . From (10.41), we may write

$$
\frac {e ^ {1 / n}}{e} <   \frac {(n !) ^ {1 / n}}{n} <   \frac {e ^ {1 / n} n ^ {1 / n}}{e}.
$$

Letting $n\to \infty$ , we find that

$$
\frac {(n !) ^ {1 / n}}{n} \rightarrow \frac {1}{e} \quad \text { or } \quad (n!) ^ {1 / n} \sim \frac {n}{e} \quad \text { as } \quad n \rightarrow \infty .
$$

## 10.15 The root test and the ratio test for series of nonnegative terms

Using the geometric series $\sum x^n$ as a comparison series, Cauchy developed two useful tests known as the root test and the ratio test.

If $\sum a_{n}$ is a series whose terms (from some point on) satisfy an inequality of the form

$$
0 \leq a _ {n} \leq x ^ {n}, \quad \text { where } \quad 0 <   x <   1,\tag{10.42}
$$

a direct application of the comparison test (Theorem 10.8) tells us that $\sum a_{n}$ converges. The inequalities in (10.42) are equivalent to

$$
0 \leq a _ {n} ^ {1 / n} \leq x;\tag{10.43}
$$

hence the name root test.

If the sequence $\{a_n^{1 / n}\}$ is convergent, the test may be restated in a somewhat more useful form that makes no reference to the number $x$ .

THEOREM 10.12. ROOT TEST. Let $\sum a_{n}$ be a series of nonnegative terms such that

$$
a _ {n} ^ {\mathbf {1} / n} \rightarrow R \quad a s \quad n \rightarrow \infty .
$$

(a) If $R < 1$ , the series converges.

(b) If $R > 1$ , the series diverges.

(c) If $R = 1$ , the test is inconclusive.

Proof. Assume R < 1 and choose x so that R < x < 1. Then (10.43) must be satisfied for all $n \geq N$ for some N. Hence, $\sum a_{n}$ converges by the comparison test. This proves (a). To prove (b), we observe that R > 1 implies $a_{n} > 1$ for infinitely many values of n and hence $a_{n}$ cannot tend to 0. Therefore, by Theorem 10.6, $\sum a_{n}$ diverges. This proves (b). To prove (c), consider the two examples in which $a_{n} = 1/n$ and $a_{n} = 1/n^{2}$ . In both cases R = 1 since $n^{1/n} \to 1$ as $n \to \infty$ [see Equation (10.12) of Section 10.2], but $\sum 1/n$ diverges whereas $\sum 1/n^{2}$ converges.

EXAMPLE 1. The root test makes it easy to determine the convergence of the series $\sum_{n=3}^{\infty} (\log n)^{-n}$ since

$$
a _ {n} ^ {1 / n} = \frac {1}{\log n} \rightarrow 0 \quad \text {as} \quad n \rightarrow \infty .
$$

EXAMPLE 2. Applying the root test to $\sum [n / (n + 1)]^{n^2}$ , we find that

$$
a _ {n} ^ {1 / n} = \left(\frac {n}{n + 1}\right) ^ {n} = \frac {1}{(1 + 1 / n) ^ {n}} \rightarrow \frac {1}{e} \quad \text { as } \quad n \rightarrow \infty ,
$$

by Equation (10.13) of Section 10.2. Since $1 / e < 1$ , the series converges.

A slightly different use of the comparison test yields the ratio test.

THEOREM 10.13. RATIO TEST. Let $\sum a_{n}$ be a series of positive terms such that

$$
\frac {a _ {n + 1}}{a _ {n}} \rightarrow L \quad a s \quad n \rightarrow \infty .
$$

(a) If $L < 1$ , the series converges.

(b) If $L > 1$ , the series diverges.

(c) If $L = 1$ , the test is inconclusive.

Proof. Assume $L < 1$ and choose $x$ so that $L < x < 1$ . Then there must be an $N$ such that $a_{n+1} / a_n < x$ for all $n \geq N$ . This implies

$$
\frac {a _ {n + 1}}{x ^ {n + 1}} <   \frac {a _ {n}}{x ^ {n}} \quad \text { for   all } n \geq N.
$$

In other words, the sequence $\{a_{n}/x^{n}\}$ is decreasing for $n \geq N$ . In particular, when $n \geq N$ , we must have $a_{n}/x^{n} \leq a_{N}/x^{N}$ , or, in other words,

$$
a _ {n} \leq c x ^ {n}, \quad \text { where } \quad c = \frac {a _ {N}}{x ^ {N}}.
$$

Therefore $\sum a_{n}$ is dominated by the convergent series $\sum x^{n}$ . This proves (a).

To prove (b), we simply observe that $L > 1$ implies $a_{n+1} > a_n$ for all $n \geq N$ for some $N$ , and hence $a_n$ cannot approach 0.

Finally, (c) is proved by using the same examples as in Theorem 10.12.

Warning. If the test ratio $a_{n+1}/a_{n}$ is always less than 1, it does not necessarily follow that the limit L will be less than 1. For example, the harmonic series, which diverges, has test ratio $n/(n+1)$ which is always less than 1 but the limit L equals 1. On the other hand, for divergence it is sufficient that the test ratio be greater than 1 for all sufficiently large n because for such n we have $a_{n+1} > a_{n}$ and $a_{n}$ cannot approach 0.

EXAMPLE 3. We may establish the convergence of the series $\sum n! / n^n$ by the ratio test. The ratio of consecutive terms is

$$
\frac {a _ {n + 1}}{a _ {n}} = \frac {(n + 1) !}{(n + 1) ^ {n + 1}} \cdot \frac {n ^ {n}}{n !} = \left(\frac {n}{n + 1}\right) ^ {n} = \frac {1}{(1 + 1 / n) ^ {n}} \rightarrow \frac {1}{e} \quad \text {as} \quad n \rightarrow \infty ,
$$

by formula (10.13) of Section 10.2. Since $1 / e < 1$ , the series converges. In particular, this implies that the general term of the series tends to 0; that is,

$$
\frac {n !}{n ^ {n}} \rightarrow 0 \quad \text { as } \quad n \rightarrow \infty .\tag{10.44}
$$

This is often described by saying that $n^{n}$ “grows faster” than $n!$ for large n. Also, with a natural extension of the o-notation, we can write (10.44) as follows: $n! = o(n^{n})$ as $n \to \infty$ .

Note: The relation (10.44) may also be proved directly by writing

$$
{\frac {n !}{n ^ {n}}} = {\frac {1}{n}} \cdot {\frac {2}{n}} \cdot \cdot \cdot {\frac {k}{n}} \cdot {\frac {k + 1}{n}} \cdot \cdot \cdot {\frac {n}{n}},
$$

where $k = n / 2$ if $n$ is even, and $k = (n - 1) / 2$ if $n$ is odd. If $n \geq 2$ , the product of the first $k$ factors on the right does not exceed $(\frac{1}{2})^k$ , and each of the remaining factors does not exceed 1. Since $(\frac{1}{2})^k \to 0$ as $n \to \infty$ , this proves (10.44). Relation (10.44) also follows from (10.41).

The reader should realize that both the root test and the ratio test are, in reality, special cases of the comparison test. In both tests when we have case (a), convergence is deduced from the fact that the series in question can be dominated by a suitable geometric series $\sum x^{n}$ . The usefulness of these tests in practice is that a knowledge of a particular comparison series $\sum x^{n}$ is not explicitly required. Further convergence tests may be deduced by using the comparison test in other ways. Two important examples known as Raabe's test and Gauss' test are described in Exercises 16 and 17 of Section 10.16. These are often helpful when the ratio test fails.

## 10.16 Exercises

Test the following series for convergence or divergence and give a reason for your decision in each case.

1. $\sum_{n = 1}^{\infty}\frac{(n!)^{2}}{(2n)!}$

8. $\sum_{n=1}^{\infty} (n^{1/n} - 1)^n$ .

2. $\sum_{n=1}^{\infty} \frac{(n!)^{2}}{2^{n^{2}}}$ .

9. $\sum_{n=1}^{\infty} e^{-n^2}$ .

3. $\sum_{n=1}^{\infty} \frac{2^n n!}{n^n}$ .

10. $\sum_{n=1}^{\infty}\left(\frac{1}{n}-e^{-n^{2}}\right)$ .

4. $\sum_{n=1}^{\infty} \frac{3^n n!}{n^n}$ .

11. $\sum_{n=1}^{\infty} \frac{(1000)^n}{n!}$ .

5. $\sum_{n=1}^{\infty} \frac{n!}{3^n}$ .

12. $\sum_{n=1}^{\infty} \frac{n^{n+1/n}}{(n + 1/n)^n}$ .

6. $\sum_{n=1}^{\infty} \frac{n!}{2^{2n}}$ .

13. $\sum_{n=1}^{\infty} \frac{n^{3}[\sqrt{2} + (-1)^{n}]^{n}}{3^{n}}$ .

7. $\sum_{n=2}^{\infty} \frac{1}{(\log n)^{1/n}}$ .

14. $\sum_{n=1}^{\infty} r^n |\sin nx|, \quad r > 0.$

15. Let $\{a_{n}\}$ and $\{b_{n}\}$ be two sequences with $a_{n} > 0$ and $b_{n} > 0$ for all $n \geq N$ , and let $c_{n} = b_{n} - b_{n+1}a_{n+1}/a_{n}$ . Prove that:

(a) If there is a positive constant $r$ such that $c_{n} \geq r > 0$ for all $n \geq N$ , then $\sum a_{n}$ converges. [Hint: Show that $\sum_{k=N}^{n} a_{k} \leq a_{N} b_{N} / r$ .]

(b) If $c_{n} \leq 0$ for $n \geq N$ and if $\sum 1 / b_{n}$ diverges, then $\sum a_{n}$ diverges.

[Hint: Show that $\sum a_{n}$ dominates $\sum 1 / b_n$ .]

16. Let $\sum a_{n}$ be a series of positive terms. Prove Raabe's test: If there is an $r > 0$ and an $N \geq 1$ such that

$$
\frac {a _ {n + 1}}{a _ {n}} \leq 1 - \frac {1}{n} - \frac {r}{n} \quad \text { for   all } n \geq N,
$$

then $\sum a_{n}$ converges. The series $\sum a_{n}$ diverges if

$$
\frac {a _ {n + 1}}{a _ {n}} \geq 1 - \frac {1}{n} \quad \text { for   all } n \geq N.
$$

[Hint: Use Exercise 15 with $b_{n+1} = n$ .]

17. Let $\sum a_{n}$ be a series of positive terms. Prove Gauss' test: If there is an $N \geq 1$ , an $s > 1$ , and an $M > 0$ such that

$$
\frac {a _ {n + 1}}{a _ {n}} = 1 - \frac {A}{n} + \frac {f (n)}{n ^ {s}} \quad \text {for} n \geq N,
$$

where $|f(n)| \leq M$ for all $n$ , then $\sum a_{n}$ converges if $A > 1$ and diverges if $A \leq 1$ .

[Hint: If $A \neq 1$ , use Exercise 16. If $A = 1$ , use Exercise 15 with $b_{n+1} = n \log n$ .]

18. Use Gauss' test (in Exercise 17) to prove that the series

$$
\sum_ {n = 1} ^ {\infty} \left(\frac {1 \cdot 3 \cdot 5 \cdot \cdots (2 n - 1)}{2 \cdot 4 \cdot 6 \cdot \cdots (2 n)}\right) ^ {k}
$$

converges if $k > 2$ and diverges if $k \leq 2$ . For this example the ratio test fails.

## 10.17 Alternating series

Up to now we have been concerned largely with series of nonnegative terms. We wish to turn our attention next to series whose terms may be positive or negative. The simplest examples occur when the terms alternate in sign. These are called alternating series and they have the form

$$
\sum_ {n = 1} ^ {\infty} (- 1) ^ {n - 1} a _ {n} = a _ {1} - a _ {2} + a _ {3} - a _ {4} + \dots + (- 1) ^ {n - 1} a _ {n} + \dots ,\tag{10.45}
$$

where each $a_{n} > 0$ .

Examples of alternating series were known to many early investigators. We have already mentioned the logarithmic series

$$
\log (1 + x) = x - \frac {x ^ {2}}{2} + \frac {x ^ {3}}{3} - \frac {x ^ {4}}{4} + \dots + (- 1) ^ {n - 1} \frac {x ^ {n}}{n} + \dots .
$$

As we shall prove later on, this series converges and has the sum $\log(1+x)$ whenever $-1<x\leq1$ . For positive x, it is an alternating series. In particular, when x=1 we obtain the formula

$$
\log 2 = 1 - \frac {1}{2} + \frac {1}{3} - \frac {1}{4} + \dots + \frac {(- 1) ^ {n - 1}}{n} + \dots ,\tag{10.46}
$$

which tells us that the alternating harmonic series has the sum log 2. This result is of special interest in view of the fact that the harmonic series $\sum 1 / n$ diverges.

Closely related to (10.46) is the interesting formula

$$
{\frac {\pi}{4}} = 1 - {\frac {1}{3}} + {\frac {1}{5}} - {\frac {1}{7}} + \dots + {\frac {(- 1) ^ {n - 1}}{2 n - 1}} + \dots\tag{10.47}
$$

discovered by James Gregory in 1671. Leibniz rediscovered this result in 1673 while computing the area of a unit circular disk.

Both series in (10.46) and in (10.47) are alternating series of the form (10.45) in which the sequence $\{a_{n}\}$ decreases monotonically to zero. Leibniz noticed, in 1705, that this simple property of the $a_{n}$ implies the convergence of any alternating series.

THEOREM 10.14. LEIBNIZ'S RULE. If $\{a_n\}$ is a monotonic decreasing sequence with limit 0, then the alternating series $\sum_{n=1}^{\infty} (-1)^{n-1} a_n$ converges. If $S$ denotes its sum and $s_n$ its nth partial sum, we also have the inequalities

$$
0 <   (- 1) ^ {n} (S - s _ {n}) <   a _ {n + 1} \quad f o r e a c h n \geq 1.\tag{10.48}
$$

The inequalities in (10.48) provide a useful way to estimate the error in approximating the sum S by any partial sum $s_{n}$ . The first inequality tells us that the error, $S - s_{n}$ , has the sign $(-1)^{n}$ , which is the same as the sign of the first neglected term, $(-1)^{n}a_{n+1}$ . The second inequality states that the absolute value of this error is less than that of the first neglected term.

![](images/a4e6615c8332060e19a048c51d90155609ef69e6d6a051cb5fee760fd01d6bbc.jpg)  
FIGURE 10.5 Proof of Leibniz's rule for alternating series.

Proof. The idea of the proof of Leibniz's rule is quite simple and is illustrated in Figure 10.5. The partial sums $s_{2n}$ (consisting of an even number of terms) form an increasing sequence because $s_{2n+2} - s_{2n} = a_{2n+1} - a_{2n+2} > 0$ . Similarly, the partial sums $s_{2n-1}$ form a decreasing sequence. Both sequences are bounded below by $s_2$ and above by $s_1$ . Therefore, each sequence $\{s_{2n}\}$ and $\{s_{2n-1}\}$ , being monotonic and bounded, converges to a limit, say $s_{2n} \to S'$ , and $s_{2n-1} \to S''$ . But $S' = S''$ because

$$
S ^ {\prime} - S ^ {\prime \prime} = \lim _ {n \to \infty} s _ {2 n} - \lim _ {n \to \infty} s _ {2 n - 1} = \lim _ {n \to \infty} (s _ {2 n} - s _ {2 n - 1}) = \lim _ {n \to \infty} (- a _ {2 n}) = 0.
$$

If we denote this common limit by $S$ , it is clear that the series converges and has sum $S$ . To derive the inequalities in (10.48) we argue as follows: Since $s_{2n} \nearrow$ and $s_{2n-1} \searrow$ , we have

$$
s _ {2 n} <   s _ {2 n + 2} \leq S \quad \text { and } \quad S \leq s _ {2 n + 1} <   s _ {2 n - 1} \quad \text { for   all } n \geq 1.
$$

Therefore we have the inequalities

$$
0 <   S - s _ {2 n} \leq s _ {2 n + 1} - s _ {2 n} = a _ {2 n + 1} \quad \text {and} \quad 0 <   s _ {2 n - 1} - S \leq s _ {2 n - 1} - s _ {2 n} = a _ {2 n},
$$

which, taken together, yield (10.48). This completes the proof.

EXAMPLE 1. Since $1/n \searrow$ and $1/n \to 0$ as $n \to \infty$ , the convergence of the alternating harmonic series $1 - \frac{1}{2} + \frac{1}{3} - \frac{1}{4} + \cdots$ is an immediate consequence of Leibniz's rule. The sum of this series is computed below in Example 4.

EXAMPLE 2. The alternating series $\sum (-1)^n (\log n) / n$ converges. To prove this using Leibniz's rule, we must show that $(\log n) / n \to 0$ as $n \to \infty$ and that $(\log n) / n \searrow$ . The first statement follows from Equation (10.11) of Section 10.2. To prove the second statement, we note that the function $f$ for which

$$
f (x) = \frac {\log x}{x} \quad \text { when } \quad x > 0
$$

has the derivative $f'(x) = (1 - \log x)/x^{2}$ . When x > e, this is negative and f is monotonic decreasing. In particular, $f(n + 1) < f(n)$ for $n \geq 3$ .

EXAMPLE 3. An important limit relation may be derived as a consequence of Leibniz's rule. Let

$$
a _ {1} = 1, \quad a _ {2} = \int_ {1} ^ {2} \frac {d x}{x}, \quad a _ {3} = \frac {1}{2}, \quad a _ {4} = \int_ {2} ^ {3} \frac {d x}{x}, \quad \dots ,
$$

where, in general,

$$
a _ {2 n - 1} = \frac {1}{n} \quad \text { and } \quad a _ {2 n} = \int_ {n} ^ {n + 1} \frac {d x}{x} \quad \text { for } \quad n = 1, 2, 3, \dots .
$$

It is easy to verify that $a_{n} \to 0$ as $n \to \infty$ and that $a_{n} \searrow$ . Hence the series $\sum (-1)^{n-1} a_{n}$ converges. Denote its sum by $C$ and its $n$ th partial sum by $s_{n}$ . The $(2n - 1)$ st partial sum may be expressed as follows:

$$
\begin{array}{c} {s _ {2 n - 1} = 1 - \int_ {1} ^ {2} \frac {d x}{x} + \frac {1}{2} - \int_ {2} ^ {3} \frac {d x}{x} + \dots + \frac {1}{n - 1} - \int_ {n - 1} ^ {n} \frac {d x}{x} + \frac {1}{n}} \\ {= 1 + \frac {1}{2} + \dots + \frac {1}{n} - \int_ {1} ^ {n} \frac {d x}{x} = 1 + \frac {1}{2} + \dots + \frac {1}{n} - \log n.} \end{array}
$$

Since $s_{2n - 1} \to C$ as $n \to \infty$ , we obtain the following limit formula:

$$
\lim _ {n \to \infty} \left(1 + \frac {1}{2} + \dots + \frac {1}{n} - \log n\right) = C.\tag{10.49}
$$

The number C defined by this limit is called Euler's constant (sometimes denoted by $\gamma$ ). Like $\pi$ and e, this number appears in many analytic formulas. Its value, correct to ten decimals, is 0.5772156649. An interesting problem, unsolved to this time, is to decide whether Euler's constant is rational or irrational.

Relation (10.49) can also be expressed as follows:

$$
\sum_ {k = 1} ^ {n} \frac {1}{k} = \log n + C + o (1) \quad \text { as } \quad n \rightarrow \infty .\tag{10.50}
$$

From this it follows that the ratio $(1 + \frac{1}{2} + \cdots + 1/n)/\log n \to 1$ as $n \to \infty$ , so the partial sums of the harmonic series are asymptotically equal to $\log n$ . That is, we have

$$
\sum_ {k = 1} ^ {n} \frac {1}{k} \sim \log n \quad \text { as } \quad n \rightarrow \infty .
$$

The relation (10.50) not only explains why the harmonic series diverges, but it also gives us some concrete idea of the rate of growth of its partial sums. In the next example we use this relation to prove that the alternating harmonic series has the sum log 2.

EXAMPLE 4. Let $s_m = \sum_{k=1}^{m} (-1)^{k-1} / k$ . We know that $s_m$ tends to a limit as $m \to \infty$ , and we shall prove now that this limit is log 2. When $m$ is even, say $m = 2n$ , we may separate the positive and negative terms to obtain

$$
s _ {2 n} = \sum_ {k = 1} ^ {n} \frac {1}{2 k - 1} - \sum_ {k = 1} ^ {n} \frac {1}{2 k} = \left(\sum_ {k = 1} ^ {2 n} \frac {1}{k} - \sum_ {k = 1} ^ {n} \frac {1}{2 k}\right) - \sum_ {k = 1} ^ {n} \frac {1}{2 k} = \sum_ {k = 1} ^ {2 n} \frac {1}{k} - \sum_ {k = 1} ^ {n} \frac {1}{k}.
$$

Applying (10.50) to each sum on the extreme right, we obtain

$$
s _ {2 n} = (\log 2 n + C + o (1)) - (\log n + C + o (1)) = \log 2 + o (1),
$$

so $s_{2n} \to \log 2$ as $n \to \infty$ . This proves that the sum of the alternating harmonic series is log 2.

## 10.18 Conditional and absolute convergence

Although the alternating harmonic series $\sum(-1)^{n-1}/n$ is convergent, the series obtained by replacing each term by its absolute value is divergent. This shows that, in general, convergence of $\sum a_{n}$ does not imply convergence of $\sum |a_{n}|$ . In the other direction, we have the following theorem.

THEOREM 10.15. Assume $\sum |a_n|$ converges. Then $\sum a_{n}$ also converges, and we have

$$
\left| \sum_ {n = 1} ^ {\infty} a _ {n} \right| \leq \sum_ {n = 1} ^ {\infty} | a _ {n} |.\tag{10.51}
$$

Proof. Assume first that the terms $a_{n}$ are real. Let $b_{n} = a_{n} + |a_{n}|$ . We shall prove that $\sum b_{n}$ converges. It then follows (by Theorem 10.2) that $\sum a_{n}$ converges because $a_{n} = b_{n} - |a_{n}|$ .

Since $b_{n}$ is either 0 or 2 $|a_{n}|$ , we have $0 \leq b_{n} \leq 2 |a_{n}|$ , and hence $\sum |a_{n}|$ dominates $\sum b_{n}$ . Therefore $\sum b_{n}$ converges and, as already mentioned, this implies convergence of $\sum a_{n}$ .

Now suppose the terms $a_{n}$ are complex, say $a_{n} = u_{n} + iv_{n}$ , where $u_{n}$ and $v_{n}$ are real. Since $|u_{n}| \leq |a_{n}|$ , convergence of $\sum |a_{n}|$ implies convergence of $\sum |u_{n}|$ and this, in turn, implies convergence of $\sum u_{n}$ , since the $u_{n}$ are real. Similarly, $\sum v_{n}$ converges. By linearity, the series $\sum (u_{n} + iv_{n})$ converges.

To prove (10.51), we note that $|\sum_{k=1}^{n} a_k| \leq \sum_{k=1}^{n} |a_k|$ , and then we let $n \to \infty$ .

DEFINITION. A series $\sum a_{n}$ is called absolutely convergent if $\sum |a_{n}|$ converges. It is called conditionally convergent if $\sum a_{n}$ converges but $\sum |a_{n}|$ diverges.

If $\sum a_{n}$ and $\sum b_{n}$ are absolutely convergent, then so is the series $\sum (\alpha a_n + \beta b_n)$ for every

choice of $\alpha$ and $\beta$ . This follows at once from the inequalities

$$
\sum_ {n = 1} ^ {M} | \alpha a _ {n} + \beta b _ {n} | \leq | \alpha | \sum_ {n = 1} ^ {M} | a _ {n} | + | \beta | \sum_ {n = 1} ^ {M} | b _ {n} | \leq | \alpha | \sum_ {n = 1} ^ {\infty} | a _ {n} | + | \beta | \sum_ {n = 1} ^ {\infty} | b _ {n} |,
$$

which show that the partial sums of $\sum |\alpha a_{n} + \beta b_{n}|$ are bounded.

## 10.19 The convergence tests of Dirichlet and Abel

The convergence tests of the earlier sections that were developed for series of nonnegative terms may also be used to test absolute convergence of a series with arbitrary complex terms. In this section we discuss two tests that are often useful for determining convergence when the series might not converge absolutely. Both tests make use of an algebraic identity known as the Abel partial summation formula, named in honor of the Norwegian mathematician Niels Henrik Abel (1802–1829). Abel's formula is analogous to the formula for integration by parts and may be described as follows.

THEOREM 10.16. ABEL'S PARTIAL SUMMATION FORMULA. Let $\{a_n\}$ and $\{b_n\}$ be two sequences of complex numbers, and let

$$
A _ {n} = \sum_ {k = 1} ^ {n} a _ {k}.
$$

Then we have the identity

$$
\sum_ {k = 1} ^ {n} a _ {k} b _ {k} = A _ {n} b _ {n + 1} + \sum_ {k = 1} ^ {n} A _ {k} (b _ {k} - b _ {k + 1}).\tag{10.52}
$$

Proof. If we define $A_0 = 0$ , then $a_k = A_k - A_{k-1}$ for each $k = 1, 2, \ldots, n$ , so we have

$$
\sum_ {k = 1} ^ {n} a _ {k} b _ {k} = \sum_ {k = 1} ^ {n} (A _ {k} - A _ {k - 1}) b _ {k} = \sum_ {k = 1} ^ {n} A _ {k} b _ {k} - \sum_ {k = 1} ^ {n} A _ {k} b _ {k + 1} + A _ {n} b _ {n + 1},
$$

which gives us (10.52).

If we let $n \to \infty$ in (10.52), we see that the series $\sum a_k b_k$ converges if both the series $\sum A_k (b_k - b_{k+1})$ and the sequence $\{A_n b_{n+1}\}$ converge. The next two tests give sufficient conditions for these to converge.

THEOREM 10.17. DIRICHLET'S TEST. Let $\sum a_{n}$ be a series of complex terms whose partial sums form a bounded sequence. Let $\{b_n\}$ be a decreasing sequence which converges to 0. Then the series $\sum a_{n}b_{n}$ converges.

Proof. Using the notation of Theorem 10.16, there is an M > 0 such that $|A_{n}| \leq M$ for all n. Therefore $A_{n}b_{n+1} \to 0$ as $n \to \infty$ . To establish convergence of $\sum a_{n}b_{n}$ , we need only show that the series $\sum A_{k}(b_{k} - b_{k+1})$ is convergent. Since $b_{n} \searrow$ , we have the inequality

$$
\left| A _ {k} \left(b _ {k} - b _ {k + 1}\right) \right| \leq M \left(b _ {k} - b _ {k + 1}\right).
$$

But the series $\sum (b_k - b_{k + 1})$ is a convergent telescoping series which dominates

$$
\sum A _ {k} (b _ {k} - b _ {k + 1}).
$$

This implies absolute convergence and hence convergence of $\sum A_{k}(b_{k}-b_{k+1})$ .

THEOREM 10.18. ABEL'S TEST. Let $\sum a_{n}$ be a convergent series of complex terms and let $\{b_n\}$ be a monotonic convergent sequence of real terms. Then the series $\sum a_{n}b_{n}$ converges.

Proof. Again we use the notation of Theorem 10.16. Convergence of $\sum a_{n}$ implies convergence of the sequence $\{A_{n}\}$ and hence of the sequence $\{A_{n}b_{n+1}\}$ . Also, $\{A_{n}\}$ is a bounded sequence. The rest of the proof is similar to that of Dirichlet's test.

To use Dirichlet's test effectively, we need some examples of series having bounded partial sums. Of course, every convergent series has this property. An important example of a divergent series with bounded partial sums is the geometric series $\sum x^{n}$ , where x is a complex number with $|x|=1$ but $x\neq1$ . The next theorem gives an upper bound for the partial sums of this series. When $|x|=1$ , we may write $x=e^{2i\theta}$ , where $\theta$ is real, and we have the following.

THEOREM 10.19. For every real $\theta$ not an integer multiple of $\pi$ , we have the identity

$$
\sum_ {k = 1} ^ {n} e ^ {2 i k \theta} = \frac {\sin n \theta}{\sin \theta} e ^ {i (n + 1) \theta},\tag{10.53}
$$

from which we obtain the estimate

$$
\left| \sum_ {k = 1} ^ {n} e ^ {2 i k \theta} \right| \leq \frac {1}{| \sin \theta |}.\tag{10.54}
$$

Proof. If $x \neq 1$ , the partial sums of the geometric series are given by

$$
\sum_ {k = 1} ^ {n} x ^ {k} = x \frac {x ^ {n} - 1}{x - 1}.
$$

Writing $x = e^{2i\theta}$ in this formula, where $\theta$ is real but not an integer multiple of $\pi$ , we find

$$
\sum_ {k = 1} ^ {n} e ^ {2 i k \theta} = e ^ {2 i \theta} \frac {e ^ {2 i n \theta} - 1}{e ^ {2 i \theta} - 1} = \frac {e ^ {i n \theta} - e ^ {- i n \theta}}{e ^ {i \theta} - e ^ {- i \theta}} e ^ {i (n + 1) \theta} = \frac {\sin n \theta}{\sin \theta} e ^ {i (n + 1) \theta}.
$$

This proves (10.53). To deduce (10.54), we simply note that $|\sin n\theta| \leq 1$ and $|e^{i(n + 1)\theta}| = 1$ .

EXAMPLES. Assume $\{b_n\}$ is any decreasing sequence of real numbers with limit 0. Taking $a_{n} = x^{n}$ in Dirichlet's test, where $x$ is complex, $|x| = 1$ , $x \neq 1$ , we find that the series

$$
\sum_ {n = 1} ^ {\infty} b _ {n} x ^ {n}\tag{10.55}
$$

converges. Note that Leibniz's rule for alternating series is merely the special case in which $x = -1$ . If we write $x = e^{i\theta}$ , where $\theta$ is real but not an integer multiple of $2\pi$ , and consider the real and imaginary parts of (10.55), we deduce that the two trigonometric series

$$
\sum_ {n = 1} ^ {\infty} b _ {n} \cos n \theta \quad \text { and } \quad \sum_ {n = 1} ^ {\infty} b _ {n} \sin n \theta
$$

converge. In particular, when $b_{n} = n^{-\alpha}$ , where $\alpha > 0$ , we find the following series converge:

$$
\sum_ {n = 1} ^ {\infty} \frac {e ^ {i n \theta}}{n ^ {\alpha}}, \quad \sum_ {n = 1} ^ {\infty} \frac {\cos n \theta}{n ^ {\alpha}}, \quad \sum_ {n = 1} ^ {\infty} \frac {\sin n \theta}{n ^ {\alpha}}.
$$

When $\alpha > 1$ , they converge absolutely since they are dominated by $\sum n^{-\alpha}$ .

## 10.20 Exercises

In Exercises 1 through 32, determine convergence or divergence of the given series. In case of convergence, determine whether the series converges absolutely or conditionally.

1. $\sum_{n=1}^{\infty} \frac{(-1)^{n+1}}{\sqrt{n}}$ .

9. $\sum_{n=1}^{\infty} (-1)^{n} \frac{n^{2}}{1 + n^{2}}$ .

2. $\sum_{n=1}^{\infty} (-1)^{n} \frac{\sqrt{n}}{n + 100}$ .

10. $\sum_{n=1}^{\infty} \frac{(-1)^n}{\log(e^n + e^{-n})}$ .

3. $\sum_{n=1}^{\infty} \frac{(-1)^{n-1}}{n^s}$ .

11. $\sum_{n = 1}^{\infty}\frac{(-1)^n}{n\log^2(n + 1)}.$

4. $\sum_{n=1}^{\infty}(-1)^{n}\left(\frac{1\cdot3\cdot5\cdots(2n-1)}{2\cdot4\cdot6\cdots(2n)}\right)^{3}.$

12. $\sum_{n=1}^{\infty} \frac{(-1)^n}{\log(1 + 1/n)}$ .

5. $\sum_{n=1}^{\infty} \frac{(-1)^{n(n-1)/2}}{2^n}$ .

13. $\sum_{n = 1}^{\infty}\frac{(-1)^{n}n^{37}}{(n + 1)!}$

6. $\sum_{n=1}^{\infty} (-1)^{n} \left( \frac{2n + 100}{3n + 1} \right)^{n}$ .

14. $\sum_{n=1}^{\infty} (-1)^{n} \int_{n}^{n+1} \frac{e^{-x}}{x} dx$ .

7. $\sum_{n=2}^{\infty} \frac{(-1)^n}{\sqrt{n} + (-1)^n}$ .

15. $\sum_{n = 1}^{\infty}\sin (\log n).$

8. $\sum_{n=1}^{\infty} \frac{(-1)^n}{\sqrt[n]{n}}$ .

16. $\sum_{n=1}^{\infty} \log \left(n \sin \frac{1}{n}\right)$ .

17. $\sum_{n=1}^{\infty} (-1)^{n} \left(1 - n \sin \frac{1}{n}\right)$ .

22. $\sum_{n=2}^{\infty} \sin \left(n\pi + \frac{1}{\log n}\right)$ .

18. $\sum_{n=1}^{\infty} (-1)^n \left(1 - \cos \frac{1}{n}\right)$ .

23. $\sum_{n=1}^{\infty} \frac{1}{n(1 + 1/2 + \cdots + 1/n)}$ .

19. $\sum_{n=1}^{\infty} (-1)^n \arctan \frac{1}{2n + 1}$ .

24. $\sum_{n=1}^{\infty} (-1)^{n} \left[ e - \left( 1 + \frac{1}{n} \right)^{n} \right]$ .

20. $\sum_{n=1}^{\infty} (-1)^{n} \left( \frac{\pi}{2} - \arctan (\log n) \right)$ .

25. $\sum_{n=2}^{\infty} \frac{(-1)^n}{(n + (-1)^n)^s}$ .

21. $\sum_{n=1}^{\infty} \log \left(1 + \frac{1}{|\sin n|}\right)$ .

26. $\sum_{n=1}^{\infty} (-1)^{n(n-1)/2} \left( \frac{n^{100}}{2^n} \right)$ .

27. $\sum_{n=1}^{\infty} a_n$ , where $a_n = \begin{cases} 1/n & \text{if } n \text{ is a square,} \\ 1/n^2 & \text{otherwise.} \end{cases}$

28. $\sum_{n=1}^{\infty} a_n$ , where $a_n = \begin{cases} 1/n^2 & \text{if } n \text{ is odd,} \\ -1/n & \text{if } n \text{ is even.} \end{cases}$

29. $\sum_{n=1}^{\infty}\left(\sin\frac{1}{n}\right)^{3/2}$ .

31. $\sum_{n=1}^{\infty}\left(1 - n\sin\frac{1}{n}\right)$ .

30. $\sum_{n=1}^{\infty} \frac{\sin(1/n)}{n}$ .

32. $\sum_{n=1}^{\infty} \frac{1 - n \sin(1/n)}{n}$ .

In Exercises 33 through 46, describe the set of all complex $z$ for which the series converges.

33. $\sum_{n=1}^{\infty} n^n z^n$ .

40. $\sum_{n=0}^{\infty} \frac{(z - 1)^n}{(n + 2)!}$ .

34. $\sum_{n=1}^{\infty} \frac{(-1)^n z^{3n}}{n!}$ .

41. $\sum_{n=1}^{\infty} \frac{(-1)^n (z - 1)^n}{n}$ .

35. $\sum_{n=0}^{\infty} \frac{z^n}{3^n}$ .

42. $\sum_{n=1}^{\infty} \frac{(2z + 3)^n}{n \log(n + 1)}$ .

36. $\sum_{n=1}^{\infty} \frac{z^n}{n^n}$ .

43. $\sum_{n=1}^{\infty} \frac{(-1)^n}{2n-1} \left( \frac{1-z}{1+z} \right)^n$ .

37. $\sum_{n=1}^{\infty} \frac{(-1)^n}{z + n}$ .

44. $\sum_{n=1}^{\infty}\left(\frac{z}{2z+1}\right)^{n}$ .

38. $\sum_{n=1}^{\infty} \frac{z^n}{\sqrt{n}} \log \frac{2n + 1}{n}$ .

45. $\sum_{n = 1}^{\infty}\frac{n}{n + 1}\left(\frac{z}{2z + 1}\right)^n.$

39. $\sum_{n=1}^{\infty}\left(1 + \frac{1}{5n+1}\right)^{n^2}|z|^{17n}$ .

46. $\sum_{n=1}^{\infty} \frac{1}{(1 + |z|^2)^n}$ .

In Exercises 47 and 48, determine the set of real x for which the given series converges.

$$
4 7. \sum_ {n = 1} ^ {\infty} (- 1) ^ {n} \frac {2 ^ {n} \sin^ {2 n} x}{n}.
$$

$$
4 8. \sum_ {n = 1} ^ {\infty} \frac {2 ^ {n} \sin^ {n} x}{n ^ {2}}.
$$

In Exercises 49 through 52, the series are assumed to have real terms.

49. If $a_{n} > 0$ and $\sum a_{n}$ converges, prove that $\sum 1 / a_{n}$ diverges.

50. If $\sum |a_n|$ converges, prove that $\sum a_n^2$ converges. Give a counterexample in which $\sum a_n^2$ converges but $\sum |a_n|$ diverges.

51. Given a convergent series $\sum a_{n}$ , where each $a_{n} \geq 0$ . Prove that $\sum \sqrt{a_n} n^{-p}$ converges if $p > \frac{1}{2}$ . Give a counterexample for $p = \frac{1}{2}$ .

52. Prove or disprove the following statements:

(a) If $\sum a_{n}$ converges absolutely, then so does $\sum a_{n}^{2} / (1 + a_{n}^{2})$ .

(b) If $\sum a_{n}$ converges absolutely, and if no $a_{n} = -1$ , then $\sum a_{n} / (1 + a_{n})$ converges absolutely.

## \*10.21 Rearrangements of series

The order of the terms in a finite sum can be rearranged without affecting the value of the sum. In 1833 Cauchy made the surprising discovery that this is not always true for infinite series. For example, consider the alternating harmonic series

$$
1 - \frac {1}{2} + \frac {1}{3} - \frac {1}{4} + \frac {1}{5} - \frac {1}{6} + - \dots = \log 2.\tag{10.56}
$$

The convergence of this series to the sum log 2 was shown in Section 10.17. If we rearrange the terms of this series, taking alternately two positive terms followed by one negative term, we get a new series which can be designated as follows:

$$
1 + \frac {1}{3} - \frac {1}{2} + \frac {1}{5} + \frac {1}{7} - \frac {1}{4} + \frac {1}{9} + \frac {1}{1 1} - \frac {1}{6} + + - \dots .\tag{10.57}
$$

Each term which occurs in the alternating harmonic series occurs exactly once in this rearrangement, and vice versa. But we can easily prove that this new series has a sum greater than $\log 2$ . We proceed as follows:

Let $t_n$ denote the $n$ th partial sum of (10.57). If $n$ is a multiple of 3, say $n = 3m$ , the partial sum $t_{3m}$ contains $2m$ positive terms and $m$ negative terms and is given by

$$
t _ {3 m} = \sum_ {k = 1} ^ {2 m} \frac {1}{2 k - 1} - \sum_ {k = 1} ^ {m} \frac {1}{2 k} = \left(\sum_ {k = 1} ^ {4 m} \frac {1}{k} - \sum_ {k = 1} ^ {2 m} \frac {1}{2 k}\right) - \frac {1}{2} \sum_ {k = 1} ^ {m} \frac {1}{k} = \sum_ {k = 1} ^ {4 m} \frac {1}{k} - \frac {1}{2} \sum_ {k = 1} ^ {2 m} \frac {1}{k} - \frac {1}{2} \sum_ {k = 1} ^ {m} \frac {1}{k}.
$$

In each of the last three sums, we use the asymptotic relation

$$
\sum_ {k = 1} ^ {n} \frac {1}{k} = \log n + C + o (1) \quad \text { as } \quad n \rightarrow \infty ,
$$

to obtain

$$
\begin{array}{r l} t _ {3 m} & = (\log 4 m + C + o (1)) - \frac {1}{2} (\log 2 m + C + o (1)) - \frac {1}{2} (\log m + C + o (1)) \\ & = \frac {3}{2} \log 2 + o (1). \end{array}
$$

Thus $t_{3m} \to \frac{3}{2} \log 2$ as $m \to \infty$ . But $t_{3m+1} = t_{3m} + 1 / (4m + 1)$ and $t_{3m-1} = t_{3m} - 1 / (2m)$ , so $t_{3m+1}$ and $t_{3m-1}$ have the same limit as $t_{3m}$ when $m \to \infty$ . Therefore, every partial sum $t_n$ has the limit $\frac{3}{2} \log 2$ as $n \to \infty$ , so the sum of the series in (10.57) is $\frac{3}{2} \log 2$ .

The foregoing example shows that rearrangement of the terms of a convergent series may alter its sum. We shall prove next that this can happen only if the given series is conditionally convergent. That is, rearrangement of an absolutely convergent series does not alter its sum. Before we prove this, we will explain more precisely what is meant by a rearrangement.

DEFINITION. Let $\mathbf{P} = \{1, 2, 3, \ldots\}$ denote the set of positive integers. Let $f$ be a function whose domain is $\mathbf{P}$ and whose range is $\mathbf{P}$ , and assume $f$ has the following property:

$$
m \neq n \quad i m p l i e s f (m) \neq f (n).
$$

Such a function $f$ is called a permutation of $\mathbf{P}$ , or a one-to-one mapping of $\mathbf{P}$ onto itself. If $\sum a_{n}$ and $\sum b_{n}$ are two series such that for every $n \geq 1$ we have

$$
b _ {n} = a _ {f (n)}
$$

for some permutation $f$ , then the series $\sum b_{n}$ is said to be a rearrangement of $\sum a_{n}$ .

EXAMPLE. If $\sum a_{n}$ denotes the alternating harmonic series in (10.56) and if $\sum b_{n}$ denotes the series in (10.57), we have $b_{n} = a_{f(n)}$ , where $f$ is the permutation defined by the formulas

$$
f (3 n + 1) = 4 n + 1, \quad f (3 n + 2) = 4 n + 3, \quad f (3 n + 3) = 2 n + 2.
$$

THEOREM 10.20. Let $\sum a_{n}$ be an absolutely convergent series having sum $S$ . Then every rearrangement of $\sum a_{n}$ also converges absolutely and has sum $S$ .

Proof. Let $\sum b_{n}$ be a rearrangement, say $b_{n} = a_{f(n)}$ . First we note that $\sum b_{n}$ converges absolutely because $\sum |b_n|$ is a series of nonnegative terms whose partial sums are bounded above by $\sum |a_{n}|$ .

To prove that $\sum b_{n}$ also has sum $S$ , we introduce

$$
B _ {n} = \sum_ {k = 1} ^ {n} b _ {k}, \quad A _ {n} = \sum_ {k = 1} ^ {n} a _ {k}, \quad A _ {n} ^ {*} = \sum_ {k = 1} ^ {n} | a _ {k} |, \quad \text { and } \quad S ^ {*} = \sum_ {k = 1} ^ {\infty} | a _ {k} |.
$$

Now $A_{n} \to S$ and $A_{n}^{*} \to S^{*}$ as $n \to \infty$ . Therefore, given any $\epsilon > 0$ , there is an $N$ such that

$$
\left| A _ {N} - S \right| <   \frac {\epsilon}{2} \quad \text { and } \quad \left| A _ {N} ^ {*} - S ^ {*} \right| <   \frac {\epsilon}{2}.
$$

For this $N$ we can choose $M$ so that

$$
\{1, 2, \dots , N \} \subseteq \left\{f (1), f (2), \dots , f (M) \right\}.
$$

This is possible because the range of f includes all the positive integers. If $n \geq M$ , we have

$$
| B _ {n} - S | = | B _ {n} - A _ {N} + A _ {N} - S | \leq | B _ {n} - A _ {N} | + | A _ {N} - S | \leq | B _ {n} - A _ {N} | + \frac {\epsilon}{2}.\tag{10.58}
$$

But we also have

$$
| B _ {n} - A _ {N} | = \left| \sum_ {k = 1} ^ {n} b _ {k} - \sum_ {k = 1} ^ {N} a _ {k} \right| = \left| \sum_ {k = 1} ^ {n} a _ {f (k)} - \sum_ {k = 1} ^ {N} a _ {k} \right|.
$$

The terms $a_1, \ldots, a_N$ cancel in the subtraction, so we have

$$
\left| B _ {n} - A _ {N} \right| \leq \left| a _ {N + 1} \right| + \left| a _ {N + 2} \right| + \dots = \left| A _ {N} ^ {*} - S ^ {*} \right| <   \frac {\epsilon}{2}.
$$

Combining this with (10.58), we see that $|B_n - S| < \epsilon$ for all $n \geq M$ , which means that $B_n \to S$ as $n \to \infty$ . This proves that the rearranged series $\sum b_n$ has sum $S$ .

The hypothesis of absolute convergence in Theorem 10.20 is essential. Riemann discovered that a conditionally convergent series of real terms can always be rearranged to give a series which converges to any preassigned sum. Riemann's argument is based on a special property of conditionally convergent series of real terms. Such a series $\sum a_{n}$ has infinitely many positive terms and infinitely many negative terms. Consider the two new series $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ obtained by taking the positive terms alone and the negative terms alone. More specifically, define $a_{n}^{+}$ and $a_{n}^{-}$ as follows:

$$
a _ {n} ^ {+} = \frac {a _ {n} + | a _ {n} |}{2}, \quad a _ {n} ^ {-} = \frac {a _ {n} - | a _ {n} |}{2}.\tag{10.59}
$$

If $a_{n}$ is positive, then $a_{n}^{+} = a_{n}$ and $a_{n}^{-} = 0$ ; if $a_{n}$ is negative, then $a_{n}^{-} = a_{n}$ and $a_{n}^{+} = 0$ . The two new series $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ are related to the given series $\sum a_{n}$ as follows.

THEOREM 10.21. Given a series $\sum a_{n}$ of real terms, define $a_{n}^{+}$ and $a_{n}^{-}$ by (10.59).

(a) If $\sum a_{n}$ is conditionally convergent, both $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ diverge.

(b) If $\sum a_{n}$ is absolutely convergent, both $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ converge, and we have

$$
\sum_ {n = 1} ^ {\infty} a _ {n} = \sum_ {n = 1} ^ {\infty} a _ {n} ^ {+} + \sum_ {n = 1} ^ {\infty} a _ {n} ^ {-}.\tag{10.60}
$$

Proof. To prove part (a), we note that $\sum\frac{1}{2}a_{n}$ converges and $\sum\frac{1}{2}|a_{n}|$ diverges. Therefore, by the linearity property (Theorem 10.3) $\sum a_{n}^{+}$ diverges and $\sum a_{n}^{-}$ diverges. To prove part (b), we note that both $\sum\frac{1}{2}a_{n}$ and $\sum\frac{1}{2}|a_{n}|$ converge, so by the linearity property (Theorem 10.2) both $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ converge. Since $a_{n}=a_{n}^{+}+a_{n}^{-}$ , we also obtain (10.60).

Now we can easily prove Riemann's rearrangement theorem.

THEOREM 10.22. Let $\sum a_{n}$ be a conditionally convergent series of real terms, and let $S$ be a given real number. Then there is a rearrangement $\sum b_{n}$ of $\sum a_{n}$ which converges to the sum $S$ .

Proof. Define $a_{n}^{+}$ and $a_{n}^{-}$ as indicated in (10.59). Both series $\sum a_{n}^{+}$ and $\sum a_{n}^{-}$ diverge since $\sum a_{n}$ is conditionally convergent. We rearrange $\sum a_{n}$ as follows:

Take, in order, just enough positive terms $a_{n}^{+}$ so that their sum exceeds S. If $p_{1}$ positive terms are required, we have

$$
\sum_ {n = 1} ^ {p _ {1}} a _ {n} > S \quad \text { but } \quad \sum_ {n = 1} ^ {q} a _ {n} \leq S \quad \text { if } \quad q <   p _ {1}.
$$

This is always possible since the partial sums of $\sum a_{n}^{+}$ tend to $+\infty$ . To this sum we add just enough negative terms $a_{n}^{-}$ , say $n_{1}$ negative terms, so that the resulting sum is less than S. This is possible since the partial sums of $a_{n}^{-}$ tend to $-\infty$ . Thus, we have

$$
\sum_ {n = 1} ^ {p _ {1}} a _ {n} ^ {+} + \sum_ {n = 1} ^ {n _ {1}} a _ {n} ^ {-} <   S \quad \text {but} \quad \sum_ {n = 1} ^ {p _ {1}} a _ {n} ^ {+} + \sum_ {n = 1} ^ {m} a _ {n} ^ {-} \geq S \quad \text {if} \quad m <   n _ {1}.
$$

Now we repeat the process, adding just enough new positive terms to make the sum exceed S, and then just enough new negative terms to make the sum less than S. Continuing in this way, we obtain a rearrangement $\sum b_{n}$ . Each partial sum of $\sum b_{n}$ differs from S by at most one term $a_{n}^{+}$ or $a_{n}^{-}$ . But $a_{n} \to 0$ as $n \to \infty$ since $\sum a_{n}$ converges, so the partial sums of $\sum b_{n}$ tend to S. This proves that the rearranged series $\sum b_{n}$ converges and has sum S, as asserted.

## 10.22 Miscellaneous review exercises

1. (a) Let $a_{n} = \sqrt{n + 1} - \sqrt{n}$ . Compute $\lim_{n\to \infty}a_n$ .

(b) Let $a_{n} = (n + 1)^{c} - n^{c}$ , where $c$ is real. Determine those $c$ for which the sequence $\{a_{n}\}$ converges and those for which it diverges. In case of convergence, compute the limit of the sequence. Remember that $c$ can be positive, negative, or zero.

2. (a) If $0 < x < 1$ , prove that $(1 + x^n)^{1 / n}$ approaches a limit as $n \to \infty$ and compute this limit.

(b) Given $a > 0$ , $b > 0$ , compute $\lim_{n\to \infty}(a^n + b^n)^{1 / n}$ .

3. A sequence $\{a_{n}\}$ is defined recursively in terms of $a_{1}$ and $a_{2}$ by the formula

$$
a _ {n + 1} = \frac {a _ {n} + a _ {n - 1}}{2} \quad \text { for } \quad n \geq 2.
$$

(a) Assuming that $\{a_n\}$ converges, compute the limit of the sequence in terms of $a_1$ and $a_2$ . The result is a weighted arithmetic mean of $a_1$ and $a_2$ .

(b) Prove that for every choice of $a_1$ and $a_2$ the sequence $\{a_n\}$ converges. You may assume that $a_1 < a_2$ . [Hint: Consider $\{a_{2n}\}$ and $\{a_{2n+1}\}$ separately.]

4. A sequence $\{x_{n}\}$ is defined by the following recursion formula:

$$
x _ {1} = 1, \quad x _ {n + 1} = \sqrt {1 + x _ {n}}.
$$

Prove that the sequence converges and find its limit.

5. A sequence $\{x_{n}\}$ is defined by the following recursion formula:

$$
x _ {0} = 1, \quad x _ {1} = 1, \quad \frac {1}{x _ {n + 2}} = \frac {1}{x _ {n + 1}} + \frac {1}{x _ {n}}.
$$

Prove that the sequence converges and find its limit.

6. Let $\{a_{n}\}$ and $\{b_{n}\}$ be two sequences such that for each $n$ we have

$$
e ^ {a _ {n}} = a _ {n} + e ^ {b _ {n}}
$$

(a) Show that $a_{n} > 0$ implies $b_{n} > 0$ .

(b) If $a_{n} > 0$ for all $n$ and if $\sum a_{n}$ converges, show that $\sum (b_{n} / a_{n})$ converges.

In Exercises 7 through 11, test the given series for convergence.

7. $\sum_{n=1}^{\infty} (\sqrt{1 + n^2} - n)$ .

9. $\sum_{n=2}^{\infty} \frac{1}{(\log n)^{\log n}}$ .

8. $\sum_{n=1}^{\infty} n^{s} (\sqrt{n+1} - 2\sqrt{n} + \sqrt{n-1})$ .

10. $\sum_{n=1}^{\infty} \frac{1}{n^{1+1/n}}$ .

11. $\sum_{n=1}^{\infty} a_n$ , where $a_n = 1/n$ if $n$ is odd, $a_n = 1/n^2$ if $n$ is even.

12. Show that the infinite series

$$
\sum_ {n = 0} ^ {\infty} (\sqrt {n ^ {a} + 1} - \sqrt {n ^ {a}})
$$

converges for $a > 2$ and diverges for $a = 2$ .

13. Given $a_{n} > 0$ for each $n$ . For each of the following statements, give a proof or exhibit a counterexample.

(a) If $\sum_{n=1}^{\infty} a_n$ diverges, then $\sum_{n=1}^{\infty} a_n^2$ diverges.

(b) If $\sum_{n=1}^{\infty} a_n^2$ converges, then $\sum_{n=1}^{\infty} a_n / n$ converges.

14. Find all real $c$ for which the series $\sum_{n=1}^{\infty} (n!)^{c} / (3n)!$ converges.

15. Find all integers $a \geq 1$ for which the series $\sum_{n=1}^{\infty} (n!)^{3} / (an)!$ converges.

16. Let $n_{1} < n_{2} < n_{3} < \cdots$ denote those positive integers that do not involve the digit 0 in their decimal representations. Thus $n_{1} = 1, n_{2} = 2, \ldots, n_{9} = 9, n_{10} = 11, \ldots, n_{18} = 19, n_{19} = 21$ , etc. Show that the series of reciprocals $\sum_{k=1}^{\infty} 1/n_{k}$ converges and has a sum less than 90.

[Hint: Dominate the series by $9\sum_{n=0}^{\infty}(9/10)^{n}$ .]

17. If a is an arbitrary real number, let $s_{n}(a) = 1^{a} + 2^{a} + \cdots + n^{a}$ . Determine the following limit:

$$
\lim _ {n \to \infty} \frac {s _ {n} (a + 1)}{n s _ {n} (a)}.
$$

(Consider both positive and negative $a$ , as well as $a = 0$ .)

18. (a) If $p$ and $q$ are fixed integers, $p \geq q \geq 1$ , show that

$$
\lim _ {n \rightarrow \infty} \sum_ {k = q n} ^ {p n} \frac {1}{k} = \log \frac {p}{q}.
$$

(b) The following series is a rearrangement of the alternating harmonic series in which there appear, alternately, three positive terms followed by two negative terms:

$$
1 + \frac {1}{3} + \frac {1}{5} - \frac {1}{2} - \frac {1}{4} + \frac {1}{7} + \frac {1}{9} + \frac {1}{1 1} - \frac {1}{6} - \frac {1}{8} + + + - - \dots .
$$

Show that the series converges and has sum $\log 2 + \frac{1}{2}\log \frac{3}{2}$ .

[Hint: Consider the partial sum $s_{5n}$ and use part (a).] (c) Rearrange the alternating harmonic series, writing alternately p positive terms followed by q negative terms. Then use part (a) to show that this rearranged series converges and has sum $\log 2 + \frac{1}{2} \log (p/q)$ .

## 10.23 Improper integrals

The concept of an integral $\int_{a}^{b}f(x)dx$ was introduced in Chapter 1 under the restriction that the function f is defined and bounded on a finite interval [a, b]. The scope of integration theory may be extended by relaxing these restrictions.

To begin with, we may study the behavior of $\int_{a}^{b}f(x)dx$ as $b\to+\infty$ . This leads to the notion of an infinite integral (also called an improper integral of the first kind) denoted by the symbol $\int_{a}^{\infty}f(x)dx$ . Another extension is obtained if we keep the interval $[a,b]$ finite and allow f to become unbounded at one or more points. The new integrals so obtained (by a suitable limit process) are called improper integrals of the second kind. To distinguish the integrals of Chapter 1 from improper integrals, the former are often called “proper” integrals.

Many important functions in analysis appear as improper integrals of one kind or another, and a detailed study of such functions is ordinarily undertaken in courses in advanced calculus. We shall be concerned here only with the most elementary aspects of the theory. In fact, we shall merely state some definitions and theorems and give some examples.

It will be evident presently that the definitions pertaining to improper integrals bear a strong resemblance to those for infinite series. Therefore it is not surprising that many of the elementary theorems on series have direct analogs for improper integrals.

If the proper integral $\int_{a}^{b}f(x)dx$ exists for every $b\geq a$ , we may define a new function $I$ as follows:

$$
I (b) = \int_ {a} ^ {b} f (x) d x \quad \text {   for   each   } b \geq a.
$$

The function I defined in this way is called an infinite integral, or an improper integral of the first kind, and it is denoted by the symbol $\int_{a}^{\infty} f(x) \, dx$ . The integral is said to converge if the limit

$$
\lim _ {b \rightarrow + \infty} I (b) = \lim _ {b \rightarrow + \infty} \int_ {a} ^ {b} f (x) d x\tag{10.61}
$$

exists and is finite. Otherwise, the integral $\int_{a}^{\infty}f(x)dx$ is said to diverge. If the limit in (10.61) exists and equals A, the number A is called the value of the integral, and we write

$$
\int_ {a} ^ {\infty} f (x) d x = A.
$$

These definitions are similar to those given for infinite series. The function values $I(b)$ play the role of the “partial sums” and may be referred to as “partial integrals.” Note that the symbol $\int_{a}^{\infty} f(x) dx$ is used both for the integral and for the value of the integral when the integral converges. (Compare with the remarks near the end of Section 10.5.)

EXAMPLE 1. The improper integral $\int_{1}^{\infty} x^{-s} dx$ converges if $s > 1$ and diverges if $s \leq 1$ . To prove this, we note that

$$
I (b) = \int_ {1} ^ {b} x ^ {- s}   d x = \left\{ \begin{array}{l l} \frac {b ^ {1 - s} - 1}{1 - s} & \text {if} s \neq 1, \\ \log b & \text {if} s = 1. \end{array} \right.
$$

Therefore $I(b)$ tends to a finite limit if and only if $s > 1$ , in which case the limit is

$$
\int_ {1} ^ {\infty} x ^ {- s} d x = \frac {1}{s - 1}.
$$

The behavior of this integral is analogous to that of the series for the zeta-function, $\zeta(s) = \sum_{n=1}^{\infty} n^{-s}$ .

EXAMPLE 2. The integral $\int_0^\infty \sin x dx$ diverges because

$$
I (b) = \int_ {0} ^ {b} \sin x d x = 1 - \cos b,
$$

and this does not tend to a limit as $b \to +\infty$ .

Infinite integrals of the form $\int_{-\infty}^{b}f(x)dx$ are similarly defined. Also, if $\int_{-\infty}^{c}f(x)dx$ and $\int_{c}^{\infty}f(x)dx$ are both convergent for some c, we say that the integral $\int_{-\infty}^{\infty}f(x)dx$ is convergent, and its value is defined to be the sum

$$
\int_ {- \infty} ^ {\infty} f (x) d x = \int_ {- \infty} ^ {c} f (x) d x + \int_ {c} ^ {\infty} f (x) d x.\tag{10.62}
$$

(It is easy to show that the choice of $c$ is unimportant.) The integral $\int_{-\infty}^{\infty} f(x) dx$ is said to diverge if at least one of the integrals on the right of (10.62) is divergent.

EXAMPLE 3. The integral $\int_{-\infty}^{\infty} e^{-a|x|} dx$ converges if $a > 0$ , for if $b > 0$ , we have

$$
\int_ {0} ^ {b} e ^ {- a | x |} d x = \int_ {0} ^ {b} e ^ {- a x} d x = \frac {e ^ {- a b} - 1}{- a} \rightarrow \frac {1}{a} \quad \text { as } \quad b \rightarrow \infty .
$$

Hence $\int_0^\infty e^{-a|x|}dx$ converges and has the value $1 / a$ . Also, if $b > 0$ , we have

$$
\int_ {- b} ^ {0} e ^ {- a | x |} d x = \int_ {- b} ^ {0} e ^ {a x} d x = - \int_ {b} ^ {0} e ^ {- a t} d t = \int_ {0} ^ {b} e ^ {- a t} d t.
$$

Therefore $\int_{-\infty}^{0} e^{-a|x|} dx$ also converges and has the value $1/a$ . Hence we have $\int_{-\infty}^{\infty} e^{-a|x|} dx = 2/a$ . Note, however, that the integral $\int_{-\infty}^{\infty} e^{-ax} dx$ diverges because $\int_{-\infty}^{0} e^{-ax} dx$ diverges.

As in the case of series, we have various convergence tests for improper integrals. The simplest of these refers to a positive integrand.

THEOREM 10.23. Assume that the proper integral $\int_{a}^{b} f(x) dx$ exists for each $b \geq a$ and suppose that $f(x) \geq 0$ for all $x \geq a$ . Then $\int_{a}^{\infty} f(x) dx$ converges if and only if there is a constant $M > 0$ such that

$$
\int_ {a} ^ {b} f (x) d x \leq M \quad \text {for every} b \geq a.
$$

This theorem forms the basis for the following comparison tests.

THEOREM 10.24. Assume the proper integral $\int_{a}^{b} f(x) dx$ exists for each $b \geq a$ and suppose that $0 \leq f(x) \leq g(x)$ for all $x \geq a$ , where $\int_{a}^{\infty} g(x) dx$ converges. Then $\int_{a}^{\infty} f(x) dx$ also converges and

$$
\int_ {a} ^ {\infty} f (x) d x \leq \int_ {a} ^ {\infty} g (x) d x.
$$

Note: The integral $\int_{a}^{\infty} g(x) dx$ is said to dominate the integral $\int_{a}^{\infty} f(x) dx$ .

THEOREM 10.25. LIMIT COMPARISON TEST. Assume both proper integrals $\int_{a}^{b} f(x) dx$ and $\int_{a}^{b} g(x) dx$ exist for each $b \geq a$ , where $f(x) \geq 0$ and $g(x) > 0$ for all $x \geq a$ . If

$$
\lim _ {x \rightarrow + \infty} \frac {f (x)}{g (x)} = c, \quad \text { where } \quad c \neq 0,\tag{10.63}
$$

then both integrals $\int_{a}^{\infty}f(x)dx$ and $\int_{a}^{\infty}g(x)dx$ converge or both diverge.

Note: If the limit in (10.63) is 0, we can conclude only that convergence of $\int_{a}^{\infty} g(x) dx$ implies convergence of $\int_{a}^{\infty} f(x) dx$ .

The proofs of Theorem 10.23 through 10.25 are similar to the corresponding results for series and are left as exercises.

EXAMPLE 4. For each real $s$ , the integral $\int_{1}^{\infty} e^{-x} x^{s} dx$ converges. This is seen by comparison with $\int_{1}^{\infty} x^{-2} dx$ since $e^{-x} x^{s} / x^{-2} \to 0$ as $x \to +\infty$ .

Improper integrals of the second kind may be introduced as follows: Suppose f is defined on the half-open interval $(a, b]$ , and assume that the integral $\int_{x}^{b}f(t)dt$ exists for each x satisfying $a < x \leq b$ . Define a new function I as follows:

$$
I (x) = \int_ {x} ^ {b} f (t) d t \quad \text { if } \quad a <   x \leq b.
$$

The function I so defined is called an improper integral of the second kind and is denoted by the symbol $\int_{a+}^{b}f(t)dt$ . The integral is said to converge if the limit

$$
\lim _ {x \to a +} I (x) = \lim _ {x \to a +} \int_ {x} ^ {b} f (t) d t\tag{10.64}
$$

exists and is finite. Otherwise, the integral $\int_{a+}^{b}f(t)dt$ is said to diverge. If the limit in (10.64) exists and equals A, the number A is called the value of the integral, and we write

$$
\int_ {a +} ^ {b} f (t) d t = A.
$$

EXAMPLE 5. Let $f(t) = t^{-s}$ if $t > 0$ . If $b > 0$ and $x > 0$ , we have

$$
I (x) = \int_ {x} ^ {b} t ^ {- s} d t = \left\{ \begin{array}{l l} \frac {b ^ {1 - s} - x ^ {1 - s}}{1 - s} & \quad \text {if} \quad s \neq 1, \\ \log b - \log x & \quad \text {if} \quad s = 1. \end{array} \right.
$$

When $x \to 0+$ , $I(x)$ tends to a finite limit if and only if $s < 1$ . Hence the integral $\int_{0+}^{b} t^{-s} dt$ converges if $s < 1$ and diverges if $s \geq 1$ .

This example may be dealt with in another way. If we introduce the substitution $t = 1 / u$ , $dt = -u^{-2} du$ , we obtain

$$
\int_ {x} ^ {b} t ^ {- s} d t = \int_ {1 / b} ^ {1 / x} u ^ {s - 2} d u.
$$

When $x \to 0+$ , $1/x \to +\infty$ and hence $\int_{0+}^{b} t^{-s} dt = \int_{1/b}^{\infty} u^{s-2} du$ , provided the last integral converges. By Example 1, this converges if and only if $s - 2 < -1$ , which means $s < 1$ .

The foregoing example illustrates a remarkable geometric fact. Consider the function f defined by the equation $f(x) = x^{-3/4}$ if $0 < x \leq 1$ . The integral $\int_{0+}^{1} f(x) \, dx$ converges, but the integral $\int_{0+}^{1} \pi f^{2}(x) \, dx$ diverges. Geometrically, this means that the ordinate set of f has a finite area, but the solid obtained by rotating this ordinate set about the x-axis has an infinite volume.

Improper integrals of the form $\int_{a}^{b - }f(t)dt$ are defined in a similar fashion. If the two integrals $\int_{a + }^{c}f(t)dt$ and $\int_c^{b - }f(t)dt$ both converge, we write

$$
\int_ {a +} ^ {b -} f (t) d t = \int_ {a +} ^ {c} f (t) d t + \int_ {c} ^ {b -} f (t) d t.
$$

Note: Some authors write $\int_{a}^{b}$ where we have written $\int_{a+}^{b-}$ .

The definition can be extended (in an obvious way) to cover the case of any finite number of summands. For example, if f is undefined at two points c < d interior to an interval $[a, b]$ , we say the improper integral $\int_{a}^{b} f(t) dt$ converges and has the value $\int_{a}^{c-} f(t) dt + \int_{c+}^{d-} f(t) dt + \int_{d+}^{b} f(t) dt$ , provided that each of these integrals converges. Furthermore, we can consider “mixed” combinations such as $\int_{a+}^{b} f(t) dt + \int_{b}^{\infty} f(t) dt$ which we write as $\int_{a+}^{\infty} f(t) dt$ , or mixed combinations of the form $\int_{a}^{b-} f(t) dt + \int_{b+}^{c} f(t) dt + \int_{c}^{\infty} f(t) dt$ which we write simply as $\int_{a}^{\infty} f(t) dt$ .

EXAMPLE 6. The gamma function. If $s > 0$ the integral $\int_{0+}^{\infty} e^{-t} t^{s-1} dt$ converges. This must be interpreted as a sum, say

$$
\int_ {0 ^ {+}} ^ {1} e ^ {- t} t ^ {s - 1} d t + \int_ {1} ^ {\infty} e ^ {- t} t ^ {s - 1} d t.\tag{10.65}
$$

The second integral converges for all real $s$ , by Example 4. To test the first integral we put $t = 1 / u$ and note that

$$
\int_ {x} ^ {1} e ^ {- t} t ^ {s - 1} d t = \int_ {1} ^ {1 / x} e ^ {- 1 / u} u ^ {- s - 1} d u.
$$

But $\int_{1}^{\infty} e^{-1/u} u^{-s-1} du$ converges for $s > 0$ by comparison with $\int_{1}^{\infty} u^{-s-1} du$ . Therefore the integral $\int_{0+}^{1} e^{-t} t^{s-1} dt$ converges for $s > 0$ . When $s > 0$ , the sum in (10.65) is denoted by $\Gamma(s)$ . The function $\Gamma$ so defined is called the gamma function, first introduced by Euler in 1729. It has the interesting property that $\Gamma(n+1) = n!$ when $n$ is any integer $\geq 0$ . (See Exercise 19 of Section 10.24 for an outline of the proof.)

The convergence tests given in Theorems 10.23 through 10.25 have straightforward analogs for improper integrals of the second kind. The reader should have no difficulty in formulating these tests for himself.

## 10.24 Exercises

In each of Exercises 1 through 10, test the improper integral for convergence.

1. $\int_0^\infty \frac{x}{\sqrt{x^4 + 1}} dx.$

6. $\int_{0 + }^{1}\frac{\log x}{\sqrt{x}} dx.$

2. $\int_{-\infty}^{\infty} e^{-x^2} dx$ .

7. $\int_{0 + }^{1 - }\frac{\log x}{1 - x} dx.$

3. $\int_0^\infty \frac{1}{\sqrt{x^3 + 1}} dx.$

8. $\int_{-\infty}^{\infty}\frac{x}{\cosh x} dx.$

4. $\int_0^\infty \frac{1}{\sqrt{e^x}} dx.$

9. $\int_{0 + }^{1 - }\frac{dx}{\sqrt{x}\log x}.$

5. $\int_{0 + }^{\infty}\frac{e^{-\sqrt{x}}}{\sqrt{x}} dx.$

10. $\int_{2}^{\infty}\frac{dx}{x(\log x)^s}.$

11. For a certain real $C$ the integral

$$
\int_ {2} ^ {\infty} \left(\frac {C x}{x ^ {2} + 1} - \frac {1}{2 x + 1}\right) d x
$$

converges. Determine $C$ and evaluate the integral.

12. For a certain real $C$ , the integral

$$
\int_ {1} ^ {\infty} \left(\frac {x}{2 x ^ {2} + 2 C} - \frac {C}{x + 1}\right) d x
$$

converges. Determine C and evaluate the integral.

13. For a certain real $C$ , the integral

$$
\int_ {0} ^ {\infty} \left(\frac {1}{\sqrt {1 + 2 x ^ {2}}} - \frac {C}{x + 1}\right) d x
$$

converges. Determine $C$ and evaluate the integral.

14. Find the values of $a$ and $b$ such that

$$
\int_ {1} ^ {\infty} \left(\frac {2 x ^ {2} + b x + a}{x (2 x + a)} - 1\right) d x = 1.
$$

15. For what values of the constants $a$ and $b$ will the following limit exist and be equal to 1?

$$
\lim _ {p \rightarrow + \infty} \int_ {- p} ^ {p} \frac {x ^ {3} + a x ^ {2} + b x}{x ^ {2} + x + 1} d x.
$$

16. (a) Prove that

$$
\lim _ {h \rightarrow 0 +} \left(\int_ {- 1} ^ {- h} \frac {d x}{x} + \int_ {h} ^ {1} \frac {d x}{x}\right) = 0 \quad \text { and   that } \quad \lim _ {h \rightarrow + \infty} \int_ {- h} ^ {h} \sin x d x = 0.
$$

(b) Do the following improper integrals converge or diverge?

$$
\int_ {- 1} ^ {1} \frac {d x}{x}; \quad \int_ {- \infty} ^ {\infty} \sin x d x.
$$

17. (a) Prove that the integral $\int_{0+}^{1} (\sin x) / x dx$ converges.

(b) Prove that $\lim_{x\to 0 + }\frac{1}{x}\int_{x}^{1}(\cos t) / t^{2}dt = 1.$

(c) Does the integral $\int_{0+}^{1} (\cos t) / t^2 dt$ converge or diverge?

18. (a) If $f$ is monotonic decreasing for all $x \geq 1$ and if $f(x) \to 0$ as $x \to +\infty$ , prove that the integral $\int_{1}^{\infty} f(x) dx$ and the series $\sum f(n)$ both converge or both diverge.

[Hint: Recall the proof of the integral test.]

(b) Give an example of a nonmonotonic $f$ for which the series $\sum f(n)$ converges and the integral $\int_1^\infty f(x) dx$ diverges.

19. Let $\Gamma(s) = \int_{0+}^{\infty} t^{s-1} e^{-t} dt$ , if $s > 0$ . (The gamma function.) Use integration by parts to show $\Gamma(s + 1) = s \Gamma(s)$ . Then use induction to prove that $\Gamma(n + 1) = n!$ if $n$ is a positive integer.

Each of Exercises 20 through 25 contains a statement, not necessarily true, about a function f defined for all $x \geq 1$ . In each of these exercises, n denotes a positive integer, and $I_{n}$ denotes the integral $\int_{1}^{n} f(x) dx$ , which is always assumed to exist. For each statement either give a proof or provide a counterexample.

20. If $f$ is monotonic decreasing and if $\lim_{n\to \infty}I_n$ exists, then the integral $\int_1^\infty f(x)dx$ converges.

21. If $\lim_{x\to \infty}f(x) = 0$ and $\lim_{n\to \infty}I_n = A$ , then $\int_1^\infty f(x)dx$ converges and has the value $A$ .

22. If the sequence $\{I_n\}$ converges, then the integral $\int_1^\infty f(x)dx$ converges.

23. If $f$ is positive and if $\lim_{n\to \infty}I_n = A$ , then $\int_1^\infty f(x)dx$ converges and has the value $A$ .

24. Assume $f'(x)$ exists for each $x \geq 1$ and suppose there is a constant $M > 0$ such that $|f'(x)| \leq M$ for all $x \geq 1$ . If $\lim_{n \to \infty} I_n = A$ , then the integral $\int_1^\infty f(x) dx$ converges and has the value $A$ .

25. If $\int_{1}^{\infty} f(x) dx$ converges, then $\lim_{x \to \infty} f(x) = 0$ .

