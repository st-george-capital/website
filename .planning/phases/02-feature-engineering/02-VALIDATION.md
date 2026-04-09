---
phase: 2
slug: feature-engineering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (existing Next.js project) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx tsx -e "import('./lib/macro-engine/features/index.ts').then(m => m.validateFeatureMatrix())"` |
| **Full suite command** | `npx jest --testPathPattern=features` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick validation command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

All tasks have inline `<automated>` verify commands extracted from plan files.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — inline `<automated>` verify in each task.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Point-in-time semantic correctness | FEAT-01 | Requires visual inspection of returned values at known historical dates | Query z-score for INDPRO at 2009-01-01; verify uses only data up to that date |
| Country-health scores appear in matrix | FEAT-05 | Requires live DB with populated data | Query feature matrix for a date; confirm country_health_* columns are non-null |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
