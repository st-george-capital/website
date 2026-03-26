import { NextResponse } from 'next/server';

export const revalidate = 300;

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';
const AV_BASE = 'https://www.alphavantage.co/query';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sequential<T>(fns: Array<() => Promise<T | null>>, staggerMs = 550, timeoutMs = 8000) {
  const results: Array<T | null> = [];
  let consecutiveFails = 0;
  for (const fn of fns) {
    if (consecutiveFails >= 3) { results.push(null); continue; }
    const result = await Promise.race([
      fn(),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ]);
    results.push(result);
    consecutiveFails = result === null ? consecutiveFails + 1 : 0;
    await delay(staggerMs);
  }
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

function calcStdDev(arr: number[]): number | null {
  if (arr.length < 2) return null;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function closesToDailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1] * 100);
  }
  return returns;
}

function calcPearsonCorr(a: number[], b: number[]): number | null {
  const len = Math.min(a.length, b.length);
  if (len < 5) return null;
  const as = a.slice(-len), bs = b.slice(-len);
  const am = as.reduce((s, v) => s + v, 0) / len;
  const bm = bs.reduce((s, v) => s + v, 0) / len;
  const num = as.reduce((s, v, i) => s + (v - am) * (bs[i] - bm), 0);
  const da = Math.sqrt(as.reduce((s, v) => s + (v - am) ** 2, 0));
  const db = Math.sqrt(bs.reduce((s, v) => s + (v - bm) ** 2, 0));
  return (da === 0 || db === 0) ? null : num / (da * db);
}

function calcAvgPairwiseCorr(allReturns: number[][]): number | null {
  const corrs: number[] = [];
  for (let i = 0; i < allReturns.length; i++) {
    for (let j = i + 1; j < allReturns.length; j++) {
      const c = calcPearsonCorr(allReturns[i], allReturns[j]);
      if (c !== null) corrs.push(c);
    }
  }
  return corrs.length === 0 ? null : corrs.reduce((a, b) => a + b, 0) / corrs.length;
}

function calcRealizedVol(closes: number[], windowDays = 20): number | null {
  if (closes.length < windowDays + 1) return null;
  const slice = closes.slice(-(windowDays + 1));
  const logRets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) logRets.push(Math.log(slice[i] / slice[i - 1]));
  }
  if (logRets.length < 4) return null;
  const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
  const variance = logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / logRets.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ETFRow {
  ticker: string;
  name: string;
  group: 'us' | 'europe' | 'asia' | 'latam' | 'sector' | 'bonds' | 'fx' | 'volatility';
  price: number | null;
  return1D: number | null;
  return5D: number | null;
  return20D: number | null;   // ~1 month
  return63D: number | null;   // ~3 months
  return95D: number | null;   // ~4.5 months (max from compact 100-day window)
  volumeRatio: number | null;
  zScore: number | null;
}

