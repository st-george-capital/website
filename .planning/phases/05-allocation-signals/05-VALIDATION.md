---
phase: 5
slug: allocation-signals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx script + manual API test |
| **Config file** | tsconfig.json (existing) |
| **Quick run command** | `npx tsx scripts/macro-engine/run-signals.ts --dry-run` |
| **Full suite command** | `npx tsx scripts/macro-engine/verify-signals.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/macro-engine/run-signals.ts --dry-run`
- **After every plan wave:** Run `npx tsx scripts/macro-engine/verify-signals.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | ALLC-01 | schema | `npx prisma validate` | ✅ existing | ⬜ pending |
| 5-01-02 | 01 | 1 | ALLC-01/02 | unit | `npx tsx scripts/macro-engine/run-signals.ts --dry-run` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | ALLC-03 | integration | `npx tsx scripts/macro-engine/verify-signals.ts --probabilities` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 3 | ALLC-04 | integration | `npx tsx scripts/macro-engine/verify-signals.ts --screener` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 4 | ALLC-05 | integration | `npx tsx scripts/macro-engine/verify-signals.ts --analyst` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/macro-engine/run-signals.ts` — CLI entrypoint with `--dry-run` flag
- [ ] `scripts/macro-engine/verify-signals.ts` — verification script with `--probabilities`, `--screener`, `--analyst` flags

*Wave 0: scripts created in Plan 01; subsequent plans add verification coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel cron fires daily at 06:00 UTC | ALLC-01 | Requires production Vercel deployment | Check Vercel dashboard → Cron Jobs after deploy |
| FMP analyst endpoint tier/fields | ALLC-05 | 403 on docs; must verify with live API key | Run: `curl "https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/AAPL?apikey=$FMP_API_KEY"` and inspect response shape |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
