---
phase: 3
slug: regime-classifier
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (existing Next.js project) |
| **Config file** | none — Wave 0 installs ml-kmeans and ml-matrix |
| **Quick run command** | `npx tsc --noEmit 2>&1 | grep -c error || true` |
| **Full suite command** | `npx jest --testPathPattern=regime` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

All tasks have inline `<automated>` verify commands.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install ml-kmeans ml-matrix` — required before any feature code in Phase 3 runs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 2008/2020/2022 map to distinct regimes | REGM-03 | Requires populated DB with 20yr of feature matrix data | Run classifier on historical data; inspect RegimeLabel rows for those date windows |
| Regime labels are economically interpretable | REGM-01 | Subjective validation | Review canonical label names vs centroid dimensions |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers ml-kmeans/ml-matrix install
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
