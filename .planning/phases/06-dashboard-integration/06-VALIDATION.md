---
phase: 6
slug: dashboard-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compile + Next.js build check |
| **Config file** | tsconfig.json (existing) |
| **Quick run command** | `npx tsc --noEmit 2>&1 | tail -5` |
| **Full suite command** | `npx next build 2>&1 | tail -20` |
| **Estimated runtime** | ~30 seconds (tsc), ~60 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit 2>&1 | tail -5`
- **After every plan wave:** Run `npx next build 2>&1 | tail -20`
- **Before `/gsd:verify-work`:** Full build must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | DASH-01/02/03/04 | compile | `npx tsc --noEmit 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | DASH-05 | compile | `npx tsc --noEmit 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 2 | DASH-01/02/03/04 | compile+build | `npx tsc --noEmit && npx next build 2>&1 \| tail -10` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 2 | DASH-05 | compile+build | `npx tsc --noEmit && npx next build 2>&1 \| tail -10` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/api/dashboard/macro-engine/route.ts` — API route (created in Plan 01)
- [ ] `app/(dashboard)/tools/macro-engine/page.tsx` — Dashboard page (created in Plan 02)

*Wave 0: all new files are created in their respective plans. No pre-existing test infrastructure needed — TypeScript compile is the gate.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Regime badge renders with correct label + factor bars | DASH-01 | Requires live browser + populated DB | Open `/dashboard/tools/macro-engine`, verify regime badge shows label and factor breakdown |
| Allocation table scrolls, conviction bars render | DASH-02 | Requires live browser | Check table renders all 12 ETFs ranked, conviction bars visible |
| Backtest stats panel visible without navigation | DASH-03 | Requires live browser | Verify Sharpe/hit-rate/drawdown panel on same page |
| Single-stock panel shows O'Neil components | DASH-04 | Requires live browser | Expand overweight sector, verify stock picks with RS/DMA/EPS |
| Tools page card navigates correctly | DASH-05 | Requires live browser | Visit `/dashboard/tools`, click "Macro Allocation Engine" card, verify navigation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