export interface PairRatio {
  label: string;
  description: string;
  bullishMeans: string;
  ratio: number | null;
  trend1D: number | null;
  trend5D: number | null;
  trend1M: number | null;   // ~20 trading days
  trend5M: number | null;   // ~95 trading days (max compact window)
  zScore1D: number | null;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface RegimeSignal {
  name: string;
  value: string;
  raw: number | null;
  score: number;
  note: string;
  why: string;
}

export interface MarketStructure {
  breadthPctUp: number | null;
  breadthTotal: number;
  dispersion1D: number | null;
  avgCorrelation20D: number | null;
  realizedVol20D: number | null;
  dxyReturn5D: number | null;
  igReturn5D: number | null;
}

// Live macro context — fetched in parallel from different AV endpoints after ETFs
export interface MacroContext {
  fedFundsRate: number | null;   // US Federal Funds Rate (daily)
  yield10Y: number | null;       // US 10-Year Treasury Yield (daily)
  wtiCrude: number | null;       // WTI crude oil price (daily)
  btcUSD: number | null;         // Bitcoin price (daily close)
  wtiReturn5D: number | null;    // WTI 5-day % change
  btcReturn5D: number | null;    // BTC 5-day % change
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
  structure: MarketStructure;
  macro: MacroContext;
  timestamp: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

interface Series {
  price: number;
  closes: number[];   // oldest → newest, up to 100 data points
  volumes: number[];
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
    // Keep up to 100 data points — newest first, then reverse to oldest→newest
    const window = dates.slice(0, Math.min(100, dates.length));
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

// Fetch a simple time-series macro value (FEDERAL_FUNDS_RATE, TREASURY_YIELD, WTI, BRENT, NATURAL_GAS)
async function fetchMacroSeries(url: string, n = 10): Promise<number[] | null> {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (isAvLimited(data)) return null;
    const items: Array<{ date: string; value: string }> = data?.data ?? [];
    if (!items.length) return null;
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-n).map(i => parseFloat(i.value)).filter(v => !isNaN(v));
  } catch { return null; }
}

async function fetchBTC(n = 10): Promise<number[] | null> {
  try {
    const res = await fetch(`${AV_BASE}?function=DIGITAL_CURRENCY_DAILY&symbol=BTC&market=USD&apikey=${AV_KEY}`);
    const data = await res.json();
    const ts = data?.['Time Series (Digital Currency Daily)'];
    if (!ts) return null;
    const dates = Object.keys(ts).sort().reverse().slice(0, n).reverse();
    return dates.map(d => parseFloat(ts[d]['4a. close (USD)'])).filter(v => !isNaN(v));
  } catch { return null; }
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
  if (!s) return { ticker, name, group, price: null, return1D: null, return5D: null, return20D: null, return63D: null, return95D: null, volumeRatio: null, zScore: null };
  return {
    ticker, name, group,
    price: s.price,
    return1D:  nDayReturn(s.closes, 1),
    return5D:  nDayReturn(s.closes, 5),
    return20D: nDayReturn(s.closes, 20),
    return63D: nDayReturn(s.closes, 63),
    return95D: nDayReturn(s.closes, 95),
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
  invertSignal = false,
): PairRatio {
  const empty: PairRatio = { label, description, bullishMeans, ratio: null, trend1D: null, trend5D: null, trend1M: null, trend5M: null, zScore1D: null, signal: 'neutral' };
  if (!numSeries || !denSeries) return empty;

  const len = Math.min(numSeries.closes.length, denSeries.closes.length);
  const ratios: number[] = [];
  for (let i = 0; i < len; i++) {
    const n = numSeries.closes[numSeries.closes.length - len + i];
    const d = denSeries.closes[denSeries.closes.length - len + i];
    if (d !== 0) ratios.push(n / d);
  }
  if (ratios.length < 2) return empty;

  const cur  = ratios[ratios.length - 1];
  const prev1  = ratios[ratios.length - 2];
  const prev5  = ratios.length >= 6  ? ratios[ratios.length - 6]  : null;
  const prev20 = ratios.length >= 21 ? ratios[ratios.length - 21] : null;
  const prev95 = ratios.length >= 96 ? ratios[ratios.length - 96] : null;

  const t1D = prev1  !== 0 ? ((cur - prev1)  / prev1)  * 100 : null;
  const t5D = prev5  && prev5  !== 0 ? ((cur - prev5)  / prev5)  * 100 : null;
  const t1M = prev20 && prev20 !== 0 ? ((cur - prev20) / prev20) * 100 : null;
  const t5M = prev95 && prev95 !== 0 ? ((cur - prev95) / prev95) * 100 : null;

  const ratioPcts: number[] = [];
  for (let i = 1; i < ratios.length; i++) {
    if (ratios[i - 1] !== 0) ratioPcts.push(((ratios[i] - ratios[i - 1]) / ratios[i - 1]) * 100);
  }
  const zScore1D = calcZScore(ratioPcts);

  let signal: PairRatio['signal'] = 'neutral';
  if (t5D !== null) {
    const up = invertSignal ? 'bearish' : 'bullish';
    const dn = invertSignal ? 'bullish' : 'bearish';
    if (t5D > 0.5) signal = up;
    else if (t5D < -0.5) signal = dn;
  }

  return { label, description, bullishMeans, ratio: cur, trend1D: t1D, trend5D: t5D, trend1M: t1M, trend5M: t5M, zScore1D, signal };
}

// ─── Risk regime ─────────────────────────────────────────────────────────────

function buildRegime(etfs: ETFRow[], pairs: PairRatio[]): FlowsPayload['regime'] {
  const vixy = etfs.find(e => e.ticker === 'VIXY');
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

  const semisSw = pairs.find(p => p.label === 'Semis vs Software');
  let ssScore = 1; let ssNote = 'unavailable';
  const ssTrend = semisSw?.trend5D;
  if (ssTrend !== null && ssTrend !== undefined) {
    if (ssTrend > 1.5)       { ssScore = 0; ssNote = `+${ssTrend.toFixed(1)}% 5D — semis leading`; }
    else if (ssTrend > 0)    { ssScore = 1; ssNote = `+${ssTrend.toFixed(1)}% 5D — semis modestly ahead`; }
    else if (ssTrend > -1.5) { ssScore = 1; ssNote = `${ssTrend.toFixed(1)}% 5D — software creeping ahead`; }
    else                     { ssScore = 2; ssNote = `${ssTrend.toFixed(1)}% 5D — software dominating`; }
  }

  const cycDef = pairs.find(p => p.label === 'Cyclicals vs Defensives');
  let cdScore = 1; let cdNote = 'unavailable';
  const cdTrend = cycDef?.trend5D;
  if (cdTrend !== null && cdTrend !== undefined) {
    if (cdTrend > 1)       { cdScore = 0; cdNote = `+${cdTrend.toFixed(1)}% 5D — cyclicals leading`; }
    else if (cdTrend > 0)  { cdScore = 1; cdNote = `+${cdTrend.toFixed(1)}% 5D — mild cyclical edge`; }
    else if (cdTrend > -1) { cdScore = 1; cdNote = `${cdTrend.toFixed(1)}% 5D — defensives creeping ahead`; }
    else                   { cdScore = 2; cdNote = `${cdTrend.toFixed(1)}% 5D — defensives dominating`; }
  }

  const hyg = etfs.find(e => e.ticker === 'HYG');
  let creditScore = 1; let creditNote = 'unavailable';
  const hygR = hyg?.return5D;
  if (hygR !== null && hygR !== undefined) {
    if (hygR > 0.5)       { creditScore = 0; creditNote = `+${hygR.toFixed(1)}% 5D — spreads tightening`; }
    else if (hygR > -0.5) { creditScore = 1; creditNote = `${hygR.toFixed(1)}% 5D — credit neutral`; }
    else if (hygR > -1.5) { creditScore = 2; creditNote = `${hygR.toFixed(1)}% 5D — spreads widening`; }
    else                  { creditScore = 3; creditNote = `${hygR.toFixed(1)}% 5D — significant credit stress`; }
  }

  const etfsExVol = etfs.filter(e => e.ticker !== 'VIXY' && e.volumeRatio !== null);
  const avgVolRatio = etfsExVol.length > 0
    ? etfsExVol.reduce((a, e) => a + (e.volumeRatio ?? 1), 0) / etfsExVol.length
    : null;
  let volScore = 0; let volNote = 'unavailable';
  if (avgVolRatio !== null) {
    if (avgVolRatio < 1.2)      { volScore = 0; volNote = `${avgVolRatio.toFixed(2)}× avg — normal activity`; }
    else if (avgVolRatio < 1.5) { volScore = 1; volNote = `${avgVolRatio.toFixed(2)}× avg — elevated`; }
    else if (avgVolRatio < 2.0) { volScore = 2; volNote = `${avgVolRatio.toFixed(2)}× avg — high, macro hedging`; }
    else                        { volScore = 3; volNote = `${avgVolRatio.toFixed(2)}× avg — extreme`; }
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
        why: "Uses VIXY's 5D % return, not its price. VIXY decays from futures roll costs — its absolute price does not map to the VIX index level. Rising VIXY return = rising implied vol = investors paying more for downside protection.",
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
        why: 'Goldman signal: ETFs normally represent ~30% of total tape volume. When >40%, institutions are using ETFs for macro hedging. Our proxy: avg ETF vol vs its 20-day norm.',
      },
    ],
  };
}

