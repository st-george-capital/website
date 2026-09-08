# Public project evidence

The public project copy describes inspected implementations, not claimed investment performance.

## MSF capstone

Source checkout: `/Users/kabirdhillon/MSFCapstone-2`.
- README.md: fixed-income index-replication framework and architecture.
- dss_framework.py: bear/CVaR, bull/Sharpe, stable/index-tracking objectives.
- dss_mpo_framework.py: corresponding multi-period optimization and controls.
- backtesting.ipynb, saved output of `compare_MPO_vs_SPO_new('2021-12-31', '2022-02-28')`: weight tables with 523 rows and 2 columns, dated 2021-12-31 and 2022-01-31. This is an allocation universe, not 523 nonzero positions.
- app.py: Streamlit interface.

Do not describe notebook Sharpe, returns, or tracking-error summaries as live or out-of-sample investment performance. The comparison computes portfolio returns from expected return vectors, uses future-period model inputs, and the saved run contains only two monthly observations. The published spotlight reports the implementation and archived allocation dimensions, with methodology notes.

The user confirmed this work is SGC research; the public site presents it under SGC Research without separate capstone attribution. The local capstone checkout remains the evidence source. No source datasets, notebooks, credentials, or private links were copied into the public directory.

## SGC tools

- `lib/quant/cvar-optimizer.ts`: scenario construction, CVaR linear program, position/sector/region/factor and optional turnover constraints.
- `lib/macro-engine/`: factor, regime, signal and backtesting modules. `backtest/windows.ts` implements expanding walk-forward windows and a holdout boundary.
- `lib/trade-radar/` and `app/dashboard/tools/trade-radar/`: signal, watchlist and briefing workflows.
- `components/portfolio/` and `app/api/portfolio/`: holdings/trades, benchmark and snapshot workflows.

Public copy describes capabilities evidenced by code. No invented returns, benchmark outperformance, or deployment-scale claims have been added.
