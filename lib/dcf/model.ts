/** DCF model shared by the DCF Valuation Tool page and Consigliere's run_dcf tool. */

export interface DCFInputs {
  // Company Setup
  companyName: string;
  ticker: string;
  currency: string;
  currentPrice: number;
  sharesOutstanding: number;
  sharesDiluted: number;
  totalDebt: number;
  cashEquivalents: number;
  preferredEquity: number;
  minorityInterest: number;
  nonOperatingAssets: number;

  // Forecast Horizon
  forecastYears: number;
  midYearConvention: boolean; // Advanced mode only

  // Operating Forecast
  forecastMode: 'simple' | 'advanced';
  startingRevenue: number;
  revenueGrowth: number[]; // One per year

  // Simple Mode
  ebitMargin: number[]; // One per year
  capexPercentOfRevenue: number; // Fixed %
  depreciationPercentOfRevenue: number; // Fixed %
  nwcChangePercentOfRevenueChange: number; // Fixed %
  cashTaxRate: number;

  // Advanced Mode
  ebitMarginAdvanced?: number[]; // By year (optional, falls back to simple)
  capexByYear?: number[]; // Capex as % of revenue by year
  depreciationByYear?: number[]; // D&A as % of revenue by year
  nwcChangeByYear?: number[]; // ΔNWC as % of revenue change by year
  cashTaxRateByYear?: number[]; // Tax rate by year

  // Discount Rate (WACC)
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;
  targetDebtRatio: number; // or D/E ratio

  // Terminal Value
  terminalMethod: 'perpetual' | 'multiple' | 'both';
  terminalWeighting: number; // For 'both' method: % perpetual vs % multiple (0.5 = 50/50)
  perpetualGrowth: number;
  exitMultiple: number;
  exitMultipleMetric: 'ebitda' | 'ebit' | 'fcf';
}

export interface DCFOutputs {
  // Cash Flows
  revenues: number[];
  ebit: number[];
  nopat: number[];
  freeCashFlow: number[];

  // Valuation
  terminalValue: number;
  pvOfFcff: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownside: number;
  terminalValueContribution: number;

  // WACC
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
}

// Default inputs for example company
export const getDefaultInputs = (): DCFInputs => ({
  companyName: 'Example Corp',
  ticker: 'EXAM',
  currency: 'USD',
  currentPrice: 50.0,
  sharesOutstanding: 100000000,
  sharesDiluted: 105000000,
  totalDebt: 500000000,
  cashEquivalents: 200000000,
  preferredEquity: 0,
  minorityInterest: 0,
  nonOperatingAssets: 0,

  forecastYears: 5,
  midYearConvention: false, // Default to year-end for simplicity

  forecastMode: 'simple',
  startingRevenue: 2000000000,
  revenueGrowth: [0.15, 0.12, 0.1, 0.08, 0.06], // 15%, 12%, 10%, 8%, 6%

  // Simple Mode
  ebitMargin: [0.25, 0.26, 0.27, 0.28, 0.29], // Improving margins
  capexPercentOfRevenue: 0.08, // 8% of revenue
  depreciationPercentOfRevenue: 0.05, // 5% of revenue
  nwcChangePercentOfRevenueChange: 0.02, // 2% of revenue change
  cashTaxRate: 0.25,

  // Advanced Mode (undefined by default)
  ebitMarginAdvanced: undefined,
  capexByYear: undefined,
  depreciationByYear: undefined,
  nwcChangeByYear: undefined,
  cashTaxRateByYear: undefined,

  riskFreeRate: 0.0425, // 4.25%
  equityRiskPremium: 0.06, // 6%
  beta: 1.2,
  costOfDebt: 0.055, // 5.5%
  taxRate: 0.25,
  targetDebtRatio: 0.3, // 30% debt

  terminalMethod: 'both',
  terminalWeighting: 0.5, // 50/50 split
  perpetualGrowth: 0.025, // 2.5%
  exitMultiple: 12,
  exitMultipleMetric: 'ebitda',
});

