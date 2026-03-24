// ── CONSTANTS ──
const GOAL = '012345678';
const GOAL_POSITIONS = {};
for (let i = 0; i < 9; i++) GOAL_POSITIONS[String(i)] = [Math.floor(i / 3), i % 3];
 
// ── STATE ──
let currentAlgo = 'random';
let currentH = 'h1';
let solveTimer = null;
let solutionPath = [];
let stepIndex = 0;
let isRunning = false;
 
// ── BOARD CLASS ──
// Board is represented as a 9-char digit string throughout.
 
function getBlank(ds) { return ds.indexOf('0'); }
function isGoalDs(ds) { return ds === GOAL; }
 
function swap(ds, i, j) {
  const a = ds.split('');
  [a[i], a[j]] = [a[j], a[i]];
  return a.join('');
}
 
// returns { newDs, moved } 
function moveBlank(ds, direction) {
  const blank = ds.indexOf('0');
  const r = Math.floor(blank / 3), c = blank % 3;
  if (direction === 'up')    { if (r === 0) return null; return swap(ds, blank, blank - 3); }
  if (direction === 'down')  { if (r === 2) return null; return swap(ds, blank, blank + 3); }
  if (direction === 'left')  { if (c === 0) return null; return swap(ds, blank, blank - 1); }
  if (direction === 'right') { if (c === 2) return null; return swap(ds, blank, blank + 1); }
  return null;
}
 
// counters of how many tiles are out of place (not counting blank)
function numMisplaced(ds) {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (ds[i] !== '0' && ds[i] !== GOAL[i]) count++;
  }
  return count;
}
 
// distance of each tile from its goal position, summed (Manhattan distance), not counting blank
function howFar(ds) {
  let dist = 0;
  for (let i = 0; i < 9; i++) {
    const tile = ds[i];
    if (tile === '0') continue;
    const goalPos = GOAL_POSITIONS[tile];
    const curR = Math.floor(i / 3), curC = i % 3;
    dist += Math.abs(curR - goalPos[0]) + Math.abs(curC - goalPos[1]);
  }
  return dist;
}
 
// ── STATE ──
// Each State node is a plain object:
// { ds, predecessor, move, numMoves }
 
const MOVES = ['up', 'down', 'left', 'right'];
 
function makeState(ds, predecessor, move) {
  return {
    ds,
    predecessor,
    move,
    numMoves: predecessor === null ? 0 : predecessor.numMoves + 1,
  };
}
 
// checks if state is goal
function isGoal(state) {
  return state.ds === GOAL;
}
 
// walks predecessor chain 
function createsCycle(state) {
  let s = state.predecessor;
  while (s !== null) {
    if (s.ds === state.ds) return true;
    s = s.predecessor;
  }
  return false;
}
 
// generates successor states by moving blank in each direction
function generateSuccessors(state) {
  const successors = [];
  for (const move of MOVES) {
    const newDs = moveBlank(state.ds, move);
    if (newDs !== null) {
      successors.push(makeState(newDs, state, move));
    }
  }
  return successors;
}
 
// builds path from initial state to given state by walking predecessor chain
function buildPath(state) {
  const path = [];
  let s = state;
  while (s !== null) {
    path.unshift({ ds: s.ds, move: s.move });
    s = s.predecessor;
  }
  return path;
}
 
// ── HEURISTICS ──
 
function h1(state) {
  return numMisplaced(state.ds);
}
 
function h2(state) {
  return howFar(state.ds);
}
 
function getHeuristic() { return currentH === 'h1' ? h1 : h2; }
 
// ── SEARCHER BASE CLASS ──
// states list, num_tested, depth_limit, add_state,
// should_add, add_states, next_state (overridden), find_solution.
 
class Searcher {
  constructor(depthLimit) {
    this.states = [];       
    this.numTested = 0;     
    this.depthLimit = depthLimit; 
  }
 
  addState(newState) {
    this.states.push(newState);
  }
 
  // checks depth limit and cycles 
  shouldAdd(state) {
    if (this.depthLimit !== -1 && state.numMoves > this.depthLimit) return false;
    if (createsCycle(state)) return false;
    return true;
  }
 
  addStates(newStates) {
    for (const s of newStates) {
      if (this.shouldAdd(s)) this.addState(s);
    }
  }
 
  // random choice
  nextState() {
    const idx = Math.floor(Math.random() * this.states.length);
    const s = this.states[idx];
    this.states.splice(idx, 1);
    return s;
  }
 
