import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { G10_COUNTRIES } from '@/lib/g10-rates/config';
import { fetchFredSeriesBatch } from '@/lib/g10-rates/fred';
import { buildCountryRates, buildG10RatesPayload } from '@/lib/g10-rates/analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export type { G10RatesPayload, G10CountryRates } from '@/lib/g10-rates/analytics';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'visitor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.FRED_API_KEY) {
      return NextResponse.json(
        {
          error: 'FRED_API_KEY is not configured',
          setup: {
            required: ['FRED_API_KEY'],
            signup: 'https://fred.stlouisfed.org/docs/api/api_key.html',
          },
        },
        { status: 503 }
      );
    }

    const warnings: string[] = [];
    const uniqueSeries = [
      ...new Set(
        G10_COUNTRIES.flatMap((country) => [
          country.policySeries,
          country.shortSeries,
          country.longSeries,
        ])
      ),
    ];

    const seriesMap = await fetchFredSeriesBatch(uniqueSeries, 120);

    const countries = G10_COUNTRIES.map((config) =>
      buildCountryRates(
        config,
        seriesMap.get(config.policySeries) ?? [],
        seriesMap.get(config.shortSeries) ?? [],
        seriesMap.get(config.longSeries) ?? []
      )
    );

    const missing = countries.filter((country) => country.dataQuality === 'missing');
    if (missing.length > 0) {
      warnings.push(`No FRED data returned for: ${missing.map((country) => country.code).join(', ')}`);
    }

    return NextResponse.json(buildG10RatesPayload(countries, warnings));
  } catch (error) {
    console.error('g10-rates route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load G10 rates' },
      { status: 500 }
    );
  }
}
