import type { ResearchToolId } from '@/lib/tool-links';

export interface ToolReadingStep {
  title: string;
  detail: string;
}

export interface ToolReadingGuide {
  id: string;
  name: string;
  question: string;
  whenToUse: string;
  steps: ToolReadingStep[];
  advancedNote?: string;
  relatedTools?: Array<{ id: ResearchToolId; label: string }>;
}

export const TOOL_READING_WORKFLOW: ToolReadingStep[] = [
  {
    title: 'Pick the question first',
    detail: 'Start on the Tools page and match your question to a tool using the “Use when…” line on each card.',
  },
  {
    title: 'Read “Start here”',
    detail: 'Every research tool opens with a plain-English summary of what the page is saying right now.',
  },
  {
    title: 'Follow the numbered roadmap',
    detail: 'Work top to bottom through the “How to read this tool” steps before opening advanced or collapsed sections.',
  },
  {
    title: 'Cross-check in related tools',
    detail: 'Use the Related Research Tools links to jump to sentiment, supplementary, or positioning on the same ticker.',
  },
];

export const TOOL_READING_GUIDES: Record<string, ToolReadingGuide> = {
  'equity-positioning': {
    id: 'equity-positioning',
    name: 'Equity Positioning',
    question: 'Is this single stock positioned bullish or bearish, and how did earnings move the price?',
    whenToUse: 'You already have a ticker and want positioning context before writing a pitch or sizing a trade.',
    steps: [
      {
        title: 'Enter the ticker',
        detail: 'Search by symbol (AAPL) or company name. The page will load both tabs for that name.',
      },
      {
        title: 'Open Earnings Revisions first',
        detail: 'Check beat rate and the “+5d / +20d” columns to see how the stock reacted after past prints.',
      },
      {
        title: 'Read the headline takeaway',
        detail: 'The blue Start here box summarizes whether beats have been rewarded and whether estimates are drifting up or down.',
      },
      {
        title: 'Switch to Options Flow',
        detail: 'Look at positioning bias, put/call ratios, and unusual contracts. High put activity often means hedging, not a confirmed short.',
      },
      {
        title: 'Jump to Sentiment or Supplementary',
        detail: 'Use Related Research Tools to add news narrative, transcripts, insiders, or forward estimates on the same ticker.',
      },
    ],
    advancedNote: 'Tables further down are supporting evidence. You do not need every row to make a first-pass call.',
    relatedTools: [
      { id: 'sentiment', label: 'News sentiment' },
      { id: 'supplementary', label: 'Transcripts & insiders' },
      { id: 'dcf', label: 'Valuation model' },
    ],
  },
  'macro-engine': {
    id: 'macro-engine',
    name: 'Macro Allocation Engine',
    question: 'Which countries and sectors should we overweight this month given the macro backdrop?',
    whenToUse: 'You want a regime-aware ETF allocation view, not a single-stock deep dive.',
    steps: [
      {
        title: 'Read Start here',
        detail: 'This tells you the current regime, whether the model is defensive, and which areas it prefers.',
      },
      {
        title: 'Check What To Own Right Now',
        detail: 'This is the main output: overweight longs at the top, avoids at the bottom. Conviction is relative ranking, not position size.',
      },
      {
        title: 'Glance at Model Portfolio Today',
        detail: 'See the equal-weight basket the live replay model would hold if followed mechanically.',
      },
      {
        title: 'Review Performance Since 2022',
        detail: 'Use the chart for context versus SPY. Ignore giant compounded percentages — focus on relative shape and regime strips.',
      },
      {
        title: 'Open advanced sections only if needed',
        detail: 'Regime Outlook, pair backtests, and attribution are evidence drawers. Expand them when you need proof, not on every visit.',
      },
    ],
    advancedNote: 'Beat SPY probabilities show N/A when the historical table is not populated — do not treat 50% or N/A as a real forecast.',
    relatedTools: [
      { id: 'sentiment', label: 'Ticker sentiment' },
      { id: 'supplementary', label: 'Single-name context' },
    ],
  },
  sentiment: {
    id: 'sentiment',
    name: 'Sentiment Tool',
    question: 'What is the news flow saying about this company right now?',
    whenToUse: 'You want a quick narrative read before earnings, a catalyst, or a pitch.',
    steps: [
      {
        title: 'Enter ticker or company',
        detail: 'Start broad with the company name if you are unsure of the symbol.',
      },
      {
        title: 'Read the overall label',
        detail: 'Bullish, bearish, or neutral is the net tone across recent articles in your selected window.',
      },
      {
        title: 'Scan bullish vs bearish drivers',
        detail: 'These are the article clusters actually moving the score — use them as memo bullets.',
      },
      {
        title: 'Check price-context divergence',
        detail: 'If sentiment and recent price action disagree, that tension is often the interesting story.',
      },
      {
        title: 'Cross-check positioning',
        detail: 'Open Equity Positioning on the same ticker to see earnings reaction history and options bias.',
      },
    ],
    relatedTools: [
      { id: 'equity-positioning', label: 'Earnings & options' },
      { id: 'supplementary', label: 'Transcripts & insiders' },
    ],
  },
  supplementary: {
    id: 'supplementary',
    name: 'Supplementary Tools',
    question: 'What else should I know about this name beyond price and headlines?',
    whenToUse: 'You are building a single-name research packet and need transcripts, insiders, estimates, or the calendar.',
    steps: [
      {
        title: 'Enter the ticker once',
        detail: 'The same symbol carries across Transcript, Insider, Estimates, Calendar, and Holdings tabs.',
      },
      {
        title: 'Start with Estimates or Calendar',
        detail: 'Forward EPS context and the next print date frame everything else.',
      },
      {
        title: 'Read Transcript for tone',
        detail: 'Look at management tone and notable snippets before diving into the full text.',
      },
      {
        title: 'Check Insider for directional tape',
        detail: 'Clustered buying or selling can confirm or contradict your thesis.',
      },
      {
        title: 'Link out to positioning or sentiment',
        detail: 'Use Related Research Tools when you need options flow or news narrative on the same name.',
      },
    ],
    relatedTools: [
      { id: 'equity-positioning', label: 'Earnings & options' },
      { id: 'sentiment', label: 'News sentiment' },
    ],
  },
};

export function getToolReadingGuide(toolId: string): ToolReadingGuide | null {
  return TOOL_READING_GUIDES[toolId] ?? null;
}