// ─── Market Structure metrics ─────────────────────────────────────────────────

function buildStructure(etfs: ETFRow[], seriesMap: Record<string, Series | null>): MarketStructure {
  const withReturn = etfs.filter(e => e.return1D !== null);
  const breadthPctUp = withReturn.length > 0
    ? (withReturn.filter(e => (e.return1D ?? 0) > 0).length / withReturn.length) * 100
    : null;

  const sectorReturns1D = etfs
    .filter(e => e.group === 'sector' && e.return1D !== null)
    .map(e => e.return1D!);
  const dispersion1D = calcStdDev(sectorReturns1D);

  const sectorTickers = etfs.filter(e => e.group === 'sector').map(e => e.ticker);
  const sectorDailyReturns = sectorTickers
    .map(t => seriesMap[t]?.closes)
    .filter((c): c is number[] => !!c)
    .map(closesToDailyReturns);
  const avgCorrelation20D = sectorDailyReturns.length >= 3
    ? calcAvgPairwiseCorr(sectorDailyReturns)
    : null;

  const realizedVol20D = seriesMap['SPY']
    ? calcRealizedVol(seriesMap['SPY'].closes, 20)
    : null;

  return {
    breadthPctUp,
    breadthTotal: withReturn.length,
    dispersion1D,
    avgCorrelation20D,
    realizedVol20D,
    dxyReturn5D: etfs.find(e => e.ticker === 'UUP')?.return5D ?? null,
    igReturn5D: etfs.find(e => e.ticker === 'LQD')?.return5D ?? null,
  };
}

