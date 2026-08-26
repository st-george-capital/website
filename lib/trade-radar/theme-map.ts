import type { ThemeMatch } from '@/lib/trade-radar/types';

export const DEFAULT_THEME_MAPS: ThemeMatch[] = [
  { hs6: '854231', hs4: '8542', themeKey: 'semis_electronics', themeLabel: 'Semiconductors & Electronics', marketTags: ['semis_electronics', 'industrial_capex'] },
  { hs6: '854239', hs4: '8542', themeKey: 'semis_electronics', themeLabel: 'Semiconductors & Electronics', marketTags: ['semis_electronics'] },
  { hs6: '850760', hs4: '8507', themeKey: 'energy_materials', themeLabel: 'Battery Supply Chain', marketTags: ['energy_materials', 'industrial_capex'] },
  { hs6: '870380', hs4: '8703', themeKey: 'consumer_demand', themeLabel: 'Electric Vehicles', marketTags: ['consumer_demand', 'nearshoring'] },
  { hs6: '300490', hs4: '3004', themeKey: 'pharma_healthcare', themeLabel: 'Pharma & Healthcare', marketTags: ['pharma_healthcare'] },
  { hs6: '300215', hs4: '3002', themeKey: 'pharma_healthcare', themeLabel: 'Biotech Inputs', marketTags: ['pharma_healthcare', 'industrial_capex'] },
  { hs6: '847130', hs4: '8471', themeKey: 'semis_electronics', themeLabel: 'Computing Hardware', marketTags: ['semis_electronics', 'consumer_demand'] },
  { hs6: '271019', hs4: '2710', themeKey: 'energy_materials', themeLabel: 'Refined Energy Products', marketTags: ['energy_materials', 'inflation_input_cost'] },
  { hs6: '720839', hs4: '7208', themeKey: 'industrial_capex', themeLabel: 'Industrial Steel Inputs', marketTags: ['industrial_capex', 'inflation_input_cost'] },
  { hs6: '620462', hs4: '6204', themeKey: 'consumer_demand', themeLabel: 'Consumer Apparel', marketTags: ['consumer_demand', 'nearshoring'] },
];

const PREFIX_RULES: Array<{
  prefix: string;
  themeKey: string;
  themeLabel: string;
  marketTags: string[];
}> = [
  { prefix: '8542', themeKey: 'semis_electronics', themeLabel: 'Semiconductors & Electronics', marketTags: ['semis_electronics'] },
  { prefix: '3002', themeKey: 'pharma_healthcare', themeLabel: 'Pharma & Healthcare', marketTags: ['pharma_healthcare'] },
  { prefix: '3004', themeKey: 'pharma_healthcare', themeLabel: 'Pharma & Healthcare', marketTags: ['pharma_healthcare'] },
  { prefix: '2710', themeKey: 'energy_materials', themeLabel: 'Energy & Materials', marketTags: ['energy_materials', 'inflation_input_cost'] },
  { prefix: '8507', themeKey: 'energy_materials', themeLabel: 'Battery & Energy Storage', marketTags: ['energy_materials', 'industrial_capex'] },
  { prefix: '8471', themeKey: 'semis_electronics', themeLabel: 'Computing Hardware', marketTags: ['semis_electronics', 'consumer_demand'] },
  { prefix: '8703', themeKey: 'consumer_demand', themeLabel: 'Autos & Mobility', marketTags: ['consumer_demand', 'nearshoring'] },
  { prefix: '7208', themeKey: 'industrial_capex', themeLabel: 'Industrial Inputs', marketTags: ['industrial_capex', 'inflation_input_cost'] },
];

export function matchTheme(hs6: string | null, description: string | null): ThemeMatch | null {
  const cleanedHs6 = (hs6 ?? '').replace(/\D/g, '').slice(0, 6);
  if (cleanedHs6.length === 6) {
    const direct = DEFAULT_THEME_MAPS.find((entry) => entry.hs6 === cleanedHs6);
    if (direct) return direct;
    const prefix = PREFIX_RULES.find((entry) => cleanedHs6.startsWith(entry.prefix));
    if (prefix) {
      return { hs6: cleanedHs6, hs4: cleanedHs6.slice(0, 4), themeKey: prefix.themeKey, themeLabel: prefix.themeLabel, marketTags: prefix.marketTags };
    }
  }

  const desc = (description ?? '').toLowerCase();
  if (desc.includes('chip') || desc.includes('semiconductor') || desc.includes('circuit')) {
    return { hs6: cleanedHs6 || '000000', hs4: cleanedHs6.slice(0, 4) || '0000', themeKey: 'semis_electronics', themeLabel: 'Semiconductors & Electronics', marketTags: ['semis_electronics'] };
  }
  if (desc.includes('pharma') || desc.includes('medical') || desc.includes('drug')) {
    return { hs6: cleanedHs6 || '000000', hs4: cleanedHs6.slice(0, 4) || '0000', themeKey: 'pharma_healthcare', themeLabel: 'Pharma & Healthcare', marketTags: ['pharma_healthcare'] };
  }
  if (desc.includes('battery') || desc.includes('lithium') || desc.includes('energy')) {
    return { hs6: cleanedHs6 || '000000', hs4: cleanedHs6.slice(0, 4) || '0000', themeKey: 'energy_materials', themeLabel: 'Energy & Materials', marketTags: ['energy_materials', 'inflation_input_cost'] };
  }
  return null;
}