  // main search loop
  findSolution(initState) {
    this.addState(initState);
    let maxFrontier = 1;
    while (this.states.length > 0) {
      maxFrontier = Math.max(maxFrontier, this.states.length);
      const s = this.nextState();
      this.numTested++;
      if (isGoal(s)) return { path: buildPath(s), tested: this.numTested, maxFrontier, solved: true };
      this.addStates(generateSuccessors(s));
      // Safety cap 
      if (this.numTested > 200000) return { path: null, tested: this.numTested, maxFrontier, solved: false };
    }
    return { path: null, tested: this.numTested, maxFrontier, solved: false };
  }
}
 
// ── BFSearcher ──
// Overrides next_state() with FIFO ordering.
class BFSearcher extends Searcher {
  nextState() {
    const s = this.states[0];
    this.states.shift();
    return s;
  }
}
 
// ── DFSearcher ──
// Overrides next_state() with LIFO ordering.
class DFSearcher extends Searcher {
  nextState() {
    return this.states.pop();
  }
}
 
// ── GreedySearcher ──
class GreedySearcher extends Searcher {
  constructor(heuristic) {
    super(-1);
    this.heuristic = heuristic; 
  }
 
  priority(state) {
    return -1 * this.heuristic(state);
  }
 
  // stores [priority, state] pairs
  addState(state) {
    this.states.push([this.priority(state), state]);
  }
 
  // pick the max-priority pair
  nextState() {
    let bestIdx = 0;
    for (let i = 1; i < this.states.length; i++) {
      if (this.states[i][0] > this.states[bestIdx][0]) bestIdx = i;
    }
    const best = this.states[bestIdx];
    this.states.splice(bestIdx, 1);
    return best[1];
  }
}
 
// ── AStarSearcher ──
// Extends GreedySearcher, overrides priority() to include num_moves (g cost).
class AStarSearcher extends GreedySearcher {
  priority(state) {
    return -1 * (this.heuristic(state) + state.numMoves);
  }
}
 
// ── SOLVER ──
function runSolver(initDs, algorithm, param) {
  const initState = makeState(initDs, null, 'init');
  let searcher;
  if      (algorithm === 'random')  searcher = new Searcher(param);
  else if (algorithm === 'BFS')     searcher = new BFSearcher(param);
  else if (algorithm === 'DFS')     searcher = new DFSearcher(param);
  else if (algorithm === 'Greedy')  searcher = new GreedySearcher(param);
  else if (algorithm === 'A*')      searcher = new AStarSearcher(param);
  else return null;
  return searcher.findSolution(initState);
}
 
// ── RUN SOLVE ──
function startSolve() {
  if (isRunning) { stopSolve(); return; }
  const input = document.getElementById('boardInput').value.trim();
  if (!validateInput(input)) return;
 
  resetViz(false);
  isRunning = true;
  document.getElementById('solveBtn').textContent = '⏹ Stop';
  document.getElementById('solveBtn').classList.add('running');
 
  const t0 = performance.now();
  let result;
  const hFn = getHeuristic();
  const depthLimit = parseInt(document.getElementById('depthInput').value) || 20;
 

  let param;
  if      (currentAlgo === 'random') param = -1;
  else if (currentAlgo === 'BFS')    param = -1;
  else if (currentAlgo === 'DFS')    param = depthLimit;
  else if (currentAlgo === 'Greedy') param = hFn;
  else                               param = hFn;   // A*
  result = runSolver(input, currentAlgo, param);
 
  const elapsed = Math.round(performance.now() - t0);
 
  document.getElementById('statTested').textContent = result.tested.toLocaleString();
  document.getElementById('statFrontier').textContent = result.maxFrontier.toLocaleString();
  document.getElementById('statTime').textContent = elapsed;
 
  if (!result.solved || !result.path) {
    document.getElementById('stepInfo').textContent = 'No solution found within limits.';
    document.getElementById('stepInfo').className = 'step-info failed';
    document.getElementById('statMoves').textContent = '—';
    isRunning = false;
    document.getElementById('solveBtn').textContent = '▶ Solve';
    document.getElementById('solveBtn').classList.remove('running');
    return;
  }
 
  solutionPath = result.path;
  document.getElementById('totalSteps').textContent = solutionPath.length - 1;
  document.getElementById('statMoves').textContent = solutionPath.length - 1;
 
  renderPathScroll();
  animatePath();
}
 
