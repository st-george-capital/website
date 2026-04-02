import {
  slugifyValue,
  type InterviewDifficulty,
  type InterviewFirmType,
  type InterviewQuestionType,
  type InterviewRole,
} from '@/lib/interview-tool/taxonomy';

export interface InterviewSeedQuestion {
  seedKey: string;
  question: string;
  answer: string;
  notes: string | null;
  role: InterviewRole;
  subcategory: string | null;
  questionType: InterviewQuestionType;
  difficulty: InterviewDifficulty;
  company: string | null;
  firmType: InterviewFirmType | null;
  topicTags: string[];
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string | null;
  attachmentUrl: string | null;
  submitterName: string;
  submittedBy: string | null;
  approved: boolean;
}

interface TrackMeta {
  role: InterviewRole;
  subcategory: string | null;
  label: string;
  product: string;
  deliverable: string;
  counterpart: string;
  workflow: string;
  focus: string;
  coreSignal: string;
  drivers: [string, string, string];
  risks: [string, string, string];
  skills: [string, string, string];
  metrics: [string, string, string];
  firms: string[];
  firmType: InterviewFirmType;
  tags: string[];
}

interface QuestionBlueprint {
  key: string;
  questionType: InterviewQuestionType;
  difficulty: InterviewDifficulty;
  tags: string[];
  buildQuestion: (meta: TrackMeta, firm: string) => string;
  buildAnswer: (meta: TrackMeta, firm: string) => string;
}

const SOURCE_TITLE = 'SGC Interview Bank v1';

interface SeedSourceReference {
  sourceType: string;
  sourceTitle: string;
  sourceUrl: string | null;
}

const SOURCE_REFERENCES = {
  salesTrading: {
    sourceType: 'web_guide',
    sourceTitle: 'Mergers & Inquisitions: Sales & Trading Interview Questions',
    sourceUrl: 'https://mergersandinquisitions.com/sales-and-trading-interview-questions/',
  },
  hedgeFund: {
    sourceType: 'web_guide',
    sourceTitle: 'Wall Street Oasis: Hedge Fund Interview Questions',
    sourceUrl: 'https://www.wallstreetoasis.com/resources/interviews/hedge-funds-interview-questions',
  },
  interviewRepo: {
    sourceType: 'github_repo',
    sourceTitle: 'd1mnewz/interviews',
    sourceUrl: 'https://github.com/d1mnewz/interviews',
  },
  quantPrimer: {
    sourceType: 'github_repo',
    sourceTitle: 'dwcoder/QuantitativePrimer',
    sourceUrl: 'https://github.com/dwcoder/QuantitativePrimer',
  },
  mlQuant: {
    sourceType: 'github_repo',
    sourceTitle: 'meagmohit/mlquant-interview-question-bank',
    sourceUrl: 'https://github.com/meagmohit/mlquant-interview-question-bank',
  },
  ibAttachment: {
    sourceType: 'user_attachment',
    sourceTitle: '400 Questions IB Interview Guide 2025 (user attachment)',
    sourceUrl: null,
  },
} satisfies Record<string, SeedSourceReference>;

function getSourceForMeta(meta: TrackMeta): SeedSourceReference {
  if (meta.role === 'investment_banking') {
    return SOURCE_REFERENCES.ibAttachment;
  }

  if (meta.subcategory === 'quant_trading') {
    return SOURCE_REFERENCES.quantPrimer;
  }

  if (meta.subcategory === 'quant_research' || meta.subcategory === 'ai_roles') {
    return SOURCE_REFERENCES.mlQuant;
  }

  if (meta.role === 'buyside' || meta.subcategory === 'hedge_fund') {
    return SOURCE_REFERENCES.hedgeFund;
  }

  if (meta.role === 'consulting' || meta.role === 'general_finance' || meta.role === 'behavioural') {
    return SOURCE_REFERENCES.interviewRepo;
  }

  return SOURCE_REFERENCES.salesTrading;
}

