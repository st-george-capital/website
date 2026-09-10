import { researchCourses } from "./research-courses";
export interface QuantCourseSeed {
  title: string;
  slug: string;
  summary: string;
  tags: string;
  lessons: { title: string; slug: string; content: string }[];
}
export const quantCourses: QuantCourseSeed[] = [
  {
    title: "Python & Market Data Foundations",
    slug: "quant-data-foundations",
    summary:
      "Build a reproducible market-data pipeline: API responses, return conventions, corporate actions, validation and a research-ready dataset. Includes Python examples and a data-quality project.",
    tags: "Quant, Python, Data engineering",
    lessons: [
      {
        title: "A Price Is a Measurement, Not Just a Number",
        slug: "price-data-contract",
        content: `## Begin with the data contract

Before writing a strategy, specify what each row means. A closing price, an adjusted close, a trade, and a midpoint are different measurements. A model cannot repair an ambiguous definition after the fact.

By the end of this lesson, you should be able to specify a price observation and calculate a return without confusing units or adjustments.

## Define the observation

| Field | Example assumption | Why it matters |
|---|---|---|
| Instrument | A named ETF with a documented ticker | Symbols can change or collide across exchanges |
| Timestamp | Session date in the exchange timezone | A calendar date is not an execution timestamp |
| Field | Adjusted weekly close | Adjustment conventions affect calculated returns |
| Currency | USD | Currency translation can dominate a local return |
| Source and retrieval time | Provider, endpoint, UTC retrieval timestamp | Historical data can be revised |

## Work through a return

A price moves from 100 to 104, then to 101.92. The period returns are +4% and −2%. The compounded return is **1.04 × 0.98 − 1 = 1.92%**, not 2%.

\`\`\`python
prices = [100.0, 104.0, 101.92]
returns = [prices[i] / prices[i - 1] - 1
           for i in range(1, len(prices))]
wealth = 1.0
for r in returns:
    wealth *= 1 + r
assert abs((wealth - 1) - 0.0192) < 1e-10
\`\`\`

A raw price can drop after a split without an economic loss. Conversely, adding dividends to a return calculated from a dividend-adjusted series can double-count the payout. Read the provider's adjustment convention and preserve the raw fields.

## A common failure

Joining US and overseas prices by a date string can quietly pair observations recorded at different times. A signal using both markets must specify when both observations were available. An outer join exposes missing dates; forward filling can conceal them.

## Check your reasoning

A stock closes at 100 before a 2-for-1 split and 50 after it. Is the raw −50% return a shareholder loss? No: the share count doubled. Investigate the adjustment before calculating a strategy return.

**Deliverable:** write a six-field data dictionary and a three-row return calculation. Include the adjustment and timezone conventions.`,
      },
      {
        title: "Request, Cache and Validate Alpha Vantage Data",
        slug: "alpha-vantage-ingestion",
        content: `## Treat the API as an external dependency

An HTTP 200 response does not guarantee a dataset. A provider can return an information message, a limit notice or an error in a successful HTTP response. Validate the expected structure before parsing values.

Use the [official documentation](https://www.alphavantage.co/documentation/) to confirm the function, output shape and access tier. The [standard free allowance](https://www.alphavantage.co/premium/) is currently 25 requests per day; do not assume a short delay makes an unbounded loop acceptable. Some functions, including adjusted daily prices, require paid access.

## A minimal cached request

This Python example uses only the standard library. It requests weekly adjusted data for one symbol, stores a retrieval timestamp and refuses to cache an information message as a dataset.

\`\`\`python
import json, os
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import urlopen

symbol = 'IBM'
cache = Path('data') / f'{symbol}-weekly.json'
cache.parent.mkdir(exist_ok=True)
if cache.exists():
    archive = json.loads(cache.read_text())
else:
    params = {'function': 'TIME_SERIES_WEEKLY_ADJUSTED',
              'symbol': symbol,
              'apikey': os.environ['ALPHA_VANTAGE_API_KEY']}
    with urlopen('https://www.alphavantage.co/query?' +
                 urlencode(params), timeout=20) as response:
        payload = json.load(response)
    if 'Weekly Adjusted Time Series' not in payload:
        raise RuntimeError('No time series returned; check access and limits')
    archive = {'retrieved_at': datetime.now(timezone.utc).isoformat(),
               'symbol': symbol, 'payload': payload}
    cache.write_text(json.dumps(archive, indent=2))
\`\`\`

## What the example deliberately leaves to you

The cache does not expire automatically. Choose a refresh policy based on the experiment, not every page load. Archive versions when refreshing so a later source revision does not silently change a published result. Add bounded retries only for transient failures; entitlement errors need a changed request or account access.

Never print the request URL with its key, put credentials in a notebook output, or commit a secrets file. Store the endpoint name and non-secret parameters separately from authentication.

**Exercise:** simulate an information-only response and verify that no data file is created. Then load the same successful archive twice without a second API request.`,
      },
      {
        title: "Detect Defects Before Calculating Signals",
        slug: "data-quality-checks",
        content: `## A clean-looking table can still be wrong

Sorting and dropping missing values is not a data-quality policy. Every dropped row changes the experiment. A useful validation layer distinguishes a hard failure from an observation requiring review.

## Start with invariants

| Check | Response |
|---|---|
| Duplicate instrument/date key | Stop; resolve the duplicate source |
| Non-positive equity price | Stop return calculations for that row |
| Missing expected session | Investigate calendars, halts and availability |
| Large adjusted return | Flag; do not automatically winsorize |
| Retrieval older than the research cut-off | Label the dataset stale |

\`\`\`python
def validate_prices(rows):
    seen = set()
    for row in rows:
        key = (row['symbol'], row['date'])
        if key in seen:
            raise ValueError('Duplicate observation')
        seen.add(key)
        if row['adjusted_close'] <= 0:
            raise ValueError('Non-positive price')
    return sorted(rows, key=lambda r: (r['symbol'], r['date']))
\`\`\`

## Diagnose instead of deleting

Suppose returns include +1%, −0.5%, −49.8% and +0.8%. The large move might indicate an unadjusted split, an instrument mapping error, a genuine collapse or a bad record. Check the source and corporate-action fields before choosing a treatment.

Keep the original observation in a raw archive. In a separate exception ledger, record the suspected issue, evidence, treatment and effect on the result. Run the analysis with and without disputed observations if the conclusion depends on them.

## Build a test fixture

Create a six-row file containing a duplicate date, a zero price and one valid large move. Test each defect independently so the first failure does not hide the next. The valid large move should generate a review flag rather than disappear.

**Review question:** does a missing date imply a zero return? No. It can mean a market holiday or unavailable information. A zero return is a modelling choice that needs justification.

**Deliverable:** validation code, defect fixtures and an exception ledger with at least one resolved and one unresolved item.`,
      },
      {
        title: "Package a Dataset Someone Else Can Reproduce",
        slug: "research-reproducibility",
        content: `## Reproducibility is a deliverable

A chart copied from a notebook is not enough. Another member should be able to recover the dataset version, assumptions and command that produced it.

## Keep a small project structure

\`\`\`text
project/
  README.md
  src/ingest.py
  src/validate.py
  src/analyze.py
  tests/test_returns.py
  data/manifest.json
  reports/findings.md
  requirements.txt
\`\`\`

Store raw data according to the provider's redistribution terms. A private cache is not permission to publish a full dataset. Where redistribution is restricted, commit a manifest and retrieval instructions instead.

## Record the experiment

A manifest should include source functions, symbols, date coverage, retrieval time, file hashes, adjustment conventions and exclusions. The README should state the Python version, dependencies and the command sequence. Fix random seeds for stochastic steps, while acknowledging that library or hardware changes can still affect results.

## A practical review

Ask a teammate to run the project from a fresh environment. They should not need your local absolute paths, shell history or uncommitted files. Compare calculated returns, row counts and summary statistics before comparing chart pixels.

A failed reproduction is useful evidence. Record the mismatch and fix the underlying dependency or data ambiguity. Do not merely send your final CSV without explaining why the other path differed.

## Connect to Workshop

Create a data-quality project. Add the repository link, assign the data contract and validation milestones to specific collaborators, and post an update explaining the first issue you found. Keep project updates short but link the supporting artifact.

**Deliverable:** a reproducible project with one command for validation, one documented dataset version and a findings note. The note should say what the data can support—and what it cannot.`,
      },
    ],
  },
  {
    title: "Statistical Evidence for Quant Research",
    slug: "statistical-research-foundations",
    summary:
      "Distinguish a pattern from evidence. Work through uncertainty, dependence, multiple testing, event-study design and honest reporting with numerical examples.",
    tags: "Quant, Statistics, Research design",
    lessons: [
      {
        title: "Specify the Claim Before Looking at the Result",
        slug: "hypotheses-and-baselines",
        content: `## Make the claim falsifiable

“We found a signal” is not a research design. State the population, information set, decision rule, evaluation window and baseline before estimating an effect.

A useful question is: **Does a lagged signal change next-period returns relative to a passive benchmark over a specified universe, after stated costs?** It identifies what can be tested without assuming the answer.

## Separate statistical and economic questions

| Question | Evidence needed |
|---|---|
| Is the sample mean above zero? | Mean, dispersion, sample size and dependence assumptions |
| Does the strategy beat a baseline? | Matched dates and a defined return difference |
| Is the effect tradable? | Timing, liquidity, costs, capacity and uncertainty |
| Is the result robust? | Frozen choices and credible later evaluation |

A small effect can be estimated precisely and still be economically irrelevant. A large estimated effect can be too uncertain to support action.

## A worked comparison

Strategy A earns 8% gross and trades 300% of capital annually. At 20bp per dollar traded, estimated trading cost is 0.6% of capital, leaving 7.4% before other costs. If the comparable passive baseline earns 7.5%, the gross headline hides a net shortfall.

The calculation assumes turnover is defined as total traded notional divided by capital. Some reports use a half-turnover convention. Label yours before multiplying by costs.

## Pre-register the essentials

Write the universe, signal, execution lag, cost assumptions, primary metric, holdout dates and rejection rule into the project plan. Changing them is allowed during development, but record the change and stop calling the original holdout untouched.

**Exercise:** take a claim that “news predicts returns” and turn it into a timestamped, measurable hypothesis. Name one baseline and one observation that would make you reject it.`,
      },
      {
        title: "Uncertainty, Sample Size and Dependence",
        slug: "uncertainty-and-dependence",
        content: `## A mean is an estimate

For independent observations with common variance, the standard error of the sample mean is the sample standard deviation divided by the square root of the sample size. Financial data often violate the independence assumption.

Suppose 100 observations have a mean return of 0.10% and a standard deviation of 1%. The simple standard error is 1% / √100 = 0.10%. A rough normal 95% interval is **0.10% ± 1.96 × 0.10%**, or −0.096% to +0.296%.

This interval includes zero. More importantly, its interpretation relies on the sampling assumptions. It does not assign a 95% probability that the fixed true mean lies inside this particular realized interval.

## Why dependence changes the answer

Overlapping holding periods reuse returns. Several companies reporting on the same day share a market shock. Consecutive volatility observations are persistent. Treating these as independent can make standard errors too small.

For a time-series strategy, consider a dependence-aware method such as block resampling or a justified autocorrelation-robust estimator. Choose the method based on the design; a bootstrap is not automatically valid merely because it produces an interval.

## A small diagnostic

\`\`\`python
# Toy calculation; independence is an assumption, not a fact.
import math
n = 100
sample_mean = 0.001
sample_std = 0.01
se = sample_std / math.sqrt(n)
interval = (sample_mean - 1.96 * se, sample_mean + 1.96 * se)
print(interval)
\`\`\`

## Check your reasoning

If you duplicate every observation, the dataset has twice as many rows but no additional independent information. A naive standard error would shrink; a valid design must recognize the duplication.

**Deliverable:** report the estimate and uncertainty together. State the unit of observation, the dependence you expect and the method you used to account for it.`,
      },
      {
        title: "Multiple Testing and the Researcher’s Degrees of Freedom",
        slug: "multiple-testing",
        content: `## The best result is selected

Trying many variants and showing only the winner changes the meaning of the reported result. Parameter windows, universes, start dates and cleaning rules are all research choices—even when they do not appear in the final strategy description.

## A simple calculation

If 20 independent tests each have a 5% false-positive probability under their nulls, the chance of at least one false positive is **1 − 0.95²⁰ ≈ 64.2%**. The independence assumption is part of this example; correlated tests require more careful reasoning.

\`\`\`python
false_positive_chance = 1 - (1 - 0.05) ** 20
assert 0.64 < false_positive_chance < 0.65
\`\`\`

This does not mean every attractive backtest is false. It means a single unadjusted statistic does not describe a broad search process.

## Keep an experiment ledger

Record each variant, why it was tried and its result. Freeze a primary specification before evaluating a final chronological holdout. If the holdout inspires another change, move that period into development history and obtain genuinely later evidence before claiming a fresh confirmation.

A simple Bonferroni family-wise threshold divides the chosen significance level by the number of tests. It is conservative in many dependent settings. Other methods target different error rates. State which question the adjustment answers rather than applying a correction mechanically.

## Look for structure, not a lone optimum

Inspect nearby parameters and subperiods. A narrow performance spike can suggest sensitivity to noise or implementation details. Stability is useful evidence, but repeatedly searching for the most stable-looking region is another selection process to disclose.

**Exercise:** design a ledger for five candidate lookback windows. Specify the primary metric, untouched period and what you will publish if none outperform the baseline.`,
      },
      {
        title: "Design an Event Study You Can Defend",
        slug: "event-study-design",
        content: `## Time zero must mean something

An event study aligns observations around an event and compares outcomes with a counterfactual. For earnings research, a fiscal period end, reporting date and announcement timestamp are not interchangeable.

If an announcement occurs after the close, a trade at that day's close could not use the announcement. If timing is ambiguous, source it or restrict the design. Do not resolve ambiguity in whichever direction improves performance.

## Calculate a matched return

Suppose a stock returns 2.5% over a pre-defined event window while the market returns 1.0%. A simple market-adjusted return is 1.5 percentage points. A market-model residual would use a separately estimated exposure and is a different benchmark.

| Item | Pre-specified choice |
|---|---|
| Event | Public announcement with verified timestamp |
| Window | A stated interval after information availability |
| Benchmark | Market return or a justified model |
| Exclusions | Ambiguous timing and overlapping events |
| Inference | Account for common dates and repeated issuers |

## Avoid survivorship and revisions

A current constituent list omits firms that disappeared. A historical earnings table retrieved today may contain revised data. Document these limits and avoid describing the result as a realizable historical strategy if the information set is not point-in-time.

## Write the conclusion at the right strength

“The sample shows an average 1.5-point market-adjusted return with this uncertainty interval” is different from “the signal earns 1.5 points.” The latter implies execution, costs and an investable information set that the first statement does not establish.

**Deliverable:** an event ledger, a frozen window definition, a benchmark-adjusted result and an uncertainty estimate. Include a rejected observation and explain its exclusion before showing the headline chart.`,
      },
    ],
  },
  {
    title: "Backtesting Without Leakage",
    slug: "backtesting-without-leakage",
    summary:
      "Build an experiment that respects time. Align signals and execution, account for trading costs, separate development from evaluation, and produce an honest research tear sheet.",
    tags: "Quant, Backtesting, Python",
    lessons: [
      {
        title: "The Information Clock",
        slug: "signal-execution-clock",
        content: `## The first question is when

A signal can use only information available at its decision time. A closing-price signal cannot assume a fill at that same close unless the design demonstrates an executable order process with the required information already available.

Write a timeline before writing the strategy:

1. Observe information through time t.
2. Calculate the signal after the observation is available.
3. Submit an order under a defined execution convention.
4. Measure the return earned while the resulting position is actually held.

## A small example

A rule becomes invested after a positive period return. For this toy close-to-close convention, use the prior period's signal for the next period's return. The example studies timing, not whether the rule is useful.

\`\`\`python
returns = [0.02, -0.01, 0.03, -0.02]
signals = [1 if r > 0 else 0 for r in returns]
weights = [0] + signals[:-1]
strategy_returns = [w * r for w, r in zip(weights, returns)]
assert strategy_returns == [0.0, -0.01, 0.0, -0.02]
\`\`\`

Multiplying the current signal by the current return instead produces gains on the positive observations while avoiding the negative ones. That is knowledge of the outcome, not forecasting skill.

## Timing also applies to fundamentals

A quarterly financial figure becomes usable when it is released, not at the quarter-end date. Provider retrieval timestamps, revisions and filing availability belong in the information contract. Economic series can also be revised long after their first release.

## A diagnostic test

Shift the signal forward and backward deliberately. If a dramatic performance improvement appears when the signal sees the current or future return, keep that as a leakage diagnostic—not as a strategy variant to select.

**Deliverable:** a timing table naming the observation, calculation, order and valuation timestamps. Include one unit test that would fail if the signal loses its lag.`,
      },
      {
        title: "Costs, Turnover and the Wealth Curve",
        slug: "costs-and-turnover",
        content: `## Gross returns are an intermediate result

A strategy changes positions. Each change can incur commissions, spread, market impact and financing costs. A high-turnover strategy may look attractive before costs and uncompetitive after them.

For a simple one-asset weight series, define traded fraction as the absolute change in weight. If weight moves from 0 to 1, you trade one unit of capital. Moving from +1 to −1 trades two. State this convention because some portfolio reports use half-turnover.

\`\`\`python
weights = [0.0, 1.0, 1.0, 0.0]
asset_returns = [0.0, 0.01, -0.005, 0.002]
previous = 0.0
wealth = 1.0
for weight, ret in zip(weights, asset_returns):
    turnover = abs(weight - previous)
    cost = turnover * 0.001  # 10bp per traded dollar
    net_return = weight * ret - cost
    wealth *= 1 + net_return
    previous = weight
\`\`\`

The loop assumes each weight is already correctly timed. Costs do not fix a leaky signal.

## Work the arithmetic

Entering a full position at 10bp costs 0.10% of capital. A +1% asset return produces approximately +0.90% net for that period under the stated convention. Exiting incurs another 10bp. If the strategy repeats this 100 times, transaction costs can be material even when each trade appears cheap.

## Go beyond a single cost number

Show a small cost-sensitivity table. Distinguish fixed fees, proportional spread costs and size-dependent impact where data support the distinction. Include short borrow and financing when the strategy requires them. Do not assume borrowing is possible merely because the price series exists.

**Exercise:** compare turnover for weights [0, 1, 0, 1] and [0, 1, 1, 1]. Explain the difference in total proportional cost before examining returns.

**Deliverable:** gross and net wealth curves with a labelled cost convention and a sensitivity analysis.`,
      },
      {
        title: "Chronological Splits and Walk-Forward Evaluation",
        slug: "chronological-validation",
        content: `## Keep development separate from evaluation

Randomly splitting time-dependent observations can let closely related information appear in both training and evaluation. A chronological design better matches the question of what could have been known before a future decision.

A simple design has a training segment, a validation segment for development choices and a final untouched test segment. Choose dates based on the available history and intended deployment horizon. There is no universal split percentage that makes an experiment valid.

## What walk-forward means

At each scheduled refit date, fit using only eligible past observations, then evaluate the next segment without revising those predictions afterward. Concatenate the genuinely out-of-sample segments. Keep the refit schedule and lookback policy fixed before reviewing results.

| Step | Permitted information |
|---|---|
| Fit at time t | Training rows and labels fully available by t |
| Tune | A designated historical validation set |
| Predict after t | Frozen parameters from the scheduled fit |
| Report | All out-of-sample predictions, including failures |

## Labels can overlap the boundary

If a label is the next 20 trading days' return, a row dated just before the split can contain outcomes after it. Remove overlapping training labels when the design requires separation. A gap or embargo must be tied to information overlap; arbitrarily dropping a few days does not guarantee independence.

## Resist retroactive improvements

Suppose a strategy fails in the test segment and succeeds after changing the window. The revised result is development evidence. It is not a successful test of the original frozen rule. Preserve both versions and explain the change.

**Deliverable:** a dated training/validation/test diagram, a label-availability check and a log of every refit. Ask a reviewer to identify any row whose target reaches beyond the permitted information boundary.`,
      },
      {
        title: "Report the Result, Including the Failure Modes",
        slug: "backtest-reporting",
        content: `## A tear sheet should support a decision

A final chart should help a reviewer understand the strategy, its benchmark and the risks. It should not merely advertise the best statistic.

Include the universe, period, data version, signal, execution convention, costs, benchmark and number of variants tried. These details determine what the performance numbers mean.

## Use complementary measures

| Measure | What it reveals | What it misses |
|---|---|---|
| Compounded return | Growth over the stated path | Timing and tail risk |
| Volatility | Dispersion under the chosen frequency | Full tail shape |
| Maximum drawdown | Worst observed peak-to-trough loss | Losses outside the sample |
| Turnover | Trading intensity | Size-dependent execution cost |
| Exposure | Time and size at risk | All nonlinear risks |

Annualizing a short sample can create an impressive but unstable headline. If you report an annualized statistic, disclose frequency, sample length and formula.

## A simple drawdown calculation

\`\`\`python
wealth = [1.0, 1.10, 0.99, 1.05]
peak = wealth[0]
drawdowns = []
for value in wealth:
    peak = max(peak, value)
    drawdowns.append(value / peak - 1)
assert abs(min(drawdowns) - (-0.10)) < 1e-10
\`\`\`

The 10% loss is measured from the prior peak of 1.10, not from the starting capital. The strategy remains below its peak at the end despite finishing above 1.0.

## Make the limitations useful

Name the most consequential constraint: unavailable delisted instruments, revised fundamentals, a short holdout, missing borrow data or sensitivity to costs. Explain how it affects the conclusion and what experiment would reduce the uncertainty.

**Deliverable:** a reproducible research report with passive and strategy curves, cost sensitivity, drawdown, exposure and a clear continue/reject decision. Post the finding in Workshop even if the hypothesis fails.`,
      },
    ],
  },
  {
    title: "Portfolio Risk Lab",
    slug: "portfolio-risk-lab",
    summary:
      "Move from individual returns to portfolio decisions. Study covariance, diversification, volatility targeting, drawdowns and tail scenarios with transparent calculations.",
    tags: "Quant, Risk, Portfolio construction",
    lessons: [
      {
        title: "Why Weights and Correlation Both Matter",
        slug: "portfolio-covariance",
        content: `## Portfolio risk is a joint calculation

Two individually volatile assets can diversify one another if their returns do not move together perfectly. The benefit depends on weights, individual volatilities and correlation—not on the number of tickers alone.

For two assets, variance is:

> w₁²σ₁² + w₂²σ₂² + 2w₁w₂ρσ₁σ₂

Use decimal weights and volatilities at the same frequency. Correlation is unitless.

## Work through a portfolio

Take equal weights, volatilities of 20% and 10%, and zero correlation. Variance is 0.25 × 0.04 + 0.25 × 0.01 = 0.0125. Volatility is √0.0125 ≈ **11.18%**.

If correlation rises to 1, volatility becomes 15%. Diversification reduced volatility in the first case; it did not eliminate risk.

\`\`\`python
import math
w1, w2 = 0.5, 0.5
s1, s2, rho = 0.20, 0.10, 0.0
variance = w1*w1*s1*s1 + w2*w2*s2*s2 + 2*w1*w2*rho*s1*s2
assert abs(math.sqrt(variance) - 0.1118034) < 1e-6
\`\`\`

## Estimation is part of the problem

A covariance matrix estimated from limited history can be unstable. A mathematically optimal weight vector may amplify small estimation errors. Compare any optimized allocation with simple equal-weight or constrained baselines before attributing value to the optimizer.

Use aligned returns, disclose missing-data treatment and inspect extreme implied correlations. More parameters do not necessarily produce more reliable risk estimates.

**Exercise:** repeat the calculation at correlations −0.5, 0.5 and 1. Explain why a portfolio that looked diversified in calm markets may become more concentrated during stress.

**Deliverable:** a two-asset sensitivity table and a short account of covariance estimation risk.`,
      },
      {
        title: "Volatility Targeting and Exposure Caps",
        slug: "volatility-targeting",
        content: `## A target is a rule, not a promise

A basic volatility-targeting strategy scales exposure inversely with a lagged estimate of volatility. It can stabilize some risk characteristics, but the estimate changes after new information arrives and can lag a shock.

> Next-period weight = target volatility / estimated volatility

Apply a leverage cap and a lower bound on the denominator. Otherwise a very low volatility estimate can imply an implausibly large position.

## A worked example

With a 10% target and a 20% volatility estimate, the indicated weight is 0.5. With an 8% estimate it is 1.25. If the policy caps exposure at 1.0, the actual weight is 1.0.

\`\`\`python
def target_weight(estimated_vol, target=0.10, cap=1.0, floor=0.05):
    return min(cap, target / max(estimated_vol, floor))
assert target_weight(0.20) == 0.5
assert target_weight(0.08) == 1.0
\`\`\`

The estimate must be based on information available before the return being evaluated. Applying the high volatility observed during a loss to reduce exposure to that same loss is look-ahead bias.

## Model the missing parts

Uninvested capital has a cash-return assumption. Leveraged exposure has financing assumptions. Rebalancing creates turnover. A strategy that reduces exposure after a selloff can participate less in a rebound; this path dependence belongs in the evaluation.

Compare realized volatility, drawdown, net return and turnover against constant exposure. Do not judge the strategy only on the statistic it explicitly targets.

**Deliverable:** a lagged exposure series with a documented window, annualization, floor and cap. Include a sudden-volatility-shock scenario and explain why realized risk can exceed the target.`,
      },
      {
        title: "Drawdown, Tail Losses and Expected Shortfall",
        slug: "tail-risk-basics",
        content: `## A risk statistic summarizes a sample

Volatility does not describe every aspect of downside risk. Drawdown measures a path from peak to trough; a loss quantile describes a threshold; expected shortfall describes average loss in a specified tail under a stated distribution or sample convention.

Always declare whether you are working with returns or positive losses. A sign error can turn a worst-loss calculation into a best-return calculation.

## An explicit empirical example

Take ten positive-loss observations, expressed in percentage points:

> −2, −1, 0, 0, 1, 1, 2, 3, 5, 8

Here negative loss means a gain. Using the simple average of the worst two observations as an empirical worst-20% tail estimate gives **(5 + 8) / 2 = 6.5%**. This is a transparent finite-sample convention. Quantile interpolation and handling observations exactly on a threshold can produce different implementations.

\`\`\`python
losses = [-2, -1, 0, 0, 1, 1, 2, 3, 5, 8]
worst_two = sorted(losses, reverse=True)[:2]
assert sum(worst_two) / len(worst_two) == 6.5
\`\`\`

## What the number does not say

Ten observations are not enough to estimate a stable tail. Historical samples may omit the next crisis, and market liquidity can deteriorate precisely when losses are largest. A 6.5% estimate is not a maximum loss or a guaranteed future average.

Combine statistical estimates with designed stress scenarios: an equity gap, a rate shock, a correlation jump and a funding squeeze. Avoid simply relabelling the single worst historical day as a comprehensive stress program.

**Deliverable:** a risk sheet containing drawdown, a clearly defined empirical tail measure, sample size and at least two scenario losses.`,
      },
      {
        title: "From Risk Estimate to a Reviewable Allocation",
        slug: "risk-budget-decision",
        content: `## Risk management ends with a decision

An allocation proposal should specify exposure, the loss scenario it is sized against, and the conditions under which the team reviews it. A precise optimizer output is not a substitute for those choices.

## Size a scenario budget

A $1m portfolio has a $5,000 loss budget for one proposed position. If the chosen stress implies a 4% instrument loss, a $125,000 position uses that budget: $5,000 / 0.04.

At a 7% gap, the same position loses $8,750. The budget is conditional on the scenario; it is not a hard cap on realized loss. To preserve the $5,000 budget under that larger shock, position size would be about $71,429.

## Check the whole portfolio

The proposed trade may share exposures with existing positions. Add the scenario P&L across positions using consistent assumptions. Do not add standalone diversification benefits while ignoring common liquidity or financing risks.

| Review item | Required explanation |
|---|---|
| Instrument | Why it expresses the view |
| Size | Budget and stress assumption |
| Portfolio fit | Shared factors and concentration |
| Liquidity | Exit horizon and adverse execution |
| Monitoring | Observable triggers and review dates |

## A useful handoff

In Workshop, assign one collaborator to the data and one to the independent validation. Create milestones for the risk sheet, stress review and final recommendation. A decision update should link the artifact, explain the assumption that changed and state the next action.

**Exercise:** argue against your own allocation. Identify the single assumption whose failure would most change the decision. Design a test or stress that exposes it.

**Deliverable:** a one-page allocation memo with base and adverse scenarios, implementation constraints and an explicit approval or rejection recommendation.`,
      },
    ],
  },
  ...researchCourses,
];
