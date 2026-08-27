export interface G10CountryConfig {
  code: string;
  name: string;
  flag: string;
  centralBank: string;
  policySeries: string;
  shortSeries: string;
  longSeries: string;
  /** Display label for the short-end yield column */
  shortLabel: string;
  notes?: string;
}

/**
 * G10 rates coverage via FRED (OECD + Fed series).
 * Short-end series are call-money / immediate rates where 2Y is unavailable on FRED.
 */
export const G10_COUNTRIES: G10CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    centralBank: 'Federal Reserve',
    policySeries: 'FEDFUNDS',
    shortSeries: 'DGS2',
    longSeries: 'DGS10',
    shortLabel: '2Y',
  },
  {
    code: 'DE',
    name: 'Germany (EUR proxy)',
    flag: '🇩🇪',
    centralBank: 'ECB',
    policySeries: 'ECBDFR',
    shortSeries: 'IRSTCI01DEM156N',
    longSeries: 'IRLTLT01DEM156N',
    shortLabel: 'Call',
    notes: 'Bund 10Y with ECB deposit rate; short end is OECD call-money rate.',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    centralBank: 'Bank of England',
    policySeries: 'BOERUKM',
    shortSeries: 'IR3TTS01GBM156N',
    longSeries: 'IRLTLT01GBM156N',
    shortLabel: '3M',
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    centralBank: 'Bank of Japan',
    policySeries: 'IRSTCB01JPM156N',
    shortSeries: 'IRSTCI01JPM156N',
    longSeries: 'IRLTLT01JPM156N',
    shortLabel: 'Call',
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    centralBank: 'Bank of Canada',
    policySeries: 'IRSTCB01CAM156N',
    shortSeries: 'IRSTCI01CAM156N',
    longSeries: 'IRLTLT01CAM156N',
    shortLabel: 'Call',
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    centralBank: 'RBA',
    policySeries: 'IRSTCI01AUM156N',
    shortSeries: 'IRSTCI01AUM156N',
    longSeries: 'IRLTLT01AUM156N',
    shortLabel: 'Call',
    notes: 'No dedicated RBA policy series on FRED — call-money rate used for both policy and short end.',
  },
  {
    code: 'CH',
    name: 'Switzerland',
    flag: '🇨🇭',
    centralBank: 'SNB',
    policySeries: 'IRSTCI01CHM156N',
    shortSeries: 'IRSTCI01CHM156N',
    longSeries: 'IRLTLT01CHM156N',
    shortLabel: 'Call',
    notes: 'SNB policy proxied by OECD call-money rate.',
  },
  {
    code: 'SE',
    name: 'Sweden',
    flag: '🇸🇪',
    centralBank: 'Riksbank',
    policySeries: 'IRSTCI01SEM156N',
    shortSeries: 'IR3TTS01SEM156N',
    longSeries: 'IRLTLT01SEM156N',
    shortLabel: '3M',
  },
  {
    code: 'NO',
    name: 'Norway',
    flag: '🇳🇴',
    centralBank: 'Norges Bank',
    policySeries: 'IRSTCI01NOM156N',
    shortSeries: 'IRSTCI01NOM156N',
    longSeries: 'IRLTLT01NOM156N',
    shortLabel: 'Call',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    centralBank: 'RBNZ',
    policySeries: 'IRSTCI01NZM156N',
    shortSeries: 'IRSTCI01NZM156N',
    longSeries: 'IRLTLT01NZM156N',
    shortLabel: 'Call',
    notes: 'RBNZ policy proxied by OECD call-money rate.',
  },
];
