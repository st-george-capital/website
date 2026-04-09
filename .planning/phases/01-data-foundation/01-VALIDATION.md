---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (existing Next.js project) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx tsx scripts/ingest/validate-ingest.ts` |
| **Full suite command** | `npx jest --testPathPattern=ingest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/ingest/validate-ingest.ts`
- **After every plan wave:** Run `npx jest --testPathPattern=ingest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-01 | integration | `SELECT count(*) FROM ohlcv_daily WHERE ticker='SPY'` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-02 | integration | `SELECT realtime_start FROM fred_series LIMIT 1` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | DATA-03 | unit | `npx tsx scripts/ingest/test-universe-config.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | DATA-04 | integration | `SELECT count(*) FROM ohlcv_daily WHERE source='alphavantage'` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | DATA-05 | integration | `SELECT count(*) FROM earnings_revisions LIMIT 1` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | DATA-06 | integration | `SELECT count(*) FROM oecd_indicators LIMIT 1` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/ingest/validate-ingest.ts` — DB connectivity + row count checks for all 6 tables
- [ ] `scripts/ingest/test-universe-config.ts` — validates universe.json schema and required fields
- [ ] TimescaleDB extension check before migration runs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ALFRED vintage reflects point-in-time values | DATA-02 | Requires comparing against known published vintage | Query GDP for 2010-03-01; verify matches FRED March 2010 advance estimate |
| Universe config drives ingest without code change | DATA-03 | Requires adding ticker and observing DB | Add test ticker to universe.json, run ingest, confirm rows appear |
| TimescaleDB hypertable compression active | DATA-01 | Requires inspecting TimescaleDB catalog views | `SELECT * FROM timescaledb_information.hypertables;` |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