const TRACKS: TrackMeta[] = [
  {
    role: 'sales_trading',
    subcategory: 'ai_roles',
    label: 'AI Roles in Markets',
    product: 'AI-enabled market intelligence and execution tooling',
    deliverable: 'turn noisy data into repeatable decisions that help the desk price risk faster',
    counterpart: 'traders, salespeople, and engineers',
    workflow: 'define the decision, source clean data, test the model, and ship it with clear guardrails',
    focus: 'using machine learning only where it adds measurable edge over a simpler baseline',
    coreSignal: 'whether the model improves decision quality after costs, latency, and false positives',
    drivers: ['data quality', 'latency constraints', 'model drift'],
    risks: ['overfitting', 'poor production monitoring', 'using a black-box signal without a kill switch'],
    skills: ['feature engineering', 'statistical validation', 'clear model monitoring'],
    metrics: ['precision versus baseline', 'latency to decision', 'post-deployment hit rate'],
    firms: ['Citadel Securities', 'Jane Street', 'Hudson River Trading', 'Optiver'],
    firmType: 'market_maker',
    tags: ['ai', 'markets', 'machine-learning'],
  },
  {
    role: 'sales_trading',
    subcategory: 'quant_trading',
    label: 'Quant Trading',
    product: 'systematic signals and automated execution',
    deliverable: 'translate a statistical edge into pnl after transaction costs and risk limits',
    counterpart: 'traders, quants, and risk managers',
    workflow: 'form a hypothesis, test it robustly, size it prudently, and monitor live performance',
    focus: 'maintaining discipline when the live strategy deviates from the backtest',
    coreSignal: 'whether the strategy keeps a stable edge net of fees, slippage, and crowding',
    drivers: ['microstructure changes', 'cost of execution', 'signal decay'],
    risks: ['regime breaks', 'hidden correlation', 'capacity constraints'],
    skills: ['probability', 'backtesting hygiene', 'position sizing'],
    metrics: ['sharpe after costs', 'hit rate by regime', 'drawdown depth'],
    firms: ['Jump Trading', 'DRW', 'IMC', 'Tower Research'],
    firmType: 'prop_trading',
    tags: ['systematic', 'trading', 'alpha'],
  },
  {
    role: 'sales_trading',
    subcategory: 'quant_research',
    label: 'Quant Research',
    product: 'research frameworks that create durable signals',
    deliverable: 'separate true edge from noise and hand traders a signal they can trust',
    counterpart: 'portfolio managers, traders, and data engineers',
    workflow: 'clean the dataset, define the target, test robustness, and stress the idea across regimes',
    focus: 'being ruthless about data leakage and false discovery',
    coreSignal: 'whether the effect survives out-of-sample, costs, and sensible economic intuition',
    drivers: ['sample selection', 'feature stability', 'economic intuition'],
    risks: ['data leakage', 'multiple testing', 'unstable production features'],
    skills: ['research design', 'cross-validation', 'economic reasoning'],
    metrics: ['out-of-sample information ratio', 'feature stability', 't-stat persistence'],
    firms: ['AQR', 'Two Sigma', 'Point72 Cubist', 'WorldQuant'],
    firmType: 'hedge_fund',
    tags: ['quant', 'research', 'data'],
  },
  {
    role: 'sales_trading',
    subcategory: 'trading_desk',
    label: 'Trading Desk',
    product: 'risk warehousing and principal market-making',
    deliverable: 'price inventory well and make money from spread, flow, and risk transfer',
    counterpart: 'salespeople, clients, and risk',
    workflow: 'read the tape, manage inventory, react to catalysts, and communicate clearly under time pressure',
    focus: 'balancing client service with disciplined inventory management',
    coreSignal: 'whether the desk is getting paid enough spread for the liquidity and inventory risk it takes',
    drivers: ['client flow', 'inventory balance', 'event risk'],
    risks: ['gap risk', 'crowded positioning', 'liquidity drying up at the wrong moment'],
    skills: ['decision-making under pressure', 'inventory management', 'clear risk communication'],
    metrics: ['inventory turnover', 'bid-ask capture', 'pnl volatility'],
    firms: ['Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'Barclays'],
    firmType: 'investment_bank',
    tags: ['desk', 'flow', 'risk'],
  },
  {
    role: 'sales_trading',
    subcategory: 'options_desk',
    label: 'Options Desk',
    product: 'listed and otc optionality',
    deliverable: 'price volatility properly and manage greek exposures dynamically',
    counterpart: 'sales, structurers, and volatility traders',
    workflow: 'understand the client objective, quote vol, hedge the greeks, and re-mark the surface as conditions change',
    focus: 'distinguishing realized versus implied volatility and knowing when skew matters most',
    coreSignal: 'whether the implied vol you sell or buy is attractive relative to realized outcomes and hedging costs',
    drivers: ['realized volatility', 'skew and term structure', 'hedging liquidity'],
    risks: ['short gamma in fast markets', 'vega concentration', 'model risk around correlation or jumps'],
    skills: ['greeks intuition', 'vol surface reading', 'hedging discipline'],
    metrics: ['vega exposure', 'gamma scalp pnl', 'realized versus implied spread'],
    firms: ['Optiver', 'Susquehanna', 'Citigroup', 'Bank of America'],
    firmType: 'market_maker',
    tags: ['options', 'volatility', 'derivatives'],
  },
  {
    role: 'sales_trading',
    subcategory: 'sales_desk',
    label: 'Sales Desk',
    product: 'client coverage and idea distribution',
    deliverable: 'win client trust by bringing timely ideas, access, and execution judgment',
    counterpart: 'institutional clients and internal trading teams',
    workflow: 'understand the client mandate, tailor the idea, coordinate execution, and follow up with value-add',
    focus: 'translating market color into client-specific recommendations',
    coreSignal: 'whether your calls and follow-up make the client more informed and more likely to trade with you again',
    drivers: ['client positioning', 'market catalysts', 'relevance of your idea set'],
    risks: ['generic communication', 'poor follow-through', 'pushing an idea that does not fit the client mandate'],
    skills: ['relationship building', 'market synthesis', 'concise communication'],
    metrics: ['client wallet share', 'idea conversion rate', 'repeat interaction frequency'],
    firms: ['RBC Capital Markets', 'BMO Capital Markets', 'Deutsche Bank', 'UBS'],
    firmType: 'investment_bank',
    tags: ['sales', 'clients', 'coverage'],
  },
  {
    role: 'sales_trading',
    subcategory: 'bonds',
    label: 'Bonds',
    product: 'rates and credit instruments',
    deliverable: 'understand curve, spread, and financing dynamics well enough to quote and manage risk intelligently',
    counterpart: 'issuers, investors, and fixed income traders',
    workflow: 'frame the macro backdrop, understand the curve, compare spread versus fundamentals, and manage duration',
    focus: 'explaining how rates and spreads interact rather than treating them as one trade',
    coreSignal: 'whether the yield properly compensates you for duration, liquidity, and credit risk',
    drivers: ['central bank expectations', 'curve shape', 'credit spread behavior'],
    risks: ['duration shock', 'spread widening', 'funding stress'],
    skills: ['fixed income math', 'curve intuition', 'relative-value framing'],
    metrics: ['duration contribution', 'spread duration', 'carry and roll-down'],
    firms: ['J.P. Morgan', 'BNP Paribas', 'CIBC Capital Markets', 'Wells Fargo'],
    firmType: 'investment_bank',
    tags: ['fixed-income', 'rates', 'credit'],
  },
  {
    role: 'sales_trading',
    subcategory: 'equities',
    label: 'Equities',
    product: 'cash equities and equity-linked flow',
    deliverable: 'match client flow with intelligent execution and tight market color',
    counterpart: 'portfolio managers and equity traders',
    workflow: 'watch liquidity, catalysts, and positioning while adjusting execution to market conditions',
    focus: 'balancing urgency, liquidity, and information leakage',
    coreSignal: 'whether you can improve execution quality without signaling too much to the market',
    drivers: ['liquidity conditions', 'earnings and news flow', 'index and factor positioning'],
    risks: ['market impact', 'short-term news shocks', 'crowded positioning'],
    skills: ['market microstructure', 'execution tactics', 'stock-specific judgment'],
    metrics: ['implementation shortfall', 'fill quality', 'market impact versus benchmark'],
    firms: ['Morgan Stanley', 'Goldman Sachs', 'RBC Capital Markets', 'Jefferies'],
    firmType: 'investment_bank',
    tags: ['equities', 'execution', 'market-structure'],
  },
  {
    role: 'sales_trading',
    subcategory: 'fx',
    label: 'FX',
    product: 'spot, forwards, and options in currencies',
    deliverable: 'connect macro and cross-border flow into tradable currency views',
    counterpart: 'corporates, asset managers, and macro traders',
    workflow: 'track relative growth, inflation, and policy paths while watching positioning and carry',
    focus: 'turning macro views into clean currency expressions with clear catalysts',
    coreSignal: 'whether the rate differential, balance-of-payments story, and positioning all point in the same direction',
    drivers: ['central bank divergence', 'real rate differentials', 'external balance and flow'],
    risks: ['policy surprises', 'correlated risk-off moves', 'crowded carry trades'],
    skills: ['macro synthesis', 'relative-value thinking', 'cross-asset awareness'],
    metrics: ['carry versus spot move', 'policy-path repricing', 'positioning extremes'],
    firms: ['Citi', 'J.P. Morgan', 'Bank of America', 'Standard Chartered'],
    firmType: 'investment_bank',
    tags: ['fx', 'macro', 'currencies'],
  },
  {
    role: 'investment_banking',
    subcategory: 'm_and_a',
    label: 'M&A',
    product: 'strategic acquisitions, divestitures, and merger advisory',
    deliverable: 'help a client evaluate strategic fit, valuation, and execution risk in a transaction',
    counterpart: 'corporate executives, sponsors, and internal deal teams',
    workflow: 'build the market map, understand the rationale, test value creation, and drive the process cleanly',
    focus: 'linking strategy to valuation instead of treating the model as the whole answer',
    coreSignal: 'whether the deal creates value after premium, financing, integration, and execution risk',
    drivers: ['strategic rationale', 'valuation support', 'execution certainty'],
    risks: ['overpaying', 'synergy overestimation', 'integration failure'],
    skills: ['valuation', 'process management', 'executive communication'],
    metrics: ['accretion or dilution', 'premium to unaffected price', 'synergy payback'],
    firms: ['Evercore', 'Goldman Sachs', 'Lazard', 'Morgan Stanley'],
    firmType: 'investment_bank',
    tags: ['m-and-a', 'advisory', 'valuation'],
  },
  {
    role: 'investment_banking',
    subcategory: 'industry_groups',
    label: 'Industry Groups',
    product: 'sector-specific corporate finance coverage',
    deliverable: 'combine sector knowledge with transaction execution so clients trust your advice',
    counterpart: 'management teams, investors, and sector specialists',
    workflow: 'know the sector cold, keep comps fresh, and connect operating drivers to capital markets implications',
    focus: 'earning credibility by understanding what actually matters in the sector',
    coreSignal: 'whether you can explain why the sector is rerating and what that means for financing or strategic options',
    drivers: ['sector growth drivers', 'competitive positioning', 'investor sentiment'],
    risks: ['weak sector knowledge', 'stale comps', 'missing a key catalyst'],
    skills: ['sector analysis', 'comps work', 'synthesizing investor narratives'],
    metrics: ['peer multiple dispersion', 'sector growth outlook', 'capital intensity'],
    firms: ['J.P. Morgan', 'RBC Capital Markets', 'BofA Securities', 'Citi'],
    firmType: 'investment_bank',
    tags: ['industry', 'coverage', 'sector'],
  },
  {
    role: 'investment_banking',
    subcategory: 'capital_markets',
    label: 'Capital Markets',
    product: 'equity and debt issuance',
    deliverable: 'help clients raise capital at the right time, size, and structure',
    counterpart: 'issuers, investors, syndicate, and sales',
    workflow: 'read market windows, position the story, set terms, and manage investor feedback',
    focus: 'matching issuer needs with real investor appetite rather than theoretical valuation alone',
    coreSignal: 'whether the issue clears cleanly with a strong book and healthy aftermarket performance',
    drivers: ['market window quality', 'investor appetite', 'pricing discipline'],
    risks: ['failed bookbuild', 'aftermarket underperformance', 'poor investor targeting'],
    skills: ['bookbuilding intuition', 'market timing', 'transaction structuring'],
    metrics: ['book coverage', 'pricing discount', 'aftermarket trading performance'],
    firms: ['Goldman Sachs', 'Morgan Stanley', 'Barclays', 'RBC Capital Markets'],
    firmType: 'investment_bank',
    tags: ['ecm', 'dcm', 'capital-markets'],
  },
  {
    role: 'investment_banking',
    subcategory: 'restructuring',
    label: 'Restructuring',
    product: 'liability management and distressed advisory',
    deliverable: 'help stakeholders understand value break, liquidity runway, and negotiation leverage',
    counterpart: 'debtors, creditors, and sponsor or creditor committees',
    workflow: 'build the cash flow, understand the capital structure, test recoveries, and map each stakeholder incentive',
    focus: 'being precise about liquidity and value leakage when time is short',
    coreSignal: 'whether the company has enough runway and whether each creditor class is in or out of the money',
    drivers: ['liquidity runway', 'capital structure seniority', 'operating deterioration'],
    risks: ['running out of cash', 'incorrect recovery assumptions', 'misreading stakeholder leverage'],
    skills: ['cash flow modeling', 'capital structure analysis', 'distressed negotiations'],
    metrics: ['minimum cash balance', 'recovery value by tranche', 'interest coverage'],
    firms: ['PJT Partners', 'Houlihan Lokey', 'Lazard', 'Moelis'],
    firmType: 'investment_bank',
    tags: ['restructuring', 'distressed', 'credit'],
  },
  {
    role: 'investment_banking',
    subcategory: 'general_ib',
    label: 'General Investment Banking',
    product: 'broad-based advisory and financing support',
    deliverable: 'be a reliable generalist who can support live deals while learning quickly across products',
    counterpart: 'senior bankers, clients, and product specialists',
    workflow: 'prepare materials accurately, update analysis fast, and keep the team aligned under deadline',
    focus: 'showing judgment early while never becoming sloppy with detail',
    coreSignal: 'whether the team can trust your work without having to rebuild it',
    drivers: ['analytical accuracy', 'responsiveness', 'commercial awareness'],
    risks: ['avoidable errors', 'poor prioritization', 'not understanding the client objective'],
    skills: ['financial modeling', 'attention to detail', 'structured communication'],
    metrics: ['turnaround time', 'error rate', 'quality of first draft materials'],
    firms: ['BMO Capital Markets', 'TD Securities', 'Jefferies', 'CIBC Capital Markets'],
    firmType: 'investment_bank',
    tags: ['ib', 'modeling', 'process'],
  },
  {
    role: 'buyside',
    subcategory: 'hedge_fund',
    label: 'Hedge Fund',
    product: 'high-conviction public market investing',
    deliverable: 'generate differentiated ideas that can survive deep challenge and catalyst timing pressure',
    counterpart: 'portfolio managers, analysts, and traders',
    workflow: 'form the variant view, map catalysts, size the position, and monitor the thesis versus the tape',
    focus: 'finding a reason the market is wrong rather than merely finding a good company',
    coreSignal: 'whether you have a genuine variant perception and a catalyst that can close the gap',
    drivers: ['variant view', 'catalyst path', 'positioning and crowding'],
    risks: ['thesis drift', 'crowded shorts or longs', 'slow catalyst realization'],
    skills: ['idea generation', 'variant perception', 'catalyst analysis'],
    metrics: ['expected upside to downside', 'time to catalyst', 'position contribution to portfolio risk'],
    firms: ['Point72', 'Citadel', 'Pershing Square', 'Millennium'],
    firmType: 'hedge_fund',
    tags: ['hedge-fund', 'ideas', 'catalysts'],
  },
  {
    role: 'buyside',
    subcategory: 'pension',
    label: 'Pension',
    product: 'long-horizon asset allocation and manager selection',
    deliverable: 'compound capital responsibly while matching liabilities and governance constraints',
    counterpart: 'investment committees, external managers, and internal asset allocation teams',
    workflow: 'start from the total fund objective, assess opportunity cost, and size the allocation with risk budgeting in mind',
    focus: 'thinking at the total-portfolio level instead of in isolated silos',
    coreSignal: 'whether the investment improves the plan’s long-run return profile without creating a governance problem',
    drivers: ['liability profile', 'expected real return', 'portfolio diversification'],
    risks: ['illiquidity mismatches', 'manager risk', 'underestimating governance constraints'],
    skills: ['portfolio construction', 'manager diligence', 'long-horizon judgment'],
    metrics: ['funded status sensitivity', 'tracking error to policy portfolio', 'liquidity budget'],
    firms: ['CPP Investments', 'OMERS', 'OTPP', 'PSP Investments'],
    firmType: 'pension',
    tags: ['pension', 'asset-allocation', 'portfolio'],
  },
  {
    role: 'buyside',
    subcategory: 'long_only',
    label: 'Long-Only Investing',
    product: 'fundamental equity investing with benchmark awareness',
    deliverable: 'own businesses that can compound earnings and outperform over a multi-year horizon',
    counterpart: 'portfolio managers, sector analysts, and clients',
    workflow: 'understand business quality, valuation, and position sizing in the context of the rest of the book',
    focus: 'knowing when a great company is not a great stock at the current price',
    coreSignal: 'whether the business can beat embedded expectations and whether valuation leaves room for rerating',
    drivers: ['earnings durability', 'management execution', 'valuation expectations'],
    risks: ['multiple compression', 'thesis complacency', 'benchmark crowding'],
    skills: ['fundamental analysis', 'valuation discipline', 'portfolio context'],
    metrics: ['expected alpha versus benchmark', 'earnings revision trend', 'free cash flow conversion'],
    firms: ['Capital Group', 'Fidelity', 'T. Rowe Price', 'MFS'],
    firmType: 'asset_manager',
    tags: ['long-only', 'equities', 'fundamental'],
  },
  {
    role: 'buyside',
    subcategory: 'asset_management',
    label: 'Asset Management',
    product: 'portfolio solutions across asset classes',
    deliverable: 'deliver repeatable investment outcomes that are aligned with client mandates',
    counterpart: 'clients, consultants, and portfolio teams',
    workflow: 'understand the mandate, evaluate the opportunity, and express the view in a portfolio-aware way',
    focus: 'aligning investment recommendations with the actual risk tolerance and benchmark of the client',
    coreSignal: 'whether the portfolio change improves expected outcomes for the mandate rather than in isolation',
    drivers: ['client objective', 'benchmark design', 'cross-asset opportunity set'],
    risks: ['style drift', 'benchmark mismatch', 'overconcentration'],
    skills: ['portfolio construction', 'client alignment', 'cross-asset thinking'],
    metrics: ['tracking error', 'information ratio', 'client retention'],
    firms: ['BlackRock', 'PIMCO', 'Vanguard', 'Fidelity'],
    firmType: 'asset_manager',
    tags: ['asset-management', 'clients', 'portfolio-construction'],
  },
  {
    role: 'buyside',
    subcategory: 'credit',
    label: 'Buyside Credit',
    product: 'corporate credit and structured opportunities',
    deliverable: 'find mispriced spreads where downside is protected by structure or recovery value',
    counterpart: 'pms, traders, and management teams',
    workflow: 'underwrite cash flows, covenant protection, and recovery scenarios before reaching for spread',
    focus: 'avoiding situations where yield looks attractive only because the downside is poorly understood',
    coreSignal: 'whether the spread compensates for default probability, recovery risk, and liquidity',
    drivers: ['leverage path', 'free cash flow resilience', 'covenant quality'],
    risks: ['refinancing risk', 'weak recoveries', 'liquidity traps'],
    skills: ['credit underwriting', 'capital structure analysis', 'downside scenario work'],
    metrics: ['net leverage', 'interest coverage', 'spread to expected loss'],
    firms: ['Apollo', 'Blue Owl', 'PIMCO', 'Carlyle'],
    firmType: 'asset_manager',
    tags: ['credit', 'underwriting', 'downside'],
  },
  {
    role: 'buyside',
    subcategory: 'macro',
    label: 'Buyside Macro',
    product: 'top-down rates, fx, equity index, and commodity positioning',
    deliverable: 'turn macro regimes into clean expressions with strong asymmetry',
    counterpart: 'macro pm, traders, and risk',
    workflow: 'define the regime, identify the best expression, and map the catalyst path and risk events',
    focus: 'choosing the cleanest expression rather than the most complicated one',
    coreSignal: 'whether your expression captures the macro view with good carry, liquidity, and catalyst timing',
    drivers: ['policy path', 'growth surprises', 'inflation trajectory'],
    risks: ['policy reversals', 'correlated drawdowns', 'wrong expression for the right thesis'],
    skills: ['regime analysis', 'expression design', 'cross-asset linkage'],
    metrics: ['carry profile', 'expected move to catalyst', 'portfolio beta contribution'],
    firms: ['Bridgewater', 'Brevan Howard', 'Caxton', 'Rokos Capital'],
    firmType: 'hedge_fund',
    tags: ['macro', 'cross-asset', 'regimes'],
  },
  {
    role: 'consulting',
    subcategory: 'strategy',
    label: 'Strategy Consulting',
    product: 'growth, market entry, and corporate strategy advice',
    deliverable: 'structure an ambiguous problem and recommend an economically sound path forward',
    counterpart: 'clients, partners, and case teams',
    workflow: 'clarify the objective, build the issue tree, test hypotheses, and communicate a clear recommendation',
    focus: 'bringing structure fast without losing commercial judgment',
    coreSignal: 'whether your recommendation is practical, quantified, and clearly tied to the client goal',
    drivers: ['market attractiveness', 'competitive position', 'economic impact'],
    risks: ['overcomplicating the problem', 'weak prioritization', 'not sizing the economics'],
    skills: ['problem structuring', 'quantitative reasoning', 'executive communication'],
    metrics: ['market size', 'profit pool impact', 'implementation feasibility'],
    firms: ['McKinsey', 'Bain', 'BCG', 'Oliver Wyman'],
    firmType: 'consulting_firm',
    tags: ['strategy', 'problem-solving', 'structured-thinking'],
  },
  {
    role: 'consulting',
    subcategory: 'general_consulting',
    label: 'General Consulting',
    product: 'broad operational and strategic advisory',
    deliverable: 'bring rigorous analysis to messy client problems and help teams execute change',
    counterpart: 'clients, managers, and analysts',
    workflow: 'frame the problem, gather facts, test hypotheses, and land the recommendation with stakeholders',
    focus: 'combining analysis with change management and stakeholder awareness',
    coreSignal: 'whether the analysis changes a client decision and can actually be implemented',
    drivers: ['client objective clarity', 'stakeholder alignment', 'quality of the fact base'],
    risks: ['analysis without actionability', 'stakeholder resistance', 'poor synthesis'],
    skills: ['structured analysis', 'stakeholder management', 'clear synthesis'],
    metrics: ['cost savings potential', 'execution timeline', 'stakeholder adoption'],
    firms: ['Accenture', 'EY-Parthenon', 'Deloitte', 'Kearney'],
    firmType: 'consulting_firm',
    tags: ['consulting', 'implementation', 'stakeholders'],
  },
  {
    role: 'consulting',
    subcategory: 'case_interview',
    label: 'Case Interview',
    product: 'live business problem solving under time pressure',
    deliverable: 'show a clean, hypothesis-driven approach rather than reciting memorized frameworks',
    counterpart: 'the interviewer and, by extension, the client',
    workflow: 'confirm the objective, structure the case, prioritize analyses, and synthesize crisply',
    focus: 'moving from framework to insight rather than getting stuck listing buckets',
    coreSignal: 'whether your structure is MECE enough to guide the case and flexible enough to adapt',
    drivers: ['clarity of objective', 'case structure', 'quality of synthesis'],
    risks: ['rambling', 'generic frameworks', 'forgetting to answer the client question'],
    skills: ['structuring ambiguity', 'mental math', 'synthesis'],
    metrics: ['math accuracy', 'prioritization quality', 'recommendation clarity'],
    firms: ['McKinsey', 'Bain', 'BCG', 'LEK Consulting'],
    firmType: 'consulting_firm',
    tags: ['case', 'interview', 'mental-math'],
  },
  {
    role: 'general_finance',
    subcategory: null,
    label: 'General Finance',
    product: 'broad finance problem solving across valuation, markets, and accounting',
    deliverable: 'show that you can connect core financial concepts to real decisions',
    counterpart: 'interviewers from mixed finance backgrounds',
    workflow: 'define the problem, identify the key economic driver, and explain the trade-off clearly',
    focus: 'linking technical knowledge to judgment instead of reciting definitions',
    coreSignal: 'whether you can explain why a concept matters in an investing or corporate decision',
    drivers: ['cash flow quality', 'cost of capital', 'capital allocation'],
    risks: ['memorized answers', 'weak commercial judgment', 'missing the linkage between statements'],
    skills: ['accounting fluency', 'valuation basics', 'clear reasoning'],
    metrics: ['return on invested capital', 'free cash flow conversion', 'leverage capacity'],
    firms: ['Goldman Sachs', 'J.P. Morgan', 'BlackRock', 'RBC Capital Markets'],
    firmType: 'general_finance',
    tags: ['finance', 'technical', 'fundamentals'],
  },
  {
    role: 'behavioural',
    subcategory: null,
    label: 'Behavioural',
    product: 'judgment, self-awareness, and teammate quality',
    deliverable: 'convince the interviewer that you can perform under pressure and be trusted on a team',
    counterpart: 'future teammates and managers',
    workflow: 'give a concrete example, explain your decision process, and show the lesson you carried forward',
    focus: 'self-awareness paired with accountability',
    coreSignal: 'whether your examples show maturity, ownership, and coachability instead of polished clichés',
    drivers: ['clarity of example', 'ownership of mistakes', 'quality of reflection'],
    risks: ['vague anecdotes', 'blaming others', 'answers that sound rehearsed but shallow'],
    skills: ['self-reflection', 'communication', 'team judgment'],
    metrics: ['clarity under pressure', 'quality of reflection', 'evidence of growth'],
    firms: ['Goldman Sachs', 'McKinsey', 'Citadel', 'CPP Investments'],
    firmType: 'general_finance',
    tags: ['behavioural', 'fit', 'leadership'],
  },
];

const COMMON_BLUEPRINTS: QuestionBlueprint[] = [
  {
    key: 'why-track',
    questionType: 'fit',
    difficulty: 'easy',
    tags: ['motivation', 'why-this-role'],
    buildQuestion: (meta, firm) => `Why ${meta.label.toLowerCase()} at ${firm}, and what do you think people underestimate about the job?`,
    buildAnswer: (meta, firm) =>
      `I am drawn to ${meta.label.toLowerCase()} because it combines ${meta.skills[0]} with ${meta.skills[1]} in a setting where feedback is immediate and accountability is clear. What people underestimate is how much the seat depends on process and consistency, not just raw intelligence. At ${firm}, I would want to contribute by learning the workflow quickly, taking feedback well, and helping the team ${meta.deliverable}. The role fits me because I enjoy high standards, fast feedback loops, and making decisions that have real consequences.`,
  },
  {
    key: 'day-one-process',
    questionType: 'technical',
    difficulty: 'medium',
    tags: ['process', 'workflow'],
    buildQuestion: (meta) => `If I dropped you into a ${meta.label.toLowerCase()} seat tomorrow morning, how would you structure your first hour?`,
    buildAnswer: (meta) =>
      `My first hour would be about orientation before action. I would clarify the day's objective, major catalysts, and any hard constraints, then review the information tied most closely to ${meta.coreSignal}. After that I would look at ${meta.drivers[0]}, ${meta.drivers[1]}, and ${meta.drivers[2]} to frame the opportunity set. Only then would I move into ${meta.workflow}, because acting early without context is usually just a faster way to make avoidable mistakes.`,
  },
  {
    key: 'core-skill',
    questionType: 'technical',
    difficulty: 'medium',
    tags: ['skills', 'technical-edge'],
    buildQuestion: (meta) => `What technical skill matters most in ${meta.label.toLowerCase()}, and how would you prove you have it?`,
    buildAnswer: (meta) =>
      `The skill I would emphasize first is ${meta.skills[0]}, because without it the rest of the process becomes reactive rather than repeatable. I would pair that with ${meta.skills[1]} and ${meta.skills[2]} so the output is not just technically correct but actually useful in a live setting. To prove it, I would walk through a concrete example where I framed the problem, picked a sensible method, and showed how the answer changed a decision rather than just producing analysis for its own sake.`,
  },
  {
    key: 'metrics',
    questionType: 'technical',
    difficulty: 'medium',
    tags: ['monitoring', 'kpis'],
    buildQuestion: (meta) => `What metrics would you monitor every week to know whether you are getting better in ${meta.label.toLowerCase()}?`,
    buildAnswer: (meta) =>
      `I would track a mix of outcome and process metrics. On the outcome side I would watch ${meta.metrics[0]} and ${meta.metrics[1]} because they tell me whether my decisions are translating into value. On the process side I would monitor ${meta.metrics[2]} or its closest practical equivalent, because a lucky run can hide weak decision-making. The goal is to create a feedback loop that tells me whether the edge is real, repeatable, and aligned with what the role is actually trying to accomplish.`,
  },
  {
    key: 'why-firm',
    questionType: 'fit',
    difficulty: 'easy',
    tags: ['firm-specific', 'motivation'],
    buildQuestion: (meta, firm) => `Why would you choose ${firm} over another platform for ${meta.label.toLowerCase()}?`,
    buildAnswer: (meta, firm) =>
      `I would choose ${firm} if I believed it gave me the strongest environment to learn the craft properly and contribute at a high standard. In ${meta.label.toLowerCase()}, that means a place where people care deeply about ${meta.focus}, where the team is honest about mistakes, and where the process behind ${meta.deliverable} is respected rather than improvised. I would make the decision based on whether the platform is known for strong feedback, real responsibility early, and a culture where sound judgment is rewarded more than empty confidence.`,
  },
];

const ROLE_BLUEPRINTS: Record<InterviewRole, QuestionBlueprint[]> = {
  sales_trading: [
    {
      key: 'market-driver',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['market-view', 'drivers'],
      buildQuestion: (meta) => `What is the most important market driver for ${meta.label.toLowerCase()} right now, and how would you translate it into a decision?`,
      buildAnswer: (meta) =>
        `I would start with ${meta.drivers[0]} because it directly changes how attractive ${meta.product} looks on a forward basis. Then I would cross-check it against ${meta.drivers[1]} and ${meta.drivers[2]} to see whether the story is confirming or starting to fracture. The real job is not just to name the driver; it is to translate it into a decision on risk, pricing, or positioning and to know what would prove that translation wrong.`,
    },
    {
      key: 'risk-framework',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['risk-management', 'discipline'],
      buildQuestion: (meta) => `How would you think about risk management in ${meta.label.toLowerCase()} before you put capital or credibility at risk?`,
      buildAnswer: (meta) =>
        `I would define risk before I touched the opportunity. That means identifying how the thesis could fail, especially through ${meta.risks[0]}, ${meta.risks[1]}, and ${meta.risks[2]}. From there I would decide whether the risk is fundamental, timing-related, or structural, because each one deserves a different response. The final step is aligning sizing and communication with actual uncertainty rather than with how confident I want to sound.`,
    },
    {
      key: 'product-explain',
      questionType: 'product',
      difficulty: 'medium',
      tags: ['product-knowledge', 'communication'],
      buildQuestion: (meta) => `Explain ${meta.product} to a smart senior person in plain English. What are the two or three things that really matter?`,
      buildAnswer: (meta) =>
        `I would explain ${meta.product} as a tool for expressing a view or solving a client problem, not as jargon for its own sake. The first thing that matters is the source of value: how does it help the team ${meta.deliverable}. The second is what truly drives the economics, especially ${meta.drivers[0]} and ${meta.drivers[1]}. The third is risk, because even a compelling product can disappoint if you ignore ${meta.risks[0]} or the practical cost of executing it.`,
    },
    {
      key: 'execution-judgment',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['execution', 'judgment'],
      buildQuestion: (meta) => `When would you pass on an apparently attractive ${meta.label.toLowerCase()} opportunity even if the headline setup looked good?`,
      buildAnswer: (meta) =>
        `I would pass when the headline thesis is right but the expression is poor. That usually happens when ${meta.risks[0]} is underappreciated, the liquidity is not good enough, or the market is already crowded enough that the reward is no longer worth the path risk. In this seat, discipline matters more than activity. If I cannot explain the entry, sizing, and exit as cleanly as the idea itself, I am not really underwriting the trade.`,
    },
    {
      key: 'communication',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['communication', 'stakeholders'],
      buildQuestion: (meta) => `How would you communicate a difficult message to ${meta.counterpart} in a ${meta.label.toLowerCase()} setting?`,
      buildAnswer: (meta) =>
        `I would keep the message direct, specific, and decision-oriented. First I would frame what changed, why it matters, and what action I recommend now. Then I would translate the analysis into the language the audience actually needs, whether that is risk, timing, or expected payoff. In fast markets, credibility comes from being calm and clear when the news is uncomfortable, not from sounding polished while avoiding the real point.`,
    },
  ],
  investment_banking: [
    {
      key: 'valuation-approach',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['valuation', 'modeling'],
      buildQuestion: (meta) => `How would you approach valuation in ${meta.label.toLowerCase()}, and which method would you trust most first?`,
      buildAnswer: (meta) =>
        `I would start by anchoring the answer to the actual question the client cares about. In ${meta.label.toLowerCase()}, I would usually triangulate across trading comps, precedent transactions, and a transaction-specific intrinsic framework, then ask which one best reflects ${meta.drivers[0]} and the client's strategic objective. I would trust no single method in isolation. Instead, I would use each one to pressure-test the others and to understand what has to be true for the proposed valuation to hold.`,
    },
    {
      key: 'deal-rationale',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['transaction', 'strategy'],
      buildQuestion: (meta) => `Pitch a transaction or financing rationale that would make sense for a ${meta.label.toLowerCase()} client today.`,
      buildAnswer: (meta) =>
        `I would begin with strategic rationale, not with the spreadsheet. The first question is whether the client solves a real problem through the transaction, such as accelerating growth, improving scale, or addressing a balance-sheet issue. Then I would test whether the economics work after premium, financing, and execution risk. A good banking recommendation is one where strategy, valuation, and process all point in the same direction rather than one where the model is doing all of the persuasive work.`,
    },
    {
      key: 'diligence',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['diligence', 'process'],
      buildQuestion: (meta) => `What are the first diligence questions you would ask in ${meta.label.toLowerCase()} before getting deep into the model?`,
      buildAnswer: (meta) =>
        `I would want to understand what truly drives value and where it can break. That starts with the business drivers tied to ${meta.drivers[0]} and ${meta.drivers[1]}, then moves to execution risks such as ${meta.risks[0]} and ${meta.risks[1]}. Only after I understand the commercial and process issues would I spend serious time refining the numbers. In banking, early judgment on the right questions often matters more than building a model faster than everyone else.`,
    },
    {
      key: 'capital-structure',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['capital-structure', 'financing'],
      buildQuestion: (meta) => `How would you think about capital structure or financing risk in ${meta.label.toLowerCase()}?`,
      buildAnswer: (meta) =>
        `I would think about financing as part of the strategy, not as an afterthought. The right structure has to preserve flexibility, support the transaction objective, and avoid creating fragility through ${meta.risks[0]} or ${meta.risks[2]}. I would look at cash generation, downside resilience, and market appetite before deciding what is sustainable. A good structure gives the client room to execute; a bad one makes a decent idea fail because the financing was too aggressive or too rigid.`,
    },
    {
      key: 'stakeholder-message',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['clients', 'stakeholders'],
      buildQuestion: (meta) => `How would you explain a hard message to a client in ${meta.label.toLowerCase()}, such as weaker valuation support or a tougher market window?`,
      buildAnswer: (meta) =>
        `I would be direct early rather than optimistic late. I would explain what changed, which evidence supports that view, and how the recommendation should adjust as a result. Then I would give the client a practical menu of options instead of just bad news. In advisory work, trust grows when the team can surface uncomfortable facts clearly and still help the client move forward with a rational plan.`,
    },
  ],
  buyside: [
    {
      key: 'variant-view',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['variant-perception', 'idea-generation'],
      buildQuestion: (meta) => `What makes an investment idea in ${meta.label.toLowerCase()} actually differentiated rather than just well researched?`,
      buildAnswer: (meta) =>
        `A differentiated idea needs a genuine variant perception, not just a lot of pages. I would ask what the market believes, why that consensus exists, and what evidence suggests the market is wrong on a point that matters to value. Then I would link that view to a catalyst or path to realization. Research matters, but without a clear gap between consensus and reality, you may only be confirming what the price already knows.`,
    },
    {
      key: 'catalyst-map',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['catalysts', 'timing'],
      buildQuestion: (meta) => `How would you map catalysts for a ${meta.label.toLowerCase()} idea and decide whether the timing is worth the risk?`,
      buildAnswer: (meta) =>
        `I would separate catalysts into hard, soft, and reflexive. Hard catalysts are things like earnings, financings, or policy meetings; soft catalysts are gradual data or operating trends; reflexive catalysts come from positioning or flows. Then I would ask whether the expected payoff justifies the time and path risk, especially if ${meta.risks[0]} or ${meta.risks[1]} can hurt the position before the thesis is recognized. A strong idea is not only directionally right; it has a believable route to being priced correctly.`,
    },
    {
      key: 'downside-underwriting',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['downside', 'risk'],
      buildQuestion: (meta) => `How do you underwrite downside in ${meta.label.toLowerCase()} before you get excited about upside?`,
      buildAnswer: (meta) =>
        `I would start by assuming I am early or wrong and then ask what protects me in that state. That means looking at balance sheet resilience, cash generation, recovery value, portfolio context, and what happens if ${meta.drivers[0]} disappoints. The point is to quantify pain before I fall in love with the reward. If I cannot articulate the downside path with the same clarity as the upside case, I do not yet understand the investment well enough.`,
    },
    {
      key: 'position-sizing',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['portfolio-construction', 'sizing'],
      buildQuestion: (meta) => `How would you decide position size or allocation size for a ${meta.label.toLowerCase()} idea?`,
      buildAnswer: (meta) =>
        `Sizing should reflect both conviction and consequences. I would think about expected upside versus downside, time to catalyst, correlation with the rest of the portfolio, and whether the risk is dominated by ${meta.risks[0]} or by a broader portfolio factor. A great idea can still be a poor position if it consumes too much risk budget or creates hidden concentration. The best sizing decision is one that keeps the portfolio strong even if the single name or theme disappoints.`,
    },
    {
      key: 'disconfirming-evidence',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['disconfirming-evidence', 'judgment'],
      buildQuestion: (meta) => `What kind of evidence would make you change your mind on a ${meta.label.toLowerCase()} thesis?`,
      buildAnswer: (meta) =>
        `I would define that before the position is on. Usually it means evidence that the original driver, such as ${meta.drivers[0]}, is not playing out, or that the downside channels like ${meta.risks[0]} are proving more important than expected. I also care about whether the market is reacting for a reason I failed to understand. Good investing is not stubbornness with better vocabulary; it is the ability to update fast without becoming directionless.`,
    },
  ],
  consulting: [
    {
      key: 'structure-problem',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['structuring', 'cases'],
      buildQuestion: (meta) => `How would you structure an ambiguous ${meta.label.toLowerCase()} problem before touching any numbers?`,
      buildAnswer: (meta) =>
        `I would start by clarifying the exact objective, constraints, and success metric. Then I would build an issue tree around the few drivers most likely to explain the outcome, usually something tied to ${meta.drivers[0]}, ${meta.drivers[1]}, and the main economic trade-off. I would avoid listing every possible framework bucket and instead prioritize the hypotheses that would most change the recommendation. Good case work is structured, but it is also selective.`,
    },
    {
      key: 'data-request',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['analysis', 'data'],
      buildQuestion: (meta) => `What data would you ask for first in a ${meta.label.toLowerCase()} engagement, and why?`,
      buildAnswer: (meta) =>
        `I would ask first for the data that tests the client objective directly. If the question is commercial, I want market size, unit economics, and competitive position. If the question is operational, I want cost structure, throughput, and bottlenecks. The point is to build the smallest fact base that can prove or disprove the most important hypotheses quickly. Asking for every spreadsheet on day one often signals uncertainty more than rigor.`,
    },
    {
      key: 'synthesis',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['synthesis', 'communication'],
      buildQuestion: (meta) => `What makes a strong final recommendation in ${meta.label.toLowerCase()} rather than just a good analysis deck?`,
      buildAnswer: (meta) =>
        `A strong recommendation is clear, prioritized, and economically grounded. It should answer the client's question directly, explain the key logic in a few lines, and show what the client should do next. I would link the recommendation back to the two or three drivers that matter most, then make the trade-offs explicit. Analysis becomes valuable only when it changes a decision and gives the client confidence about implementation.`,
    },
    {
      key: 'stakeholder-pushback',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['stakeholders', 'change-management'],
      buildQuestion: (meta) => `How would you handle pushback from a skeptical stakeholder during a ${meta.label.toLowerCase()} project?`,
      buildAnswer: (meta) =>
        `I would treat pushback as information before treating it as resistance. First I would clarify whether the disagreement is about facts, incentives, or framing. Then I would address it with evidence tied to the client goal rather than defending the team's analysis for its own sake. In consulting, strong stakeholder management is not about winning an argument; it is about helping the client reach a better decision with less friction.`,
    },
  ],
  general_finance: [
    {
      key: 'three-statements',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['accounting', 'three-statements'],
      buildQuestion: () => 'Walk me through how the three financial statements link together when depreciation increases by 10.',
      buildAnswer: () =>
        `On the income statement, EBIT falls by 10 and taxes fall by the tax shield, so net income declines by the after-tax amount. On the cash flow statement, net income starts lower, but the full 10 of extra depreciation is added back because it is non-cash, so cash from operations rises by the tax shield. On the balance sheet, cash increases by that same tax shield, PP&E falls by the 10 of extra depreciation, and retained earnings fall by the after-tax decline in net income. Both sides stay balanced because the higher cash offsets part of the lower retained earnings and lower PP&E.`,
    },
    {
      key: 'wacc',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['valuation', 'wacc'],
      buildQuestion: () => 'If WACC goes up by 100 basis points, what happens to DCF value and why?',
      buildAnswer: () =>
        `All else equal, DCF value falls because future cash flows are discounted more aggressively. The effect is especially large for long-duration assets where a big share of value sits in later years or in terminal value. A higher discount rate also often signals either greater business risk or tighter capital availability, which can justify lower valuation multiples as well. So the answer is not just mathematical; it also reflects a change in the market's required return.`,
    },
    {
      key: 'working-capital',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['working-capital', 'cash-flow'],
      buildQuestion: () => 'Why does an increase in working capital reduce free cash flow?',
      buildAnswer: () =>
        `Because the business has tied up more cash in operations. If receivables or inventory rise faster than payables, the company has effectively spent cash that has not yet shown up as revenue collection or supplier financing. That reduces the cash available to debt and equity holders even if accounting earnings look fine. Working capital is one of the clearest examples of why cash flow can diverge from reported profit.`,
    },
    {
      key: 'debt-vs-equity',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['capital-structure', 'corporate-finance'],
      buildQuestion: () => 'When would a company prefer debt financing over equity, and when would equity be the better choice?',
      buildAnswer: () =>
        `Debt is often preferable when cash flows are stable, interest coverage is strong, and management wants to avoid dilution while benefiting from the tax shield. Equity is usually the better choice when leverage is already high, cash flows are uncertain, or the company values flexibility more than near-term EPS optics. The key is not whether debt is cheaper in theory. It is whether the business can carry it through a bad scenario without losing strategic room to operate.`,
    },
  ],
  behavioural: [
    {
      key: 'failure-story',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['failure', 'ownership'],
      buildQuestion: () => 'Tell me about a failure that genuinely changed how you work.',
      buildAnswer: () =>
        `A strong answer should show a real mistake, not a disguised strength. I would explain the situation clearly, own my part without blaming others, and focus on the process lesson that changed my behavior afterward. The interviewer should hear what I now do differently when I face a similar setup. The key is to show growth that is specific and observable rather than abstract self-awareness.`,
    },
    {
      key: 'conflict',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['conflict', 'teamwork'],
      buildQuestion: () => 'Describe a conflict on a team and how you handled it without damaging the relationship.',
      buildAnswer: () =>
        `I would choose an example where the conflict mattered and where I had some responsibility for improving it. Then I would explain how I clarified the disagreement, listened for the underlying concern, and moved the conversation back to the shared objective. The strongest answers show respect and accountability at the same time. The point is not to sound agreeable; it is to show that I can navigate tension without becoming defensive or political.`,
    },
    {
      key: 'lead-without-authority',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['leadership', 'influence'],
      buildQuestion: () => 'Tell me about a time you had to lead without formal authority.',
      buildAnswer: () =>
        `I would show that I created momentum through clarity, reliability, and follow-through rather than through title. A strong example explains how I aligned people around the goal, removed ambiguity, and made it easier for others to do good work. I would also mention how I adapted if someone resisted the approach. Leadership without authority is really about earning trust fast and making collaboration simpler under pressure.`,
    },
    {
      key: 'prioritization',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['prioritization', 'pressure'],
      buildQuestion: () => 'How do you prioritize when multiple urgent tasks land at the same time?',
      buildAnswer: () =>
        `I prioritize by impact first, deadline second, and reversibility third. I want to know which task changes the outcome most if it is done well or poorly, then which deadline is truly hard versus merely uncomfortable. If needed, I communicate trade-offs early rather than silently juggling and missing all of them. Under pressure, good prioritization is less about working harder and more about making the sequence visible and deliberate.`,
    },
  ],
};

const TRACK_BLUEPRINTS: Record<string, QuestionBlueprint[]> = {
  ai_roles: [
    {
      key: 'feature-selection',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['features', 'signal-design'],
      buildQuestion: () => 'How would you decide whether a new feature should enter a live market model rather than stay in research?',
      buildAnswer: () =>
        `I would require three things before shipping it. First, the feature needs to add explanatory or predictive power out of sample, not just in a backtest. Second, I need a clear story for why it should remain stable in production rather than being a lucky artifact. Third, I need a monitoring plan that tells me when the feature degrades so the desk is not trusting stale output. The threshold to ship should be higher than the threshold to find something interesting.`,
    },
    {
      key: 'llm-guardrails',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['llm', 'monitoring'],
      buildQuestion: () => 'Where could an LLM help a markets team, and where would you absolutely put guardrails around it?',
      buildAnswer: () =>
        `An LLM can help most in summarization, workflow acceleration, and extracting structure from messy text. I would be far more cautious using it in any step that directly triggers a trading or risk decision. In those cases I would require human review, explicit evaluation sets, and clear failure-mode monitoring. The mistake is not using AI; it is pretending a tool built for language generation is automatically good enough for live financial decision-making without controls.`,
    },
    {
      key: 'precision-recall',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['evaluation', 'precision-recall'],
      buildQuestion: () => 'How would you think about the precision versus recall trade-off in an AI workflow for markets?',
      buildAnswer: () =>
        `It depends on the cost of a false positive versus the cost of a false negative. If the tool is surfacing opportunities for a human to vet, I may accept lower precision for broader recall. If the tool is escalating risk or influencing execution, precision matters much more because false positives can be expensive. The right threshold comes from the operational use case, not from a generic machine-learning preference.`,
    },
    {
      key: 'eval-set',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['evaluation', 'datasets'],
      buildQuestion: () => 'How would you build an evaluation set for an AI product used by traders or salespeople?',
      buildAnswer: () =>
        `I would start with real workflows, not abstract benchmark tasks. The evaluation set needs examples that reflect the kinds of ambiguity, time pressure, and edge cases the users actually face. Then I would label what good output looks like at the level of decision usefulness, not just linguistic fluency. A useful eval set measures whether the tool helps a human reach a better decision faster and more safely.`,
    },
    {
      key: 'human-in-loop',
      questionType: 'product',
      difficulty: 'medium',
      tags: ['human-in-the-loop', 'operations'],
      buildQuestion: () => 'When does a human-in-the-loop design improve an AI workflow in finance, and when does it just add friction?',
      buildAnswer: () =>
        `It improves the workflow when the human is reviewing genuinely high-risk or ambiguous outputs and can add judgment the model does not have. It adds friction when the human review is purely ceremonial and does not change the decision. The goal is to place humans where the cost of model error is high and where the reviewer has enough context to improve the outcome. Good workflow design respects both risk and time.`,
    },
    {
      key: 'build-vs-buy',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['platform', 'build-vs-buy'],
      buildQuestion: () => 'How would you think about build versus buy for an AI workflow inside a trading organization?',
      buildAnswer: () =>
        `I would ask where the differentiated edge actually sits. If the value comes from proprietary data, unique workflow integration, or a very specific internal need, building more in-house can make sense. If the need is generic and the market solution is already robust, buying may be better so the team can focus on its real edge. The wrong answer is to build everything because it feels ambitious or to buy everything because it feels easier.`,
    },
  ],
  quant_trading: [
    {
      key: 'alpha-decay',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['alpha', 'signal-decay'],
      buildQuestion: () => 'What causes alpha decay in a quant trading strategy, and how would you know whether the edge is gone or just in a drawdown?',
      buildAnswer: () =>
        `Alpha decays when the market adapts, when the signal is crowded, or when the original structural reason for the edge disappears. To separate true decay from a temporary drawdown, I would compare current behavior to the historical distribution of performance by regime, look at implementation quality, and test whether the underlying relationships still hold at the feature level. If execution is stable but the signal no longer behaves as expected out of sample, that is a stronger warning sign than a short run of bad pnl on its own.`,
    },
    {
      key: 'backtest-bias',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['backtesting', 'bias'],
      buildQuestion: () => 'How do you make sure a backtest is not lying to you?',
      buildAnswer: () =>
        `I would attack the backtest from several angles. I want to eliminate look-ahead bias, survivorship bias, unrealistic fills, and hidden data snooping. Then I would stress it across time periods, liquidity buckets, and cost assumptions to see if the result survives. A backtest becomes useful only when it is treated as evidence to challenge, not as proof to defend.`,
    },
    {
      key: 'cost-model',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['transaction-costs', 'slippage'],
      buildQuestion: () => 'How would you model transaction costs and slippage for a high-turnover strategy?',
      buildAnswer: () =>
        `I would start with spread, commissions, and fees, but I would not stop there because impact often dominates for high-turnover strategies. I would model costs as a function of turnover, liquidity, volatility, and participation rate, then test how sensitive the strategy is to more pessimistic assumptions. If a strategy only works under friendly cost assumptions, it is probably not robust enough for live capital. In quant trading, cost realism is part of the edge test, not a postscript.`,
    },
    {
      key: 'sharpe-hit-rate',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['sharpe', 'hit-rate'],
      buildQuestion: () => 'Would you rather have a high hit rate or a high Sharpe ratio, and why?',
      buildAnswer: () =>
        `I care far more about the quality and stability of the return distribution than about hit rate alone. A strategy can have a high hit rate and still be fragile if its losers are too large or its edge is too small after costs. Sharpe ratio is imperfect, but it at least forces me to think about return relative to volatility. The right answer is to understand the whole distribution, not to optimize a single stat that can be gamed.`,
    },
    {
      key: 'regime-detection',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['regimes', 'adaptation'],
      buildQuestion: () => 'How would you detect that a quant strategy is entering a new regime where its historical assumptions are less reliable?',
      buildAnswer: () =>
        `I would monitor changes in feature behavior, execution quality, correlation structure, and where pnl is actually coming from. A regime shift often shows up first as the model behaving differently at the component level before the aggregate pnl fully explains what changed. I would also compare current market conditions to the training period to see whether we are extrapolating too far beyond the environments the model has seen before. Good regime detection is more about early warning than perfect labeling.`,
    },
    {
      key: 'position-sizing-kelly',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['position-sizing', 'kelly'],
      buildQuestion: () => 'How do you think about Kelly sizing in practice for a real quant strategy?',
      buildAnswer: () =>
        `I think of Kelly as a theoretical upper bound, not as a live instruction. In practice, estimates of edge and variance are noisy, and full Kelly can be far too aggressive when the inputs are uncertain or correlated with the rest of the book. I would use it as a way to reason about expected growth, then size more conservatively based on estimation error, drawdown tolerance, and portfolio context. The discipline is more important than the formula.`,
    },
    {
      key: 'latency-tradeoff',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['latency', 'execution'],
      buildQuestion: () => 'When does reducing latency actually matter for a strategy, and when is it a distraction?',
      buildAnswer: () =>
        `Latency matters when the strategy's edge depends on being first or on avoiding adverse selection in a microstructure-driven setting. It matters much less if the alpha horizon is long enough that an extra few milliseconds does not change the economics. I would first ask what proportion of edge is being lost to latency today, and only then decide whether the engineering effort is worth it. Speed is valuable, but only if the strategy is built to monetize it.`,
    },
    {
      key: 'feature-stationarity',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['stationarity', 'features'],
      buildQuestion: () => 'How would you evaluate whether a feature is stable enough to use in a live quant trading model?',
      buildAnswer: () =>
        `I would examine whether the relationship holds across time, assets, and market regimes, not just on average. Then I would test whether the feature remains meaningful after sensible normalization and after accounting for costs and implementation realities. I also want an economic intuition for why the feature should exist, because purely statistical features are more likely to disappear when conditions change. Stability is about persistence under stress, not just significance in a single sample.`,
    },
  ],
  quant_research: [
    {
      key: 'data-snooping',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['research', 'data-snooping'],
      buildQuestion: () => 'What does data snooping look like in quant research, and how do you guard against it?',
      buildAnswer: () =>
        `Data snooping happens when you keep testing variations until something looks significant and then forget how many dead ends you explored. I guard against it with hypothesis discipline, holdout periods, and by tracking the full research tree rather than only the winning branch. I also prefer simple models when possible because complexity can hide multiple testing problems. A robust result should survive being treated skeptically, not just creatively.`,
    },
    {
      key: 'time-series-cv',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['cross-validation', 'time-series'],
      buildQuestion: () => 'How should time-series cross-validation differ from standard machine-learning validation?',
      buildAnswer: () =>
        `Time-series data requires respecting the arrow of time. That means using rolling or expanding windows and never allowing future information to leak into training. It also means thinking about how often the model would realistically be retrained in production. Standard random shuffling can make a weak financial model look much stronger than it is because it breaks the actual forecasting setup.`,
    },
    {
      key: 'factor-orthogonalization',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['factors', 'orthogonalization'],
      buildQuestion: () => 'When would you orthogonalize factors in quant research, and what can go wrong if you do it carelessly?',
      buildAnswer: () =>
        `I would orthogonalize when I need to isolate whether a signal adds information beyond known exposures such as value, size, momentum, or sector effects. The danger is that careless orthogonalization can remove economically meaningful information or create a cleaner statistical result that is less tradable. I want to understand both the math and the economic story. A factor that only looks interesting after aggressive transformation may not be as useful as it first appears.`,
    },
    {
      key: 'outliers',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['outliers', 'data-cleaning'],
      buildQuestion: () => 'How would you handle outliers in a research dataset without accidentally throwing away signal?',
      buildAnswer: () =>
        `I would start by understanding whether the outlier is a data error, a structural break, or a real but rare event. Data errors should be fixed or removed; real tail events may need robust methods rather than deletion because they can matter a lot in finance. I would compare winsorization, robust scaling, and model choices that are less sensitive to extremes. The key is to avoid cleaning the dataset so aggressively that you erase the very behavior the strategy needs to understand.`,
    },
    {
      key: 'feature-importance',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['features', 'interpretability'],
      buildQuestion: () => 'How much do you care about feature importance or interpretability in a quant research model?',
      buildAnswer: () =>
        `I care enough to understand why the model is working and when it might stop. Full interpretability is not always required, but total opacity is dangerous in finance because it makes debugging and production monitoring much harder. I want enough visibility to know which inputs matter, whether that importance is stable, and what kind of market environment the model relies on. Interpretability is not a luxury if it improves control over live risk.`,
    },
    {
      key: 'signal-combination',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['signals', 'ensemble'],
      buildQuestion: () => 'How would you combine multiple weak signals into something that is actually tradable?',
      buildAnswer: () =>
        `I would first ask whether the signals are genuinely distinct or just restatements of the same effect. Then I would combine them in a way that respects correlation, turnover, and implementation cost rather than just stacking raw scores. Even weak signals can be valuable if they diversify each other and improve the stability of the total return stream. The target is not maximum in-sample fit; it is a cleaner live signal after costs and portfolio constraints.`,
    },
    {
      key: 'research-memo',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['communication', 'research-process'],
      buildQuestion: () => 'What would a strong quant research memo look like before you handed a signal to a PM or trader?',
      buildAnswer: () =>
        `A strong memo should make the reader smarter quickly. It needs the hypothesis, dataset, methodology, results, limitations, implementation considerations, and a plain-language explanation of why the signal should exist. I would also include where the result breaks and what monitoring I would require in production. If the memo cannot explain both the upside and the fragility of the idea, it is not ready for capital.`,
    },
    {
      key: 'non-stationarity',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['non-stationarity', 'regime-change'],
      buildQuestion: () => 'How do you research in a world where financial relationships are often non-stationary?',
      buildAnswer: () =>
        `I assume instability is normal rather than exceptional. That means preferring simpler effects with economic intuition, testing across many regimes, and treating recent behavior as potentially more relevant than distant history when justified. I also want models and monitoring that degrade gracefully when the world changes. The goal is not to find a signal that works forever; it is to find one that earns its keep and tells you early when the world has shifted.`,
    },
  ],
  options_desk: [
    {
      key: 'greeks',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['greeks', 'options'],
      buildQuestion: () => 'How do delta, gamma, and vega interact when you are managing an options book?',
      buildAnswer: () =>
        `Delta tells me my first-order exposure to the underlying, gamma tells me how fast that delta changes, and vega tells me how sensitive the book is to changes in implied volatility. In practice, the interaction matters because a book that looks manageable on delta can still become difficult quickly if gamma is large and the underlying starts moving. I want to know where the book is fragile before the market forces me to learn it in real time.`,
    },
    {
      key: 'smile-skew',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['volatility-surface', 'skew'],
      buildQuestion: () => 'Why do volatility smile and skew exist, and why do they matter to an options desk?',
      buildAnswer: () =>
        `They exist because real return distributions are not lognormal and because supply and demand for protection are not symmetric across strikes and maturities. For the desk, smile and skew matter because they change how you quote, hedge, and think about relative value. If you ignore them, you can look fairly priced on a simple model while actually giving away value in the part of the surface the client cares about most.`,
    },
    {
      key: 'short-gamma',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['gamma', 'hedging'],
      buildQuestion: () => 'What makes being short gamma painful in a fast market, and how would you manage it?',
      buildAnswer: () =>
        `Short gamma is painful because adverse moves force you to trade in the wrong direction to stay hedged. If the market is moving fast, the hedge becomes more expensive and slippage rises at the worst possible time. Managing it means understanding where the convexity sits ahead of time, limiting concentration, and being realistic about the liquidity available when everyone else is trying to hedge too. A short-gamma book is manageable only when you respect how path-dependent the pain can become.`,
    },
    {
      key: 'event-vol',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['event-vol', 'earnings'],
      buildQuestion: () => 'How would you think about pricing event volatility around something like earnings or a central bank meeting?',
      buildAnswer: () =>
        `I would separate the normal realized volatility from the discrete event premium and ask what distribution of outcomes the market is implying. Then I would compare that implied distribution to historical event behavior, current positioning, and what I believe the market is under- or overestimating. Event vol is not just a forecast; it is also a market price for uncertainty. The real question is whether that price is rich or cheap after you consider hedging and execution costs.`,
    },
    {
      key: 'surface-scenario',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['surface', 'scenario-analysis'],
      buildQuestion: () => 'If skew steepens sharply while the underlying sells off, what parts of an options book would you inspect first?',
      buildAnswer: () =>
        `I would look first at downside vega, downside gamma, and any concentrated client or inventory positions linked to the stressed area of the surface. Then I would ask whether the move changes my hedge assumptions or whether it mainly changes mark-to-market valuation. In practice, surface moves and spot moves reinforce each other at exactly the moment liquidity gets worse. The point is to know where the book is convex and where the desk is simply long or short a repricing of fear.`,
    },
  ],
  bonds: [
    {
      key: 'duration-convexity',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['duration', 'convexity'],
      buildQuestion: () => 'Explain duration and convexity in a practical trading or investing context rather than just in textbook terms.',
      buildAnswer: () =>
        `Duration tells me the first-order sensitivity of the bond price to rates, while convexity tells me how that sensitivity changes as yields move. Practically, duration helps frame the immediate risk, but convexity matters when the move is large or the instrument is especially curved in its response. Good fixed income thinking uses both because relying on duration alone can understate or overstate the pain once the market starts moving materially.`,
    },
    {
      key: 'spread-vs-rates',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['spreads', 'rates'],
      buildQuestion: () => 'How do you separate a move driven by rates from a move driven by spreads in fixed income?',
      buildAnswer: () =>
        `I would decompose the bond into its rate sensitivity and spread sensitivity, often by looking at duration to the risk-free curve and spread duration separately. Then I would compare the security to the relevant Treasury move and to peers. This matters because the hedging response is different if the problem is a pure rate repricing versus a deterioration in credit or liquidity. In bonds, getting the decomposition right is often the difference between managing risk and just describing what happened.`,
    },
    {
      key: 'curve-trade',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['yield-curve', 'relative-value'],
      buildQuestion: () => 'When would a steepener or flattener make sense, and what are the biggest ways that thesis can fail?',
      buildAnswer: () =>
        `A steepener or flattener works when the market is likely mispricing how different parts of the curve will react to policy, growth, inflation, or supply. I would want a clear reason why one segment of the curve should move differently from another and a clean catalyst for that relative move. The thesis can fail if the policy path changes unexpectedly, if the market is already positioned the same way, or if funding and liquidity dynamics distort the relative move. Curve trades need both macro logic and balance-sheet realism.`,
    },
    {
      key: 'repo-funding',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['repo', 'funding'],
      buildQuestion: () => 'Why does repo or funding matter so much to bond desks and fixed income relative value strategies?',
      buildAnswer: () =>
        `Because many fixed income trades only work once financing is available at a sensible cost. A bond can look attractive on paper, but if repo is expensive or unstable, the economics deteriorate quickly. Funding also changes how scalable a trade is and how painful it becomes during market stress. In fixed income, financing is often part of the trade thesis rather than an operational footnote.`,
    },
    {
      key: 'credit-underwriting',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['credit', 'underwriting'],
      buildQuestion: () => 'If you had five minutes to underwrite a bond, what would you focus on first?',
      buildAnswer: () =>
        `I would start with the issuer's ability to pay and refinance. That means quick work on leverage, interest coverage, free cash flow, and where the bond sits in the capital structure. Then I would compare that to the spread being offered and the liquidity of the instrument. In a short meeting, I do not need perfect detail; I need enough to know whether the spread is compensating me for the real credit and funding risks.`,
    },
  ],
  fx: [
    {
      key: 'rate-differentials',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['rates', 'carry'],
      buildQuestion: () => 'How do rate differentials matter in FX, and why are they not the whole story?',
      buildAnswer: () =>
        `Rate differentials matter because they drive carry and often shape medium-term currency pressure. But they are not the whole story because growth, inflation credibility, positioning, and external balances can dominate in the short run. I would use rates as a starting point, then ask whether the broader macro regime supports or offsets that signal. A good FX view usually comes from the combination, not from a single variable.`,
    },
    {
      key: 'balance-of-payments',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['external-balance', 'macro'],
      buildQuestion: () => 'Why does the balance of payments matter in FX?',
      buildAnswer: () =>
        `Because currencies are ultimately prices for one country's claims on another. A country that depends heavily on foreign funding can see its currency become vulnerable when sentiment or capital flows shift. The balance of payments helps explain whether a currency is being supported by durable inflows or relying on more fragile financing. It does not tell you timing perfectly, but it gives a strong sense of structural pressure.`,
    },
    {
      key: 'carry-risk',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['carry', 'risk-off'],
      buildQuestion: () => 'Why do carry trades work for stretches and then unwind so violently?',
      buildAnswer: () =>
        `Carry works when rate differentials are attractive, volatility is contained, and funding conditions are stable. It unwinds violently when that environment reverses because many participants hold similar positions and the short-vol nature of the trade becomes visible all at once. The lesson is that good carry is not just about yield pickup; it is about whether the market is being paid enough for tail risk and crowding.`,
    },
    {
      key: 'em-fx-expression',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['em-fx', 'expression'],
      buildQuestion: () => 'How would you express an EM FX view differently from a G10 FX view?',
      buildAnswer: () =>
        `I would care more about liquidity, external financing vulnerability, and event risk in EM, because those can overwhelm the clean macro view faster than in G10. I would also think harder about whether the best expression is outright spot, forwards, or an options structure. In EM, the right thesis can still produce poor pnl if the instrument choice ignores the path risk and the liquidity profile of the market.`,
    },
    {
      key: 'hedged-unhedged',
      questionType: 'product',
      difficulty: 'medium',
      tags: ['hedging', 'portfolio'],
      buildQuestion: () => 'When should an investor hedge currency exposure and when might leaving it unhedged make sense?',
      buildAnswer: () =>
        `It depends on the investor's objective. If the currency risk is not part of the intended return stream, hedging often makes sense to isolate the core asset view. If the currency exposure is a deliberate macro view or if hedging costs are unattractive, leaving it unhedged may be better. The important point is to make the choice consciously rather than inheriting currency exposure by accident.`,
    },
  ],
  m_and_a: [
    {
      key: 'synergies',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['synergies', 'm-and-a'],
      buildQuestion: () => 'How do you judge whether synergy assumptions in an M&A deal are credible rather than just convenient?',
      buildAnswer: () =>
        `I would ask whether the synergies are tied to real overlap, a clear implementation path, and a timeline that management can actually execute. Revenue synergies deserve more skepticism than cost synergies because they are harder to isolate and easier to overstate. I would also compare the synergy case to the premium being paid and ask whether the deal still works if the synergy realization is slower or smaller than advertised.`,
    },
    {
      key: 'accretion-dilution',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['merger-model', 'eps'],
      buildQuestion: () => 'What does accretion or dilution tell you in a merger model, and what does it not tell you?',
      buildAnswer: () =>
        `Accretion or dilution tells me whether EPS goes up or down after the deal under a specific financing and synergy setup. It is useful, but it is not the full answer because EPS optics can improve even if the strategic logic is weak or the balance sheet becomes more fragile. I treat it as one lens on the deal, not as a substitute for valuation, integration risk, or return on invested capital.`,
    },
    {
      key: 'purchase-premium',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['premium', 'valuation'],
      buildQuestion: () => 'How would you think about an acquisition premium in a competitive process?',
      buildAnswer: () =>
        `A premium only makes sense if the buyer can justify it through synergies, scarcity, strategic value, or a better ability to execute than other bidders. I would ask what the asset is worth to this specific buyer, not just what the seller wants or what a comp deal paid in a hotter market. In competitive processes, discipline matters because the easiest way to destroy value is to confuse winning the auction with winning the economics.`,
    },
    {
      key: 'integration-risk',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['integration', 'execution'],
      buildQuestion: () => 'What integration risk gets underestimated most often in M&A?',
      buildAnswer: () =>
        `People often underestimate execution complexity at the level of systems, people, and incentives. Cost synergy stories can look straightforward in a spreadsheet while real integration creates distractions that damage the base business. I would want to understand decision rights, leadership accountability, and where customer or employee disruption is most likely. If you ignore integration, you can be directionally right on strategy and still fail on value creation.`,
    },
  ],
  restructuring: [
    {
      key: 'liquidity-runway',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['liquidity', 'runway'],
      buildQuestion: () => 'How would you estimate liquidity runway quickly in a restructuring situation?',
      buildAnswer: () =>
        `I would focus on minimum cash, weekly or monthly burn, covenant or borrowing-base constraints, and the size and timing of near-term obligations. The point is to understand when the company actually runs out of options, not just when it runs out of cash. In distressed situations, the calendar matters almost as much as the valuation. A company with a good long-term story can still have no negotiating leverage if runway is short.`,
    },
    {
      key: 'waterfall',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['capital-structure', 'recovery'],
      buildQuestion: () => 'What does the restructuring waterfall tell you, and how would you use it in an interview?',
      buildAnswer: () =>
        `The waterfall tells me who is likely in or out of the money under different enterprise-value assumptions. In an interview, I would use it to show that I understand priority, collateral, and where negotiating leverage sits. The precise numbers may move, but the logic of the waterfall helps explain why one creditor class might push for speed while another pushes for a longer process. It turns a capital structure into a map of incentives.`,
    },
    {
      key: 'covenants',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['covenants', 'distress'],
      buildQuestion: () => 'Why do covenants matter so much in distressed situations?',
      buildAnswer: () =>
        `Covenants can shift leverage before the company actually misses a payment. They determine when creditors can force conversations, extract concessions, or block value leakage. I would pay attention to which covenants are likely to trip, what cure rights exist, and how that changes the negotiating posture of each stakeholder. In distress, documents matter because control often changes before insolvency becomes official.`,
    },
    {
      key: 'new-money',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['debtor-financing', 'capital-structure'],
      buildQuestion: () => 'When can new money be value preserving in a restructuring, and when does it just delay the inevitable?',
      buildAnswer: () =>
        `New money is value preserving when it buys time for a fundamentally viable business to stabilize and protects value that would be destroyed in a rushed process. It simply delays the inevitable when the operating problem is too deep, the runway purchased is too short, or the capital structure remains unsustainable after the financing. I would ask whether the money changes the path to viability or only postpones recognition of the problem.`,
    },
  ],
  hedge_fund: [
    {
      key: 'short-idea',
      questionType: 'case',
      difficulty: 'hard',
      tags: ['shorts', 'risk'],
      buildQuestion: () => 'What makes a strong short idea, and why is a weak company not automatically a good short?',
      buildAnswer: () =>
        `A strong short needs more than a weak business. It needs fragile expectations, a believable catalyst, and a path where downside fundamentals actually matter to the price. Weak companies can stay expensive for a long time if the narrative, flows, or capital structure keep the stock supported. On the short side, timing and crowding matter almost as much as being directionally right on quality.`,
    },
    {
      key: 'variant-source',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['variant-view', 'process'],
      buildQuestion: () => 'Where do you think genuine variant perception usually comes from?',
      buildAnswer: () =>
        `Usually from asking a sharper question than the market is asking, not from reading more pages of the same material. It can come from a better understanding of incentives, a misunderstood accounting issue, a catalyst the market is discounting poorly, or a cleaner view of industry structure. The common thread is that the insight changes the economic conclusion, not just the level of detail in the note.`,
    },
    {
      key: 'catalyst-vs-quality',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['catalysts', 'quality'],
      buildQuestion: () => 'Would you rather own a great business without a catalyst or a decent business with a clear catalyst?',
      buildAnswer: () =>
        `It depends on mandate and horizon, but in a hedge fund setting I care a lot about what closes the gap between intrinsic value and price. A great business can still be a poor hedge fund position if the valuation is full and nothing changes perception for a long time. A decent business with a clear catalyst can be attractive if the payoff is asymmetric and the downside is controlled. The best answer balances quality, valuation, and time-to-realization.`,
    },
    {
      key: 'sizing-under-uncertainty',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['sizing', 'uncertainty'],
      buildQuestion: () => 'How would you size a hedge fund idea when the upside is attractive but the catalyst timing is uncertain?',
      buildAnswer: () =>
        `I would size it smaller than a high-conviction catalyst situation and let the position earn a larger weight as the path clarifies. Timing uncertainty increases opportunity cost and path risk even if the upside is real. I also care about how the position behaves relative to the rest of the book while I wait. A smaller starter position with room to add is often better than pretending uncertainty does not deserve a discount.`,
    },
  ],
  credit: [
    {
      key: 'covenant-quality',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['covenants', 'credit'],
      buildQuestion: () => 'What does covenant quality tell you that leverage alone does not?',
      buildAnswer: () =>
        `Leverage tells me how much room the issuer appears to have today. Covenant quality tells me how much that room can change before lenders have a say. Weak covenants can allow value leakage, asset moves, or additional debt incurrence that make the downside materially worse without showing up in leverage at issuance. In credit, documentation can be just as important as the starting ratio.`,
    },
    {
      key: 'recovery-thinking',
      questionType: 'technical',
      difficulty: 'hard',
      tags: ['recovery', 'downside'],
      buildQuestion: () => 'How do you think about recovery value when underwriting a credit?',
      buildAnswer: () =>
        `I think about recovery as a downside discipline, not as a comforting plug. I want to know what assets or cash flows would support value in a stressed scenario, what sits ahead of me in the capital structure, and how much friction or leakage can happen in a workout. Recovery assumptions should be tied to realistic cases, not to management's base plan. The real use of recovery work is deciding whether the downside is survivable relative to the spread being offered.`,
    },
    {
      key: 'refinancing-wall',
      questionType: 'market',
      difficulty: 'medium',
      tags: ['refinancing', 'maturity-wall'],
      buildQuestion: () => 'Why can a refinancing wall create problems well before maturity dates actually arrive?',
      buildAnswer: () =>
        `Because markets price the risk of being unable to refinance before the legal deadline becomes immediate. If investors think the company may struggle to roll debt, spreads widen, optionality disappears, and management often has to act from a weaker position. A maturity wall is really about access to capital under plausible market conditions, not just about what the schedule says on paper.`,
    },
    {
      key: 'fixed-charge',
      questionType: 'technical',
      difficulty: 'medium',
      tags: ['coverage', 'cash-flow'],
      buildQuestion: () => 'Why do fixed-charge coverage and free cash flow matter more than EBITDA alone in credit?',
      buildAnswer: () =>
        `Because creditors are repaid with cash, not with a headline profitability metric. EBITDA can be useful, but it can also flatter businesses with heavy capex, working-capital strain, or one-time add-backs. Fixed-charge coverage and free cash flow force you to ask whether the company can actually service debt while still funding the business. Credit work improves when you move quickly from adjusted EBITDA to real cash obligations.`,
    },
  ],
  case_interview: [
    {
      key: 'profitability-case',
      questionType: 'case',
      difficulty: 'medium',
      tags: ['profitability', 'cases'],
      buildQuestion: () => 'How would you approach a profitability case without defaulting to a memorized template?',
      buildAnswer: () =>
        `I would begin by clarifying whether the issue is volume, price, variable cost, fixed cost, or some combination, then tailor the structure to the economics of the business in front of me. The point is to prioritize the few levers most likely to explain the change rather than mechanically reciting revenue minus cost buckets. A good profitability case shows judgment in where you look first, not just familiarity with the words margin and volume.`,
    },
    {
      key: 'market-entry-case',
      questionType: 'case',
      difficulty: 'medium',
      tags: ['market-entry', 'strategy'],
      buildQuestion: () => 'What are the first questions you ask in a market-entry case?',
      buildAnswer: () =>
        `I want to know whether the market is attractive, whether the client has a right to win, and whether the economics justify entry. That means sizing the opportunity, understanding the competitive landscape, and testing likely profitability and execution requirements. I would avoid discussing entry mode too early if I do not yet know whether the market itself is worth entering. Sequence matters in cases because a good framework should reduce the problem, not decorate it.`,
    },
    {
      key: 'ops-capacity-case',
      questionType: 'case',
      difficulty: 'medium',
      tags: ['operations', 'capacity'],
      buildQuestion: () => 'How would you structure an operations or capacity case?',
      buildAnswer: () =>
        `I would map the process, identify the bottleneck, and then ask whether the real objective is throughput, cost, service level, or all three. Then I would quantify the trade-offs between adding capacity, improving utilization, changing scheduling, or redesigning the process. Operations cases reward clean thinking about where value is actually lost. They are not just math exercises; they are about linking process constraints to business outcomes.`,
    },
    {
      key: 'brainstorming-case',
      questionType: 'fit',
      difficulty: 'medium',
      tags: ['creativity', 'structure'],
      buildQuestion: () => 'How do you stay structured during an open-ended brainstorming part of a case?',
      buildAnswer: () =>
        `I still organize the brainstorm into a few sensible buckets so the ideas build toward a recommendation instead of becoming random. Then I prioritize which ideas are likely to have the biggest impact and why. The interviewer is usually testing whether I can be creative without becoming chaotic. Structure does not kill brainstorming; it makes it easier to separate useful ideas from noise.`,
    },
  ],
};

function getBlueprintsForMeta(meta: TrackMeta) {
  return [
    ...COMMON_BLUEPRINTS,
    ...(ROLE_BLUEPRINTS[meta.role] || []),
    ...(meta.subcategory ? TRACK_BLUEPRINTS[meta.subcategory] || [] : []),
  ];
}

function createSeedQuestion(meta: TrackMeta, blueprint: QuestionBlueprint, index: number): InterviewSeedQuestion {
  const firm = meta.firms[index % meta.firms.length];
  const source = getSourceForMeta(meta);
  const seedKey = slugifyValue([
    meta.role,
    meta.subcategory ?? 'general',
    blueprint.key,
    firm,
  ].join('-'));

  return {
    seedKey,
    question: blueprint.buildQuestion(meta, firm),
    answer: blueprint.buildAnswer(meta, firm),
    notes: null,
    role: meta.role,
    subcategory: meta.subcategory,
    questionType: blueprint.questionType,
    difficulty: blueprint.difficulty,
    company: firm,
    firmType: meta.firmType,
    topicTags: Array.from(new Set([...meta.tags, ...blueprint.tags])),
    sourceType: source.sourceType,
    sourceTitle: `${SOURCE_TITLE} · ${source.sourceTitle}`,
    sourceUrl: source.sourceUrl,
    attachmentUrl: null,
    submitterName: 'SGC Editorial',
    submittedBy: null,
    approved: true,
  };
}

export function buildInterviewSeedQuestions() {
  return TRACKS.flatMap((meta) =>
    getBlueprintsForMeta(meta).map((blueprint, index) => createSeedQuestion(meta, blueprint, index))
  );
}