export function resizeYearArray(values: number[] | undefined, forecastYears: number, fallbackValue: number): number[] | undefined {
  if (values == null) return undefined;

  const resized = values.slice(0, forecastYears);
  const fillValue = resized.length > 0 ? resized[resized.length - 1] : fallbackValue;

  while (resized.length < forecastYears) {
    resized.push(fillValue);
  }

  return resized;
}

export function normalizeInputsForForecastYears(inputs: DCFInputs): DCFInputs {
  const forecastYears = Math.max(1, Math.floor(inputs.forecastYears || 5));

  return {
    ...inputs,
    forecastYears,
    revenueGrowth: resizeYearArray(inputs.revenueGrowth, forecastYears, 0.05) ?? Array(forecastYears).fill(0.05),
    ebitMargin: resizeYearArray(inputs.ebitMargin, forecastYears, 0.15) ?? Array(forecastYears).fill(0.15),
    ebitMarginAdvanced: resizeYearArray(inputs.ebitMarginAdvanced, forecastYears, inputs.ebitMargin[inputs.ebitMargin.length - 1] ?? 0.15),
    capexByYear: resizeYearArray(inputs.capexByYear, forecastYears, inputs.capexPercentOfRevenue),
    depreciationByYear: resizeYearArray(inputs.depreciationByYear, forecastYears, inputs.depreciationPercentOfRevenue),
    nwcChangeByYear: resizeYearArray(inputs.nwcChangeByYear, forecastYears, inputs.nwcChangePercentOfRevenueChange),
    cashTaxRateByYear: resizeYearArray(inputs.cashTaxRateByYear, forecastYears, inputs.cashTaxRate),
  };
}

