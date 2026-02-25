const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

export interface AlphaVantageQuote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export async function fetchAlphaVantageQuote(ticker: string): Promise<AlphaVantageQuote> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  // Alpha Vantage returns { "Note": "..." } when rate-limited
  if (data.Note) {
    throw new Error('Alpha Vantage rate limit reached');
  }

  // Alpha Vantage returns { "Error Message": "..." } for invalid requests
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
  }

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error(`No quote data for ${ticker}`);
  }

  return {
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat((quote['10. change percent'] || '0').replace('%', '')),
    volume: parseInt(quote['06. volume'] || '0', 10),
  };
}
