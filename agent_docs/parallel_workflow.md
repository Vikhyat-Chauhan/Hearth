# Parallel Workflow — How to Split and Coordinate Agents

## When to read this
Read this at the start of a session when you're about to divide work across multiple agents or terminal tabs.

## Decomposition heuristic
Before writing any code, spend 2–3 min in Plan mode to break the spec into parallel streams. Good splits are domain-independent:

| Agent | Owns |
|-------|------|
| Agent A | Data model + API routes / backend |
| Agent B | Frontend pages + components |
| Agent C | Auth + deploy + env wiring |

Bad splits: anything that requires agents to edit the same file simultaneously.

## How to launch parallel threads
In Warp (or any terminal), open 3 tabs in the same project directory:
```bash
# Tab 1
cd ~/project && claude
# Tab 2
cd ~/project && claude
# Tab 3
cd ~/project && claude
```
Each tab is an independent agent. Give each a scoped prompt (see below).

## Scoped prompt template
Paste this into each agent tab, filling in the blanks:

```
You are Agent [A/B/C]. Your scope is [domain]. Do NOT edit files outside this scope.

Your tasks:
1. [task 1]
2. [task 2]

Files you own: [list key files]
Do not touch: [list files owned by other agents]

Commit each completed task with: git add . && git commit -m "feat(scope): description"
Ping me when done or blocked.
```

## Sub-agents (in-thread parallelization)
For research/exploration tasks, ask your agent:
```
Split this into 4 parallel sub-tasks and explore them simultaneously using the Task tool.
```

## Coordination checkpoints
- Every ~10 min: scan all tabs, check for blockers
- After each agent commits: `git log --oneline -5` to verify no conflicts
- Integration test: run `npm run build` in a clean tab after agents merge

## Merge strategy
Agents commit to their own branches. You do the merge manually:
```bash
git checkout main
git merge feat/backend feat/frontend feat/auth
npm run build  # catch integration issues early
```

## Sub-agent routing (add to your prompt when orchestrating)
```
## Sub-Agent Routing Rules
- PARALLEL: tasks with no shared files or dependencies
- SEQUENTIAL: task B requires output of task A (e.g. schema before API)
- BACKGROUND: long-running tasks (e.g. image processing, data fetch)
```
