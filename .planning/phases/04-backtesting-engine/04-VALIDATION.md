---
phase: 4
slug: backtesting-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript type checking + Node.js script assertions |
| **Config file** | tsconfig.json (existing) |
| **Quick run command** | `npx tsc --noEmit 2>&1 \| grep -c "error" \|\| echo "0 errors"` |
| **Full suite command** | `npm run verify:backtest` |
| **Estimated runtime** | ~10 seconds (type check); backtest run requires DB |

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit`
- **After every plan wave:** `npm run verify:backtest` (dry-run or DB-connected)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds (type check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 4-01-01 | 01 | 1 | BACK-01/03 | tsc | `npx tsc --noEmit 2>&1 \| grep "backtest" \|\| echo "no errors"` | ⬜ pending |
| 4-01-02 | 01 | 1 | BACK-01/02 | tsc | `npx tsc --noEmit 2>&1 \| grep "backtest" \|\| echo "no errors"` | ⬜ pending |
| 4-02-01 | 02 | 2 | BACK-01/02 | tsc | `npx tsc --noEmit 2>&1 \| grep "backtest" \|\| echo "no errors"` | ⬜ pending |
| 4-02-02 | 02 | 2 | BACK-03/04 | tsc | `npx tsc --noEmit 2>&1 \| grep "backtest" \|\| echo "no errors"` | ⬜ pending |
| 4-03-01 | 03 | 3 | BACK-01-04 | script | `npm run backtest:run -- --dry-run && echo "CLI ok"` | ⬜ pending |
| 4-03-02 | 03 | 3 | BACK-04 | script | `npm run verify:backtest && echo "metrics ok"` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.
- TypeScript compilation via `npx tsc --noEmit` is available
- `ml-matrix` and `simple-statistics` are installed
- Prisma client already generated

*No new test framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Holdout set never seen during optimization | BACK-03 | Requires DB with real data + visual audit of date boundaries | Run `npm run backtest:run`, check that no training window overlaps with `>= 2022-01-01` |
| Walk-forward windows non-overlapping | BACK-01 | Requires DB with feature matrix populated | Run `npm run verify:backtest`, review window boundaries in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