function stopSolve() {
  if (solveTimer) clearTimeout(solveTimer);
  isRunning = false;
  document.getElementById('solveBtn').textContent = '▶ Solve';
  document.getElementById('solveBtn').classList.remove('running');
}
 
function animatePath() {
  stepIndex = 0;
  const speeds = [600, 400, 220, 100, 30];
  const speed = speeds[parseInt(document.getElementById('speedSlider').value) - 1];
 
  function step() {
    if (stepIndex >= solutionPath.length) {
      isRunning = false;
      document.getElementById('solveBtn').textContent = '▶ Solve';
      document.getElementById('solveBtn').classList.remove('running');
      return;
    }
    const s = solutionPath[stepIndex];
    renderMainPuzzle(s.ds, stepIndex > 0 ? solutionPath[stepIndex - 1].ds : null);
    document.getElementById('stepNum').textContent = stepIndex;
    document.getElementById('queueSize').textContent = solutionPath.length - stepIndex;
    const pct = Math.min(100, ((solutionPath.length - stepIndex) / solutionPath.length) * 100);
    document.getElementById('queueFill').style.width = pct + '%';
 
    document.querySelectorAll('.path-step').forEach((el, i) => {
      el.classList.toggle('current', i === stepIndex);
      if (i === stepIndex) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
 
    if (stepIndex === 0) {
      document.getElementById('stepInfo').textContent = `Starting state → running ${currentAlgo}${currentH && (currentAlgo === 'Greedy' || currentAlgo === 'A*') ? ' with ' + currentH : ''}`;
      document.getElementById('stepInfo').className = 'step-info';
      document.getElementById('moveLabel').style.display = 'none';
    } else {
      const ml = document.getElementById('moveLabel');
      ml.style.display = 'flex';
      ml.textContent = `move blank ${s.move}`;
      if (stepIndex === solutionPath.length - 1) {
        document.getElementById('stepInfo').textContent = `✓ Solved in ${solutionPath.length - 1} moves — ${document.getElementById('statTested').textContent} states tested`;
        document.getElementById('stepInfo').className = 'step-info solved';
      } else {
        document.getElementById('stepInfo').textContent = `Step ${stepIndex} of ${solutionPath.length - 1} — move blank ${s.move}`;
        document.getElementById('stepInfo').className = 'step-info';
      }
    }
 
    stepIndex++;
    solveTimer = setTimeout(step, speed);
  }
  step();
}
 
// ── RENDER ──
function renderPuzzle(ds, containerId, tileSize = '72px', prevDs = null) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  for (let i = 0; i < 9; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.width = tileSize;
    tile.style.height = tileSize;
    tile.style.fontSize = tileSize === '72px' ? '28px' : '18px';
    const val = ds[i];
    if (val === '0') {
      tile.classList.add('blank');
    } else {
      tile.textContent = val;
      if (val === GOAL[i]) tile.classList.add('correct');
      if (prevDs && prevDs[i] !== ds[i] && val !== '0') {
        tile.classList.add('moved');
        setTimeout(() => tile.classList.remove('moved'), 300);
      }
    }
    grid.appendChild(tile);
  }
}
 
function renderMainPuzzle(ds, prevDs) {
  const grid = document.getElementById('mainPuzzle');
  grid.innerHTML = '';
  grid.style.width = '144px';
  grid.style.gap = '4px';
  for (let i = 0; i < 9; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.width = '44px';
    tile.style.height = '44px';
    tile.style.fontSize = '18px';
    const val = ds[i];
    if (val === '0') {
      tile.classList.add('blank');
    } else {
      tile.textContent = val;
      if (val === GOAL[i]) tile.classList.add('correct');
      if (prevDs && prevDs[i] !== ds[i] && val !== '0') tile.classList.add('moved');
    }
    grid.appendChild(tile);
  }
}
 
function renderGoal() {
  const mini = document.getElementById('goalMini');
  mini.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const t = document.createElement('div');
    t.className = 'goal-mini-tile' + (GOAL[i] === '0' ? ' blank-mini' : '');
    t.textContent = GOAL[i] === '0' ? '' : GOAL[i];
    mini.appendChild(t);
  }
}
 
function renderPathScroll() {
  const scroll = document.getElementById('pathScroll');
  scroll.innerHTML = '';
  solutionPath.forEach((s, idx) => {
    const step = document.createElement('div');
    step.className = 'path-step' + (idx === 0 ? ' current' : '');
    step.onclick = () => jumpToStep(idx);
    for (let i = 0; i < 9; i++) {
      const t = document.createElement('div');
      const val = s.ds[i];
      t.className = 'ps-tile' + (val === '0' ? ' ps-blank' : val === GOAL[i] ? ' ps-correct' : '');
      t.textContent = val === '0' ? '' : val;
      step.appendChild(t);
    }
    scroll.appendChild(step);
  });
}
 
