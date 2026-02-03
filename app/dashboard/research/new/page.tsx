'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Save, Eye, FileText, DollarSign, TrendingUp, AlertTriangle, Target, Building2 } from 'lucide-react';

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

export default function NewResearchReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dcfModelId = searchParams.get('dcfModelId');

  const [activeSection, setActiveSection] = useState<string>('metadata');
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  // Form state
  const [metadata, setMetadata] = useState({
    companyName: '',
    ticker: '',
    exchange: 'NYSE',
    sector: '',
    industry: '',
    coverageStatus: 'initiation',
    recommendation: 'hold',
    currentPrice: 0,
    targetPrice: 0,
    currency: 'USD',
    analysts: [''],
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
  
  const [risks, setRisks] = useState<Risk[]>([
    { title: '', description: '', impact: 'medium', mitigation: '' }
  ]);

  const [esgFactors, setEsgFactors] = useState('');

  // Load DCF model if ID provided
  useEffect(() => {
    if (dcfModelId) {
      loadDCFModel(dcfModelId);
    }
  }, [dcfModelId]);

  const loadDCFModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/dcf-models/${modelId}`);
      if (!response.ok) throw new Error('Failed to load DCF model');
      
      const model = await response.json();
      
      // Auto-populate metadata from DCF
      setMetadata(prev => ({
        ...prev,
        companyName: model.companyName,
        ticker: model.ticker,
        currentPrice: model.inputs.currentPrice || 0,
        targetPrice: model.outputs.intrinsicValuePerShare || 0,
      }));

      // Auto-populate valuation analysis
      setValuationAnalysis(`DCF Valuation Analysis:

**Enterprise Value**: $${(model.outputs.enterpriseValue / 1e9).toFixed(2)}B
**Equity Value**: $${(model.outputs.equityValue / 1e9).toFixed(2)}B
**Intrinsic Value per Share**: $${model.outputs.intrinsicValuePerShare.toFixed(2)}
**Upside/Downside**: ${(model.outputs.upsideDownside * 100).toFixed(1)}%

**WACC**: ${(model.outputs.wacc * 100).toFixed(2)}%
**Terminal Growth Rate**: ${(model.inputs.perpetualGrowth * 100).toFixed(2)}%

**Key Assumptions**:
- Forecast Period: ${model.inputs.forecastYears} years
- Starting Revenue: $${(model.inputs.startingRevenue / 1e9).toFixed(2)}B
- Average Revenue Growth: ${(model.inputs.revenueGrowth.reduce((sum: number, g: number) => sum + g, 0) / model.inputs.revenueGrowth.length * 100).toFixed(1)}%
- Average EBIT Margin: ${(model.inputs.ebitMargin.reduce((sum: number, m: number) => sum + m, 0) / model.inputs.ebitMargin.length * 100).toFixed(1)}%`);

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
        dcfModelId,
        investmentThesis: thesis,
        businessModel: businessModel.description,
        unitEconomics: businessModel.unitEconomics,
        economicMoat: businessModel.economicMoat,
        industryAnalysis,
        catalystsNearTerm: catalystsNear,
        catalystsMediumTerm: catalystsMedium,
        valuationAnalysis,
        bearCase,
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

      const savedReport = await response.json();
      setReportId(savedReport.id);
      
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
    { id: 'risks', name: 'Risks & Bear Case', icon: AlertTriangle },
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
              {reportId ? 'Edit' : 'New'} Research Report
            </h1>
            <p className="text-muted-foreground">
              {metadata.companyName || 'Create institutional-grade equity research report'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
                  <input
                    type="text"
                    value={metadata.analysts.join(', ')}
                    onChange={(e) => setMetadata({ ...metadata, analysts: e.target.value.split(',').map(a => a.trim()) })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Analyst Name 1, Analyst Name 2"
                  />
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
                <Button onClick={addThesisBullet} variant="outline">
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
                  <label className="block text-sm font-medium mb-2">Business Model Description</label>
                  <textarea
                    value={businessModel.description}
                    onChange={(e) => setBusinessModel({ ...businessModel, description: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="Describe revenue streams, pricing, cost structure..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit Economics (if applicable)</label>
                  <textarea
                    value={businessModel.unitEconomics}
                    onChange={(e) => setBusinessModel({ ...businessModel, unitEconomics: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="ARPU, CAC, LTV, margins per unit, what improves with scale..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Economic Moat</label>
                  <textarea
                    value={businessModel.economicMoat}
                    onChange={(e) => setBusinessModel({ ...businessModel, economicMoat: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="Cost advantages, switching costs, network effects, regulatory barriers..."
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
                <textarea
                  value={industryAnalysis}
                  onChange={(e) => setIndustryAnalysis(e.target.value)}
                  rows={15}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="Industry size and growth, key competitors, competitive positioning, secular vs cyclical forces..."
                />
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
                    <Button onClick={() => addCatalyst('near')} variant="outline">
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
                    <Button onClick={() => addCatalyst('medium')} variant="outline">
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
                  {dcfModelId ? 'Valuation analysis pre-populated from linked DCF model' : 'DCF methodology, key assumptions, and sensitivity analysis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={valuationAnalysis}
                  onChange={(e) => setValuationAnalysis(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="Primary valuation method, key assumptions (WACC, terminal growth, etc.), sensitivity analysis..."
                />
              </CardContent>
            </Card>
          )}

          {activeSection === 'risks' && (
            <Card>
              <CardHeader>
                <CardTitle>Risks & Bear Case</CardTitle>
                <CardDescription>Thesis-specific risks and downside scenario</CardDescription>
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
                    <Button onClick={addRisk} variant="outline">
                      Add Risk
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Bear Case Scenario</h4>
                  <textarea
                    value={bearCase}
                    onChange={(e) => setBearCase(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    placeholder="Describe the bear case: what would invalidate this investment thesis? Include downside scenario valuation if possible..."
                  />
                </div>
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
                <textarea
                  value={esgFactors}
                  onChange={(e) => setEsgFactors(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="Material ESG factors, governance red flags, regulatory exposure..."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
