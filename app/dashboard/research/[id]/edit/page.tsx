'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Save, Eye, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Building2, Upload, Image as ImageIcon } from 'lucide-react';

interface ThesisBullet {
  claim: string;
  driver: string;
  mispricing: string;
}

interface Catalyst {
  event: string;
  mechanism: string;
  probability: 'low' | 'medium' | 'high';
  timeframe: string;
}

interface Risk {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export default function EditResearchReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const reportId = params.id; // Editing existing report

  const [activeSection, setActiveSection] = useState<string>('metadata');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedDCFModels, setSavedDCFModels] = useState<any[]>([]);
  const [selectedDCFModelId, setSelectedDCFModelId] = useState<string>('');
  const [loadingDCFModels, setLoadingDCFModels] = useState(false);
  const [dcfData, setDcfData] = useState<{ inputs: any; outputs: any } | null>(null);

  // Form state
  const [metadata, setMetadata] = useState({
    companyName: '',
    ticker: '',
    exchange: 'NYSE',
    sector: '',
    industry: '',
    coverageStatus: 'initiation',
    recommendation: 'hold' as string,
    currentPrice: 0,
    targetPrice: 0,
    currency: 'USD',
    analysts: [''] as string[],
    priceDate: '',
    fiftyTwoWeekRange: '',
    marketCap: null as number | null,
    sharesOutstanding: null as number | null,
    fiscalYearEnd: '',
    priceTargetEndDate: '',
    dataSource: '',
    epsTableMarkdown: '',
    peRatio: null as number | null,
    forwardPE: null as number | null, // Calculated from DCF
    forwardPEConsensus: null as number | null, // From API
    dividendYield: null as number | null,
    performanceMetrics: null as {
      absYTD?: number; abs1m?: number; abs3m?: number; abs12m?: number;
      relYTD?: number; rel1m?: number; rel3m?: number; rel12m?: number;
    } | null,
  });

  const [thesis, setThesis] = useState<ThesisBullet[]>([
    { claim: '', driver: '', mispricing: '' }
  ]);

  const [businessModel, setBusinessModel] = useState({
    description: '',
    unitEconomics: '',
    economicMoat: '',
  });

  const [industryAnalysis, setIndustryAnalysis] = useState('');

  const [catalystsNear, setCatalystsNear] = useState<Catalyst[]>([
    { event: '', mechanism: '', probability: 'medium', timeframe: '' }
  ]);

  const [catalystsMedium, setCatalystsMedium] = useState<Catalyst[]>([
    { event: '', mechanism: '', probability: 'medium', timeframe: '' }
  ]);

  const [valuationAnalysis, setValuationAnalysis] = useState('');
  
  const [bearCase, setBearCase] = useState('');
  const [bullCase, setBullCase] = useState('');
  const [bullBearJustification, setBullBearJustification] = useState('');
  const [aiStrategies, setAiStrategies] = useState('');
  
  const [risks, setRisks] = useState<Risk[]>([
    { title: '', description: '', impact: 'medium', mitigation: '' }
  ]);

  const [esgFactors, setEsgFactors] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch available DCF models on mount
  useEffect(() => {
    fetchSavedDCFModels();
  }, []);

  // Load existing report data for editing
  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await fetch(`/api/research-reports/${reportId}`);
        if (!res.ok) throw new Error('Failed to load report');
        
        const report = await res.json();

        // Populate all form fields
        setMetadata({
          companyName: report.companyName,
          ticker: report.ticker,
          exchange: report.exchange,
          sector: report.sector,
          industry: report.industry,
          coverageStatus: report.coverageStatus,
          recommendation: report.recommendation,
          currentPrice: report.currentPrice,
          targetPrice: report.targetPrice,
          currency: report.currency,
          analysts: report.analysts || [''],
          priceDate: report.priceDate || '',
          fiftyTwoWeekRange: report.fiftyTwoWeekRange || '',
          marketCap: report.marketCap ?? null,
          sharesOutstanding: report.sharesOutstanding ?? null,
          fiscalYearEnd: report.fiscalYearEnd || '',
          priceTargetEndDate: report.priceTargetEndDate || '',
          dataSource: report.dataSource || '',
          epsTableMarkdown: report.epsTableMarkdown || '',
          peRatio: report.peRatio ?? null,
          forwardPE: report.forwardPE ?? null,
          forwardPEConsensus: (report as any).forwardPEConsensus ?? null,
          dividendYield: (report as any).dividendYield ?? null,
          performanceMetrics: report.performanceMetrics ?? null,
        });

        setThesis(report.investmentThesis || [{ claim: '', driver: '', mispricing: '' }]);
        setBusinessModel({
          description: report.businessModel || '',
          unitEconomics: report.unitEconomics || '',
          economicMoat: report.economicMoat || '',
        });
        setIndustryAnalysis(report.industryAnalysis || '');
        setCatalystsNear(report.catalystsNearTerm || [{ event: '', mechanism: '', probability: 'medium', timeframe: '' }]);
        setCatalystsMedium(report.catalystsMediumTerm || [{ event: '', mechanism: '', probability: 'medium', timeframe: '' }]);
        setValuationAnalysis(report.valuationAnalysis || '');
        setBearCase(report.bearCase || '');
        setBullCase(report.bullCase || '');
        setBullBearJustification(report.bullBearJustification || '');
        setAiStrategies(report.aiStrategies || '');
        setRisks(report.keyRisks || [{ title: '', description: '', impact: 'medium', mitigation: '' }]);
        setEsgFactors(report.esgFactors || '');

        // Load DCF data if exists (include priceHistory from report so chart persists)
        if (report.dcfInputs || report.dcfOutputs) {
          setDcfData({
            inputs: {
              ...(report.dcfInputs || {}),
              priceHistory: (report as any).priceHistory ?? report.dcfInputs?.priceHistory
            },
            outputs: report.dcfOutputs || {}
          });
        }

      } catch (error) {
        console.error('Error loading report:', error);
        alert('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const fetchSavedDCFModels = async () => {
    setLoadingDCFModels(true);
    try {
      const response = await fetch('/api/dcf-models');
      if (!response.ok) throw new Error('Failed to fetch DCF models');
      
      const models = await response.json();
      setSavedDCFModels(models);
    } catch (error) {
      console.error('Error fetching DCF models:', error);
    } finally {
      setLoadingDCFModels(false);
    }
  };

  const handleDCFModelSelect = async (modelId: string) => {
    setSelectedDCFModelId(modelId);
    if (modelId) {
      await loadDCFModel(modelId);
    }
  };

  const loadDCFModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/dcf-models/${modelId}`);
      if (!response.ok) throw new Error('Failed to load DCF model');
      
      const model = await response.json();
      
      // Store DCF data for saving with report (merge in PE ratios and price history from API so they persist)
      setDcfData({
        inputs: {
          ...model.inputs,
          peRatio: model.financialData?.peRatio,
          forwardPE: model.financialData?.forwardPE,
          priceHistory: model.financialData?.priceHistory
        },
        outputs: model.outputs
      });
      
      // Auto-populate metadata from DCF (including company snapshot data)
      setMetadata(prev => {
        const currentPrice = model.inputs.currentPrice || prev.currentPrice;
        const sharesOutstanding = model.inputs.sharesOutstanding || model.financialData?.sharesOutstanding || null;
        const marketCap = currentPrice && sharesOutstanding ? (currentPrice * sharesOutstanding) / 1e6 : null; // in millions
        
        // Calculate 52-week range from DCF financial data
        const week52High = model.financialData?.week52High;
        const week52Low = model.financialData?.week52Low;
        const fiftyTwoWeekRange = week52High && week52Low ? `${week52Low.toFixed(2)}-${week52High.toFixed(2)}` : prev.fiftyTwoWeekRange;
        
        // Get fiscal year end from financial data (usually stored as month name like "December")
        const fiscalYearEnd = model.financialData?.fiscalYearEnd || prev.fiscalYearEnd;
        
        // Build EPS table from quarterly earnings data
        let epsTable = '';
        if (model.financialData?.quarterlyEPS && model.financialData.quarterlyEPS.length > 0) {
          const quarters = model.financialData.quarterlyEPS.slice(0, 12); // Last 12 quarters (3 years)
          epsTable = '| Quarter | Reported EPS |\n|---------|-------------|\n';
          quarters.forEach((q: any) => {
            const date = new Date(q.fiscalDateEnding);
            const qtr = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear().toString().slice(-2)}`;
            epsTable += `| ${qtr} | $${q.reportedEPS} |\n`;
          });
        }
        
        // Get price performance from DCF financial data
        const pricePerformance = model.financialData?.pricePerformance || null;
        
        // Calculate our own Forward P/E from DCF projections
        // Forward P/E = Current Price / Next Year's Projected EPS
        // Use TTM EPS grown by our Year 1 revenue growth rate
        let calculatedForwardPE = null;
        if (currentPrice > 0 && model.inputs?.revenueGrowth?.[0] != null) {
          const ttmEPS = model.financialData?.dilutedEPSTTM;
          const year1GrowthRate = model.inputs.revenueGrowth[0]; // Year 1 growth rate from DCF
          
          if (ttmEPS && ttmEPS > 0) {
            // Assume EPS grows at same rate as revenue (conservative)
            const nextYearEPS = ttmEPS * (1 + year1GrowthRate);
            calculatedForwardPE = currentPrice / nextYearEPS;
          }
        }
        
        return {
          ...prev,
          companyName: model.companyName || prev.companyName,
          ticker: model.ticker || prev.ticker,
          currentPrice: currentPrice,
          targetPrice: model.outputs.intrinsicValuePerShare || prev.targetPrice,
          sector: model.financialData?.sector || prev.sector,
          industry: model.financialData?.industry || prev.industry,
          // Company snapshot fields from DCF
          priceDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).replace(',', ''),
          fiftyTwoWeekRange: fiftyTwoWeekRange,
          marketCap: marketCap,
          sharesOutstanding: sharesOutstanding ? sharesOutstanding / 1e6 : null, // convert to millions for display
          fiscalYearEnd: fiscalYearEnd,
          dataSource: 'Company data, Bloomberg, Alpha Vantage API',
          epsTableMarkdown: epsTable || prev.epsTableMarkdown,
          performanceMetrics: pricePerformance || prev.performanceMetrics,
          peRatio: model.financialData?.peRatio ?? prev.peRatio,
          forwardPE: calculatedForwardPE ?? prev.forwardPE, // Our calculated Forward P/E
          forwardPEConsensus: model.financialData?.forwardPEConsensus ?? prev.forwardPEConsensus, // API consensus
          dividendYield: model.financialData?.dividendYield ?? prev.dividendYield,
        };
      });

      // Auto-populate valuation analysis with comprehensive DCF results including tables
      const avgRevGrowth = model.inputs.revenueGrowth.reduce((sum: number, g: number) => sum + g, 0) / model.inputs.revenueGrowth.length;
      const avgEBITMargin = model.inputs.ebitMargin.reduce((sum: number, m: number) => sum + m, 0) / model.inputs.ebitMargin.length;
      
      // Build revenue projections table
      let revenueTable = '\n| Year | Revenue ($M) | Growth % | EBIT ($M) | EBIT Margin % | FCFF ($M) |\n';
      revenueTable += '|------|-------------|----------|-----------|---------------|----------|\n';
      let revenue = model.inputs.startingRevenue;
      model.outputs.revenues.forEach((rev: number, i: number) => {
        const growth = i === 0 ? model.inputs.revenueGrowth[i] : (rev / model.outputs.revenues[i-1] - 1);
        const ebit = model.outputs.ebit[i];
        const ebitMargin = ebit / rev;
        const fcff = model.outputs.freeCashFlow[i];
        revenueTable += `| Year ${i+1} | $${(rev / 1e6).toFixed(0)} | ${(growth * 100).toFixed(1)}% | $${(ebit / 1e6).toFixed(0)} | ${(ebitMargin * 100).toFixed(1)}% | $${(fcff / 1e6).toFixed(0)} |\n`;
      });
      
      // Build WACC calculation table
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

      // Build valuation summary table
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

      // Build sensitivity table for WACC vs Growth
      let sensitivityTable = '\n### Sensitivity Analysis: Intrinsic Value per Share\n\n';
      sensitivityTable += '**WACC vs Terminal Growth Rate**\n\n';
      sensitivityTable += '|  | ';
      const termGrowthRange = [-0.01, -0.005, 0, 0.005, 0.01];
      termGrowthRange.forEach(tg => {
        sensitivityTable += `${((model.inputs.perpetualGrowth + tg) * 100).toFixed(1)}% | `;
      });
      sensitivityTable += '\n|---|' + '---|'.repeat(termGrowthRange.length) + '\n';
      
      const waccRange = [-0.01, -0.005, 0, 0.005, 0.01];
      waccRange.forEach(wd => {
        const testWacc = model.outputs.wacc + wd;
        sensitivityTable += `| **${(testWacc * 100).toFixed(2)}%** | `;
        termGrowthRange.forEach(tg => {
          const testGrowth = model.inputs.perpetualGrowth + tg;
          // Simple approximation of intrinsic value with different WACC and growth
          const lastFCFF = model.outputs.freeCashFlow[model.outputs.freeCashFlow.length - 1];
          const termValue = lastFCFF * (1 + testGrowth) / (testWacc - testGrowth);
          const pvFcff = model.outputs.freeCashFlow.reduce((sum: number, fcf: number, i: number) => 
            sum + fcf / Math.pow(1 + testWacc, i + 1), 0);
          const pvTermValue = termValue / Math.pow(1 + testWacc, model.inputs.forecastYears);
          const ev = pvFcff + pvTermValue;
          const equity = ev - model.inputs.totalDebt + model.inputs.cashEquivalents - model.inputs.preferredEquity - model.inputs.minorityInterest;
          const perShare = equity / model.inputs.sharesDiluted;
          sensitivityTable += `$${perShare.toFixed(2)} | `;
        });
        sensitivityTable += '\n';
      });
      
      setValuationAnalysis(`# DCF Valuation Analysis

## Executive Summary

Our DCF model values ${model.companyName} at **$${model.outputs.intrinsicValuePerShare.toFixed(2)} per share**, representing a **${(model.outputs.upsideDownside * 100).toFixed(1)}%** ${model.outputs.upsideDownside >= 0 ? 'upside' : 'downside'} to the current market price of $${model.inputs.currentPrice.toFixed(2)}. The valuation is based on a ${model.inputs.forecastYears}-year explicit forecast period and a terminal value using ${model.inputs.terminalMethod === 'perpetual' ? 'perpetuity growth' : 'exit multiple'} methodology.

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
| Terminal FCFF | $${(model.outputs.freeCashFlow[model.outputs.freeCashFlow.length - 1] * (1 + model.inputs.perpetualGrowth) / 1e6).toFixed(0)}M |
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

At $${model.outputs.intrinsicValuePerShare.toFixed(2)} per share, our DCF valuation suggests the stock is currently **${model.outputs.upsideDownside >= 0 ? 'undervalued' : 'overvalued'}** by ${Math.abs(model.outputs.upsideDownside * 100).toFixed(1)}%. The valuation is most sensitive to assumptions around terminal growth rate and discount rate, as illustrated in the sensitivity table above.`);

      // Pre-fill bull and bear cases from DCF scenarios if saved with the model
      if (model.outputs.bull && model.outputs.bear) {
        const bullUpside = model.inputs.currentPrice > 0
          ? ((model.outputs.bull.intrinsicValuePerShare - model.inputs.currentPrice) / model.inputs.currentPrice) * 100
          : 0;
        const bearUpside = model.inputs.currentPrice > 0
          ? ((model.outputs.bear.intrinsicValuePerShare - model.inputs.currentPrice) / model.inputs.currentPrice) * 100
          : 0;
        setBullCase(`## Bull Case (from DCF model)

**Target:** $${model.outputs.bull.intrinsicValuePerShare.toFixed(2)} per share (**${bullUpside >= 0 ? '+' : ''}${bullUpside.toFixed(1)}%** vs current $${model.inputs.currentPrice.toFixed(2)})

| Metric | Bull Case |
|--------|-----------|
| Intrinsic Value/Share | $${model.outputs.bull.intrinsicValuePerShare.toFixed(2)} |
| Enterprise Value | $${(model.outputs.bull.enterpriseValue / 1e9).toFixed(2)}B |
| WACC | ${(model.outputs.bull.wacc * 100).toFixed(2)}% |

*Assumptions: Higher revenue growth, margin expansion, lower discount rate. Adjust narrative and add justification below.*`);
        setBearCase(`## Bear Case (from DCF model)

**Target:** $${model.outputs.bear.intrinsicValuePerShare.toFixed(2)} per share (**${bearUpside.toFixed(1)}%** vs current $${model.inputs.currentPrice.toFixed(2)})

| Metric | Bear Case |
|--------|-----------|
| Intrinsic Value/Share | $${model.outputs.bear.intrinsicValuePerShare.toFixed(2)} |
| Enterprise Value | $${(model.outputs.bear.enterpriseValue / 1e9).toFixed(2)}B |
| WACC | ${(model.outputs.bear.wacc * 100).toFixed(2)}% |

*Assumptions: Lower growth, margin pressure, higher discount rate. Adjust narrative and add justification below.*`);
      }

      alert('DCF model loaded successfully! Full valuation analysis with tables and sensitivity analysis has been generated.' + (model.outputs.bull && model.outputs.bear ? ' Bull and bear cases pre-filled from DCF scenarios.' : ''));
    } catch (error) {
      console.error('Error loading DCF model:', error);
      alert('Failed to load DCF model');
    }
  };

  const handleSave = async (publishNow: boolean = false) => {
    setSaving(true);
    try {
      const reportData = {
        ...metadata,
        dcfInputs: dcfData?.inputs || null,
        dcfOutputs: dcfData?.outputs || null,
        priceHistory: dcfData?.inputs?.priceHistory || null,
        investmentThesis: thesis,
        businessModel: businessModel.description,
        unitEconomics: businessModel.unitEconomics,
        economicMoat: businessModel.economicMoat,
        industryAnalysis,
        catalystsNearTerm: catalystsNear,
        catalystsMediumTerm: catalystsMedium,
        valuationAnalysis,
        bearCase,
        bullCase,
        bullBearJustification,
        aiStrategies,
        keyRisks: risks,
        esgFactors,
        financialSnapshot: {}, // Will be populated from DCF
        forecastAssumptions: {},
        incomeStatementForecast: {},
        cashFlowForecast: {},
        sensitivityAnalysis: {},
        valuationMethod: 'dcf',
        published: publishNow,
        status: publishNow ? 'published' : 'draft',
      };

      const url = reportId ? `/api/research-reports/${reportId}` : '/api/research-reports';
      const method = reportId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) throw new Error('Failed to save report');

      alert(publishNow ? 'Report published successfully!' : 'Report saved as draft');
      if (publishNow) {
        router.push('/dashboard/research');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'metadata', name: 'Company Info', icon: Building2 },
    { id: 'thesis', name: 'Investment Thesis', icon: Target },
    { id: 'business', name: 'Business Model', icon: FileText },
    { id: 'industry', name: 'Industry Analysis', icon: TrendingUp },
    { id: 'catalysts', name: 'Catalysts', icon: TrendingUp },
    { id: 'valuation', name: 'Valuation', icon: DollarSign },
    { id: 'bullbear', name: 'Bull & Bear Cases', icon: TrendingUp },
    { id: 'justification', name: 'Justification (Optional)', icon: FileText },
    { id: 'risks', name: 'Risks', icon: AlertTriangle },
    { id: 'aistrategies', name: 'AI Strategies', icon: Target },
    { id: 'esg', name: 'ESG (Optional)', icon: FileText },
  ];

  const addThesisBullet = () => {
    setThesis([...thesis, { claim: '', driver: '', mispricing: '' }]);
  };

  const addCatalyst = (type: 'near' | 'medium') => {
    const newCatalyst = { event: '', mechanism: '', probability: 'medium' as const, timeframe: '' };
    if (type === 'near') {
      setCatalystsNear([...catalystsNear, newCatalyst]);
    } else {
      setCatalystsMedium([...catalystsMedium, newCatalyst]);
    }
  };

  const addRisk = () => {
    setRisks([...risks, { title: '', description: '', impact: 'medium', mitigation: '' }]);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      const imageUrl = data.url;
      const imageMarkdown = `![Image](${imageUrl})`;

      // Copy to clipboard
      await navigator.clipboard.writeText(imageMarkdown);
      alert(`Image uploaded! Markdown copied to clipboard:\n${imageMarkdown}\n\nPaste this into any text field.`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/research">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Edit Research Report
            </h1>
            <p className="text-muted-foreground">
              {metadata.companyName || 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={uploadingImage}
            variant="outline"
            className="bg-purple-50 text-purple-700 hover:bg-purple-100"
          >
            {uploadingImage ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <Eye className="w-4 h-4 mr-2" />
            Save & Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-3">
          <Card>
            <CardContent className="pt-6">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.name}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {activeSection === 'metadata' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Information & Recommendation</CardTitle>
                <CardDescription>Basic company details and investment recommendation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* DCF Model Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold mb-2 text-blue-900">
                    📊 Load from Saved DCF Model (Optional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedDCFModelId}
                      onChange={(e) => handleDCFModelSelect(e.target.value)}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-md bg-white"
                      disabled={loadingDCFModels}
                    >
                      <option value="">-- Select a DCF model to auto-populate --</option>
                      {savedDCFModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.ticker}) - {new Date(model.updatedAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    {selectedDCFModelId && (
                      <Button
                        type="button"
                        onClick={() => handleDCFModelSelect(selectedDCFModelId)}
                        variant="outline"
                        className="whitespace-nowrap"
                      >
                        Reload
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Selecting a DCF model will auto-populate: company name, ticker, current price, target price, sector, industry, and full valuation analysis.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={metadata.companyName}
                      onChange={(e) => setMetadata({ ...metadata, companyName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Apple Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ticker</label>
                    <input
                      type="text"
                      value={metadata.ticker}
                      onChange={(e) => setMetadata({ ...metadata, ticker: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="AAPL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Exchange</label>
                    <select
                      value={metadata.exchange}
                      onChange={(e) => setMetadata({ ...metadata, exchange: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="NYSE">NYSE</option>
                      <option value="NASDAQ">NASDAQ</option>
                      <option value="TSX">TSX</option>
                      <option value="LSE">LSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sector</label>
                    <input
                      type="text"
                      value={metadata.sector}
                      onChange={(e) => setMetadata({ ...metadata, sector: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Technology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Industry</label>
                    <input
                      type="text"
                      value={metadata.industry}
                      onChange={(e) => setMetadata({ ...metadata, industry: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Consumer Electronics"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Coverage Status</label>
                    <select
                      value={metadata.coverageStatus}
                      onChange={(e) => setMetadata({ ...metadata, coverageStatus: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="initiation">Initiation</option>
                      <option value="update">Update</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Recommendation</label>
                    <select
                      value={metadata.recommendation}
                      onChange={(e) => setMetadata({ ...metadata, recommendation: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="buy">Buy</option>
                      <option value="hold">Hold</option>
                      <option value="sell">Sell</option>
                      <option value="overweight">Overweight</option>
                      <option value="neutral">Neutral</option>
                      <option value="underweight">Underweight</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={metadata.currentPrice}
                      onChange={(e) => setMetadata({ ...metadata, currentPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={metadata.targetPrice}
                      onChange={(e) => setMetadata({ ...metadata, targetPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Implied Upside</label>
                    <div className="px-3 py-2 border rounded-md bg-gray-50 text-center font-medium">
                      {metadata.currentPrice > 0 
                        ? ((metadata.targetPrice - metadata.currentPrice) / metadata.currentPrice * 100).toFixed(1)
                        : '0.0'}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Analysts</label>
                  <textarea
                    value={metadata.analysts.join(', ')}
                    onChange={(e) => {
                      // Only split and trim when comma is present, otherwise keep raw input
                      const value = e.target.value;
                      if (value.includes(',')) {
                        setMetadata({ ...metadata, analysts: value.split(',').map(a => a.trim()).filter(a => a) });
                      } else {
                        setMetadata({ ...metadata, analysts: value ? [value] : [''] });
                      }
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter analyst names separated by commas (e.g., John Smith, Jane Doe)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate multiple analysts with commas
                  </p>
                </div>

                {/* Company Snapshot */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-3">Company Snapshot</h3>
                  <p className="text-sm text-gray-500 mb-4">Optional: price date, 52-week range, market cap, fiscal year end, data source.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price Date</label>
                      <input
                        type="text"
                        value={metadata.priceDate}
                        onChange={(e) => setMetadata({ ...metadata, priceDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 29 Sep 15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">52-Week Range ($)</label>
                      <input
                        type="text"
                        value={metadata.fiftyTwoWeekRange}
                        onChange={(e) => setMetadata({ ...metadata, fiftyTwoWeekRange: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 22.81-39.27"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Market Cap ($ mn)</label>
                      <input
                        type="number"
                        step="any"
                        value={metadata.marketCap ?? ''}
                        onChange={(e) => setMetadata({ ...metadata, marketCap: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 53148"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Shares O/S (mn)</label>
                      <input
                        type="number"
                        step="any"
                        value={metadata.sharesOutstanding ?? ''}
                        onChange={(e) => setMetadata({ ...metadata, sharesOutstanding: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 2060"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Fiscal Year End</label>
                      <input
                        type="text"
                        value={metadata.fiscalYearEnd}
                        onChange={(e) => setMetadata({ ...metadata, fiscalYearEnd: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. Jun"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Price Target End Date</label>
                      <input
                        type="text"
                        value={metadata.priceTargetEndDate}
                        onChange={(e) => setMetadata({ ...metadata, priceTargetEndDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 31-Dec-16"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Data Source</label>
                    <input
                      type="text"
                      value={metadata.dataSource}
                      onChange={(e) => setMetadata({ ...metadata, dataSource: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g. Company data, Bloomberg, J.P. Morgan estimates"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">P/E Ratio (TTM, from API)</label>
                      <div className="px-3 py-2 border rounded-md bg-gray-50 font-medium">
                        {metadata.peRatio != null ? metadata.peRatio.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Dividend Yield (from API)</label>
                      <div className="px-3 py-2 border rounded-md bg-gray-50 font-medium">
                        {metadata.dividendYield != null ? `${metadata.dividendYield.toFixed(2)}%` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Forward P/E (Our DCF Projection)</label>
                      <div className="px-3 py-2 border rounded-md bg-blue-50 border-blue-200 font-medium text-blue-700">
                        {metadata.forwardPE != null ? metadata.forwardPE.toFixed(2) : '—'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Based on our DCF EPS projections</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Forward P/E (Consensus)</label>
                      <div className="px-3 py-2 border rounded-md bg-purple-50 border-purple-200 font-medium text-purple-700">
                        {metadata.forwardPEConsensus != null ? metadata.forwardPEConsensus.toFixed(2) : '—'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Analyst consensus from API</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">EPS Table (Markdown)</label>
                    <textarea
                      value={metadata.epsTableMarkdown}
                      onChange={(e) => setMetadata({ ...metadata, epsTableMarkdown: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Paste or type EPS table in markdown"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Price Chart Preview (from DCF)</label>
                    {dcfData?.inputs?.priceHistory && dcfData.inputs.priceHistory.length > 0 ? (
                      <div className="border rounded-md p-4 bg-gray-50">
                        <svg viewBox="0 0 800 200" className="w-full h-48">
                          {(() => {
                            const chartData = dcfData.inputs.priceHistory.slice(0, 252);
                            if (!chartData.length) return null;
                            const prices = chartData.map((d: any) => d.close);
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            const priceRange = maxPrice - minPrice;
                            const padding = priceRange * 0.1;
                            const points = chartData.map((d: any, i: number) => {
                              const x = (chartData.length > 1 ? i / (chartData.length - 1) : 0) * 780 + 10;
                              const y = 190 - ((d.close - minPrice + padding) / (priceRange + 2 * padding)) * 180;
                              return `${x},${y}`;
                            }).join(' ');
                            return (
                              <>
                                <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
                                <line x1="10" y1="190" x2="790" y2="190" stroke="#e5e7eb" strokeWidth="1" />
                                <text x="10" y="205" fontSize="12" fill="#6b7280">{chartData[chartData.length - 1]?.date}</text>
                                <text x="790" y="205" fontSize="12" fill="#6b7280" textAnchor="end">{chartData[0]?.date}</text>
                                <text x="10" y="15" fontSize="12" fill="#6b7280">${maxPrice.toFixed(2)}</text>
                                <text x="10" y="195" fontSize="12" fill="#6b7280">${minPrice.toFixed(2)}</text>
                              </>
                            );
                          })()}
                        </svg>
                        <p className="text-xs text-gray-500 mt-2">1-year price history (will be shown on the published report)</p>
                      </div>
                    ) : (
                      <div className="border rounded-md p-4 bg-yellow-50 border-yellow-200">
                        <p className="text-sm text-yellow-800">⚠️ Could not load price history. Run DCF analysis with a valid ticker to fetch price data from Alpha Vantage API.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Performance */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-3">Price Performance (%)</h3>
                  <p className="text-sm text-gray-500 mb-4">Absolute and relative. Enter as numbers (e.g. -32.8 for -32.8%).</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border px-3 py-2 text-left"></th>
                          <th className="border px-3 py-2 text-left">YTD</th>
                          <th className="border px-3 py-2 text-left">1m</th>
                          <th className="border px-3 py-2 text-left">3m</th>
                          <th className="border px-3 py-2 text-left">12m</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border px-3 py-2 font-medium">Abs</td>
                          {(['absYTD', 'abs1m', 'abs3m', 'abs12m'] as const).map((key) => (
                            <td key={key} className="border px-2 py-1">
                              <input
                                type="number"
                                step="0.1"
                                value={metadata.performanceMetrics?.[key] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  setMetadata({
                                    ...metadata,
                                    performanceMetrics: {
                                      ...(metadata.performanceMetrics || {}),
                                      [key]: v,
                                    },
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-sm"
                                placeholder="—"
                              />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border px-3 py-2 font-medium">Rel</td>
                          {(['relYTD', 'rel1m', 'rel3m', 'rel12m'] as const).map((key) => (
                            <td key={key} className="border px-2 py-1">
                              <input
                                type="number"
                                step="0.1"
                                value={metadata.performanceMetrics?.[key] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  setMetadata({
                                    ...metadata,
                                    performanceMetrics: {
                                      ...(metadata.performanceMetrics || {}),
                                      [key]: v,
                                    },
                                  });
                                }}
                                className="w-full px-2 py-1 border rounded text-sm"
                                placeholder="—"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'thesis' && (
            <Card>
              <CardHeader>
                <CardTitle>Investment Thesis</CardTitle>
                <CardDescription>
                  3-5 bullet points. Each must include: claim, driver, and why the market misprices it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {thesis.map((bullet, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Thesis Point #{index + 1}</h4>
                      {index > 0 && (
                        <Button
                          onClick={() => setThesis(thesis.filter((_, i) => i !== index))}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Claim</label>
                      <input
                        type="text"
                        value={bullet.claim}
                        onChange={(e) => {
                          const newThesis = [...thesis];
                          newThesis[index].claim = e.target.value;
                          setThesis(newThesis);
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g., Trading at 15x despite 20% structural advantage in..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Driver</label>
                      <input
                        type="text"
                        value={bullet.driver}
                        onChange={(e) => {
                          const newThesis = [...thesis];
                          newThesis[index].driver = e.target.value;
                          setThesis(newThesis);
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g., New product cycle driving 30% margin expansion..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Market Mispricing</label>
                      <input
                        type="text"
                        value={bullet.mispricing}
                        onChange={(e) => {
                          const newThesis = [...thesis];
                          newThesis[index].mispricing = e.target.value;
                          setThesis(newThesis);
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g., Market not yet pricing in regulatory approval..."
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={addThesisBullet} className="border-blue-500 text-blue-700 hover:bg-blue-50">
                  Add Thesis Point
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'business' && (
            <Card>
              <CardHeader>
                <CardTitle>Business Model & Economics</CardTitle>
                <CardDescription>How the company makes money and its competitive advantages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Business Model Description
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Images Supported</span>
                  </label>
                  <textarea
                    value={businessModel.description}
                    onChange={(e) => setBusinessModel({ ...businessModel, description: e.target.value })}
                    rows={15}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="Describe revenue streams, pricing, cost structure...

## Revenue Streams
- Stream 1: Description
- Stream 2: Description

## Pricing Model
How the company prices its products/services...

## Cost Structure
Key cost drivers...

**To add images:**
![Figure 1: Revenue Breakdown](https://your-image-url.com/image.png)
*Figure 1: Caption describing the image*"
                  />
                  <p className="text-xs text-gray-600 mt-1 space-y-1">
                    <span className="block">💡 <strong>Markdown Tips:</strong> Use **bold**, *italic*, ## Headers, - Lists</span>
                    <span className="block">🖼️ <strong>Images:</strong> ![Alt text](image-url) or upload to Imgur/your server and paste URL</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Unit Economics (if applicable)
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Images Supported</span>
                  </label>
                  <textarea
                    value={businessModel.unitEconomics}
                    onChange={(e) => setBusinessModel({ ...businessModel, unitEconomics: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Key Metrics
- **ARPU (Average Revenue Per User):** $X
- **CAC (Customer Acquisition Cost):** $Y
- **LTV (Lifetime Value):** $Z
- **LTV:CAC Ratio:** X:1
- **Payback Period:** X months

## Economies of Scale
What improves as company scales...

![Figure: Unit Economics Trend](image-url)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Economic Moat
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Images Supported</span>
                  </label>
                  <textarea
                    value={businessModel.economicMoat}
                    onChange={(e) => setBusinessModel({ ...businessModel, economicMoat: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Moat Sources

### 1. Cost Advantages
- Scale economies
- Process advantages
- Location advantages

### 2. Switching Costs
- Integration depth
- Financial switching costs
- Procedural switching costs

### 3. Network Effects
- Direct/indirect network effects
- Platform lock-in

### 4. Regulatory/IP Barriers
- Patents, licenses, regulations

![Figure: Competitive Moat Diagram](image-url)"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'industry' && (
            <Card>
              <CardHeader>
                <CardTitle>Industry & Competitive Landscape</CardTitle>
                <CardDescription>Industry dynamics and competitive positioning</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Industry Analysis
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Images Supported</span>
                  </label>
                  <textarea
                    value={industryAnalysis}
                    onChange={(e) => setIndustryAnalysis(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Industry Overview
- **Market Size:** $X billion (2024)
- **Growth Rate:** Y% CAGR (2024-2029)
- **Key Trends:** List major trends

## Competitive Landscape
### Major Players
1. **Company A** - Market share, positioning
2. **Company B** - Market share, positioning

### Competitive Positioning
How does this company compare?

![Figure: Market Share Analysis](image-url)

## Industry Dynamics
- **Secular Trends:** Long-term tailwinds/headwinds
- **Cyclical Factors:** Short-term considerations
- **Barriers to Entry:** What protects incumbents

## Regulatory Environment
Key regulations affecting the industry..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    💡 Include charts, tables, and diagrams to support analysis
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'catalysts' && (
            <Card>
              <CardHeader>
                <CardTitle>Catalysts & Timeline</CardTitle>
                <CardDescription>Specific events that could drive stock price appreciation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <h4 className="font-medium mb-4">Near-Term Catalysts (0-6 months)</h4>
                  <div className="space-y-4">
                    {catalystsNear.map((catalyst, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Event</label>
                            <input
                              type="text"
                              value={catalyst.event}
                              onChange={(e) => {
                                const newCatalysts = [...catalystsNear];
                                newCatalysts[index].event = e.target.value;
                                setCatalystsNear(newCatalysts);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                              placeholder="Q2 earnings release, product launch..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Probability</label>
                            <select
                              value={catalyst.probability}
                              onChange={(e) => {
                                const newCatalysts = [...catalystsNear];
                                newCatalysts[index].probability = e.target.value as 'low' | 'medium' | 'high';
                                setCatalystsNear(newCatalysts);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Mechanism (How it impacts earnings/multiples)</label>
                          <textarea
                            value={catalyst.mechanism}
                            onChange={(e) => {
                              const newCatalysts = [...catalystsNear];
                              newCatalysts[index].mechanism = e.target.value;
                              setCatalystsNear(newCatalysts);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Explain how this event impacts valuation..."
                          />
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => addCatalyst('near')} className="border-blue-500 text-blue-700 hover:bg-blue-50">
                      Add Near-Term Catalyst
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Medium-Term Catalysts (6-18 months)</h4>
                  <div className="space-y-4">
                    {catalystsMedium.map((catalyst, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Event</label>
                            <input
                              type="text"
                              value={catalyst.event}
                              onChange={(e) => {
                                const newCatalysts = [...catalystsMedium];
                                newCatalysts[index].event = e.target.value;
                                setCatalystsMedium(newCatalysts);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                              placeholder="Regulatory approval, market expansion..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Probability</label>
                            <select
                              value={catalyst.probability}
                              onChange={(e) => {
                                const newCatalysts = [...catalystsMedium];
                                newCatalysts[index].probability = e.target.value as 'low' | 'medium' | 'high';
                                setCatalystsMedium(newCatalysts);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Mechanism</label>
                          <textarea
                            value={catalyst.mechanism}
                            onChange={(e) => {
                              const newCatalysts = [...catalystsMedium];
                              newCatalysts[index].mechanism = e.target.value;
                              setCatalystsMedium(newCatalysts);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Explain how this event impacts valuation..."
                          />
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => addCatalyst('medium')} className="border-blue-500 text-blue-700 hover:bg-blue-50">
                      Add Medium-Term Catalyst
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'valuation' && (
            <Card>
              <CardHeader>
                <CardTitle>Valuation Analysis</CardTitle>
                <CardDescription>
                  {dcfData ? 'Valuation analysis from linked DCF model' : 'DCF methodology, key assumptions, and sensitivity analysis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Valuation Analysis
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Tables Supported</span>
                  </label>
                  <textarea
                    value={valuationAnalysis}
                    onChange={(e) => setValuationAnalysis(e.target.value)}
                    rows={25}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="This section will be auto-populated when you load a DCF model above. You can also manually edit/add content here.

## Additional Valuation Methods

### Comparable Companies Analysis
Add peer comparisons, trading multiples...

### Precedent Transactions
Recent M&A activity in the sector...

### Sum-of-the-Parts
If applicable for multi-business companies..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    📊 When you load a DCF model, this field auto-fills with comprehensive tables. You can edit or add supplementary analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'bullbear' && (
            <Card>
              <CardHeader>
                <CardTitle>Bull & Bear Cases</CardTitle>
                <CardDescription>Upside and downside scenarios. Can be pre-filled from a linked DCF model if saved with bull/bear scenarios.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Bull Case</h4>
                  <p className="text-xs text-gray-500 mb-2">✓ Markdown & Images Supported</p>
                  <textarea
                    value={bullCase}
                    onChange={(e) => setBullCase(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Bull Case Thesis&#10;Key drivers that could push the stock higher...&#10;&#10;## Upside Scenario&#10;- Revenue growth above base case&#10;- Margin expansion&#10;- Multiple re-rating&#10;&#10;## Bull Case Valuation&#10;**Upside Target:** $XX per share (+XX%)"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Bear Case</h4>
                  <p className="text-xs text-gray-500 mb-2">✓ Markdown & Images Supported</p>
                  <textarea
                    value={bearCase}
                    onChange={(e) => setBearCase(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Bear Case Thesis&#10;What would invalidate the investment thesis?&#10;&#10;## Downside Scenario&#10;- Revenue miss, margin compression&#10;- Multiple compression&#10;&#10;## Bear Case Valuation&#10;**Downside Target:** $XX per share (-XX%)"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'justification' && (
            <Card>
              <CardHeader>
                <CardTitle>Justification for Bull & Bear Cases (Optional)</CardTitle>
                <CardDescription>Explain the rationale and assumptions behind your bull and bear scenarios.</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={bullBearJustification}
                  onChange={(e) => setBullBearJustification(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="Optional: Why these bull/bear cases? Key assumptions, probability weights, or how they tie to the DCF scenarios..."
                />
              </CardContent>
            </Card>
          )}

          {activeSection === 'risks' && (
            <Card>
              <CardHeader>
                <CardTitle>Key Risks</CardTitle>
                <CardDescription>Thesis-specific risks and mitigations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Key Risks</h4>
                  <div className="space-y-4">
                    {risks.map((risk, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Risk Title</label>
                            <input
                              type="text"
                              value={risk.title}
                              onChange={(e) => {
                                const newRisks = [...risks];
                                newRisks[index].title = e.target.value;
                                setRisks(newRisks);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                              placeholder="Regulatory changes..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Impact</label>
                            <select
                              value={risk.impact}
                              onChange={(e) => {
                                const newRisks = [...risks];
                                newRisks[index].impact = e.target.value as 'low' | 'medium' | 'high';
                                setRisks(newRisks);
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            value={risk.description}
                            onChange={(e) => {
                              const newRisks = [...risks];
                              newRisks[index].description = e.target.value;
                              setRisks(newRisks);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Describe the specific risk..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Mitigation</label>
                          <input
                            type="text"
                            value={risk.mitigation}
                            onChange={(e) => {
                              const newRisks = [...risks];
                              newRisks[index].mitigation = e.target.value;
                              setRisks(newRisks);
                            }}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="How can this risk be monitored or mitigated?"
                          />
                        </div>
                      </div>
                ))}
                <Button onClick={addRisk} className="border-red-500 text-red-700 hover:bg-red-50">
                  Add Risk
                </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'aistrategies' && (
            <Card>
              <CardHeader>
                <CardTitle>AI Strategies</CardTitle>
                <CardDescription>Information on the company's use of AI, data strategy, and digital initiatives.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-2">✓ Markdown & Images Supported</p>
                <textarea
                  value={aiStrategies}
                  onChange={(e) => setAiStrategies(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="## AI & Data Strategy&#10;How the company uses AI, automation, data...&#10;&#10;## Key Initiatives&#10;- Product, operations, or customer use cases&#10;- Partnerships, build vs buy&#10;&#10;## Competitive Moat&#10;How AI/digital capabilities support the thesis..."
                />
              </CardContent>
            </Card>
          )}

          {activeSection === 'esg' && (
            <Card>
              <CardHeader>
                <CardTitle>ESG & Governance (Optional)</CardTitle>
                <CardDescription>Material ESG factors and governance considerations</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ESG Factors & Governance
                    <span className="ml-2 text-xs font-normal text-blue-600">✓ Markdown & Images Supported</span>
                  </label>
                  <textarea
                    value={esgFactors}
                    onChange={(e) => setEsgFactors(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="## Environmental Factors
- Carbon footprint
- Climate risk exposure
- Environmental initiatives

## Social Factors
- Labor practices
- Diversity & inclusion
- Community impact

## Governance
- Board composition
- Executive compensation
- Shareholder rights
- Related party transactions

## Regulatory Exposure
Key regulations affecting operations...

![Figure: ESG Score Comparison](image-url)"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
