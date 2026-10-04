import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { compsRowFromOverview, fetchFmpPeers, type CompsRow } from '@/lib/comps';

export type { CompsRow };

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

async function fetchAVOverview(ticker: string): Promise<CompsRow | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${AV_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();

    // Rate limit
    if (data.Note || data.Information) {
      throw Object.assign(new Error('RATE_LIMIT'), { isRateLimit: true, raw: data.Note || data.Information });
    }

    if (data['Error Message']) return null;
    return compsRowFromOverview(data, ticker);
  } catch (err: any) {
    if (err.isRateLimit) throw err;
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { subject, peers: manualPeers } = await req.json() as { subject: string; peers?: string[] };

    if (!subject) {
      return NextResponse.json({ error: 'subject ticker is required' }, { status: 400 });
    }

    const subjectTicker = subject.toUpperCase();

    // Resolve peers: manual override > FMP auto-fetch > empty
    let peerTickers: string[] = [];
    if (manualPeers && manualPeers.length > 0) {
      peerTickers = manualPeers.map(t => t.toUpperCase()).filter(t => t !== subjectTicker);
    } else {
      peerTickers = await fetchFmpPeers(subjectTicker);
    }

    const allTickers = [subjectTicker, ...peerTickers];

    // Fetch AV OVERVIEW for all tickers in parallel
    const results = await Promise.all(allTickers.map(t => fetchAVOverview(t)));

    const rows: CompsRow[] = results
      .filter((r): r is CompsRow => r !== null)
      .map((r) => ({ ...r, isSubject: r.ticker.toUpperCase() === subjectTicker }));

    return NextResponse.json({ rows, peersSource: manualPeers?.length ? 'manual' : (peerTickers.length > 0 ? 'fmp' : 'none') });
  } catch (err: any) {
    if (err.isRateLimit) {
      return NextResponse.json(
        {
          error: 'Alpha Vantage API rate limit reached',
          details: `The free tier allows 25 requests per day (5 per minute). The comps table fetches one request per company — with a subject + 8 peers that's 9 requests. You've hit today's limit. Either upgrade your Alpha Vantage plan or try again tomorrow.`,
          raw: err.raw,
        },
        { status: 429 }
      );
    }
    console.error('Comps error:', err);
    return NextResponse.json({ error: 'Failed to build comps table', details: String(err) }, { status: 500 });
  }
}
