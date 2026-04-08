# Macro Allocation Engine (SGC Hedge Fund Backend)

## What This Is

A macro discretionary allocation engine for a hedge fund that identifies global regime, scores countries and sectors across multiple data-derived factors, backtests 10–20 years of predictions against actual ETF and equity performance, and produces forward-looking allocation signals with probabilistic forecasts. Lives as a tool in the existing SGC dashboard under `/dashboard/tools/macro-engine`. Restricted to publicly available ETFs and single-stock equities.

## Core Value

Given the current global macro regime, tell me which countries and sectors will outperform and underperform over the next weeks-to-months and quarters-to-years — with probabilities, backtested accuracy, and specific investable recommendations.

## Requirements

### Validated

- ✓ Country macro health scoring across 5 pillars (productive capacity, human capital, macro sustainability, institutions, innovation) — existing `/dashboard/country-health`
- ✓ ETF-based capital flows & risk regime composite signal — existing `/dashboard/flows`
- ✓ Alpha Vantage premium API integration — existing across flows, sentiment, supplementary tools
- ✓ FRED macro data integration — existing in country-health ingest
- ✓ Dashboard tools section at `/dashboard/tools` with card-based navigation

### Active

- [ ] Global macro regime classifier — data-derived regime labels (not hardcoded), trained on historical macro data
- [ ] Factor scoring engine — model-derived weights for macro factors (growth, inflation, flows, spreads, commodities, earnings revisions) per country and sector
- [ ] Sector/country allocation signals — ranked outperform/underperform calls with conviction scores, layered: regime context + factor scores
- [ ] Backtesting engine — 10–20 year lookback, hit rate + simulated P&L vs benchmark, per sector and country
- [ ] Probabilistic forecasting — P(regime transition), P(central bank action), P(sector/country sees inflows/outperformance in 2Y window)
- [ ] ETF + single-stock universe management — dynamic, not hardcoded; driven by sector/country mapping
- [ ] Forward-looking dashboard view — current signals, probabilities, allocation table with entry ETFs/equities
- [ ] Integration with existing country-health and flows dashboards — reuse scores and signals, don't rebuild
- [ ] Tools page card — add Macro Allocation Engine entry to `/dashboard/tools`

### Out of Scope

- Real-time intraday trading signals — this is a macro/strategic tool, not HFT
- Options or derivatives — restricted to ETFs and equities only
- Execution / order management — research and signal generation only, no brokerage integration
- Private/alternative data — only publicly available data sources

## Context

**Existing reusable infrastructure:**
- `lib/country-health/` — full scoring pipeline (dictionary, scoring, classification, contributions, narrative, peer-sets). Can feed country factor scores directly into the allocation engine.
- `app/api/dashboard/flows/` — ETF price/return data, z-scores, pair ratios, regime composite signal, macro bar. Core building block for flow-based factor signals.
- `lib/alpha-vantage.ts` — AV premium API wrapper. Already handles rate limiting with sequential fetch + stagger.
- FRED data fetched in country-health ingest — reusable pattern for macro time-series.

**Data sources available:**
- Alpha Vantage (premium): price history, ETF data, earnings, news sentiment, economic indicators
- FRED: macro time series (rates, spreads, GDP, CPI, PMI, unemployment, yield curves)
- Additional needed: credit/bond spreads by country (FRED has some), commodity prices (AV has some), earnings revision data

**Design constraints:**
- Factor weights must be model-derived (from backtesting), not hand-tuned constants
- Regime definitions must be learned from data patterns, not hardcoded labels
- ETF/ticker lists should be configurable, not scattered magic strings
- All signals must have backtested evidence before going forward-looking

## Constraints

- **Data**: Only publicly available APIs — Alpha Vantage premium, FRED, possibly others (Quandl/OECD free tiers)
- **Universe**: ETFs and single-stock equities only — no derivatives
- **Architecture**: Must integrate into existing Next.js app — same patterns as flows and country-health
- **Backtest depth**: Minimum 10 years, target 20 years of history

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Regime-filtered factor scoring (not pure factor model) | Citadel/Bridgewater hybrid: macro regime sets context, factor scores rank within that context | — Pending |
| Reuse existing country-health scores as factor inputs | Already computed, no sense rebuilding — plug into allocation engine as validated signals | — Pending |
| Layered time horizons (tactical + strategic) | Different signal decay: momentum/flows for weeks-months, macro regime for quarters-years | — Pending |
| Model-derived weights via backtest optimization | Prevents overfitting to intuition; weights justified by historical evidence | — Pending |

---
*Last updated: 2026-04-08 after initialization*
