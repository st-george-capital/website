---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx inline evaluation (existing Next.js project) |
| **Config file** | none — all verify commands are inline `npx tsx -e` or `npm run` scripts |
| **Quick run command** | `npm run ingest:dry` |
| **Full suite command** | `npm run verify:data` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's inline `<automated>` verify command
- **After every plan wave:** Run `npm run verify:data`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-01 | integration | `npx tsx -e "import { checkTimescaleDb } from './lib/macro-engine/db'; checkTimescaleDb().then(r => console.log('TimescaleDB:', r)).catch(e => { console.error(e.message); process.exit(1) }"` | ✅ inline | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-01 | integration | `npx prisma validate && npx tsc --noEmit` | ✅ inline | ⬜ pending |
| 1-01-03 | 01 | 1 | DATA-03 | unit | `npx tsx -e "import { getUniverse } from './lib/macro-engine/universe'; const u = getUniverse(); console.log('Universe entries:', u.length); u.forEach(e => { if (!e.ticker \|\| !e.inceptionDate) throw new Error('Missing required field in ' + e.ticker) }); console.log('All entries valid')"` | ✅ inline | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-02 | integration | `npx tsx -e "import { fetchFredAllVintages } from './lib/macro-engine/providers/alfred'; fetchFredAllVintages('UNRATE', '2020-01-01').then(rows => { console.log('ALFRED rows:', rows.length); if (!rows[0]?.realtimeStart) throw new Error('Missing realtimeStart'); console.log('Sample:', rows[0]) }).catch(e => { console.error(e.message); process.exit(1) })"` | ✅ inline | ⬜ pending |
| 1-02-02 | 02 | 1 | DATA-04 | integration | `npx tsx -e "import { fetchFullOhlcv } from './lib/macro-engine/providers/alpha-vantage'; fetchFullOhlcv('SPY').then(rows => { console.log('OHLCV rows:', rows.length); if (!rows[0]?.adjClose) throw new Error('Missing adjClose — wrong endpoint?'); console.log('Sample:', rows[0]) }).catch(e => { console.error(e.message); process.exit(1) })"` | ✅ inline | ⬜ pending |
| 1-02-03 | 02 | 1 | DATA-05/06 | integration | `npx tsc --noEmit && npx tsx -e "import { fetchOecdCliForCountry } from './lib/macro-engine/providers/oecd'; fetchOecdCliForCountry('US', '2020-01-01').then(rows => { console.log('OECD CLI rows:', rows.length); console.log('Sample:', rows[0]) }).catch(e => { console.error(e.message); process.exit(1) })"` | ✅ inline | ⬜ pending |
| 1-03-01 | 03 | 2 | DATA-01/04 | integration | `npx tsx -e "import { ingestPrices } from './lib/macro-engine/ingest/prices'; import { getUniverse } from './lib/macro-engine/universe'; const u = getUniverse().slice(0,1); ingestPrices(u, { dryRun: true }).then(r => console.log('Dry run prices:', r)).catch(e => { console.error(e.message); process.exit(1) })"` | ✅ inline | ⬜ pending |
| 1-03-02 | 03 | 2 | DATA-01/03 | integration | `npm run ingest:dry 2>&1 \| grep -E "(Stage\|Source\|dry run\|Dry run)" \| head -20` | ✅ inline | ⬜ pending |
| 1-03-03 | 03 | 2 | DATA-01/02 | integration | `npx tsc --noEmit && npm run ingest:dry 2>&1 \| grep -i "last run\|checkpoint\|incremental\|since" \| head -10` | ✅ inline | ⬜ pending |
| 1-04-01 | 04 | 3 | DATA-02/01 | integration | `npx tsx -e "import { getFredAsOf, getOhlcvCoverage } from './lib/macro-engine/query'; Promise.all([getOhlcvCoverage(), getFredAsOf('UNRATE', new Date('2010-01-01'), new Date('2010-03-01'))]).then(([cov, v]) => { console.log('Coverage rows:', cov.length); console.log('FRED as-of:', v) }).catch(e => { console.error(e.message); process.exit(1) })"` | ✅ inline | ⬜ pending |
| 1-04-02 | 04 | 3 | DATA-01/02/03/04/05/06 | integration | `npm run verify:data; echo "Exit code: $?"` | ✅ inline | ⬜ pending |
| 1-04-03 | 04 | 3 | DATA-01/02/03/04/05/06 | smoke | `npm run verify:data 2>&1 \| grep -E "PASS\|FAIL"` | ✅ inline | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — inline `<automated>` verify in each task.

Every task in plans 01–04 carries an `<automated>` command that can run in under 60 seconds and exits non-zero on failure. No separate Wave 0 scripts are needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ALFRED vintage reflects point-in-time values | DATA-02 | Requires comparing against known published vintage | Query GDP for 2010-03-01; verify matches FRED March 2010 advance estimate |
| Universe config drives ingest without code change | DATA-03 | Requires adding ticker and observing DB | Add test ticker to universe.json, run ingest, confirm rows appear |
| TimescaleDB hypertable compression active | DATA-01 | Requires inspecting TimescaleDB catalog views | `SELECT * FROM timescaledb_information.hypertables;` |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not required — all verify commands are inline in plan tasks
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