function jumpToStep(idx) {
  if (solveTimer) clearTimeout(solveTimer);
  stepIndex = idx;
  const s = solutionPath[idx];
  renderMainPuzzle(s.ds, idx > 0 ? solutionPath[idx - 1].ds : null);
  document.getElementById('stepNum').textContent = idx;
  document.querySelectorAll('.path-step').forEach((el, i) => el.classList.toggle('current', i === idx));
  if (idx === solutionPath.length - 1) {
    isRunning = false;
    document.getElementById('solveBtn').textContent = '▶ Solve';
    document.getElementById('solveBtn').classList.remove('running');
  }
}
 
// ── CONTROLS ──
function selectAlgo(algo) {
  currentAlgo = algo;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('selected'));
  const map = { random: 'algoRandom', BFS: 'algoBFS', DFS: 'algoDFS', Greedy: 'algoGreedy', 'A*': 'algoAstar' };
  document.getElementById(map[algo]).classList.add('selected');
 
  const needsH = algo === 'Greedy' || algo === 'A*';
  document.getElementById('heuristicSection').classList.toggle('hidden', !needsH);
  document.getElementById('depthSection').style.display = algo === 'DFS' ? 'block' : 'none';
 
  const classMap = { random: 'random', BFS: 'bfs', DFS: 'dfs', Greedy: 'greedy', 'A*': 'astar' };
  const tagEl = document.getElementById('algoTag');
  tagEl.textContent = algo;
  tagEl.className = 'tag ' + classMap[algo];
 
  document.getElementById('hTag').textContent = needsH ? `(${currentH})` : '';
}
 
function selectH(h) {
  currentH = h;
  document.getElementById('h1btn').classList.toggle('selected', h === 'h1');
  document.getElementById('h2btn').classList.toggle('selected', h === 'h2');
  document.getElementById('hTag').textContent = `(${h})`;
}
 
function loadSample(ds) {
  document.getElementById('boardInput').value = ds;
  document.getElementById('inputError').textContent = '';
  document.getElementById('boardInput').classList.remove('error');
  renderPuzzle(ds, 'puzzleGrid');
  resetViz(false);
}
 
function validateInput(val) {
  const errEl = document.getElementById('inputError');
  if (val.length !== 9) { errEl.textContent = 'Must be exactly 9 digits'; document.getElementById('boardInput').classList.add('error'); return false; }
  const digits = val.split('').map(Number);
  if (digits.some(isNaN)) { errEl.textContent = 'Digits only (0–8)'; document.getElementById('boardInput').classList.add('error'); return false; }
  const sorted = [...digits].sort((a, b) => a - b);
  if (sorted.join('') !== '012345678') { errEl.textContent = 'Must contain each digit 0–8 exactly once'; document.getElementById('boardInput').classList.add('error'); return false; }
  errEl.textContent = '';
  document.getElementById('boardInput').classList.remove('error');
  return true;
}
 
function resetViz(full = true) {
  stopSolve();
  solutionPath = [];
  stepIndex = 0;
  document.getElementById('stepNum').textContent = '0';
  document.getElementById('totalSteps').textContent = '—';
  document.getElementById('stepInfo').textContent = 'Configure a puzzle and press Solve.';
  document.getElementById('stepInfo').className = 'step-info';
  document.getElementById('pathScroll').innerHTML = '';
  document.getElementById('queueFill').style.width = '0%';
  document.getElementById('queueSize').textContent = '0';
  document.getElementById('moveLabel').style.display = 'none';
  document.getElementById('statTested').textContent = '0';
  document.getElementById('statMoves').textContent = '—';
  document.getElementById('statFrontier').textContent = '0';
  document.getElementById('statTime').textContent = '—';
  document.getElementById('mainPuzzle').innerHTML = '';
  if (full) { document.getElementById('boardInput').value = '312065748'; renderPuzzle('312065748', 'puzzleGrid'); }
}
 
document.getElementById('boardInput').addEventListener('input', function () {
  const v = this.value.trim();
  if (v.length === 9 && validateInput(v)) renderPuzzle(v, 'puzzleGrid');
});
 
// init
renderGoal();
renderPuzzle('312065748', 'puzzleGrid');
selectAlgo('random');