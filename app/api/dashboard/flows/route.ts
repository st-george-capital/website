import { NextResponse } from 'next/server';

export const revalidate = 300;

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';
const AV_BASE = 'https://www.alphavantage.co/query';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sequential<T>(fns: Array<() => Promise<T | null>>, staggerMs = 550) {
  const results: Array<T | null> = [];
  for (const fn of fns) { results.push(await fn()); await delay(staggerMs); }
  return results;
}

function isAvLimited(data: any) {
  return !!(data?.Note || data?.Information || data?.['Error Message']);
}

function calcZScore(changes: number[], window = 20): number | null {
  if (changes.length < 5) return null;
  const today = changes[changes.length - 1];
  const lookback = changes.slice(-Math.min(window + 1, changes.length), -1);
  if (lookback.length < 4) return null;
  const mean = lookback.reduce((a, b) => a + b, 0) / lookback.length;
  const variance = lookback.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lookback.length;
  const std = Math.sqrt(variance);
  return std === 0 ? null : (today - mean) / std;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ETFRow {
  ticker: string;
  name: string;
  group: 'us' | 'asia' | 'sector' | 'bonds' | 'volatility';
  price: number | null;
  return1D: number | null;
  return5D: number | null;
  return20D: number | null;
  volumeRatio: number | null; // today / 20-day avg volume
  zScore: number | null;
}

export interface PairRatio {
  label: string;
  description: string;
  ratio: number | null;
  trend1D: number | null; // % change in ratio over 1 day
  trend5D: number | null; // % change in ratio over 5 days
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface RegimeSignal {
  name: string;
  value: string;
  raw: number | null;
  score: number; // 0 = calm, 1 = elevated, 2 = stress
  note: string;
}

export interface FlowsPayload {
  etfs: ETFRow[];
  pairs: PairRatio[];
  regime: {
    label: 'Risk-on' | 'Neutral' | 'Hedging-heavy' | 'Stress';
    score: number; // 0–10
    color: 'green' | 'yellow' | 'orange' | 'red';
    signals: RegimeSignal[];
  };
  interpretation: string[];  // 3–4 sentences
  timestamp: string;
}

// ─── Fetch daily series ───────────────────────────────────────────────────────

interface Series {
  price: number;
  closes: number[];  // oldest → newest (up to 22)
  volumes: number[]; // oldest → newest (up to 22)
}

async function fetchSeries(ticker: string): Promise<Series | null> {
  try {
    const res = await fetch(
      `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) { console.warn(`AV limited: ${ticker}`); return null; }
    const series = data['Time Series (Daily)'];
    if (!series) return null;

    const dates = Object.keys(series).sort().reverse(); // newest first
    const window = dates.slice(0, Math.min(22, dates.length));
    const closes: number[] = [];
    const volumes: number[] = [];

    for (let i = window.length - 1; i >= 0; i--) { // reverse → oldest first
      const c = parseFloat(series[window[i]]['4. close']);
      const v = parseFloat(series[window[i]]['5. volume']);
      if (!isNaN(c)) closes.push(c);
      if (!isNaN(v)) volumes.push(v);
    }
    if (closes.length < 2) return null;
    return { price: closes[closes.length - 1], closes, volumes };
  } catch (e) {
    console.error(`fetchSeries(${ticker}):`, e);
    return null;
  }
}

// ─── Metric helpers ───────────────────────────────────────────────────────────

function nDayReturn(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null;
  const cur = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - n];
  return prev !== 0 ? ((cur - prev) / prev) * 100 : null;
}

function volumeRatio(volumes: number[]): number | null {
  if (volumes.length < 2) return null;
  const today = volumes[volumes.length - 1];
  const avg = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
  return avg > 0 ? today / avg : null;
}

function zScoreFromCloses(closes: number[]): number | null {
  const pcts: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) pcts.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
  }
  return calcZScore(pcts);
}

function buildETFRow(ticker: string, name: string, group: ETFRow['group'], s: Series | null): ETFRow {
  if (!s) return { ticker, name, group, price: null, return1D: null, return5D: null, return20D: null, volumeRatio: null, zScore: null };
  return {
    ticker, name, group,
    price: s.price,
    return1D: nDayReturn(s.closes, 1),
    return5D: nDayReturn(s.closes, 5),
    return20D: nDayReturn(s.closes, 20),
    volumeRatio: volumeRatio(s.volumes),
    zScore: zScoreFromCloses(s.closes),
  };
}

// ─── Pair ratio ───────────────────────────────────────────────────────────────

function buildPair(
  label: string,
  description: string,
  numSeries: Series | null,
  denSeries: Series | null,
  higherMeansWhat: 'bullish' | 'bearish', // higher ratio = bullish or bearish signal?
): PairRatio {
  if (!numSeries || !denSeries) return { label, description, ratio: null, trend1D: null, trend5D: null, signal: 'neutral' };
  const len = Math.min(numSeries.closes.length, denSeries.closes.length);
  const ratios: number[] = [];
  for (let i = 0; i < len; i++) {
    const d = denSeries.closes[denSeries.closes.length - len + i];
    const n = numSeries.closes[numSeries.closes.length - len + i];
    if (d !== 0) ratios.push(n / d);
  }
  if (ratios.length < 2) return { label, description, ratio: null, trend1D: null, trend5D: null, signal: 'neutral' };

  const cur = ratios[ratios.length - 1];
  const prev1 = ratios[ratios.length - 2];
  const prev5 = ratios.length >= 6 ? ratios[ratios.length - 6] : null;
  const t1 = prev1 !== 0 ? ((cur - prev1) / prev1) * 100 : null;
  const t5 = prev5 && prev5 !== 0 ? ((cur - prev5) / prev5) * 100 : null;

  let signal: PairRatio['signal'] = 'neutral';
  if (t5 !== null) {
    const rising = t5 > 0.5;
    const falling = t5 < -0.5;
    if (rising) signal = higherMeansWhat === 'bullish' ? 'bullish' : 'bearish';
    else if (falling) signal = higherMeansWhat === 'bullish' ? 'bearish' : 'bullish';
  }
  return { label, description, ratio: cur, trend1D: t1, trend5D: t5, signal };
}

// ─── Risk regime ─────────────────────────────────────────────────────────────

function buildRegime(
  etfs: ETFRow[],
  pairs: PairRatio[],
  seriesMap: Record<string, Series | null>
): FlowsPayload['regime'] {
  const vixy = etfs.find(e => e.ticker === 'VIXY');
  const vixVal = vixy?.price ?? null;

  // Signal 1: VIX proxy
  let vixScore = 0;
  let vixNote = 'unavailable';
  if (vixVal !== null) {
    if (vixVal < 15) { vixScore = 0; vixNote = `${vixVal.toFixed(1)} — calm, low hedge demand`; }
    else if (vixVal < 20) { vixScore = 1; vixNote = `${vixVal.toFixed(1)} — slightly elevated`; }
    else if (vixVal < 25) { vixScore = 2; vixNote = `${vixVal.toFixed(1)} — elevated, hedging activity rising`; }
    else if (vixVal < 30) { vixScore = 3; vixNote = `${vixVal.toFixed(1)} — stress regime`; }
    else { vixScore = 4; vixNote = `${vixVal.toFixed(1)} — extreme fear, macro hedging dominant`; }
  }

  // Signal 2: Semis vs Software (SOXX/IGV trend)
  const semisSw = pairs.find(p => p.label === 'Semis vs Software');
  let ssScore = 1;
  let ssNote = 'unavailable';
  if (semisSw?.trend5D !== null && semisSw?.trend5D !== undefined) {
    if (semisSw.trend5D > 1.5) { ssScore = 0; ssNote = `Semis outpacing software (+${semisSw.trend5D.toFixed(1)}% 5D) — AI/momentum trade intact`; }
    else if (semisSw.trend5D > 0) { ssScore = 1; ssNote = `Semis modestly ahead — AI trade holding`; }
    else if (semisSw.trend5D > -1.5) { ssScore = 1; ssNote = `Slight software outperformance — momentum fading`; }
    else { ssScore = 2; ssNote = `Software crushing semis (${semisSw.trend5D.toFixed(1)}% 5D) — momentum unwind / crowded longs under stress`; }
  }

  // Signal 3: Cyclicals vs Defensives
  const cycDef = pairs.find(p => p.label === 'Cyclicals vs Defensives');
  let cdScore = 1;
  let cdNote = 'unavailable';
  if (cycDef?.trend5D !== null && cycDef?.trend5D !== undefined) {
    if (cycDef.trend5D > 1) { cdScore = 0; cdNote = `Cyclicals leading (+${cycDef.trend5D.toFixed(1)}% 5D) — risk-on rotation`; }
    else if (cycDef.trend5D > 0) { cdScore = 1; cdNote = `Slight cyclical edge — neutral`; }
    else if (cycDef.trend5D > -1) { cdScore = 1; cdNote = `Defensives creeping ahead — mild caution`; }
    else { cdScore = 2; cdNote = `Defensives dominating (${cycDef.trend5D.toFixed(1)}% 5D) — rotation into safety`; }
  }

  // Signal 4: Credit (HYG 5D return)
  const hyg = etfs.find(e => e.ticker === 'HYG');
  let creditScore = 1;
  let creditNote = 'unavailable';
  if (hyg?.return5D !== null && hyg?.return5D !== undefined) {
    if (hyg.return5D > 0.5) { creditScore = 0; creditNote = `HYG +${hyg.return5D.toFixed(1)}% 5D — credit spreads tightening, risk appetite healthy`; }
    else if (hyg.return5D > -0.5) { creditScore = 1; creditNote = `HYG flat — credit neutral`; }
    else if (hyg.return5D > -1.5) { creditScore = 2; creditNote = `HYG ${hyg.return5D.toFixed(1)}% 5D — spreads widening, stress building`; }
    else { creditScore = 3; creditNote = `HYG ${hyg.return5D.toFixed(1)}% 5D — significant spread widening, credit stress`; }
  }

  // Signal 5: Average ETF volume spike (ex-VIXY)
  const etfsExVol = etfs.filter(e => e.ticker !== 'VIXY' && e.volumeRatio !== null);
  const avgVolRatio = etfsExVol.length > 0
    ? etfsExVol.reduce((a, e) => a + (e.volumeRatio ?? 1), 0) / etfsExVol.length
    : null;
  let volScore = 0;
  let volNote = 'unavailable';
  if (avgVolRatio !== null) {
    if (avgVolRatio < 1.2) { volScore = 0; volNote = `Avg ETF vol ${avgVolRatio.toFixed(2)}× — normal activity`; }
    else if (avgVolRatio < 1.5) { volScore = 1; volNote = `Avg ETF vol ${avgVolRatio.toFixed(2)}× — elevated, some hedging`; }
    else if (avgVolRatio < 2.0) { volScore = 2; volNote = `Avg ETF vol ${avgVolRatio.toFixed(2)}× — high, macro hedging active`; }
    else { volScore = 3; volNote = `Avg ETF vol ${avgVolRatio.toFixed(2)}× — extreme, ETFs dominating tape (GS stress signal)`; }
  }

  const totalScore = vixScore + ssScore + cdScore + creditScore + volScore;

  let label: FlowsPayload['regime']['label'];
  let color: FlowsPayload['regime']['color'];
  if (totalScore <= 3) { label = 'Risk-on'; color = 'green'; }
  else if (totalScore <= 5) { label = 'Neutral'; color = 'yellow'; }
  else if (totalScore <= 8) { label = 'Hedging-heavy'; color = 'orange'; }
  else { label = 'Stress'; color = 'red'; }

  return {
    label, score: totalScore, color,
    signals: [
      { name: 'VIX (VIXY)', value: vixVal !== null ? vixVal.toFixed(1) : '—', raw: vixVal, score: vixScore, note: vixNote },
      { name: 'Semis vs Software', value: semisSw?.trend5D !== null && semisSw?.trend5D !== undefined ? `${semisSw.trend5D > 0 ? '+' : ''}${semisSw.trend5D.toFixed(1)}% 5D` : '—', raw: semisSw?.trend5D ?? null, score: ssScore, note: ssNote },
      { name: 'Cyclicals vs Defensives', value: cycDef?.trend5D !== null && cycDef?.trend5D !== undefined ? `${cycDef.trend5D > 0 ? '+' : ''}${cycDef.trend5D.toFixed(1)}% 5D` : '—', raw: cycDef?.trend5D ?? null, score: cdScore, note: cdNote },
      { name: 'HYG Credit', value: hyg?.return5D !== null && hyg?.return5D !== undefined ? `${hyg.return5D > 0 ? '+' : ''}${hyg.return5D.toFixed(1)}% 5D` : '—', raw: hyg?.return5D ?? null, score: creditScore, note: creditNote },
      { name: 'ETF Volume Spike', value: avgVolRatio !== null ? `${avgVolRatio.toFixed(2)}×` : '—', raw: avgVolRatio, score: volScore, note: volNote },
    ],
  };
}

// ─── Interpretation ───────────────────────────────────────────────────────────

function buildInterpretation(etfs: ETFRow[], pairs: PairRatio[], regime: FlowsPayload['regime']): string[] {
  const sentences: string[] = [];

  // Top geo performers (1D)
  const geoETFs = etfs.filter(e => (e.group === 'us' || e.group === 'asia') && e.return1D !== null);
  geoETFs.sort((a, b) => (b.return1D ?? 0) - (a.return1D ?? 0));
  if (geoETFs.length >= 2) {
    const top = geoETFs[0];
    const bottom = geoETFs[geoETFs.length - 1];
    const flowDir = (top.return1D ?? 0) > 0 ? 'flowing into' : 'rotating out of';
    sentences.push(
      `Geographic flows: Capital appears to be ${flowDir} ${top.name} (${top.return1D !== null ? (top.return1D > 0 ? '+' : '') + top.return1D.toFixed(2) + '%' : '—'} today)` +
      `, with ${bottom.name} the weakest link (${bottom.return1D !== null ? (bottom.return1D > 0 ? '+' : '') + bottom.return1D.toFixed(2) + '%' : '—'}).`
    );
  }

  // Sector signal (semis vs software)
  const semisSw = pairs.find(p => p.label === 'Semis vs Software');
  const ewyUS = pairs.find(p => p.label === 'Korea vs US');
  const ewtUS = pairs.find(p => p.label === 'Taiwan vs US');
  if (semisSw?.trend5D !== null && semisSw?.trend5D !== undefined) {
    const aiTrade = semisSw.trend5D > 0;
    const koreaTw = ((ewyUS?.trend5D ?? 0) + (ewtUS?.trend5D ?? 0)) / 2;
    sentences.push(
      aiTrade
        ? `The AI/momentum trade is holding: semis are outperforming software over 5 days (${semisSw.trend5D > 0 ? '+' : ''}${semisSw.trend5D.toFixed(1)}%), with Korea and Taiwan ${koreaTw > 0 ? 'supporting' : 'diverging from'} the thesis.`
        : `The semis vs software spread is compressing (${semisSw.trend5D.toFixed(1)}% 5D), suggesting pressure on the crowded long-semis/short-software trade — a key de-risking signal for Asia-tech longs.`
    );
  }

  // Risk regime sentence
  const vixSig = regime.signals.find(s => s.name === 'VIX (VIXY)');
  const volSig = regime.signals.find(s => s.name === 'ETF Volume Spike');
  sentences.push(
    `Risk regime is ${regime.label} (score ${regime.score}/13): ` +
    `${vixSig?.note ?? ''}${volSig && volSig.score >= 2 ? ` and ETF volume at ${volSig.value} — consistent with macro hedging via futures and ETF shorts` : ''}.`
  );

  // Trade structure conclusion
  const stressHigh = regime.score >= 6;
  const koreaUp = (ewyUS?.trend5D ?? 0) > 0;
  const taiwanUp = (ewtUS?.trend5D ?? 0) > 0;
  const semiLed = (semisSw?.trend5D ?? 0) > 0;
  if (stressHigh) {
    sentences.push(
      'Likely trade structure: Institutions holding single-stock longs while shorting macro products (index ETFs, futures). ' +
      `${(koreaUp || taiwanUp) ? 'Korea/Taiwan thematic longs are retained but under pressure' : 'Korea/Taiwan positioning is unwinding'}. Watch for a sharp reversal squeeze if geopolitical headlines turn positive.`
    );
  } else {
    sentences.push(
      `Likely trade structure: ${semiLed ? 'Long semis (Korea/Taiwan exposure), hedge via index puts or short software' : 'Rotation toward defensives and bonds — reduce cyclical exposure, add quality/safety'}. ` +
      `${(koreaUp && taiwanUp) ? 'Asia thematic still intact.' : 'Reduce Asia thematic exposure given relative underperformance.'}`
    );
  }

  return sentences;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const UNIVERSE: Array<{ ticker: string; name: string; group: ETFRow['group'] }> = [
    // US
    { ticker: 'SPY',  name: 'S&P 500 (SPY)',        group: 'us' },
    { ticker: 'QQQ',  name: 'NASDAQ 100 (QQQ)',      group: 'us' },
    // Asia
    { ticker: 'EWY',  name: 'Korea (EWY)',           group: 'asia' },
    { ticker: 'EWT',  name: 'Taiwan (EWT)',          group: 'asia' },
    { ticker: 'EWJ',  name: 'Japan (EWJ)',           group: 'asia' },
    { ticker: 'VNM',  name: 'Vietnam (VNM)',         group: 'asia' },
    // Sectors
    { ticker: 'SOXX', name: 'Semis (SOXX)',          group: 'sector' },
    { ticker: 'IGV',  name: 'Software (IGV)',        group: 'sector' },
    { ticker: 'XLE',  name: 'Energy (XLE)',          group: 'sector' },
    { ticker: 'XLV',  name: 'Healthcare (XLV)',      group: 'sector' },
    { ticker: 'XLY',  name: 'Cyclicals (XLY)',       group: 'sector' },
    { ticker: 'XLP',  name: 'Defensives (XLP)',      group: 'sector' },
    // Bonds / Credit
    { ticker: 'TLT',  name: 'Long Bonds (TLT)',      group: 'bonds' },
    { ticker: 'HYG',  name: 'High Yield (HYG)',      group: 'bonds' },
    // Volatility
    { ticker: 'VIXY', name: 'VIX Proxy (VIXY)',      group: 'volatility' },
  ];

  // Fetch all series sequentially (15 × 550ms ≈ 8.3s, cached 5 min)
  const seriesArray = await sequential(
    UNIVERSE.map(({ ticker }) => () => fetchSeries(ticker)),
    550
  );

  const seriesMap: Record<string, Series | null> = {};
  UNIVERSE.forEach(({ ticker }, i) => { seriesMap[ticker] = seriesArray[i]; });

  const etfs = UNIVERSE.map(({ ticker, name, group }) =>
    buildETFRow(ticker, name, group, seriesMap[ticker])
  );

  const pairs: PairRatio[] = [
    buildPair('Korea vs US',             'EWY / SPY — Asia thematic vs US safety',              seriesMap['EWY'],  seriesMap['SPY'],  'bullish'),
    buildPair('Taiwan vs US',            'EWT / SPY — Semi-heavy Asia vs US',                   seriesMap['EWT'],  seriesMap['SPY'],  'bullish'),
    buildPair('Japan vs US',             'EWJ / SPY — Developed Asia vs US',                    seriesMap['EWJ'],  seriesMap['SPY'],  'bullish'),
    buildPair('Semis vs Software',       'SOXX / IGV — AI momentum trade health',               seriesMap['SOXX'], seriesMap['IGV'],  'bullish'),
    buildPair('Cyclicals vs Defensives', 'XLY / XLP — Risk appetite signal',                    seriesMap['XLY'],  seriesMap['XLP'],  'bullish'),
    buildPair('Credit vs Safety',        'HYG / TLT — Risk credit vs safe haven',               seriesMap['HYG'],  seriesMap['TLT'],  'bullish'),
    buildPair('Growth vs Value',         'QQQ / SPY — Growth premium signal',                   seriesMap['QQQ'],  seriesMap['SPY'],  'bullish'),
  ];

  const regime = buildRegime(etfs, pairs, {} as any);
  const interpretation = buildInterpretation(etfs, pairs, regime);

  const payload: FlowsPayload = {
    etfs,
    pairs,
    regime,
    interpretation,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload);
}
