import { valuePerShareAt, type DCFInputs, type DCFOutputs } from '@/lib/dcf/model';

export interface DcfModelForReport {
  companyName: string;
  inputs: DCFInputs;
  outputs: DCFOutputs & { bull?: DCFOutputs; bear?: DCFOutputs };
}

export function buildEpsTableMarkdown(quarterlyEPS: Array<{ fiscalDateEnding: string; reportedEPS: string | number }> | undefined | null): string {
  if (!quarterlyEPS?.length) return '';
  let epsTable = '| Quarter | Reported EPS |\n|---------|-------------|\n';
  quarterlyEPS.slice(0, 12).forEach((q) => {
    const date = new Date(q.fiscalDateEnding);
    const qtr = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear().toString().slice(-2)}`;
    epsTable += `| ${qtr} | $${q.reportedEPS} |\n`;
  });
  return epsTable;
}

/** The research editor's generated "DCF Valuation Analysis" section. */
export function buildValuationMarkdown(model: DcfModelForReport): string {
  const avgRevGrowth = model.inputs.revenueGrowth.reduce((sum: number, g: number) => sum + g, 0) / model.inputs.revenueGrowth.length;
  const avgEBITMargin = model.inputs.ebitMargin.reduce((sum: number, m: number) => sum + m, 0) / model.inputs.ebitMargin.length;

  let revenueTable = '\n| Year | Revenue ($M) | Growth % | EBIT ($M) | EBIT Margin % | FCFF ($M) |\n';
  revenueTable += '|------|-------------|----------|-----------|---------------|----------|\n';
  model.outputs.revenues.forEach((rev: number, i: number) => {
    const growth = i === 0 ? model.inputs.revenueGrowth[i] : rev / model.outputs.revenues[i - 1] - 1;
    const ebit = model.outputs.ebit[i];
    const ebitMargin = ebit / rev;
    const fcff = model.outputs.freeCashFlow[i];
    revenueTable += `| Year ${i + 1} | $${(rev / 1e6).toFixed(0)} | ${(growth * 100).toFixed(1)}% | $${(ebit / 1e6).toFixed(0)} | ${(ebitMargin * 100).toFixed(1)}% | $${(fcff / 1e6).toFixed(0)} |\n`;
  });

  const waccTable = `
| Component | Value |
|-----------|-------|
| Risk-Free Rate | ${(model.inputs.riskFreeRate * 100).toFixed(2)}% |
| Equity Risk Premium | ${(model.inputs.equityRiskPremium * 100).toFixed(2)}% |
| Beta | ${model.inputs.beta.toFixed(2)} |
| **Cost of Equity** | **${(model.outputs.costOfEquity * 100).toFixed(2)}%** |
| Cost of Debt (Pre-Tax) | ${(model.inputs.costOfDebt * 100).toFixed(2)}% |
| Tax Rate | ${(model.inputs.taxRate * 100).toFixed(1)}% |
| **After-Tax Cost of Debt** | **${(model.outputs.afterTaxCostOfDebt * 100).toFixed(2)}%** |
| Target Equity Weight | ${((1 - model.inputs.targetDebtRatio) * 100).toFixed(1)}% |
| Target Debt Weight | ${(model.inputs.targetDebtRatio * 100).toFixed(1)}% |
| **WACC** | **${(model.outputs.wacc * 100).toFixed(2)}%** |`;

  const valuationSummaryTable = `
| Metric | Value |
|--------|-------|
| **Enterprise Value** | **$${(model.outputs.enterpriseValue / 1e9).toFixed(2)}B** |
| Less: Net Debt | $${((model.inputs.totalDebt - model.inputs.cashEquivalents) / 1e9).toFixed(2)}B |
| Less: Preferred Equity | $${(model.inputs.preferredEquity / 1e9).toFixed(2)}B |
| Less: Minority Interest | $${(model.inputs.minorityInterest / 1e9).toFixed(2)}B |
| **Equity Value** | **$${(model.outputs.equityValue / 1e9).toFixed(2)}B** |
| Diluted Shares Outstanding | ${(model.inputs.sharesDiluted / 1e6).toFixed(1)}M |
| **Intrinsic Value per Share** | **$${model.outputs.intrinsicValuePerShare.toFixed(2)}** |
| Current Market Price | $${model.inputs.currentPrice.toFixed(2)} |
| **Implied Upside/(Downside)** | **${(model.outputs.upsideDownside * 100).toFixed(1)}%** |`;

  let sensitivityTable = '\n### Sensitivity Analysis: Intrinsic Value per Share\n\n';
  sensitivityTable += '**WACC vs Terminal Growth Rate**\n\n';
  sensitivityTable += '|  | ';
  const termGrowthRange = [-0.01, -0.005, 0, 0.005, 0.01];
  termGrowthRange.forEach((tg) => {
    sensitivityTable += `${((model.inputs.perpetualGrowth + tg) * 100).toFixed(1)}% | `;
  });
  sensitivityTable += '\n|---|' + '---|'.repeat(termGrowthRange.length) + '\n';

  const waccRange = [-0.01, -0.005, 0, 0.005, 0.01];
  waccRange.forEach((wd) => {
    const testWacc = model.outputs.wacc + wd;
    sensitivityTable += `| **${(testWacc * 100).toFixed(2)}%** | `;
    termGrowthRange.forEach((tg) => {
      const perShare = valuePerShareAt(model.inputs, model.outputs, testWacc, model.inputs.perpetualGrowth + tg);
      sensitivityTable += perShare === null ? 'n/a | ' : `$${perShare.toFixed(2)} | `;
    });
    sensitivityTable += '\n';
  });

  return `# DCF Valuation Analysis

## Executive Summary

Our DCF model values ${model.companyName} at **$${model.outputs.intrinsicValuePerShare.toFixed(2)} per share**, representing a **${(model.outputs.upsideDownside * 100).toFixed(1)}%** ${model.outputs.upsideDownside >= 0 ? 'upside' : 'downside'} to the current market price of $${model.inputs.currentPrice.toFixed(2)}. The valuation is based on a ${model.inputs.forecastYears}-year explicit forecast period and a terminal value using ${model.inputs.terminalMethod === 'perpetual' ? 'perpetuity growth' : model.inputs.terminalMethod === 'multiple' ? 'exit multiple' : 'a blend of perpetuity growth and exit multiple'} methodology.

## Valuation Summary
${valuationSummaryTable}

## Cost of Capital (WACC)

We calculate a WACC of **${(model.outputs.wacc * 100).toFixed(2)}%** using the Capital Asset Pricing Model (CAPM) for the cost of equity and the company's marginal cost of debt.
${waccTable}

**WACC Calculation:**
- Cost of Equity = Risk-Free Rate + (Beta × Equity Risk Premium)
- Cost of Equity = ${(model.inputs.riskFreeRate * 100).toFixed(2)}% + (${model.inputs.beta.toFixed(2)} × ${(model.inputs.equityRiskPremium * 100).toFixed(2)}%) = ${(model.outputs.costOfEquity * 100).toFixed(2)}%
- WACC = (E/V × Cost of Equity) + (D/V × After-Tax Cost of Debt)
- WACC = (${((1 - model.inputs.targetDebtRatio) * 100).toFixed(1)}% × ${(model.outputs.costOfEquity * 100).toFixed(2)}%) + (${(model.inputs.targetDebtRatio * 100).toFixed(1)}% × ${(model.outputs.afterTaxCostOfDebt * 100).toFixed(2)}%) = **${(model.outputs.wacc * 100).toFixed(2)}%**

## Revenue and Cash Flow Projections

Our model projects revenue growing at a ${model.inputs.forecastYears}-year CAGR of **${(avgRevGrowth * 100).toFixed(1)}%**, with EBIT margins expanding to an average of **${(avgEBITMargin * 100).toFixed(1)}%** over the forecast period.
${revenueTable}

### Key Operating Assumptions

| Assumption | Value |
|------------|-------|
| Capex as % of Revenue | ${(model.inputs.capexPercentOfRevenue * 100).toFixed(1)}% |
| D&A as % of Revenue | ${(model.inputs.depreciationPercentOfRevenue * 100).toFixed(1)}% |
| NWC Change as % of Revenue Change | ${(model.inputs.nwcChangePercentOfRevenueChange * 100).toFixed(1)}% |
| Cash Tax Rate | ${(model.inputs.cashTaxRate * 100).toFixed(1)}% |

## Terminal Value

**Method**: ${model.inputs.terminalMethod === 'perpetual' ? 'Perpetuity Growth' : model.inputs.terminalMethod === 'multiple' ? 'Exit Multiple' : 'Blended Approach'}
**Perpetual Growth Rate**: ${(model.inputs.perpetualGrowth * 100).toFixed(2)}%

| Metric | Value |
|--------|-------|
| Terminal FCFF | $${((model.outputs.freeCashFlow[model.outputs.freeCashFlow.length - 1] * (1 + model.inputs.perpetualGrowth)) / 1e6).toFixed(0)}M |
| Terminal Value | $${(model.outputs.terminalValue / 1e9).toFixed(2)}B |
| PV of Terminal Value | $${(model.outputs.pvOfTerminalValue / 1e9).toFixed(2)}B |
| Terminal Value as % of EV | **${(model.outputs.terminalValueContribution * 100).toFixed(1)}%** |

The terminal value assumes a perpetual growth rate of ${(model.inputs.perpetualGrowth * 100).toFixed(2)}%, which is in line with expected long-term GDP growth and below the company's forecasted growth rate during the explicit period.
${sensitivityTable}

*Note: Highlighted cell represents base case valuation of $${model.outputs.intrinsicValuePerShare.toFixed(2)} per share*

## Valuation Methodology

Our DCF analysis employs a Free Cash Flow to the Firm (FCFF) approach, which values the enterprise based on cash flows available to all capital providers (debt and equity holders). The methodology involves:

1. **Explicit Forecast Period** (${model.inputs.forecastYears} years): We project operating performance based on management guidance, historical trends, and industry dynamics.

2. **Terminal Value**: Represents value beyond the explicit forecast period, calculated using a perpetuity growth model. This accounts for ${(model.outputs.terminalValueContribution * 100).toFixed(1)}% of total enterprise value.

3. **Discount Rate**: All cash flows are discounted at the WACC of ${(model.outputs.wacc * 100).toFixed(2)}%, reflecting the company's cost of capital and risk profile.

4. **Bridge to Equity Value**: Enterprise value is adjusted for net debt, preferred equity, and minority interests to arrive at equity value attributable to common shareholders.

### Key Valuation Drivers

- **Revenue Growth**: ${(avgRevGrowth * 100).toFixed(1)}% CAGR driven by [insert key growth drivers]
- **Operating Leverage**: EBIT margins expanding to ${(avgEBITMargin * 100).toFixed(1)}% through [insert margin drivers]
- **Capital Efficiency**: Capex requirements of ${(model.inputs.capexPercentOfRevenue * 100).toFixed(1)}% of revenue
- **Terminal Growth**: ${(model.inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth assumption

## Investment Conclusion

At $${model.outputs.intrinsicValuePerShare.toFixed(2)} per share, our DCF valuation suggests the stock is currently **${model.outputs.upsideDownside >= 0 ? 'undervalued' : 'overvalued'}** by ${Math.abs(model.outputs.upsideDownside * 100).toFixed(1)}%. The valuation is most sensitive to assumptions around terminal growth rate and discount rate, as illustrated in the sensitivity table above.`;
}

/** Bull and bear sections pre-filled from the DCF scenarios, when the model was saved with them. */
export function buildScenarioCases(model: DcfModelForReport): { bullCase: string; bearCase: string } | null {
  const { bull, bear } = model.outputs;
  if (!bull || !bear) return null;
  const price = model.inputs.currentPrice;
  const bullUpside = price > 0 ? ((bull.intrinsicValuePerShare - price) / price) * 100 : 0;
  const bearUpside = price > 0 ? ((bear.intrinsicValuePerShare - price) / price) * 100 : 0;
  return {
    bullCase: `## Bull Case (from DCF model)

**Target:** $${bull.intrinsicValuePerShare.toFixed(2)} per share (**${bullUpside >= 0 ? '+' : ''}${bullUpside.toFixed(1)}%** vs current $${price.toFixed(2)})

| Metric | Bull Case |
|--------|-----------|
| Intrinsic Value/Share | $${bull.intrinsicValuePerShare.toFixed(2)} |
| Enterprise Value | $${(bull.enterpriseValue / 1e9).toFixed(2)}B |
| WACC | ${(bull.wacc * 100).toFixed(2)}% |

*Assumptions: Higher revenue growth, margin expansion, lower discount rate.*`,
    bearCase: `## Bear Case (from DCF model)

**Target:** $${bear.intrinsicValuePerShare.toFixed(2)} per share (**${bearUpside.toFixed(1)}%** vs current $${price.toFixed(2)})

| Metric | Bear Case |
|--------|-----------|
| Intrinsic Value/Share | $${bear.intrinsicValuePerShare.toFixed(2)} |
| Enterprise Value | $${(bear.enterpriseValue / 1e9).toFixed(2)}B |
| WACC | ${(bear.wacc * 100).toFixed(2)}% |

*Assumptions: Lower growth, margin pressure, higher discount rate.*`,
  };
}
