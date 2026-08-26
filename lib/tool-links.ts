export type ResearchToolId =
  | 'equity-positioning'
  | 'sentiment'
  | 'supplementary'
  | 'dcf';

const TOOL_PATHS: Record<ResearchToolId, string> = {
  'equity-positioning': '/dashboard/tools/equity-positioning',
  sentiment: '/dashboard/tools/sentiment',
  supplementary: '/dashboard/tools/supplementary',
  dcf: '/dashboard/tools/dcf',
};

export const RESEARCH_TOOL_LINKS: Array<{
  id: ResearchToolId;
  label: string;
  description: string;
}> = [
  {
    id: 'equity-positioning',
    label: 'Equity Positioning',
    description: 'Earnings revisions, price reactions, and options flow.',
  },
  {
    id: 'sentiment',
    label: 'Sentiment',
    description: 'News and social sentiment memo.',
  },
  {
    id: 'supplementary',
    label: 'Supplementary',
    description: 'Transcripts, insiders, estimates, and holdings.',
  },
  {
    id: 'dcf',
    label: 'DCF',
    description: 'Discounted cash flow valuation model.',
  },
];

export function buildResearchToolLink(tool: ResearchToolId, symbol: string, tab?: string) {
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() });
  if (tab) {
    params.set('tab', tab);
  }
  return `${TOOL_PATHS[tool]}?${params.toString()}`;
}
