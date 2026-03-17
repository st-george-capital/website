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
  group: 'us' | 'europe' | 'asia' | 'latam' | 'sector' | 'bonds' | 'volatility';
  price: number | null;
  return1D: number | null;
  return5D: number | null;
  return20D: number | null;
  volumeRatio: number | null;
  zScore: number | null;
}

export interface PairRatio {
  label: string;
  description: string;     // what the ratio tracks
  bullishMeans: string;    // what rising ratio implies
  ratio: number | null;
  trend1D: number | null;
  trend5D: number | null;
  zScore1D: number | null; // significance of today's ratio move vs its own 20-day history
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface RegimeSignal {
  name: string;
  value: string;
  raw: number | null;
  score: number;           // 0 = calm, 1 = elevated, 2 = stress, 3+ = extreme
  note: string;
  why: string;             // why this signal was included
}

export interface FlowsPayload {
  etfs: ETFRow[];
  pairs: PairRatio[];
  regime: {
    label: 'Risk-on' | 'Neutral' | 'Hedging-heavy' | 'Stress';
    score: number;
    color: 'green' | 'yellow' | 'orange' | 'red';
    signals: RegimeSignal[];
  };
  timestamp: string;
}

// ─── Fetch daily series ───────────────────────────────────────────────────────

interface Series {
  price: number;
  closes: number[];   // oldest → newest (up to 22)
  volumes: number[];  // oldest → newest (up to 22)
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
    const dates = Object.keys(series).sort().reverse();
    const window = dates.slice(0, Math.min(22, dates.length));
    const closes: number[] = [];
    const volumes: number[] = [];
    for (let i = window.length - 1; i >= 0; i--) {
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
  bullishMeans: string,
  numSeries: Series | null,
  denSeries: Series | null,
): PairRatio {
  const empty: PairRatio = { label, description, bullishMeans, ratio: null, trend1D: null, trend5D: null, zScore1D: null, signal: 'neutral' };
  if (!numSeries || !denSeries) return empty;

  const len = Math.min(numSeries.closes.length, denSeries.closes.length);
  const ratios: number[] = [];
  for (let i = 0; i < len; i++) {
    const n = numSeries.closes[numSeries.closes.length - len + i];
    const d = denSeries.closes[denSeries.closes.length - len + i];
    if (d !== 0) ratios.push(n / d);
  }
  if (ratios.length < 2) return empty;

  const cur = ratios[ratios.length - 1];
  const prev1 = ratios[ratios.length - 2];
  const prev5 = ratios.length >= 6 ? ratios[ratios.length - 6] : null;
  const t1 = prev1 !== 0 ? ((cur - prev1) / prev1) * 100 : null;
  const t5 = prev5 && prev5 !== 0 ? ((cur - prev5) / prev5) * 100 : null;

  // Z-score of the ratio's daily % changes — is today's spread move significant?
  const ratioPcts: number[] = [];
  for (let i = 1; i < ratios.length; i++) {
    if (ratios[i - 1] !== 0) ratioPcts.push(((ratios[i] - ratios[i - 1]) / ratios[i - 1]) * 100);
  }
  const zScore1D = calcZScore(ratioPcts);

  let signal: PairRatio['signal'] = 'neutral';
  if (t5 !== null) {
    if (t5 > 0.5) signal = 'bullish';
    else if (t5 < -0.5) signal = 'bearish';
  }

  return { label, description, bullishMeans, ratio: cur, trend1D: t1, trend5D: t5, zScore1D, signal };
}

// ─── Risk regime ─────────────────────────────────────────────────────────────

function buildRegime(etfs: ETFRow[], pairs: PairRatio[]): FlowsPayload['regime'] {
  const vixy = etfs.find(e => e.ticker === 'VIXY');
  // VIXY price ≠ VIX level (VIXY decays from futures roll costs).
  // Use % return instead: rising VIXY = rising implied vol = rising hedge demand.
  const vixyR1D = vixy?.return1D ?? null;
  const vixyR5D = vixy?.return5D ?? null;
  const vixyDisplay = vixyR5D !== null
    ? `${vixyR5D > 0 ? '+' : ''}${vixyR5D.toFixed(1)}% 5D`
    : (vixyR1D !== null ? `${vixyR1D > 0 ? '+' : ''}${vixyR1D.toFixed(1)}% 1D` : '—');

  let vixScore = 0; let vixNote = 'unavailable';
  const vixyRef = vixyR5D ?? vixyR1D;
  if (vixyRef !== null) {
    if (vixyRef < -5)      { vixScore = 0; vixNote = `${vixyDisplay} — vol collapsing, hedging demand very low`; }
    else if (vixyRef < 0)  { vixScore = 0; vixNote = `${vixyDisplay} — vol falling, calm`; }
    else if (vixyRef < 5)  { vixScore = 1; vixNote = `${vixyDisplay} — vol slightly elevated, some hedging`; }
    else if (vixyRef < 15) { vixScore = 2; vixNote = `${vixyDisplay} — vol rising, hedging demand building`; }
    else                   { vixScore = 3; vixNote = `${vixyDisplay} — vol surging, macro hedging dominant`; }
  }

  // Semis vs Software
  const semisSw = pairs.find(p => p.label === 'Semis vs Software');
  let ssScore = 1; let ssNote = 'unavailable';
  const ssTrend = semisSw?.trend5D;
  if (ssTrend !== null && ssTrend !== undefined) {
    if (ssTrend > 1.5)       { ssScore = 0; ssNote = `+${ssTrend.toFixed(1)}% 5D — semis leading, AI/momentum trade intact`; }
    else if (ssTrend > 0)    { ssScore = 1; ssNote = `+${ssTrend.toFixed(1)}% 5D — semis modestly ahead, trade holding`; }
    else if (ssTrend > -1.5) { ssScore = 1; ssNote = `${ssTrend.toFixed(1)}% 5D — software creeping ahead, momentum fading`; }
    else                     { ssScore = 2; ssNote = `${ssTrend.toFixed(1)}% 5D — software crushing semis, crowded longs unwinding`; }
  }

  // Cyclicals vs Defensives
  const cycDef = pairs.find(p => p.label === 'Cyclicals vs Defensives');
  let cdScore = 1; let cdNote = 'unavailable';
  const cdTrend = cycDef?.trend5D;
  if (cdTrend !== null && cdTrend !== undefined) {
    if (cdTrend > 1)       { cdScore = 0; cdNote = `+${cdTrend.toFixed(1)}% 5D — cyclicals leading, risk appetite healthy`; }
    else if (cdTrend > 0)  { cdScore = 1; cdNote = `+${cdTrend.toFixed(1)}% 5D — mild cyclical edge`; }
    else if (cdTrend > -1) { cdScore = 1; cdNote = `${cdTrend.toFixed(1)}% 5D — defensives creeping ahead`; }
    else                   { cdScore = 2; cdNote = `${cdTrend.toFixed(1)}% 5D — defensives dominating, rotation to safety`; }
  }

  // HYG credit
  const hyg = etfs.find(e => e.ticker === 'HYG');
  let creditScore = 1; let creditNote = 'unavailable';
  const hygR = hyg?.return5D;
  if (hygR !== null && hygR !== undefined) {
    if (hygR > 0.5)       { creditScore = 0; creditNote = `+${hygR.toFixed(1)}% 5D — spreads tightening, risk appetite healthy`; }
    else if (hygR > -0.5) { creditScore = 1; creditNote = `${hygR.toFixed(1)}% 5D — credit neutral`; }
    else if (hygR > -1.5) { creditScore = 2; creditNote = `${hygR.toFixed(1)}% 5D — spreads widening, stress building`; }
    else                  { creditScore = 3; creditNote = `${hygR.toFixed(1)}% 5D — significant spread widening, credit stress`; }
  }

  // ETF volume spike
  const etfsExVol = etfs.filter(e => e.ticker !== 'VIXY' && e.volumeRatio !== null);
  const avgVolRatio = etfsExVol.length > 0
    ? etfsExVol.reduce((a, e) => a + (e.volumeRatio ?? 1), 0) / etfsExVol.length
    : null;
  let volScore = 0; let volNote = 'unavailable';
  if (avgVolRatio !== null) {
    if (avgVolRatio < 1.2)      { volScore = 0; volNote = `${avgVolRatio.toFixed(2)}× avg — normal activity`; }
    else if (avgVolRatio < 1.5) { volScore = 1; volNote = `${avgVolRatio.toFixed(2)}× avg — elevated, some hedging`; }
    else if (avgVolRatio < 2.0) { volScore = 2; volNote = `${avgVolRatio.toFixed(2)}× avg — high, macro hedging active`; }
    else                        { volScore = 3; volNote = `${avgVolRatio.toFixed(2)}× avg — extreme, ETFs dominating tape`; }
  }

  const totalScore = vixScore + ssScore + cdScore + creditScore + volScore;
  let label: FlowsPayload['regime']['label'];
  let color: FlowsPayload['regime']['color'];
  if (totalScore <= 3)      { label = 'Risk-on';       color = 'green';  }
  else if (totalScore <= 5) { label = 'Neutral';        color = 'yellow'; }
  else if (totalScore <= 8) { label = 'Hedging-heavy';  color = 'orange'; }
  else                      { label = 'Stress';         color = 'red';    }

  return {
    label, score: totalScore, color,
    signals: [
      {
        name: 'VIX (VIXY return)', value: vixyDisplay,
        raw: vixyRef, score: vixScore, note: vixNote,
        why: "Uses VIXY's % return, not its price. VIXY's absolute price doesn't map to the VIX index — it decays over time from futures roll costs. Rising VIXY = rising implied vol = investors paying more to hedge downside.",
      },
      {
        name: 'Semis vs Software', value: ssTrend !== undefined && ssTrend !== null ? `${ssTrend > 0 ? '+' : ''}${ssTrend.toFixed(1)}% 5D` : '—',
        raw: ssTrend ?? null, score: ssScore, note: ssNote,
        why: 'The Goldman "AI trade" pair. Long semis = Korea/Taiwan exposure. When semis underperform software, the most crowded institutional trade is unwinding — Korea/Taiwan longs follow.',
      },
      {
        name: 'Cyclicals vs Defensives', value: cdTrend !== undefined && cdTrend !== null ? `${cdTrend > 0 ? '+' : ''}${cdTrend.toFixed(1)}% 5D` : '—',
        raw: cdTrend ?? null, score: cdScore, note: cdNote,
        why: 'Classic risk-on/off rotation. Cyclicals (XLY: Amazon, Tesla) vs Defensives (XLP: P&G, Walmart). Money flows to defensives when investors expect an economic slowdown.',
      },
      {
        name: 'HYG Credit', value: hygR !== undefined && hygR !== null ? `${hygR > 0 ? '+' : ''}${hygR.toFixed(1)}% 5D` : '—',
        raw: hygR ?? null, score: creditScore, note: creditNote,
        why: 'Credit spreads are a leading indicator — institutions feel stress in credit before equities react. HYG falling = high-yield spreads widening = risk-off.',
      },
      {
        name: 'ETF Volume Spike', value: avgVolRatio !== null ? `${avgVolRatio.toFixed(2)}×` : '—',
        raw: avgVolRatio, score: volScore, note: volNote,
        why: 'Goldman signal: ETFs normally represent ~30% of total tape volume. When >40%, institutions are using ETFs to hedge macro risk (short SPY/QQQ baskets). Our proxy: avg ETF vol vs its 20-day norm.',
      },
    ],
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const UNIVERSE: Array<{ ticker: string; name: string; group: ETFRow['group'] }> = [
    // US & North America
    { ticker: 'SPY',  name: 'S&P 500 (SPY)',        group: 'us'         },
    { ticker: 'QQQ',  name: 'NASDAQ 100 (QQQ)',      group: 'us'         },
    { ticker: 'EWC',  name: 'Canada (EWC)',          group: 'us'         },
    // Europe
    { ticker: 'EZU',  name: 'Eurozone (EZU)',        group: 'europe'     },
    // Asia
    { ticker: 'EWY',  name: 'Korea (EWY)',           group: 'asia'       },
    { ticker: 'EWT',  name: 'Taiwan (EWT)',          group: 'asia'       },
    { ticker: 'EWJ',  name: 'Japan (EWJ)',           group: 'asia'       },
    { ticker: 'FXI',  name: 'China (FXI)',           group: 'asia'       },
    { ticker: 'INDA', name: 'India (INDA)',          group: 'asia'       },
    { ticker: 'VNM',  name: 'Vietnam (VNM)',         group: 'asia'       },
    // LatAm
    { ticker: 'EWZ',  name: 'Brazil (EWZ)',          group: 'latam'      },
    { ticker: 'EWW',  name: 'Mexico (EWW)',          group: 'latam'      },
    // Sectors
    { ticker: 'SOXX', name: 'Semis (SOXX)',          group: 'sector'     },
    { ticker: 'IGV',  name: 'Software (IGV)',        group: 'sector'     },
    { ticker: 'XLE',  name: 'Energy (XLE)',          group: 'sector'     },
    { ticker: 'XLV',  name: 'Healthcare (XLV)',      group: 'sector'     },
    { ticker: 'XLF',  name: 'Financials (XLF)',       group: 'sector'     },
    { ticker: 'XLY',  name: 'Cyclicals (XLY)',       group: 'sector'     },
    { ticker: 'XLP',  name: 'Defensives (XLP)',      group: 'sector'     },
    // Bonds / Credit
    { ticker: 'TLT',  name: 'Long Bonds (TLT)',      group: 'bonds'      },
    { ticker: 'HYG',  name: 'High Yield (HYG)',      group: 'bonds'      },
    // Volatility
    { ticker: 'VIXY', name: 'VIX Proxy (VIXY)',      group: 'volatility' },
  ];

  // 21 ETFs × 550ms ≈ 11.5s sequential — cached 5 min after first load
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
    buildPair('Korea vs US',             'EWY / SPY', 'Korea thematic outperforming US — Asia longs working',         seriesMap['EWY'],  seriesMap['SPY']  ),
    buildPair('Taiwan vs US',            'EWT / SPY', 'Taiwan semis outperforming US — TSMC/hardware trade intact',   seriesMap['EWT'],  seriesMap['SPY']  ),
    buildPair('China vs US',             'FXI / SPY', 'Chinese equities outperforming US — EM rotation into China',   seriesMap['FXI'],  seriesMap['SPY']  ),
    buildPair('Europe vs US',            'EZU / SPY', 'Eurozone outperforming US — capital shifting to Europe',       seriesMap['EZU'],  seriesMap['SPY']  ),
    buildPair('LatAm vs US',             'EWZ / SPY', 'Brazil/EM outperforming US — commodity/EM risk-on',           seriesMap['EWZ'],  seriesMap['SPY']  ),
    buildPair('Semis vs Software',       'SOXX / IGV', 'Semis beating software — AI momentum trade intact, Korea/Taiwan longs working', seriesMap['SOXX'], seriesMap['IGV']  ),
    buildPair('Cyclicals vs Defensives', 'XLY / XLP', 'Cyclicals beating defensives — broad risk appetite healthy',  seriesMap['XLY'],  seriesMap['XLP']  ),
    buildPair('Credit vs Safety',        'HYG / TLT', 'HY credit beating Treasuries — investors taking risk, spreads tightening', seriesMap['HYG'],  seriesMap['TLT']  ),
    buildPair('Growth vs Value',         'QQQ / SPY', 'Growth/tech premium expanding — risk-on, mega-cap leading',   seriesMap['QQQ'],  seriesMap['SPY']  ),
  ];

  const regime = buildRegime(etfs, pairs);

  return NextResponse.json({
    etfs, pairs, regime,
    timestamp: new Date().toISOString(),
  } satisfies FlowsPayload);
}
