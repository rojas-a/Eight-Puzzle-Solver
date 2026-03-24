# Eight Puzzle — AI Search Visualizer

An interactive browser-based visualizer for classic AI search algorithms applied to the 8-puzzle problem. No build step, no dependencies — just open `index.html` and go.

---

## Features

- **5 search algorithms** — Random, BFS, DFS, Greedy, A*
- **2 heuristics** — Misplaced tiles (h1) and Manhattan distance (h2)
- **Step-by-step animation** with scrubable solution path
- **Live stats** — states tested, solution length, max frontier, elapsed time
- **7 preset puzzles** from 5 to 27 moves, plus custom input
- **Fully responsive** — works on desktop, tablet, and mobile

---

## Getting Started

```bash
git clone https://github.com/adrianrojas801/Eight-Puzzle-Solver.git
cd Eight-Puzzle-Solver
open index.html
```

Or just double-click `index.html` — no server required.

---

## How to Use

1. **Set a puzzle** — type a 9-digit string (`0` = blank) or pick a sample preset
2. **Choose an algorithm** — select from the 5 strategies in the Algorithm panel
3. **Pick a heuristic** — for Greedy or A*, choose h1 (misplaced tiles) or h2 (Manhattan distance)
4. **Hit Solve** — the algorithm runs, then animates the solution step by step
5. **Explore** — click any thumbnail in the Solution Path strip to jump to that step

**Board format:** digits `0–8` read left-to-right, top-to-bottom. `0` is the blank.
```
3 1 2
0 6 5  →  "312065748"
7 4 8
```

---

## Algorithms

| Algorithm | Strategy | Optimal? |
|---|---|---|
| Random | Random state from frontier | No |
| BFS | FIFO — shallowest first | ✅ Yes |
| DFS | LIFO — deepest first (depth-limited) | No |
| Greedy | Lowest heuristic cost first | No |
| A* | Minimizes `g(n) + h(n)` | ✅ Yes |

> **Tip:** Use A* with h2 (Manhattan) for the best performance on harder puzzles.

---

## Notes

- Cycle detection walks the ancestor chain rather than using a global visited set
- Search is capped at 200,000 states to prevent browser lockup
- Not all 9-digit permutations are solvable — invalid parity will hit the state cap
