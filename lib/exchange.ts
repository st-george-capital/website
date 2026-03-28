const EXCHANGE_SUFFIXES: Record<string, string> = {
  US: '',
  TRT: '.TRT',
  TRV: '.TRV',
  LON: '.LON',
};

export function getApiTicker(ticker: string, exchange: string): string {
  const suffix = EXCHANGE_SUFFIXES[exchange] || '';
  if (suffix && !ticker.includes('.')) {
    return ticker + suffix;
  }
  return ticker;
}

export function getDisplayTicker(apiTicker: string): string {
  return apiTicker.replace(/\.(TRT|TRV|LON)$/, '');
}

export const EXCHANGES = [
  { value: 'US', label: 'US (NYSE/NASDAQ)' },
  { value: 'TRT', label: 'Canada TSX (.TRT)' },
  { value: 'TRV', label: 'Canada TSX-V (.TRV)' },
  { value: 'LON', label: 'UK LSE (.LON)' },
] as const;