// ─── Macro context (parallel fetches after ETFs) ──────────────────────────────

async function buildMacro(): Promise<MacroContext> {
  const [ffr, ty10, wtiArr, btcArr] = await Promise.allSettled([
    fetchMacroSeries(`${AV_BASE}?function=FEDERAL_FUNDS_RATE&interval=daily&apikey=${AV_KEY}`, 10),
    fetchMacroSeries(`${AV_BASE}?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${AV_KEY}`, 10),
    fetchMacroSeries(`${AV_BASE}?function=WTI&interval=daily&apikey=${AV_KEY}`, 10),
    fetchBTC(10),
  ]).then(rs => rs.map(r => r.status === 'fulfilled' ? r.value : null));

  const last = (arr: number[] | null) => arr && arr.length > 0 ? arr[arr.length - 1] : null;
  const pctChange = (arr: number[] | null, n: number) => {
    if (!arr || arr.length < n + 1) return null;
    const cur = arr[arr.length - 1];
    const prev = arr[arr.length - 1 - n];
    return prev !== 0 ? ((cur - prev) / prev) * 100 : null;
  };

  const wtiData = wtiArr as number[] | null;
  const btcData = btcArr as number[] | null;

  return {
    fedFundsRate: last(ffr as number[] | null),
    yield10Y: last(ty10 as number[] | null),
    wtiCrude: last(wtiData),
    btcUSD: last(btcData),
    wtiReturn5D: pctChange(wtiData, Math.min(5, (wtiData?.length ?? 0) - 1)),
    btcReturn5D: pctChange(btcData, Math.min(5, (btcData?.length ?? 0) - 1)),
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
    { ticker: 'XLF',  name: 'Financials (XLF)',      group: 'sector'     },
    { ticker: 'XLY',  name: 'Cyclicals (XLY)',       group: 'sector'     },
    { ticker: 'XLP',  name: 'Defensives (XLP)',      group: 'sector'     },
    // Bonds / Credit
    { ticker: 'TLT',  name: 'Long Bonds (TLT)',      group: 'bonds'      },
    { ticker: 'LQD',  name: 'IG Credit (LQD)',       group: 'bonds'      },
    { ticker: 'HYG',  name: 'High Yield (HYG)',      group: 'bonds'      },
    // FX / Dollar
    { ticker: 'UUP',  name: 'USD Index (UUP)',       group: 'fx'         },
    // Volatility
    { ticker: 'VIXY', name: 'VIX Proxy (VIXY)',      group: 'volatility' },
  ];

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
    buildPair('Korea vs US',             'EWY / SPY',  'Korea thematic outperforming US — Asia longs working',                        seriesMap['EWY'],  seriesMap['SPY']  ),
    buildPair('Taiwan vs US',            'EWT / SPY',  'Taiwan semis outperforming US — TSMC/hardware trade intact',                  seriesMap['EWT'],  seriesMap['SPY']  ),
    buildPair('China vs US',             'FXI / SPY',  'Chinese equities outperforming US — EM rotation into China',                  seriesMap['FXI'],  seriesMap['SPY']  ),
    buildPair('Europe vs US',            'EZU / SPY',  'Eurozone outperforming US — capital shifting to Europe',                      seriesMap['EZU'],  seriesMap['SPY']  ),
    buildPair('LatAm vs US',             'EWZ / SPY',  'Brazil/EM outperforming US — commodity/EM risk-on',                          seriesMap['EWZ'],  seriesMap['SPY']  ),
    buildPair('Semis vs Software',       'SOXX / IGV', 'Semis beating software — AI momentum trade intact, Korea/Taiwan longs working', seriesMap['SOXX'], seriesMap['IGV'] ),
    buildPair('Cyclicals vs Defensives', 'XLY / XLP',  'Cyclicals beating defensives — broad risk appetite healthy',                  seriesMap['XLY'],  seriesMap['XLP']  ),
    buildPair('Financials vs Market',    'XLF / SPY',  'Banks outperforming — leverage appetite rising, yield curve expectations up',  seriesMap['XLF'],  seriesMap['SPY']  ),
    buildPair('Growth vs Value',         'QQQ / SPY',  'Growth/tech premium expanding — risk-on, mega-cap leading',                  seriesMap['QQQ'],  seriesMap['SPY']  ),
    buildPair('HY vs IG Credit',         'HYG / LQD',  'High yield outperforming IG — investors taking credit risk, spreads tight',   seriesMap['HYG'],  seriesMap['LQD']  ),
    buildPair('Credit vs Safety',        'HYG / TLT',  'HY credit beating Treasuries — risk appetite healthy, spreads tightening',    seriesMap['HYG'],  seriesMap['TLT']  ),
    buildPair('Risk vs Safety',          'SPY / TLT',  'Equities outperforming bonds — classic risk-on rotation',                     seriesMap['SPY'],  seriesMap['TLT']  ),
    buildPair('Dollar vs Equities',      'UUP / SPY',  'USD strengthening vs equities — risk-off or global tightening; bad for EM',  seriesMap['UUP'],  seriesMap['SPY'], true ),
  ];

  const regime = buildRegime(etfs, pairs);
  const structure = buildStructure(etfs, seriesMap);
  const macro = await buildMacro();

  return NextResponse.json({
    etfs, pairs, regime, structure, macro,
    timestamp: new Date().toISOString(),
  } satisfies FlowsPayload);
}
