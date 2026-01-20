import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(request: NextRequest) {
  console.log('Alpha Vantage Search API called');
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    console.log('Search query:', query);

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    // Alpha Vantage Symbol Search API
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    console.log('Alpha Vantage Search URL:', url);
    const response = await fetch(url);
    console.log('Alpha Vantage Response Status:', response.status);

    const data = await response.json();
    console.log('Alpha Vantage Raw Response:', data);

    if (data.Note) {
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day. Please try again tomorrow.',
        note: data.Note
      }, { status: 429 });
    }

    if (data['Error Message']) {
      return NextResponse.json({
        error: 'API error',
        details: data['Error Message']
      }, { status: 400 });
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'HTTP error',
        details: `Status: ${response.status}`,
        url: url
      }, { status: response.status });
    }

    // Transform Alpha Vantage response to our format
    const results = data.bestMatches?.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: match['9. matchScore']
    })) || [];

    return NextResponse.json({
      query,
      results: results.slice(0, 10), // Limit to top 10 results
      count: results.length
    });

  } catch (error) {
    console.error('Alpha Vantage search error:', error);
    return NextResponse.json(
      { error: 'Failed to search symbols' },
      { status: 500 }
    );
  }
}