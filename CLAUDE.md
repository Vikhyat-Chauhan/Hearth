# Kiloforge Founding Engineer Interview — Session Briefing

## What's Happening

This is a 30-minute collaborative agentic coding interview with **Nate Tucker**, Founder of Kiloforge. You (Vikhyat Chauhan) will receive a project spec that would normally take ~3 months to build. Your job: make as much progress as possible in 30 minutes using Claude Code as your primary agent.

**Interview date:** Friday, June 5, 2026 (Pacific Time)
**Contact:** nate@kiloforge.com | Introduced via Joe Garcia (a16z)

## About Kiloforge

Kiloforge is an autonomous **company factory** — a system that ideates, validates, builds, and distributes thousands of niche software products. Their thesis: niche communities were previously too expensive to serve with quality software; AI changes that economics.

- **Team:** Ethan, Nate, Raghav — from Google Brain, DeepMind, Facebook, Apple, Microsoft; alumni of Harvard and Berkeley
- **Track record:** Founded StartPlaying Games (YC S20, a16z-backed, scaled to $20M+ ARR); built and sold Clientelligent (acquired by Canoe Financial, 2022)
- **Backed by:** a16z, Uncork Capital, YC partners, Rahul Vohra
- **Vision:** 10,000 self-evolving micro-apps, each solving a real niche pain point, each at $1M ARR

The company is looking for generalists who've shipped things real people use, have strong product taste, and thrive in chaos. Vikhyat is being evaluated as a potential founding team member — high ownership expected.

## The Interview Format

- Receive a large, ambiguous project spec at the start
- Drive Claude Code (or another agent) nearly continuously for 30 minutes
- Goal is NOT to finish — it's to show judgment, prioritization, and shipping effectiveness
- Typing the spec directly into the agent is a perfectly valid start
- Hand-writing code for >2-3 minutes at a stretch is too slow

## What's Being Evaluated

1. **Judgment** — how you break down and prioritize an overwhelming spec
2. **Agent steering** — how well you direct, correct, and chain agent outputs
3. **Shipping effectiveness** — how much working, demonstrable product exists at the end
4. **Ownership** — decisiveness, initiative, cutting scope ruthlessly when needed

## Strategy

**When you receive the spec:**
1. Use **plan mode** (`/plan`) immediately — turn the spec into a prioritized step-by-step execution plan
2. Identify the 2-3 features that create the most visible, demonstrable value
3. Cut everything else from the first pass — note it as "stretch" but don't build it
4. Spin up **parallel agents** (multiple terminal tabs, each with one task) immediately

**During the session:**
- Default to breadth over depth — a working skeleton with 5 features beats a perfect implementation of 1
- Every ~5 minutes: check what's shippable/demoable and redirect agents accordingly
- If an agent is stuck or going in the wrong direction, kill it and restart with a clearer prompt — don't nurse a failing thread
- Use sub-agents for parallelization: ask Claude to split tasks into N parallel sub-agents

**Scope philosophy:**
- Ship something real people can click/use first
- Delay: comprehensive auth(supabase), error handling, edge cases, tests, polish
- Prioritize: core value loop, real data, something that renders and does the thing

## Technical Playbook

### Parallel Agents (Critical)
Run multiple terminal tabs, each with an independent Claude Code session in the same directory. Each agent owns one task. Context-switch between them every few minutes.

To instruct Claude to parallelize within a session:
> "Split this into N parallel sub-agents and run them concurrently"

### Plan Mode
For any large or ambiguous task, start with:
> `/plan [paste spec here]`

This generates rich step-by-step instructions before any code is written. Always do this for the main spec.

### Recommended Setup
- **Terminal:** Warp (better autocomplete + UI) or Ghostty — avoid built-in Mac terminal
- **CLIs to have ready:**
  - `gh` (GitHub CLI) — for fast repo creation and PRs
  - `vercel` (Vercel CLI) — for instant deploys: `vercel --prod`
- **Skills to have loaded:** Playwright (browser automation/screenshots), frontend-design

### Deploy Fast
```bash
# New project
gh repo create <name> --public --clone && cd <name>
vercel link && vercel --prod

# Or for quick preview
vercel
```

## Priorities During the Session

| Priority | Focus |
|----------|-------|
| 1 | Something that runs and renders |
| 2 | Core value loop working end-to-end |
| 3 | Real data / real interaction (not mocked) |
| 4 | Deployed URL you can show |
| 5 | Additional features (time permitting) |

**Never prioritize:** perfect code, full error handling, comprehensive auth, test coverage, responsive design (unless it's the core feature).

## Claude's Role in This Session

Act as an expert co-pilot optimizing for maximum shipping velocity. Be decisive. When given a choice between two approaches, pick the faster one and say so. Proactively suggest scope cuts. Flag when an agent thread is going wrong. Recommend when to kill and restart vs. continue. Prioritize getting something shippable above all else.

If asked to build something: start with plan mode, propose a ruthlessly scoped v0, confirm, then execute with parallel agents.

## Plan Mode Output Convention

Whenever producing a plan, always end with a **"Sub-agent Prompt"** section — a self-contained prompt ready to paste into a fresh Claude Code session. See PROJECT.md Step 3 for the full required fields and post-completion instructions.