// DCF Calculation Logic
export function calculateDCF(inputs: DCFInputs): DCFOutputs {
  const normalizedInputs = normalizeInputsForForecastYears(inputs);
  const revenues: number[] = [];
  const ebit: number[] = [];
  const nopat: number[] = [];
  const freeCashFlow: number[] = [];

  // Calculate operating forecasts
  let revenue = normalizedInputs.startingRevenue;

  for (let year = 0; year < normalizedInputs.forecastYears; year++) {
    revenue *= 1 + normalizedInputs.revenueGrowth[year];
    revenues.push(revenue);

    // EBIT calculation - use advanced mode if available, otherwise simple mode
    const ebitMargin =
      normalizedInputs.forecastMode === 'advanced' && normalizedInputs.ebitMarginAdvanced
        ? normalizedInputs.ebitMarginAdvanced[year]
        : normalizedInputs.ebitMargin[year];
    const ebitValue = revenue * ebitMargin;
    ebit.push(ebitValue);

    // Tax rate - use advanced mode if available, otherwise simple mode
    const taxRate =
      normalizedInputs.forecastMode === 'advanced' && normalizedInputs.cashTaxRateByYear
        ? normalizedInputs.cashTaxRateByYear[year]
        : normalizedInputs.cashTaxRate;
    const nopatValue = ebitValue * (1 - taxRate);
    nopat.push(nopatValue);

    // Working capital changes
    let nwcChange = 0;
    if (year === 0) {
      // First year: assume NWC builds from zero
      const revenueChange = revenue - normalizedInputs.startingRevenue;
      nwcChange =
        revenueChange *
        (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.nwcChangeByYear
          ? normalizedInputs.nwcChangeByYear[year]
          : normalizedInputs.nwcChangePercentOfRevenueChange);
    } else {
      // Subsequent years: change based on revenue growth
      const revenueChange = revenues[year] - revenues[year - 1];
      nwcChange =
        revenueChange *
        (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.nwcChangeByYear
          ? normalizedInputs.nwcChangeByYear[year]
          : normalizedInputs.nwcChangePercentOfRevenueChange);
    }

    // Depreciation
    const depreciation =
      revenue *
      (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.depreciationByYear
        ? normalizedInputs.depreciationByYear[year]
        : normalizedInputs.depreciationPercentOfRevenue);

    // Capex
    const capex =
      revenue *
      (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.capexByYear
        ? normalizedInputs.capexByYear[year]
        : normalizedInputs.capexPercentOfRevenue);

    // FCFF calculation
    const fcff = nopatValue + depreciation - capex - nwcChange;
    freeCashFlow.push(fcff);
  }

  // Calculate WACC
  const costOfEquity = normalizedInputs.riskFreeRate + normalizedInputs.beta * normalizedInputs.equityRiskPremium;
  const afterTaxCostOfDebt = normalizedInputs.costOfDebt * (1 - normalizedInputs.taxRate);
  const wacc = costOfEquity * (1 - normalizedInputs.targetDebtRatio) + afterTaxCostOfDebt * normalizedInputs.targetDebtRatio;

  // Calculate terminal value
  let terminalValue = 0;
  const lastFCFF = freeCashFlow[freeCashFlow.length - 1];
  const lastRevenue = revenues[revenues.length - 1];
  const lastEBIT = ebit[ebit.length - 1];
  // Use terminal-year D&A rate (respects advanced mode)
  const terminalDepRate =
    normalizedInputs.forecastMode === 'advanced' && normalizedInputs.depreciationByYear
      ? normalizedInputs.depreciationByYear[normalizedInputs.depreciationByYear.length - 1]
      : normalizedInputs.depreciationPercentOfRevenue;

  if (normalizedInputs.terminalMethod === 'perpetual') {
    terminalValue = (lastFCFF * (1 + normalizedInputs.perpetualGrowth)) / (wacc - normalizedInputs.perpetualGrowth);
  } else if (normalizedInputs.terminalMethod === 'multiple') {
    let exitMetric = 0;
    if (normalizedInputs.exitMultipleMetric === 'ebitda') {
      exitMetric = lastEBIT + lastRevenue * terminalDepRate;
    } else if (normalizedInputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    terminalValue = exitMetric * normalizedInputs.exitMultiple;
  } else if (normalizedInputs.terminalMethod === 'both') {
    // Perpetuity component
    const perpetualTV = (lastFCFF * (1 + normalizedInputs.perpetualGrowth)) / (wacc - normalizedInputs.perpetualGrowth);

    // Multiple component
    let exitMetric = 0;
    if (normalizedInputs.exitMultipleMetric === 'ebitda') {
      exitMetric = lastEBIT + lastRevenue * terminalDepRate;
    } else if (normalizedInputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    const multipleTV = exitMetric * normalizedInputs.exitMultiple;

    // Weighted average
    terminalValue = perpetualTV * normalizedInputs.terminalWeighting + multipleTV * (1 - normalizedInputs.terminalWeighting);
  }

  // Calculate present values (with mid-year convention if enabled)
  let pvFcff = 0;
  for (let i = 0; i < freeCashFlow.length; i++) {
    const discountPeriod = normalizedInputs.midYearConvention ? i + 0.5 : i + 1;
    pvFcff += freeCashFlow[i] / Math.pow(1 + wacc, discountPeriod);
  }
  const pvTerminal = terminalValue / Math.pow(1 + wacc, normalizedInputs.forecastYears);

  // Calculate enterprise and equity value
  const enterpriseValue = pvFcff + pvTerminal;
  const netDebt = normalizedInputs.totalDebt - normalizedInputs.cashEquivalents;
  const equityValue =
    enterpriseValue - netDebt - normalizedInputs.preferredEquity - normalizedInputs.minorityInterest + normalizedInputs.nonOperatingAssets;
  const sharesDiluted = normalizedInputs.sharesDiluted || 100000000; // Default if not set
  const intrinsicValuePerShare = equityValue / sharesDiluted;
  const upsideDownside =
    normalizedInputs.currentPrice !== 0 ? (intrinsicValuePerShare - normalizedInputs.currentPrice) / normalizedInputs.currentPrice : 0;
  // PV of terminal value as % of EV — the meaningful sensitivity indicator
  const terminalValueContribution = enterpriseValue > 0 ? pvTerminal / enterpriseValue : 0;

  return {
    revenues,
    ebit,
    nopat,
    freeCashFlow,
    terminalValue,
    pvOfFcff: pvFcff,
    pvOfTerminalValue: pvTerminal,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    upsideDownside,
    terminalValueContribution,
    costOfEquity,
    afterTaxCostOfDebt,
    wacc,
  };
}

/**
 * Value per share at a different WACC and terminal growth, keeping the forecast cash flows and the
 * same terminal blend as `outputs`. The exit-multiple leg does not depend on WACC or growth, so it is
 * backed out of the base terminal value once.
 */
export function valuePerShareAt(inputs: DCFInputs, outputs: DCFOutputs, wacc: number, growth: number): number | null {
  const fcf = outputs.freeCashFlow;
  if (!fcf.length) return null;
  const last = fcf[fcf.length - 1];
  const perpetual = (w: number, g: number) => (last * (1 + g)) / (w - g);
  const weight = inputs.terminalMethod === 'perpetual' ? 1 : inputs.terminalMethod === 'multiple' ? 0 : inputs.terminalWeighting;
  if (weight > 0 && wacc <= growth) return null;
  const multipleTV = weight >= 1 ? 0 : (outputs.terminalValue - weight * perpetual(outputs.wacc, inputs.perpetualGrowth)) / (1 - weight);
  const pv = fcf.reduce((s, f, i) => s + f / Math.pow(1 + wacc, inputs.midYearConvention ? i + 0.5 : i + 1), 0);
  const tv = (weight > 0 ? weight * perpetual(wacc, growth) : 0) + (1 - weight) * multipleTV;
  const equity =
    pv + tv / Math.pow(1 + wacc, inputs.forecastYears) - inputs.totalDebt + inputs.cashEquivalents - inputs.preferredEquity - inputs.minorityInterest + inputs.nonOperatingAssets;
  return equity / (inputs.sharesDiluted || 100000000);
}

export interface ScenarioParams {
  revenueGrowthAdj: number;
  marginAdj: number;
  waccAdj: number;
  termGrowthAdj: number;
}

/** The DCF page's default bull and bear shifts. */
export const DEFAULT_SCENARIOS: { bull: ScenarioParams; bear: ScenarioParams } = {
  bull: { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 },
  bear: { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 },
};

export function scenarioInputs(inputs: DCFInputs, params: ScenarioParams): DCFInputs {
  return {
    ...inputs,
    revenueGrowth: inputs.revenueGrowth.map((g) => g + params.revenueGrowthAdj),
    ebitMargin: inputs.ebitMargin.map((m) => m + params.marginAdj),
    riskFreeRate: inputs.riskFreeRate + params.waccAdj,
    perpetualGrowth: Math.max(
      0.005,
      Math.min(inputs.perpetualGrowth + params.termGrowthAdj, inputs.riskFreeRate + params.waccAdj - 0.01)
    ),
  };
}

export type DCFOutputsWithScenarios = DCFOutputs & { bull: DCFOutputs; bear: DCFOutputs };

/** Base case plus the default bull/bear scenarios, in the shape the DCF page saves to SavedDCFModel.outputs. */
export function outputsWithScenarios(inputs: DCFInputs): DCFOutputsWithScenarios {
  return {
    ...calculateDCF(inputs),
    bull: calculateDCF(scenarioInputs(inputs, DEFAULT_SCENARIOS.bull)),
    bear: calculateDCF(scenarioInputs(inputs, DEFAULT_SCENARIOS.bear)),
  };
}
