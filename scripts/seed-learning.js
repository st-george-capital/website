// Seed script for SGC Learning Hub
// Run: node scripts/seed-learning.js
// This populates courses, lessons, and curated resources from scratch.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// CURATED RESOURCES
// ---------------------------------------------------------------------------

const curatedItems = [
  // ── Books ──────────────────────────────────────────────────────────────
  {
    kind: 'book',
    title: 'The Intelligent Investor',
    author: 'Benjamin Graham',
    url: 'https://www.amazon.com/dp/0060555661',
    description: 'The definitive book on value investing. Graham\'s "Mr. Market" and margin of safety framework is the foundation of rational long-term investing. Required reading.',
    order: 1,
    published: true,
  },
  {
    kind: 'book',
    title: 'Principles: Life and Work',
    author: 'Ray Dalio',
    url: 'https://www.amazon.com/dp/1501124021',
    description: 'Ray Dalio\'s foundational principles for decision-making, markets, and building organizations. Synthesizes lessons from 40+ years running Bridgewater, the world\'s largest hedge fund.',
    order: 2,
    published: true,
  },
  {
    kind: 'book',
    title: 'Principles for Dealing with the Changing World Order',
    author: 'Ray Dalio',
    url: 'https://www.amazon.com/dp/1982160276',
    description: 'Dalio\'s framework for understanding the rise and fall of empires, reserve currencies, and global power cycles — and what they signal for markets today.',
    order: 3,
    published: true,
  },
  {
    kind: 'book',
    title: 'Big Debt Crises (Free PDF)',
    author: 'Ray Dalio',
    url: 'https://www.principles.com/big-debt-crises/',
    description: 'Dalio\'s comprehensive study of debt cycles and deleveragings across history. Available free as a PDF. Essential for understanding how credit crises unfold and resolve.',
    order: 4,
    published: true,
  },
  {
    kind: 'book',
    title: 'Market Wizards',
    author: 'Jack D. Schwager',
    url: 'https://www.amazon.com/dp/1118273052',
    description: 'Interviews with the world\'s top traders — Paul Tudor Jones, Bruce Kovner, Ed Seykota. The clearest window into real risk management and trading psychology from practitioners.',
    order: 5,
    published: true,
  },
  {
    kind: 'book',
    title: 'One Up on Wall Street',
    author: 'Peter Lynch',
    url: 'https://www.amazon.com/dp/0743200403',
    description: 'Lynch\'s philosophy from managing the Fidelity Magellan Fund: everyday investors can spot great companies before Wall Street does. Practical, grounded, and timeless.',
    order: 6,
    published: true,
  },
  {
    kind: 'book',
    title: 'Reminiscences of a Stock Operator',
    author: 'Edwin Lefèvre',
    url: 'https://www.amazon.com/dp/0471770884',
    description: 'Fictionalized biography of Jesse Livermore, the greatest speculator in history. Written in 1923 and still accurate about how markets, human nature, and speculation work.',
    order: 7,
    published: true,
  },
  {
    kind: 'book',
    title: 'Options as a Strategic Investment',
    author: 'Lawrence G. McMillan',
    url: 'https://www.amazon.com/dp/0735204659',
    description: 'The definitive reference on listed options — every strategy from basic calls/puts to complex multi-leg positions, with real pricing examples and risk analysis.',
    order: 8,
    published: true,
  },
  {
    kind: 'book',
    title: 'When Genius Failed',
    author: 'Roger Lowenstein',
    url: 'https://www.amazon.com/dp/0375758259',
    description: 'The rise and fall of Long-Term Capital Management. A masterclass in leverage risk, correlation collapse, and what happens when models assume away tail risk.',
    order: 9,
    published: true,
  },
  {
    kind: 'book',
    title: 'Flash Boys',
    author: 'Michael Lewis',
    url: 'https://www.amazon.com/dp/0393351599',
    description: 'How high-frequency trading and modern market structure actually work, told through the people who built IEX to fight back. Changes how you think about price discovery.',
    order: 10,
    published: true,
  },

  // ── Newsletters (all free to subscribe) ────────────────────────────────
  {
    kind: 'newsletter',
    title: 'Bridgewater — Connecting the Dots',
    author: 'Bridgewater Associates',
    url: 'https://www.bridgewater.com/stayinformed',
    description: 'Free newsletter from Bridgewater\'s co-CIOs covering global macro, portfolio construction, and emerging market regimes. Institutional-quality analysis, no paywall.',
    order: 1,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'CNBC Newsletters',
    author: 'CNBC',
    url: 'https://www.cnbc.com/sign-up-for-cnbc-newsletters',
    description: 'Free daily market briefings, evening playbooks, and sector newsletters from CNBC. Good for staying current on macro events, earnings, and market-moving news.',
    order: 2,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'Nikkei Asia — Free Newsletters',
    author: 'Nikkei Asia',
    url: 'https://asia.nikkei.com/member/register/newsletter',
    description: 'Free daily and weekly newsletters covering Asian markets, China, Japan, and emerging Asia. Nikkei is the most credible source for Asian business and financial news.',
    order: 3,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'a16z Newsletter',
    author: 'Andreessen Horowitz',
    url: 'https://www.a16z.news/subscribe',
    description: 'Free newsletter from a16z covering technology, AI, crypto, and the business of software. Essential for understanding where venture capital sees the next decade going.',
    order: 4,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'Lyn Alden — Investment Strategy',
    author: 'Lyn Alden',
    url: 'https://www.lynalden.com/investing-newsletter/',
    description: 'Free macro research covering equities, bonds, commodities, and global capital flows. Data-driven, independent, read by 100k+ investors. Published every 6 weeks.',
    order: 5,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'Verdad Research',
    author: 'Verdad Capital',
    url: 'https://verdad.com/research/',
    description: 'Free quantitative research on global small-cap value investing. Institutional-quality, data-driven papers published weekly. No paywall, no pitch — just research.',
    order: 6,
    published: true,
  },
  {
    kind: 'newsletter',
    title: 'The Diff',
    author: 'Byrne Hobart',
    url: 'https://www.thediff.co/',
    description: 'Long-form analysis connecting macro trends, capital allocation, and technology inflection points. Free tier available. Dense and rigorous — not a typical market newsletter.',
    order: 7,
    published: true,
  },

  // ── YouTube ────────────────────────────────────────────────────────────
  {
    kind: 'youtube',
    title: 'BlackRock — BlackRock Bottom Line',
    author: 'BlackRock',
    url: 'https://www.youtube.com/@blackrock',
    description: 'BlackRock\'s official channel featuring the "Bottom Line" series — global CIO Wei Li and senior strategists break down markets, outlooks, and portfolio strategy every week. One of the most data-rich free macro resources available.',
    order: 1,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Blackstone — Insights & Market Views',
    author: 'Blackstone',
    url: 'https://www.youtube.com/channel/UCWP3K_Lfy7yc5J2Wa50RWHA',
    description: 'The world\'s largest alternative asset manager ($1.2T AUM). Jon Gray (President), Steve Schwarzman, and Blackstone\'s CIOs discuss private equity, real estate cycles, private credit, and macro trends. Institutional-grade thinking made public.',
    order: 2,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Goldman Sachs',
    author: 'Goldman Sachs',
    url: 'https://www.youtube.com/@GoldmanSachs',
    description: 'Goldman Sachs\'s official channel — market outlooks, CEO interviews, economic research, and explainers from top strategists including Jan Hatzius (Chief Economist) and David Solomon. Complements their podcast series.',
    order: 3,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'All-In Podcast',
    author: 'Chamath, Jason, Sacks & Friedberg',
    url: 'https://www.youtube.com/@AllIn',
    description: 'Weekly roundtable with four billionaire tech investors covering markets, geopolitics, technology, AI, and venture capital. Polarizing but intellectually stimulating — great for understanding where Silicon Valley money sees the world going.',
    order: 4,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'CNBC',
    author: 'CNBC',
    url: 'https://www.youtube.com/@CNBC',
    description: 'Real-time market coverage, Fed press conferences, earnings calls, and expert panels. The standard financial news network — essential for staying current during live market events.',
    order: 5,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Ray Dalio — Principles & Economics',
    author: 'Ray Dalio (Principles by Ray Dalio)',
    url: 'https://www.youtube.com/user/Bridgewater',
    description: 'Dalio\'s free educational content including "How the Economic Machine Works" (30 min, 20M+ views) — the clearest visual explanation of debt cycles, credit, and macro dynamics ever produced. Also covers Principles for Success and the Changing World Order.',
    order: 6,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Patrick Boyle — Finance & Economics',
    author: 'Patrick Boyle',
    url: 'https://www.youtube.com/@PBoyle',
    description: 'Former hedge fund manager and Columbia/LSE lecturer. The most rigorous free finance content on YouTube — deep dives into derivatives, HFT, quant strategies, market crises, and financial history. Graduate-level clarity.',
    order: 7,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Aswath Damodaran — Valuation',
    author: 'Aswath Damodaran (NYU Stern)',
    url: 'https://www.youtube.com/@AswathDamodaranonValuation',
    description: 'Full university-quality valuation courses from NYU Stern\'s Professor Damodaran — the world\'s foremost authority on corporate valuation. DCF, relative valuation, real options, and dark side of valuation. Completely free.',
    order: 8,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'InTheMoney — Options Education',
    author: 'Adam (InTheMoney)',
    url: 'https://www.youtube.com/@InTheMoneyAdam',
    description: 'The best free options education on YouTube. Animated, step-by-step explanations of calls, puts, the Greeks, credit spreads, iron condors, and real trade examples. Start here before anything else for options.',
    order: 9,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'tastylive — Options Trading',
    author: 'tastylive',
    url: 'https://www.youtube.com/@tastyliveshow',
    description: 'Built by professional options traders. Deep library on premium selling, probability-based trading, delta/theta mechanics, and live trade breakdowns. Best for understanding the mechanics of actively managing options positions.',
    order: 10,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'Nicholas Crown',
    author: 'Nicholas Crown',
    url: 'https://www.youtube.com/channel/UCJSICzUeXSxBvc0UAf2Up8g',
    description: 'Former Goldman Sachs investment banker breaking down personal finance, wealth-building decisions, and investing fundamentals in short-form content. Great for foundational concepts and accessible explanations.',
    order: 11,
    published: true,
  },

  // ── Podcasts ───────────────────────────────────────────────────────────
  {
    kind: 'podcast',
    title: 'Goldman Sachs — The Markets (Weekly)',
    author: 'Goldman Sachs',
    url: 'https://podcasts.apple.com/us/podcast/goldman-sachs-the-markets/id1683802600',
    description: 'Goldman Sachs leaders, investors, and analysts break down key issues moving markets every week. Audio format: available on Apple Podcasts, Spotify, and Audible (free). Covers macro, equities, credit, commodities, and geopolitics from one of the most influential research desks on Wall Street.',
    order: 1,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'Morgan Stanley — Thoughts on the Market',
    author: 'Morgan Stanley',
    url: 'https://www.morganstanley.com/insights/podcasts/thoughts-on-the-market',
    description: 'Daily 5–10 minute takes from Morgan Stanley\'s top strategists — Mike Wilson (US equities), Seth Carpenter (economics), and others. Exceptional for daily market context without the noise. Free on all podcast platforms.',
    order: 2,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'Acquired — Tech & Business Deep Dives',
    author: 'Ben Gilbert & David Rosenthal',
    url: 'https://www.acquired.fm/',
    description: 'Multi-hour deep dives into the history and strategy of the world\'s greatest companies (NVIDIA, Apple, Amazon, Berkshire Hathaway, TSMC). Not a daily show — each episode is essentially a case study. Essential for understanding competitive moats and business model evolution.',
    order: 3,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'We Study Billionaires — The Investor\'s Podcast',
    author: 'The Investor\'s Podcast Network',
    url: 'https://www.theinvestorspodcast.com/we-study-billionaires/',
    description: 'Breaks down the investment philosophies of legendary investors — Buffett, Munger, Lynch, Dalio, Ackman. Also covers macro, value investing, and business analysis. One of the longest-running and most respected independent investing podcasts.',
    order: 4,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'Odd Lots — Bloomberg',
    author: 'Joe Weisenthal & Tracy Alloway (Bloomberg)',
    url: 'https://www.bloomberg.com/podcasts/odd-lots',
    description: 'Bloomberg\'s top finance podcast — in-depth conversations with economists, portfolio managers, and market practitioners on topics most mainstream media doesn\'t touch. Covers plumbing of the financial system, unconventional macro, and emerging market dynamics.',
    order: 5,
    published: true,
  },

  // ── External Research & Courses ────────────────────────────────────────
  {
    kind: 'external_course',
    title: 'Bridgewater Research & Insights Library',
    author: 'Bridgewater Associates',
    url: 'https://www.bridgewater.com/research-and-insights',
    description: 'Bridgewater\'s full public research archive — macro regime analysis, inflation frameworks, global capital flow papers, and deep-dives on economic history. No registration required. The best free institutional macro research in the world.',
    order: 1,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Blackstone Market Views',
    author: 'Blackstone',
    url: 'https://www.blackstone.com/insights/market-views',
    description: 'Blackstone\'s public market commentary — covering private credit, real estate cycles, M&A activity, infrastructure, and private equity. Written by practitioners managing $1.2 trillion in assets. Free, no registration required.',
    order: 2,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Coursera — Financial Markets (Yale / Robert Shiller)',
    author: 'Robert Shiller, Yale University',
    url: 'https://www.coursera.org/learn/financial-markets-global',
    description: 'Nobel laureate Shiller\'s full Yale course on financial markets. Free to audit. Covers equity, debt, derivatives, behavioral finance, and insurance. 7 weeks, university-quality — the best free structured course for understanding markets holistically.',
    order: 3,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Investopedia Academy — Options for Beginners',
    author: 'Investopedia',
    url: 'https://academy.investopedia.com/products/options-for-beginners',
    description: '8+ hours of structured video covering options mechanics, Greeks, basic and advanced strategies, and risk management. Paid, but one of the most complete self-paced options intro courses available outside a brokerage.',
    order: 4,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Khan Academy — Core Finance',
    author: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance',
    description: 'Completely free foundational finance — interest, stocks, bonds, mutual funds, accounting, and taxes. The best zero-cost structured starting point for anyone new to financial concepts.',
    order: 5,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Mergers & Inquisitions — Career Guides',
    author: 'Brian DeChesare',
    url: 'https://mergersandinquisitions.com/',
    description: 'The gold standard for understanding IB/PE/HF/ER/S&T careers — recruiting timelines, interview formats, compensation by bank, day-in-the-life breakdowns, and region-specific advice (US, UK, HK, Singapore). Free, obsessively detailed, and written by a former banker. Read before networking.',
    order: 6,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Wall Street Oasis (WSO)',
    author: 'WSO Community',
    url: 'https://www.wallstreetoasis.com/forums',
    description: 'The largest high-finance community online. Active forums on IB, PE, HF, ER, and S&T where current analysts and associates post about recruiting, deals, comp, and culture. Search before you ask — most of your questions already have 200-reply threads. Invaluable for unfiltered industry reality.',
    order: 7,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Breaking Into Wall Street (BIWS)',
    author: 'Brian DeChesare',
    url: 'https://breakingintowallstreet.com/',
    description: 'The most comprehensive paid IB/PE modeling courses anywhere — full 3-statement, LBO, M&A, and DCF templates with video walkthroughs built from real deals. Not cheap, but the industry standard for self-study modeling prep. Pair with their free article archive before committing.',
    order: 8,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Peak Frameworks — Interview Prep',
    author: 'Matt Ting & Pratik Thakkar (ex-Goldman, ex-Evercore)',
    url: 'https://www.peakframeworks.com/',
    description: 'The best structured interview prep for IB and consulting from two ex-MBB/ex-bulge-bracket practitioners. Covers technicals, stock pitches, behavioral frameworks, and recruiting strategy. Clean, modern, and far more actionable than dense interview guides. Paid with a strong free blog.',
    order: 9,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Corporate Finance Institute (CFI) — Free Courses',
    author: 'Corporate Finance Institute',
    url: 'https://corporatefinanceinstitute.com/course-catalog/free-courses/',
    description: 'Free certification-style courses on Excel, accounting, financial modeling, and valuation. Multiple "Fundamentals" tracks are 100% free — including Reading Financial Statements, Accounting Fundamentals, and Excel Crash Course. Ideal for filling specific skill gaps before internships.',
    order: 10,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Aswath Damodaran — Free Valuation Spreadsheets',
    author: 'Aswath Damodaran (NYU Stern)',
    url: 'https://pages.stern.nyu.edu/~adamodar/',
    description: 'Damodaran\'s entire NYU Stern teaching archive — free DCF models, industry beta tables, equity risk premium data, country risk scores, and every lecture slide from his Valuation and Corporate Finance MBA courses. The single most valuable free resource for anyone doing ER or IB modeling work.',
    order: 11,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'Macrotrends — Financial Data',
    author: 'Macrotrends',
    url: 'https://www.macrotrends.net/',
    description: 'Free 10-year+ financials for every US public company — income statement, balance sheet, cash flow, and key ratios in a clean comparable format. Indispensable for stock pitches, industry comps, and quick sanity checks on company historicals without needing a Bloomberg or FactSet terminal.',
    order: 12,
    published: true,
  },
  {
    kind: 'external_course',
    title: 'SEC EDGAR — Filings Database',
    author: 'U.S. Securities and Exchange Commission',
    url: 'https://www.sec.gov/edgar/search-and-access',
    description: 'The official US filings database. Every 10-K, 10-Q, 8-K, S-1, and proxy statement ever filed. Primary source for any serious equity research — read management\'s own words in their Risk Factors and MD&A sections before trusting any analyst report.',
    order: 13,
    published: true,
  },

  // ── Career-Focused YouTube & Podcasts (added for high-finance applicants) ─
  {
    kind: 'youtube',
    title: 'Peak Frameworks (YouTube)',
    author: 'Matt Ting & Pratik Thakkar',
    url: 'https://www.youtube.com/@PeakFrameworks',
    description: 'Interview walkthroughs, technical breakdowns, and recruiting advice from ex-Goldman / ex-Evercore bankers. Watch their DCF walkthrough and "How to Answer Walk Me Through a DCF" before any IB or ER interview.',
    order: 12,
    published: true,
  },
  {
    kind: 'youtube',
    title: 'rareliquid — Ex-Goldman Analyst',
    author: 'Brandon Gurvich',
    url: 'https://www.youtube.com/@rareliquid',
    description: 'Ex-Goldman TMT analyst. Honest, grounded breakdowns of what IB is actually like, recruiting strategy, and exit opportunities. One of the more credible and less clickbait voices on finance YouTube.',
    order: 13,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'Macro Voices',
    author: 'Erik Townsend',
    url: 'https://www.macrovoices.com/',
    description: 'Weekly 90-minute deep-dive interviews with institutional macro traders, commodity specialists, and hedge fund PMs. Technical and unfiltered — one of the best free sources of working-practitioner macro content anywhere.',
    order: 6,
    published: true,
  },
  {
    kind: 'podcast',
    title: 'Capital Allocators',
    author: 'Ted Seides',
    url: 'https://capitalallocators.com/podcast/',
    description: 'Ted Seides (ex-Protege Partners) interviews CIOs of endowments, sovereign wealth funds, and allocators about portfolio construction and manager selection. The clearest window into how the buy-side actually allocates capital and evaluates managers.',
    order: 7,
    published: true,
  },
];

// ---------------------------------------------------------------------------
// COURSE 1: OPTIONS FOUNDATIONS
// ---------------------------------------------------------------------------

const optionsCourse = {
  title: 'Options Foundations',
  slug: 'options-foundations',
  summary: 'A ground-up introduction to options — how they work, how they\'re priced, and how to use them to generate income or hedge risk. No prior derivatives experience needed.',
  tags: 'options, derivatives, beginner',
  published: true,
  order: 1,
};

const optionsLessons = [
  {
    title: 'What Is an Option? Calls & Puts Explained',
    slug: 'what-is-an-option',
    order: 0,
    published: true,
    content: `## What Is an Option?

An **option** is a contract that gives the buyer the *right — but not the obligation* — to buy or sell an underlying asset at a specified price before or on a specified date.

You pay a **premium** upfront to acquire this right. If the option is never worth exercising, you simply let it expire — your maximum loss is the premium paid.

---

## The Two Types: Calls and Puts

### Call Option
A **call** gives the buyer the right to **buy** 100 shares of the underlying stock at the **strike price** before expiration.

- You buy a call when you think the stock will **go up**.
- The call gains value as the stock price rises above the strike.

**Example:** AAPL is trading at $180. You buy a call with a $185 strike expiring in 30 days for a $3 premium ($300 total for 1 contract = 100 shares).
- If AAPL rises to $195, your call is worth at least $10 ($195 − $185), and you profit.
- If AAPL stays below $185, the call expires worthless — you lose the $300 premium.

### Put Option
A **put** gives the buyer the right to **sell** 100 shares at the strike price before expiration.

- You buy a put when you think the stock will **go down**.
- The put gains value as the stock price falls below the strike.

**Example:** You own 100 shares of AAPL at $180 and buy a $175 put for $2 ($200 total). If AAPL drops to $160, your put is worth $15 ($175 − $160), cushioning your loss.

---

## Buyers vs. Sellers

| Role | Rights | Obligation | Max Loss | Max Gain |
|------|--------|------------|----------|----------|
| Call Buyer | Right to buy | None | Premium paid | Unlimited (theoretically) |
| Call Seller | None | Must sell if assigned | Unlimited | Premium received |
| Put Buyer | Right to sell | None | Premium paid | Strike − Premium |
| Put Seller | None | Must buy if assigned | Strike − Premium | Premium received |

**One person's right is another person's obligation.** Every option contract has a buyer and a seller on opposite sides.

---

## Key Takeaways

- Options are contracts on 100 shares (in US markets)
- Calls = right to buy; Puts = right to sell
- Buyers pay premiums and have rights, not obligations
- Sellers collect premiums and take on obligations
- Options expire — time works *against* buyers and *for* sellers
`,
  },
  {
    title: 'Options Terminology: Strike, Expiry, Premium & More',
    slug: 'options-terminology',
    order: 1,
    published: true,
    content: `## The Core Vocabulary

Options have their own language. Understanding these terms precisely matters — a $0.50 misunderstanding on a 10-contract position is $500.

---

## Strike Price

The **strike price** (also called exercise price) is the price at which the option holder can buy (call) or sell (put) the underlying stock.

- A call with a **$150 strike** lets you buy the stock for $150 — regardless of where it's actually trading.
- A put with a **$150 strike** lets you sell the stock for $150 — even if the market price is $120.

---

## Expiration Date

Every option has an **expiration date**. After this date, the option ceases to exist.

- **Weekly options** expire every Friday — common for short-term speculative trades.
- **Monthly options** expire on the third Friday of each month — the most liquid.
- **LEAPS** (Long-term Equity Anticipation Securities) expire 1–3 years out — used for longer-term positions.

American-style options can be exercised **any time** before expiry. Most equity options are American-style. Index options are often European-style (exercise at expiry only).

---

## Premium

The **premium** is the price you pay (or receive) for an option contract. It's quoted per share, and since each contract covers 100 shares, multiply by 100 for the total cost.

A call quoted at **$3.50** costs **$350 per contract**.

Premium has two components:

| Component | Definition |
|-----------|------------|
| **Intrinsic Value** | How much the option is *already* in the money |
| **Extrinsic Value** | Time value + implied volatility premium |

---

## Moneyness

**Moneyness** describes the relationship between the stock price and the strike price.

| Term | Calls | Puts |
|------|-------|------|
| **In the Money (ITM)** | Stock price > Strike | Stock price < Strike |
| **At the Money (ATM)** | Stock price ≈ Strike | Stock price ≈ Strike |
| **Out of the Money (OTM)** | Stock price < Strike | Stock price > Strike |

- **ITM options** have intrinsic value and behave more like the stock.
- **OTM options** are pure extrinsic value — they're a bet on a large move.
- **ATM options** have the most extrinsic value relative to price — highest time decay risk.

---

## The Option Chain

The **option chain** is the table displayed by your broker showing all available strikes and expirations. Each row shows the bid, ask, last price, volume, open interest, and Greeks for that strike.

**Open Interest** = number of outstanding contracts. Higher open interest = more liquid = tighter bid-ask spread = better fills.

---

## Quick Reference

| Term | Meaning |
|------|---------|
| Strike | Price to buy/sell the stock |
| Expiration | Date the option dies |
| Premium | Price of the option (× 100 for cost) |
| ITM | Has intrinsic value |
| OTM | No intrinsic value, only extrinsic |
| Open Interest | Number of open contracts |
`,
  },
  {
    title: 'Intrinsic Value vs. Extrinsic Value',
    slug: 'intrinsic-vs-extrinsic-value',
    order: 2,
    published: true,
    content: `## Breaking Down Option Premium

Every option's price (premium) is made up of two parts:

> **Premium = Intrinsic Value + Extrinsic Value**

Understanding this split is critical — it tells you *why* an option costs what it does and *how* it will behave over time.

---

## Intrinsic Value

**Intrinsic value** is the "real" value of an option — the amount it would be worth if exercised right now.

- **Call intrinsic value** = max(Stock Price − Strike, 0)
- **Put intrinsic value** = max(Strike − Stock Price, 0)

**Example:** AAPL at $192, Call strike $185:
Intrinsic Value = $192 − $185 = **$7.00**

If the call is trading at $9.50, then:
Extrinsic Value = $9.50 − $7.00 = **$2.50**

Out-of-the-money options have **zero intrinsic value** — they're entirely extrinsic.

---

## Extrinsic Value (Time Value)

**Extrinsic value** is everything above intrinsic value. It's sometimes called "time value" though that's slightly reductive — it reflects:

1. **Time remaining** — more time = more chance for the stock to move in your favor
2. **Implied volatility (IV)** — higher IV = more expected movement = higher premium

Extrinsic value **decays to zero by expiration**. This is called **theta decay** (covered in the Greeks lesson).

---

## Why This Matters for Strategy

### Buying options
When you buy an option, you're paying extrinsic value that will erode over time even if the stock doesn't move. You need the stock to move *fast enough* and *far enough* to overcome that decay.

### Selling options
When you sell an option, you're collecting that extrinsic value. Time works in your favor — every day that passes, the option you sold loses value (all else equal), and you profit.

> **Key insight:** Option sellers profit from time decay. Option buyers need volatility to win.

---

## Implied Volatility's Role

Implied Volatility (IV) is the market's forecast of how much the stock will move over the option's life. Higher IV → fatter premiums → more extrinsic value baked in.

When IV is high (e.g., before earnings), options are expensive. When IV is low, they're cheap.

| IV Environment | Strategy Lean |
|----------------|---------------|
| High IV | Sell options (collect inflated premium) |
| Low IV | Buy options (cheap extrinsic value) |

---

## Summary

| | Intrinsic Value | Extrinsic Value |
|-|-----------------|-----------------|
| Source | In-the-money amount | Time + volatility |
| OTM option | $0 | All of the premium |
| ITM option | Stock − Strike | Remaining premium |
| At expiry | Max(S−K, 0) | **$0** — always zero |
`,
  },
  {
    title: 'The Four Basic Positions',
    slug: 'four-basic-positions',
    order: 3,
    published: true,
    content: `## Building Blocks of All Options Strategies

Every complex options strategy is just a combination of four basic positions:

1. **Long Call** — Bullish, unlimited upside
2. **Long Put** — Bearish, capped at strike
3. **Short Call** — Neutral to bearish, income-generating
4. **Short Put** — Neutral to bullish, income-generating

---

## 1. Long Call

**View:** Bullish. You expect the stock to rise significantly.

- **Max Profit:** Unlimited (stock can rise indefinitely)
- **Max Loss:** Premium paid
- **Breakeven:** Strike + Premium paid

**Example:** SPY at $500. Buy $505 call for $4 (cost: $400/contract). Breakeven at $509. If SPY hits $520, profit = ($520 − $505 − $4) × 100 = $1,100.

**Best used when:** You expect a large, quick move up and want leverage with defined risk.

---

## 2. Long Put

**View:** Bearish. You expect the stock to fall, or you want downside protection.

- **Max Profit:** Strike − Premium (stock can only go to zero)
- **Max Loss:** Premium paid
- **Breakeven:** Strike − Premium paid

**Example:** SPY at $500. Buy $495 put for $3.50 (cost: $350/contract). Breakeven at $491.50. If SPY drops to $470, profit = ($495 − $470 − $3.50) × 100 = $2,150.

**Best used when:** You're bearish or want to hedge an existing long position.

---

## 3. Short Call (Covered vs. Naked)

**View:** Neutral to bearish. You don't expect a large move up.

Selling a call obligates you to sell 100 shares at the strike if assigned.

- **Max Profit:** Premium received
- **Max Loss:** Unlimited if *naked* (no underlying shares); capped if *covered*
- **Breakeven:** Strike + Premium received

**Covered call:** You own 100 shares AND sell a call. If assigned, you sell your shares at the strike (acceptable outcome). This is the most common income strategy.

---

## 4. Short Put

**View:** Neutral to bullish. You wouldn't mind buying the stock at the strike.

Selling a put obligates you to buy 100 shares at the strike if assigned.

- **Max Profit:** Premium received
- **Max Loss:** Strike − Premium (stock falls to zero)
- **Breakeven:** Strike − Premium received

**Cash-secured put:** You have enough cash to buy 100 shares at the strike. This is a popular way to get paid to wait to buy a stock you like.

---

## Payoff Summary

| Position | Direction | Max Profit | Max Loss |
|----------|-----------|------------|----------|
| Long Call | Bullish | Unlimited | Premium |
| Long Put | Bearish | Strike − Prem | Premium |
| Short Call | Neutral/Bearish | Premium | Unlimited* |
| Short Put | Neutral/Bullish | Premium | Strike − Prem |

*Unlimited only if naked. Covered calls cap the loss.

---

## The Core Tradeoff

- **Buying options** = limited risk, unlimited (or large) reward, but requires a big move and fights time decay
- **Selling options** = limited profit, larger risk, but benefits from time decay and doesn't require a move

Most professional options traders lean toward *selling* premium because statistics favor it: roughly 70% of options expire worthless.
`,
  },
  {
    title: 'Introduction to the Greeks',
    slug: 'introduction-to-the-greeks',
    order: 4,
    published: true,
    content: `## Why the Greeks Matter

The "Greeks" are sensitivity measures — they tell you *how much* an option's price will change given a change in one variable. Ignoring them means trading blind.

The four main Greeks: **Delta, Gamma, Theta, Vega**.

---

## Delta (Δ)

**Delta** measures how much the option price changes for a $1 move in the underlying stock.

- Calls: Delta ranges from 0 to +1
- Puts: Delta ranges from −1 to 0
- ATM options: ~0.50 delta

**Example:** A call with delta 0.40 will gain roughly $0.40 in value if the stock rises $1 (and lose $0.40 if it falls $1).

### Interpreting Delta as Probability
Delta is also a rough approximation of the probability of expiring in the money. A 0.30 delta call has roughly a 30% chance of expiring ITM.

**Delta for position sizing:** If you own 1 call with 0.50 delta, you have the equivalent exposure of 50 shares of stock.

---

## Gamma (Γ)

**Gamma** measures the *rate of change* of delta — how much delta changes for a $1 stock move.

- Gamma is highest for ATM options close to expiration
- Gamma makes short options dangerous near expiry — delta can shift rapidly

**Think of it this way:** Delta is speed; Gamma is acceleration.

**For option sellers:** High gamma near expiry is the risk. A stock that gaps through your short strike can cause large losses quickly.

---

## Theta (Θ)

**Theta** measures the daily dollar loss due to time passing, all else equal. It's usually expressed as a negative number for buyers.

- **Option buyers** pay theta — the option loses value every day.
- **Option sellers** collect theta — this is the "decay premium."

**Example:** A theta of −0.05 means the option loses $5 per day per contract.

Theta decay is *not* linear — it accelerates as expiration approaches. The last 30 days before expiry see the most rapid decay (this is why sellers often target 30–45 DTE).

---

## Vega (ν)

**Vega** measures how much the option price changes for a 1% change in implied volatility.

- Higher IV → higher premium → good for sellers, bad for buyers
- Lower IV → lower premium → good for buyers, bad for sellers

**Example:** Vega of 0.10 means a 1% rise in IV adds $0.10 to the option price (per share).

**Practical relevance:** If you buy options before earnings (when IV is high), the stock might move as expected, but if IV collapses after the announcement (IV crush), you can still lose money.

---

## The Greeks in One Table

| Greek | Measures | Positive means | Key use |
|-------|----------|----------------|---------|
| **Delta** | $ change per $1 stock move | Exposure size, directional bet | Position sizing, hedging |
| **Gamma** | Rate of delta change | Delta increases faster | Risk near expiry |
| **Theta** | $ lost per day | Time helps you | Income strategy profitability |
| **Vega** | $ change per 1% IV move | Volatile environments help | Earnings plays, IV strategies |

---

## Putting It Together

A **covered call** seller wants:
- Low delta (OTM strike, stock stays away from strike)
- Positive theta (decay earns you money daily)
- Low vega exposure (IV changes don't hurt much if ATM)

A **long call** buyer wants:
- High delta (ITM option, moves with stock)
- Low theta drag (shorter time = more theta risk)
- Rising vega (buy before IV expands)
`,
  },
  {
    title: 'Covered Calls & Cash-Secured Puts',
    slug: 'covered-calls-and-cash-secured-puts',
    order: 5,
    published: true,
    content: `## Two Core Income Strategies

These two strategies are the starting point for most options income approaches. They're defined-risk, conservative, and used by professional and retail traders alike.

---

## Covered Call

### What it is
You **own 100 shares** of a stock and **sell a call** against them. You collect the premium in exchange for capping your upside at the strike price.

### When to use it
- You're neutral to mildly bullish on a stock you already own
- You want to generate income while holding
- You're okay selling the stock at the strike price if assigned

### Example
You own 100 shares of MSFT at $415. You sell a $420 call expiring in 30 days for $3.50 ($350 total).

**Scenarios:**
- MSFT stays at $415 → call expires worthless, you keep $350. Effective cost basis reduced by $3.50.
- MSFT rises to $425 → you're assigned, sell shares at $420. You keep the premium + gains to $420.
- MSFT drops to $400 → call expires worthless, you keep $350 which offsets some of the $1,500 paper loss.

### Risk
You still own the shares — downside is the same as owning stock, minus the premium collected. The only thing you give up is gains above the strike.

### Key metrics to track
- **Annualized yield:** (Premium / Stock Price) × (365 / DTE) — compares across different strikes and expirations
- **Strike selection:** Typically 0.20–0.30 delta OTM for balance between income and keeping your shares

---

## Cash-Secured Put

### What it is
You **sell a put** on a stock you'd be happy to own, with enough cash in your account to buy 100 shares at the strike price if assigned.

### When to use it
- You want to buy a stock but at a lower price
- You want to generate income while waiting
- You're comfortable owning the stock if it drops to the strike

### Example
NVDA is trading at $900. You'd love to own it at $860. You sell an $860 put expiring in 30 days for $12 ($1,200 total). You set aside $86,000 in cash.

**Scenarios:**
- NVDA stays above $860 → put expires worthless, you keep $1,200. Repeat.
- NVDA drops to $840 → you're assigned, buy 100 shares at $860. Effective cost basis: $860 − $12 = **$848**.
- NVDA crashes to $700 → you own shares at an $848 effective cost. This is the real risk — you must be genuinely okay with owning the stock here.

### Risk
The risk is the same as owning the stock — except your cost basis is reduced by the premium. Never sell puts on stocks you wouldn't want to own.

---

## The Wheel Strategy

Many traders combine these two into a continuous income loop:

1. **Sell cash-secured put** → if assigned, you own the stock at a favorable price
2. **Sell covered call** against the shares → if assigned, you sell the shares and start over

This "wheel" can generate consistent income on stocks you're comfortable holding long-term. The key is stock selection — the underlying must be a company you're genuinely bullish on fundamentally.

---

## Comparison

| | Covered Call | Cash-Secured Put |
|-|-------------|-----------------|
| Start with | 100 shares | Cash |
| Income | Premium collected | Premium collected |
| Assignment means | Sell shares at strike | Buy shares at strike |
| Risk | Stock drops | Stock drops (same) |
| Requires | Stock ownership | Sufficient cash |
`,
  },
  {
    title: 'Risk Management & Position Sizing',
    slug: 'risk-management-position-sizing',
    order: 6,
    published: true,
    content: `## Why Risk Management Comes First

Options offer leverage. That leverage is useful — but it cuts both ways. The traders who blow up accounts don't lose because they had bad trade ideas; they lose because they were sized incorrectly when a bad trade hit.

The goal isn't to never lose. The goal is to survive long enough that the wins outpace the losses.

---

## The 1–2% Rule

Never risk more than **1–2% of your total portfolio** on a single options trade.

**Example:** Portfolio = $50,000. Max risk per trade = $500–$1,000.

- Buying calls? Maximum premium spend = $500–$1,000
- Selling a put? The margin/cash requirement isn't your risk — your risk is the loss if the stock gaps down. Size accordingly.

This rule means 20–50 consecutive max losses don't wipe you out — giving you time to adjust.

---

## Understanding Your Actual Risk

For **bought options**, risk is simple: it's the premium you paid.

For **sold options**, risk is less obvious:
- Short put on a $100 stock: risk is up to $10,000 (stock goes to zero) minus premium received
- Short call (naked): theoretically unlimited — avoid unless you have a hedge

Always ask: **"What is my P&L if this stock gaps 20% against me overnight?"** If the answer is catastrophic, reduce size.

---

## Probability vs. Expected Value

Options have a **probability of profit (POP)**. A 30 delta short put has roughly a 70% chance of expiring worthless — which feels good. But:

> A strategy with 70% probability of winning $1 and 30% probability of losing $5 has a **negative expected value**.
> 0.70 × $1 + 0.30 × (−$5) = −$0.80

Always calculate expected value, not just probability of profit. This is why the premium you collect relative to the risk you take matters enormously.

**Rule of thumb:** Collect at least 1/3 of the width of a spread when selling spreads (e.g., a $5-wide spread should collect at least $1.65).

---

## Diversification Across Underlyings

Don't sell puts on 10 tech stocks simultaneously — they're correlated. When the market sells off, all 10 move against you at once.

- Spread trades across **sectors** (tech, financials, healthcare, commodities)
- Include **uncorrelated underlyings** (gold, bonds, international indexes)
- Be cautious with total **portfolio delta** — if you're long delta on every position, you're just leveraged long the market

---

## Managing Losing Trades

**Set a max loss rule.** Common approaches:
- Close at **2× the premium received** (e.g., sold for $1.00, close if it reaches $2.00)
- Close at **50% of max loss** on defined-risk trades

**Don't "hope" positions back.** Rolling a losing position to a further expiry or lower strike just extends the pain without changing the thesis. If the trade is broken, close it.

---

## Checklist Before Every Trade

- [ ] What is my maximum loss on this trade?
- [ ] Does this fit within my 1–2% portfolio risk rule?
- [ ] Am I okay owning this stock (if selling puts) or selling it (if selling calls)?
- [ ] What's my exit plan if the trade goes against me?
- [ ] Am I taking this trade because it has edge, or because I'm bored/greedy?

---

## Key Principles Summary

1. Size trades so no single loss is catastrophic
2. Know your exact max loss *before* entering
3. Calculate expected value, not just win rate
4. Diversify across uncorrelated underlyings
5. Have pre-defined exit rules — and follow them
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 2: EQUITY INVESTING FUNDAMENTALS
// ---------------------------------------------------------------------------

const equityCourse = {
  title: 'Equity Investing Fundamentals',
  slug: 'equity-investing-fundamentals',
  summary: 'How to evaluate stocks like an investor, not a speculator. Covers financial statements, valuation, competitive moats, and portfolio construction from first principles.',
  tags: 'equities, value investing, fundamentals',
  published: true,
  order: 2,
};

const equityLessons = [
  {
    title: 'How the Stock Market Actually Works',
    slug: 'how-the-stock-market-works',
    order: 0,
    published: true,
    content: `## What You Own When You Buy a Stock

A **share of stock** represents fractional ownership in a company. If a company has 1,000,000 shares outstanding and you own 1,000, you own 0.1% of the business.

You're entitled to:
- A proportional share of profits (via dividends, or retained earnings that increase book value)
- A vote on major corporate decisions
- A claim on assets if the company liquidates (after all creditors are paid)

This seems obvious — but it matters. A stock isn't a ticker symbol on a chart. It's a piece of a real business with employees, products, cash flows, and debts.

---

## Primary vs. Secondary Markets

The **primary market** is where companies raise capital directly — IPOs and follow-on offerings. The company receives the proceeds.

The **secondary market** is what most people call "the stock market" — exchanges like NYSE and NASDAQ where investors trade existing shares *with each other*. The company gets nothing from these transactions.

Most trading happens in the secondary market. Prices are set by supply (sellers) and demand (buyers) in continuous real-time auctions.

---

## Market Capitalization

**Market cap** = Share Price × Shares Outstanding

It's the market's current estimate of the total value of the business.

| Cap Range | Category | Examples |
|-----------|----------|----------|
| > $200B | Mega-cap | Apple, Microsoft, Nvidia |
| $10B–$200B | Large-cap | Nike, Salesforce |
| $2B–$10B | Mid-cap | Chipotle (historically), Etsy |
| $300M–$2B | Small-cap | Regional banks, niche tech |
| < $300M | Micro-cap | Highly illiquid, speculative |

Smaller companies have more growth potential but less liquidity and more risk. Institutional investors (who move markets) largely ignore micro-caps — creating both opportunity and risk for retail investors.

---

## Price vs. Value

**Price** is what you pay. **Value** is what you get.

The stock market is a voting machine in the short term (driven by sentiment, news, momentum) and a weighing machine in the long term (driven by actual earnings and cash flows).

Benjamin Graham's "Mr. Market" analogy: imagine a business partner who offers to buy or sell you his share every day at a wildly different price. Some days he's euphoric, some days despondent. You don't have to take his price. You only trade when the price is attractive relative to your estimate of value.

---

## Why Stocks Generally Go Up Over Time

Over long periods, stock prices follow earnings. Companies that grow their earnings per share — through revenue growth, margin expansion, and buybacks — tend to see their stock prices rise accordingly.

The S&P 500 has compounded at roughly 10% annually over the last century, driven primarily by:
1. **Earnings growth** (~5–6% annually)
2. **Dividends** (~2–3% historically)
3. **Valuation expansion/contraction** (mean-reverting noise over long periods)

This is why long-term investing in diversified equities has been the dominant wealth-building tool for most investors.

---

## Key Terms

| Term | Definition |
|------|------------|
| EPS | Earnings Per Share — net income divided by shares outstanding |
| P/E Ratio | Price-to-Earnings — how much you pay for $1 of earnings |
| Dividend | Cash distribution to shareholders |
| Float | Shares available for public trading |
| Short Interest | Shares sold short as % of float — a measure of bearish sentiment |
`,
  },
  {
    title: 'Reading Financial Statements',
    slug: 'reading-financial-statements',
    order: 1,
    published: true,
    content: `## The Three Core Financial Statements

Every public company files an annual report (10-K) and quarterly report (10-Q) with the SEC. The core financial data lives in three statements that together tell the full story of a business.

---

## 1. The Income Statement

The income statement answers: **Did the business make money this period?**

Key line items, in order:

\`\`\`
Revenue                         $100M
– Cost of Goods Sold (COGS)     ($60M)
= Gross Profit                   $40M   (40% gross margin)

– Operating Expenses (OpEx)     ($20M)
= Operating Income (EBIT)        $20M   (20% operating margin)

– Interest Expense               ($2M)
= Pre-Tax Income                 $18M

– Taxes                          ($4M)
= Net Income                     $14M   (14% net margin)
\`\`\`

**What to look for:**
- **Gross margin trend** — is the core business getting more profitable?
- **Operating leverage** — do revenues growing faster than expenses?
- **Net margin** — what's left for shareholders after everything?

---

## 2. The Balance Sheet

The balance sheet answers: **What does the company own and owe at a point in time?**

> **Assets = Liabilities + Shareholders' Equity**

**Assets** (what you own):
- Current assets: cash, receivables, inventory (convertible to cash within a year)
- Long-term assets: property, equipment, intangibles (patents, goodwill)

**Liabilities** (what you owe):
- Current liabilities: accounts payable, short-term debt (due within a year)
- Long-term liabilities: bonds, deferred taxes

**Shareholders' Equity** = Assets − Liabilities = book value

**What to look for:**
- **Debt-to-equity ratio** — is the company overleveraged?
- **Current ratio** (current assets / current liabilities) — can it pay near-term bills?
- **Cash position** — fortress balance sheet or cash burn?

---

## 3. The Cash Flow Statement

The cash flow statement answers: **Where did cash actually come from and where did it go?**

This matters because **net income ≠ cash**. Accounting rules allow revenue to be recognized before cash is received and expenses to be deferred.

Three sections:
1. **Operating Cash Flow (OCF)** — cash from the core business
2. **Investing Cash Flow** — capex, acquisitions, asset sales
3. **Financing Cash Flow** — debt issuance/repayment, dividends, buybacks

**Free Cash Flow (FCF) = Operating Cash Flow − Capital Expenditures**

FCF is what the business *actually* generates for shareholders. Companies can manipulate earnings with accounting; cash flow is much harder to fake.

---

## Common Red Flags

| Warning Sign | What It Might Indicate |
|-------------|------------------------|
| Revenue growing, FCF declining | Quality of earnings issue |
| Accounts receivable growing faster than revenue | Customers aren't paying |
| Goodwill is huge % of assets | Overpaid for acquisitions |
| Debt increasing every year | May be unsustainable leverage |
| Net income >> Operating cash flow | Aggressive revenue recognition |

---

## Where to Find Financials

- **SEC EDGAR** (free, official): edgar.sec.gov
- **Macrotrends** (historical charts): macrotrends.net
- **Tikr.com** (clean interface, free tier): tikr.com
- **Annual reports** directly from company IR pages
`,
  },
  {
    title: 'Valuation: How to Estimate What a Stock Is Worth',
    slug: 'valuation-methods',
    order: 2,
    published: true,
    content: `## What Is Valuation?

Valuation is the process of estimating what a business is intrinsically worth — independent of its current market price. If the stock is priced *below* your estimate of intrinsic value, you might have an opportunity.

There's no single "correct" method. Professionals triangulate using several approaches.

---

## 1. Price-to-Earnings (P/E) Ratio

**P/E = Stock Price / Earnings Per Share**

It tells you how many dollars you pay for $1 of earnings.

- A P/E of 20 means you pay $20 for every $1 of annual earnings
- A P/E of 10 is "cheap" relative to historical averages; 40+ is expensive

**Limitations:**
- Earnings can be manipulated; P/E can be distorted by one-time items
- High-growth companies should trade at higher P/Es (you're paying for future earnings)
- Different industries have different "normal" P/E ranges

**Use it to compare** similar companies in the same sector or a company vs. its historical average.

---

## 2. EV/EBITDA

**Enterprise Value (EV) = Market Cap + Total Debt − Cash**

**EV/EBITDA = Enterprise Value / EBITDA**

EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortization

EV/EBITDA is better than P/E for comparing companies with different capital structures (some heavily debt-financed, some not). It's the most common multiple used in M&A.

A typical range: 8–12× for mature companies, 15–25× for high-growth.

---

## 3. Price-to-Free Cash Flow (P/FCF)

**P/FCF = Stock Price / Free Cash Flow per Share**

Many investors prefer FCF-based multiples because FCF is harder to manipulate than earnings.

Warren Buffett thinks in terms of "owner earnings" — roughly equivalent to FCF. The question: what could this business pay out to shareholders every year without impairing future growth?

---

## 4. Discounted Cash Flow (DCF)

The DCF model estimates **intrinsic value** by projecting future cash flows and discounting them back to present value.

\`\`\`
Intrinsic Value = Σ [FCF_t / (1 + r)^t] + Terminal Value / (1 + r)^n
\`\`\`

Where r = discount rate (usually WACC or a required return like 10%)

**Steps:**
1. Project FCF for 5–10 years
2. Estimate terminal value (what the business is worth after the projection period)
3. Discount everything back to today

**Problem:** DCF is extremely sensitive to assumptions. A 1% change in growth rate or discount rate can swing the output by 30–50%. Use it as a range, not a precise answer.

---

## 5. Comparable Company Analysis ("Comps")

Look at what similar businesses trade at, then apply those multiples to the company you're valuing.

**Example:** Software companies trade at an average of 8× revenue. If your company generates $100M in revenue and you believe it's comparable, a rough value is $800M.

This tells you what the *market* thinks similar businesses are worth — useful for relative valuation, not intrinsic value.

---

## Margin of Safety

Benjamin Graham's central concept: always buy with a **margin of safety** — pay significantly *less* than your estimate of intrinsic value.

If you estimate a stock is worth $100, don't pay $95 — pay $65–70. This buffer:
- Protects against errors in your assumptions
- Provides a return cushion if the business underperforms
- Limits downside if you're wrong

The bigger the uncertainty in your estimate, the larger the margin of safety required.

---

## Putting It Together

No single metric tells the whole story. A good analyst looks at:
- P/E relative to growth (PEG ratio)
- EV/EBITDA vs. industry peers
- P/FCF for cash quality
- DCF for absolute value anchoring
- Historical multiples for the specific company

Then asks: *Is there a reason this looks cheap or expensive? Is the reason already known, or is the market missing something?*
`,
  },
  {
    title: 'Moats: Understanding Competitive Advantages',
    slug: 'competitive-moats',
    order: 3,
    published: true,
    content: `## What Is an Economic Moat?

Warren Buffett coined the term "economic moat" — borrowed from the water-filled ditches that protected medieval castles. A business moat is a **durable competitive advantage** that protects profits from being competed away.

Without a moat, competition tends to erode returns on capital toward the cost of capital over time. With a moat, a business can sustain returns above cost of capital for years or decades — and that's where the real value accrues to long-term shareholders.

The key question for any investment: *What protects this company's profits 10 years from now?*

---

## The Five Sources of Moats (Morningstar Framework)

### 1. Network Effects
The product becomes more valuable as more people use it.

**Examples:** Visa/Mastercard (more merchants + cardholders = more useful), Meta (more users = more content = more users), stock exchanges.

Network effects are the most powerful moat — they're self-reinforcing and extremely difficult to replicate from scratch.

### 2. Switching Costs
Users are locked in — the cost (time, money, disruption) of switching to a competitor exceeds the benefit.

**Examples:** SAP/Oracle enterprise software (huge implementation cost), Salesforce CRM (all your customer data is in there), Bloomberg Terminal (traders have 20 years of muscle memory and customization).

### 3. Cost Advantages
The company can produce at a sustainably lower cost than competitors, allowing it to undercut on price or earn higher margins at the same price.

Sources: economies of scale, proprietary processes, cheaper inputs, unique geography, favorable government regulations.

**Examples:** Costco (scale + membership model), Walmart (distribution network), Amazon AWS (shared infrastructure).

### 4. Intangible Assets
Brands, patents, licenses, or regulatory approvals that competitors can't easily replicate.

**Examples:** Apple (brand premium), Coca-Cola (brand + distribution), pharmaceutical companies with patent portfolios, insurance companies with regulatory licenses.

### 5. Efficient Scale
In a market with limited demand, the incumbent serves the market at a scale that makes new entry unprofitable.

**Examples:** Waste Management (a city only needs one or two garbage collectors), airports, local cable monopolies.

---

## Moat Width: Wide, Narrow, or None

| Rating | Meaning |
|--------|---------|
| **Wide moat** | Competitive advantage expected to persist 20+ years |
| **Narrow moat** | Advantage exists but may erode within 10 years |
| **No moat** | Subject to intense competition; returns likely to erode |

Wide-moat businesses at reasonable prices have historically been some of the best long-term investments.

---

## Moats Can Erode

Technology disrupts moats. Blockbuster had scale advantages and brand recognition — but couldn't survive streaming. Kodak had patent moats — but digital photography made the underlying product irrelevant.

**Key questions when assessing moat durability:**
- Is this moat based on something structural, or just current market position?
- What would it take for a well-funded competitor to close the gap in 5 years?
- Is the regulatory/technological landscape changing in ways that threaten the moat?

---

## Return on Invested Capital (ROIC)

The financial fingerprint of a moat is **ROIC — Return on Invested Capital**.

**ROIC = NOPAT / Invested Capital**
(NOPAT = Net Operating Profit After Tax)

- **ROIC > Cost of Capital:** Value creation — the business is worth more than the sum of its assets
- **ROIC = Cost of Capital:** Value neutral
- **ROIC < Cost of Capital:** Value destruction — the business destroys value as it grows

Wide-moat businesses consistently post ROIC of 20–50%+. Commodity businesses typically earn their cost of capital or less.

> Look for businesses that have earned above their cost of capital for 10+ years. That's not luck — that's a moat.
`,
  },
  {
    title: 'Portfolio Construction Basics',
    slug: 'portfolio-construction-basics',
    order: 4,
    published: true,
    content: `## From Stock Picking to Portfolio Management

Picking good individual stocks is only half the job. How you combine those stocks — position sizing, sector exposure, correlation, and rebalancing — determines your actual returns and risk.

---

## Concentration vs. Diversification

There is a genuine tension here.

**The case for concentration:** Buffett and Munger ran concentrated portfolios (10–20 stocks). If you have high conviction based on deep research, diluting into mediocre ideas reduces returns. "Diworsification" is real.

**The case for diversification:** Most individual investors don't have the time, skill, or information advantage to reliably pick winners. Diversification reduces idiosyncratic risk (single-stock blow-ups) without reducing expected return.

**Practical framework:**
- 15–25 stocks is enough diversification to largely eliminate single-stock risk while maintaining meaningful positions
- 5–10 stocks if you're running a concentrated, high-conviction approach
- Index funds if you don't want to pick stocks at all

---

## Position Sizing

Two common approaches:

### Equal-Weight
Put the same dollar amount in each position. Simple, reduces recency bias, no position becomes a runaway bet without intentional action.

### Conviction-Weight
Larger positions in highest-conviction ideas. Requires discipline — it's psychologically hard to hold a 15% position through a drawdown.

**Key rule:** Regardless of conviction, be wary of any single position exceeding 10–15% of the portfolio. Even great companies have unexpected problems.

---

## Sector Diversification

Sectors move together during macro events (financials during bank crises, energy during oil shocks, tech during rate hikes). Even if you own 20 stocks, they don't reduce risk if they're all correlated tech names.

**Rough target for a diversified equity portfolio:**
- No single sector > 30–35% of portfolio
- Include some representation across cyclicals (tech, consumer disc, industrials), defensives (healthcare, staples, utilities), and financials

---

## Geographic Diversification

US equities dominate global market cap (~60%) but concentration in a single country has historically produced volatility during regional crises.

Some exposure to international developed markets (Europe, Japan) and selective emerging markets (India, Southeast Asia) can reduce correlation.

---

## When to Sell

Most investors obsess over when to buy but have no sell discipline. A few frameworks:

1. **Thesis broken:** The original reason you bought the stock is no longer true. Sell regardless of price.
2. **Valuation stretched:** The stock has reached or exceeded fair value. Trim or exit.
3. **Better opportunity:** A more attractive risk/reward exists and you're at your max position count. Sell the weakest idea.
4. **Position size too large:** One position has grown to 20%+ due to appreciation. Trim to maintain diversification.

---

## Rebalancing

Rebalancing is selling winners and buying laggards to maintain target allocations. It's emotionally counter-intuitive — you're selling what's working.

**Research shows modest rebalancing benefits** (forces buy-low-sell-high discipline) but the tax drag from frequent rebalancing in taxable accounts can offset gains. Rebalancing annually or when positions drift 5+ percentage points from target is a reasonable approach.

---

## Benchmark Against an Index

Always compare your portfolio to a relevant benchmark (S&P 500 for US large-cap, Russell 2000 for small-cap, etc.).

If you're not beating the index after fees and taxes over a 5+ year period, a low-cost index fund would have served you better. This isn't pessimism — it's the reality for roughly 80% of active fund managers.

The goal of stock picking is to earn *more* than the market with *acceptable* risk. If you can't consistently do that, passive indexing is the rational choice.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 3: FIXED INCOME & BONDS
// ---------------------------------------------------------------------------

const bondsCourse = {
  title: 'Fixed Income & Bonds',
  slug: 'fixed-income-bonds',
  summary: 'How bonds work, how they\'re priced, and how they interact with interest rates, central banks, and the economy — explained from scratch with real-world examples.',
  tags: 'bonds, fixed income, rates, credit',
  published: true,
  order: 3,
};

const bondsLessons = [
  {
    title: 'What Is a Bond? The Anatomy of Fixed Income',
    slug: 'what-is-a-bond',
    order: 0,
    published: true,
    content: `## What Is a Bond?

A **bond** is a loan. When you buy a bond, you are lending money to the issuer — a government, corporation, or municipality. In return, the issuer promises to pay you interest on a regular schedule and return your principal when the bond matures.

Unlike a stock (which gives you ownership), a bond gives you a **creditor's claim**. Bondholders get paid before stockholders in a bankruptcy — which is why bonds are generally less risky than equities.

---

## The Core Components

### Face Value (Par Value)
The amount the issuer promises to repay at maturity. US bonds typically have a face value of **$1,000 per bond**.

### Coupon Rate
The annual interest rate paid on the face value. A 4% coupon on a $1,000 bond pays **$40/year**, usually in two semi-annual payments of $20.

The word "coupon" is historical — bonds once had physical coupons you'd tear off and bring to a bank to collect interest.

### Maturity Date
The date the issuer repays the face value. Common maturities:
- **Short-term:** < 2 years (T-bills, commercial paper)
- **Medium-term:** 2–10 years (T-notes, most corporate bonds)
- **Long-term:** 10–30 years (T-bonds, long corporate debt)

### Yield to Maturity (YTM)
The total return you'd earn if you bought the bond today and held it until maturity, accounting for the current price, coupon payments, and the difference between purchase price and face value.

**YTM is the single most important number for comparing bonds.**

---

## A Complete Example

You buy a 10-year US Treasury bond:
- Face value: $1,000
- Coupon rate: 4.5%
- Maturity: 10 years

Every year for 10 years you receive **$45** (paid as $22.50 every 6 months). At the end of year 10, you receive your **$1,000** back.

Total cash received: $450 in coupons + $1,000 principal = **$1,450** on a $1,000 investment.

If you bought this bond at a discount — say $950 — your effective yield would be higher than 4.5% because you also capture the $50 price appreciation to par.

---

## Who Issues Bonds?

| Issuer | Type | Risk Level |
|--------|------|------------|
| US Government | Treasury bonds/notes/bills | Near-zero (backed by US taxing power) |
| Agencies (Fannie, Freddie) | Agency bonds | Very low |
| State/local governments | Municipal bonds | Low to moderate |
| Large corporations (Apple, JPM) | Investment-grade corporate | Low to moderate |
| Smaller/riskier companies | High-yield ("junk") bonds | Moderate to high |
| Foreign governments | Sovereign debt | Varies widely |

---

## Why Bonds Matter Even If You Don't Own Them

Bond markets are **vastly larger** than equity markets. The global bond market is ~$130 trillion vs ~$100 trillion for global equities. Bond yields set the "risk-free rate" that every other asset class is priced against.

When the 10-year Treasury yield rises, stock valuations compress — because future earnings get discounted at a higher rate. When yields fall, stocks and real estate tend to rise. **Bonds are the engine room of all asset pricing.**
`,
  },
  {
    title: 'Price vs. Yield: The Inverse Relationship',
    slug: 'price-vs-yield',
    order: 1,
    published: true,
    content: `## The Most Important Rule in Fixed Income

> **When bond prices go up, yields go down. When prices go down, yields go up.**

This inverse relationship confuses many new investors, but once you understand *why* it works this way, it becomes intuitive.

---

## Why Price and Yield Move Oppositely

Imagine you own a bond that pays $40/year on a $1,000 face value (4% coupon). Now interest rates rise and newly issued bonds pay $60/year on $1,000 (6% coupon).

Your old 4% bond is now **less attractive** than the new 6% bonds. Why would anyone buy your bond for $1,000 when they can get $60/year instead of $40/year with a new bond?

They wouldn't — unless you **lower your asking price**.

At some lower price, your bond becomes equally attractive. The math:
- If you sell your bond for $667, the $40 annual payment represents a **6% yield** on the $667 investment.
- At that price, your bond is equivalent in yield to the new 6% bonds.

This is why rising interest rates cause existing bond prices to fall.

---

## Three Ways to Measure Yield

### 1. Current Yield
\`\`\`
Current Yield = Annual Coupon / Current Price
\`\`\`
Simple but incomplete — doesn't account for price appreciation/depreciation to par.

**Example:** Bond pays $50/year, current price = $900
Current Yield = $50 / $900 = **5.56%**

### 2. Yield to Maturity (YTM)
The internal rate of return if held to maturity. Accounts for:
- Annual coupon payments
- Price paid vs face value received at maturity
- Time until maturity

YTM is the standard comparison metric used by professionals.

### 3. Yield to Call (YTC)
For callable bonds (where the issuer can redeem early), YTC calculates return assuming the bond is called at the earliest call date.

---

## Premium, Discount, and Par Bonds

| Relationship | Bond Trades | Why |
|-------------|-------------|-----|
| Coupon > YTM | **Above par** (premium) | Old bond pays more than market rates — expensive |
| Coupon = YTM | **At par** ($1,000) | New-issue pricing |
| Coupon < YTM | **Below par** (discount) | Old bond pays less than market rates — cheap |

**Example scenarios:**
- You bought a 5% bond at par. Rates fall to 3%. Your bond is now worth **more than $1,000** (premium) because your 5% coupon beats current market rates.
- Rates rise to 7%. Your bond is worth **less than $1,000** (discount) because new bonds pay more.

---

## Real-World Application: 2022 Bond Selloff

In 2022, the Federal Reserve raised rates from 0.25% to 4.5% in 12 months — one of the fastest hiking cycles in history.

- A 10-year Treasury bought at par in early 2022 with a 1.7% coupon lost roughly **15–20% of its value** by year end as yields soared to 4%+.
- Long-duration bonds (20–30 years) lost **30–40%**.
- This is why rising rates are devastating for bond holders — and why "duration risk" is the primary risk in fixed income.
`,
  },
  {
    title: 'The Yield Curve and What It Signals',
    slug: 'the-yield-curve',
    order: 2,
    published: true,
    content: `## What Is the Yield Curve?

The **yield curve** is a chart plotting the yields of bonds with the same credit quality (typically US Treasuries) across different maturities — from 3 months to 30 years.

It answers the question: *what interest rate does the market demand for lending money for different lengths of time?*

---

## Normal Yield Curve (Upward Sloping)

In normal economic conditions, the curve slopes upward — **longer maturities yield more than shorter ones**.

Why? Longer loans carry more risk (more time for things to go wrong), more inflation uncertainty, and more opportunity cost. Investors demand more compensation.

**Example of a normal curve:**
\`\`\`
3-month:  5.10%
2-year:   4.80%
5-year:   4.60%
10-year:  4.50%
30-year:  4.70%
\`\`\`

---

## Inverted Yield Curve

When **short-term yields exceed long-term yields**, the curve is inverted. This is unusual and historically significant.

**Example (2022–2023, US):**
\`\`\`
3-month:  5.40%
2-year:   5.10%
5-year:   4.70%
10-year:  4.25%
30-year:  4.30%
\`\`\`

The 2-year exceeds the 10-year — an "inverted 2s10s spread."

### Why Inversion Signals Recession

An inverted curve means bond markets expect short-term rates to **fall in the future** — typically because they expect the Fed to cut rates in response to a slowing economy or recession.

The **2-year/10-year inversion** has preceded every US recession since 1955, with a lag of 6–18 months. It's not a guarantee, but it's the most closely watched recession indicator in markets.

---

## The 2s10s Spread

The **2-year minus 10-year spread** is the most-watched yield curve metric.
- Positive = normal (steep) curve
- Zero = flat
- Negative = inverted

It went deeply negative in 2022–2023 (as low as -100 basis points), and the US economy slowed significantly in 2023 though avoided a technical recession — partly due to unusual post-COVID dynamics.

---

## Flat Yield Curve

When short and long rates are similar, the curve is flat — often a transition state between normal and inverted. Indicates uncertainty about the economic path.

---

## What Each Part of the Curve Reflects

| Maturity | Primarily Driven By |
|----------|---------------------|
| Short-end (< 2yr) | Federal Reserve policy expectations |
| Middle (2–10yr) | Growth and inflation expectations |
| Long-end (10–30yr) | Long-run inflation expectations + term premium |

**The Fed controls the short end.** The market sets the long end based on expectations of future rates, inflation, and economic growth. This is why the Fed can raise rates aggressively but still not always control long-term mortgage rates — the 10-year and 30-year Treasury yields move on market expectations, not direct Fed action.
`,
  },
  {
    title: 'Duration and Interest Rate Risk',
    slug: 'duration-and-interest-rate-risk',
    order: 3,
    published: true,
    content: `## What Is Duration?

**Duration** is the single most important risk measure in fixed income. It tells you how sensitive a bond's price is to changes in interest rates.

> A bond with a duration of 7 years will **lose approximately 7%** in price for every 1% rise in interest rates (and gain ~7% for every 1% fall).

Duration is expressed in years but it's really a measure of price sensitivity.

---

## Macaulay Duration vs. Modified Duration

### Macaulay Duration
The **weighted average time** to receive all of a bond's cash flows (coupons + principal), in years. A bond that pays all cash flows upfront has low duration; a zero-coupon bond (no coupons, only principal at maturity) has duration equal to its maturity.

### Modified Duration
The **percentage price change** for a 1% change in yield.

\`\`\`
Modified Duration = Macaulay Duration / (1 + YTM/n)
\`\`\`

In practice, Modified Duration is what traders use. When someone says "the portfolio has duration of 6.5," they mean Modified Duration.

---

## Practical Examples

**Example 1: Short duration**
- 2-year Treasury, coupon 5%, YTM 5%, Modified Duration ≈ 1.9 years
- If rates rise 1%: price falls ~1.9%
- A $1,000 position loses ~$19

**Example 2: Long duration**
- 30-year Treasury, coupon 4%, YTM 4%, Modified Duration ≈ 18 years
- If rates rise 1%: price falls ~18%
- A $100,000 position loses ~$18,000 — on a "safe" government bond

**Example 3: Zero-coupon bond**
- 10-year zero-coupon bond: Modified Duration ≈ 10 years
- Highest duration for a given maturity because there are no interim coupon payments to cushion the impact

---

## What Affects Duration

| Factor | Effect on Duration |
|--------|-------------------|
| Higher coupon | **Lower** duration (cash returned sooner via coupons) |
| Longer maturity | **Higher** duration (wait longer for principal) |
| Higher YTM | **Lower** duration (future cash flows discounted more) |
| Zero coupon | **Equal to maturity** (no interim cash flows) |

---

## Convexity: The Duration Correction

Duration assumes a linear relationship between rates and prices — but the actual relationship is **curved** (convex). Convexity measures the curvature.

**Practical implication:**
- When rates rise sharply, bonds fall **less** than duration alone predicts
- When rates fall sharply, bonds rise **more** than duration alone predicts

**Positive convexity is good** — it means you get asymmetric protection. Mortgage-backed securities (MBS) are a notable exception — they have *negative* convexity in certain environments because homeowners prepay mortgages when rates fall, eliminating the upside.

---

## Duration in Portfolio Management

**Duration matching:** Pension funds match the duration of their asset portfolio to their liability stream (future pension payments). This immunizes the portfolio against interest rate moves.

**Duration targeting:** Bond fund managers set target durations based on their rate outlook:
- Bullish on rates (expect rates to fall) → increase duration → capture more price appreciation
- Bearish on rates (expect rates to rise) → decrease duration → reduce price risk

A typical intermediate bond fund has duration of 4–7 years. A "long-duration" fund might have duration of 12–18 years — much higher volatility, much more sensitive to Fed policy changes.
`,
  },
  {
    title: 'Bond Types: Treasuries, Corporate, High Yield & More',
    slug: 'bond-types',
    order: 4,
    published: true,
    content: `## The Bond Universe

Not all bonds are the same. The issuer, structure, and credit quality determine the risk and return profile. Here's a tour of the major categories.

---

## US Treasury Securities

Backed by the "full faith and credit" of the US government — considered the **global risk-free benchmark**.

| Type | Maturity | Notes |
|------|----------|-------|
| T-Bills | 4 weeks – 1 year | Zero coupon; sold at discount to face value |
| T-Notes | 2 – 10 years | Pay semi-annual coupons |
| T-Bonds | 20 – 30 years | Pay semi-annual coupons |
| TIPS | 5 – 30 years | Principal adjusts with CPI inflation |
| I-Bonds | Up to 30 years | Retail savings bond with inflation component |

**TIPS (Treasury Inflation-Protected Securities)** are particularly important: their principal increases with inflation, protecting purchasing power. Real yield on TIPS is the "true" risk-free rate — it strips out inflation.

**The 10-year Treasury yield** is the most important number in global finance. It's the benchmark for mortgage rates, corporate borrowing, and the discount rate used in equity valuation.

---

## Agency Bonds

Issued by government-sponsored enterprises (GSEs):
- **Fannie Mae (FNMA)** and **Freddie Mac (FHLMC)** — package mortgages into mortgage-backed securities (MBS)
- **FHLB (Federal Home Loan Banks)** — fund member banks' lending activities

Agency bonds carry an *implicit* (not explicit) government guarantee. They yield slightly more than Treasuries — the "agency spread."

**Mortgage-Backed Securities (MBS)**: pools of home mortgages bundled together. Investors receive principal + interest payments as homeowners pay mortgages. The Fed's QE programs primarily bought MBS to suppress mortgage rates.

---

## Investment-Grade Corporate Bonds

Issued by corporations with strong credit ratings (BBB- or above per S&P/Fitch; Baa3+ per Moody's). Companies like Apple, Microsoft, JPMorgan, and Johnson & Johnson issue IG bonds.

The **credit spread** (yield above comparable Treasury) reflects the market's assessment of default risk:
- AAA corporates: ~30–50 basis points over Treasury
- A-rated: ~60–100 bps
- BBB: ~100–200 bps

Corporate bond investors earn the Treasury rate **plus** a credit spread as compensation for default risk. In recessions, spreads widen dramatically as default risk rises — crushing corporate bond prices.

---

## High-Yield ("Junk") Bonds

Issued by companies rated BB+ or below — more indebted, cyclical, or speculative businesses. Private equity buyouts (LBOs) almost always involve high-yield debt.

- Typical yield: Treasury + 300–700 bps in normal markets
- In stress: spreads can blow out to 1,000–2,000+ bps
- Default rates: ~2–3% in good times, 8–12% in recessions

High-yield bonds behave more like equities than investment-grade bonds — they move with the business cycle, economic sentiment, and risk appetite rather than just interest rate moves.

**Fallen Angels**: investment-grade bonds downgraded to high yield (Ford and Boeing during COVID). Can create forced selling as IG-only funds must liquidate — creating buying opportunities for nimble investors.

---

## Municipal Bonds ("Munis")

Issued by states, cities, counties, and other local governments to fund infrastructure (bridges, schools, water systems). Key feature: **interest is typically exempt from federal income tax** (and often state/local tax too).

Tax-equivalent yield formula:
\`\`\`
Tax-Equivalent Yield = Muni Yield / (1 - Marginal Tax Rate)
\`\`\`

Example: A 3% muni yield for someone in the 37% tax bracket is equivalent to a 4.76% taxable yield. For high-income investors, munis often offer better after-tax returns than comparable Treasuries.

---

## Sovereign Debt (International)

Government bonds issued by countries outside the US:
- **German Bunds**: eurozone benchmark, AAA-rated
- **UK Gilts**: benchmark for sterling rates
- **Japanese JGBs**: world's largest bond market by face value; yields near zero for decades
- **Emerging market sovereign debt**: Brazil, Turkey, India — higher yields, currency risk, political risk

When EM sovereigns denominate debt in USD (not local currency), they take on "original sin" — if their currency weakens, the debt burden in local terms explodes. This has caused multiple EM debt crises (Argentina, Turkey).
`,
  },
  {
    title: 'Credit Ratings, Spreads, and Default Risk',
    slug: 'credit-ratings-spreads-default',
    order: 5,
    published: true,
    content: `## The Credit Rating System

Credit rating agencies assess the likelihood that a bond issuer will repay its debt on time. The three major agencies are:

- **Moody's**: Aaa, Aa, A, Baa | Ba, B, Caa, Ca, C
- **S&P / Fitch**: AAA, AA, A, BBB | BB, B, CCC, CC, D

**Investment grade** = BBB-/Baa3 and above (low default risk)
**High yield / "junk"** = BB+/Ba1 and below (meaningful default risk)
**Default** = D/C — issuer has missed a payment

---

## What Drives a Rating

Agencies assess:
1. **Leverage**: total debt / EBITDA (how much debt relative to earnings power)
2. **Interest coverage**: EBIT / interest expense (can the company service its debt?)
3. **Cash flow stability**: cyclical vs defensive business
4. **Liquidity**: access to credit lines, cash on hand
5. **Business position**: market share, competitive moat, diversification
6. **Management**: capital allocation track record

A company with 6× leverage and declining free cash flow will be rated very differently from one with 2× leverage and growing FCF.

---

## Credit Spreads

The **credit spread** is the additional yield a bond offers above a comparable-maturity Treasury bond, expressed in basis points (bps). It's the market's real-time price of credit risk.

\`\`\`
Corporate Bond Yield = Risk-Free Rate (Treasury) + Credit Spread
\`\`\`

**Example:**
- 5-year Treasury: 4.20%
- 5-year BBB corporate: 4.90%
- Credit spread: **70 bps** (0.70%)

Spreads compress when the economy is strong (investors confident, demand for yield chasing). Spreads widen during stress — recessions, crises, earnings deterioration.

### Credit Spread History: Key Moments

| Event | IG Spread (bps) | HY Spread (bps) |
|-------|----------------|----------------|
| Normal (calm) | 80–120 | 300–400 |
| March 2020 (COVID) | 370 | 1,100 |
| 2008 GFC | 600+ | 2,000+ |
| 2024 (tight) | 90 | 280 |

During March 2020, the Fed had to directly buy corporate bond ETFs (an unprecedented step) to prevent a total seizure of the credit market.

---

## CDS: Credit Default Swaps

A **credit default swap (CDS)** is essentially insurance on a bond. The protection buyer pays a regular premium to the protection seller. If the issuer defaults, the seller pays the face value.

CDS spreads are traded in the market and provide a real-time, liquid indicator of credit risk — often moving before rating agencies update their ratings.

**During the 2008 financial crisis**, AIG had sold enormous quantities of CDS protection on mortgage securities without adequate capital — when those securities defaulted, AIG faced hundreds of billions in claims, requiring a government bailout.

---

## Distressed Debt Investing

When a company faces financial stress, its bonds may trade at 30–50 cents on the dollar. Specialized "distressed debt" investors — hedge funds like Oaktree, Elliott, Apollo — buy these bonds betting on:
1. Recovery in a bankruptcy reorganization (may receive new equity or restructured debt)
2. An out-of-court restructuring that improves the capital structure
3. An asset sale that generates recovery above the distressed purchase price

This is high-risk, high-reward investing requiring legal expertise, financial analysis, and patience. Howard Marks (Oaktree) has written extensively about distressed credit in his famous "Memos" — available free at oaktreecapital.com.

---

## Key Takeaways

- Ratings are a starting point, not a final answer — do your own credit analysis
- Spread levels tell you more than absolute yield — compare spreads vs historical norms
- The credit market is forward-looking: spreads widen before defaults materialize
- IG and HY behave differently — IG is driven by rates, HY by credit/economic cycle
- In recessions, IG spreads double; HY spreads can triple or quadruple
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 4: FOREIGN EXCHANGE (FX)
// ---------------------------------------------------------------------------

const fxCourse = {
  title: 'Foreign Exchange (FX)',
  slug: 'foreign-exchange-fx',
  summary: 'The world\'s largest financial market — $7.5 trillion traded daily. How currency pairs work, what drives exchange rates, how central banks intervene, and how traders use FX.',
  tags: 'forex, fx, currencies, macro',
  published: true,
  order: 4,
};

const fxLessons = [
  {
    title: 'How the FX Market Works',
    slug: 'how-fx-market-works',
    order: 0,
    published: true,
    content: `## The Largest Financial Market in the World

The **foreign exchange market (FX or Forex)** is the global marketplace for buying and selling currencies. With approximately **$7.5 trillion in daily volume**, it dwarfs all stock exchanges combined (NYSE + NASDAQ: ~$25 billion/day).

Yet most people have no idea it exists — because there's no building, no trading floor, and no central exchange. It's entirely over-the-counter (OTC).

---

## How It's Structured

FX is a **decentralized, 24-hour, 5-day-per-week** market. Trading follows the sun across time zones:

| Session | Hours (EST) | Major Centers |
|---------|-------------|---------------|
| Sydney | 5pm–2am | Australia, NZ |
| Tokyo | 7pm–4am | Japan, Singapore, Hong Kong |
| London | 3am–12pm | UK, Europe |
| New York | 8am–5pm | US, Canada |

The **London session** is the most liquid (most overlaps with other sessions). The **London-New York overlap** (8am–12pm EST) has the highest volume and tightest spreads.

There is no "close" — a currency's price never stops updating somewhere in the world during trading days.

---

## Who Trades FX?

| Participant | Share of Volume | Purpose |
|-------------|----------------|---------|
| **Commercial banks** (Deutsche Bank, Citi, JPM) | ~40% | Client flows, proprietary trading |
| **Central banks** | ~5–10% | Currency management, reserve operations |
| **Hedge funds** | ~10–15% | Macro speculation, carry trades |
| **Corporations** | ~10% | Converting revenue, hedging future cash flows |
| **Retail traders** | ~5% | Speculation |

When Apple sells iPhones in Japan and converts ¥ to $, they create real FX demand. When the Bank of Japan intervenes to prevent yen depreciation, they're selling USD and buying JPY. These institutional flows dwarf retail speculation.

---

## How Transactions Work

FX transactions settle in two business days (T+2) for **spot transactions** — the "spot rate" is today's exchange rate for immediate delivery. 

**Forward contracts** lock in an exchange rate for a future date — corporations use these to hedge future revenue or costs in foreign currencies.

**FX swaps** combine a spot transaction with a simultaneous forward — used extensively by banks to manage short-term funding needs across currencies.

---

## Why FX Matters Even If You Don't Trade It

- **Importers and exporters**: A US company importing goods from Germany needs euros. Currency moves directly affect their costs.
- **Multinational earnings**: When the USD strengthens, US multinationals' foreign earnings are worth less in dollars. Apple reported $10B+ in negative FX impacts in strong-dollar years.
- **Emerging markets**: Countries that borrow in USD (not their own currency) face disaster when their currency weakens — the debt burden in local terms explodes. This is the mechanism behind many EM crises.
- **Global asset allocation**: International stocks carry currency risk. A 10% return in European stocks can become 5% or 15% after EUR/USD moves.
`,
  },
  {
    title: 'Currency Pairs: Majors, Minors & Exotics',
    slug: 'currency-pairs',
    order: 1,
    published: true,
    content: `## How to Read a Currency Pair

FX is always quoted as a **pair** because you're simultaneously buying one currency and selling another.

\`\`\`
EUR/USD = 1.0850
\`\`\`

- **EUR** = base currency (the one you're buying/selling)
- **USD** = quote currency (the one you're pricing in)
- **1.0850** = it costs $1.0850 to buy €1

If EUR/USD rises from 1.0850 to 1.1000, the euro strengthened (you now need more dollars to buy one euro).

---

## The Major Pairs

The "majors" all involve USD and account for ~80% of daily FX volume:

| Pair | Nickname | Countries |
|------|----------|-----------|
| EUR/USD | "The Euro" or "Fiber" | Eurozone / US |
| USD/JPY | "The Yen" or "Gopher" | US / Japan |
| GBP/USD | "Cable" | UK / US |
| USD/CHF | "The Swissie" | US / Switzerland |
| AUD/USD | "The Aussie" | Australia / US |
| USD/CAD | "The Loonie" | US / Canada |
| NZD/USD | "The Kiwi" | New Zealand / US |

The name "Cable" for GBP/USD dates to the 1860s when the exchange rate was transmitted via the transatlantic telegraph cable.

---

## Pips: The Unit of Measurement

A **pip** (percentage in point) is the smallest standard price move in FX.

For most pairs (quoted to 4 decimal places):
\`\`\`
EUR/USD moves from 1.0850 to 1.0851 = 1 pip
\`\`\`

For JPY pairs (quoted to 2 decimal places):
\`\`\`
USD/JPY moves from 149.50 to 149.51 = 1 pip
\`\`\`

Many brokers now quote to 5 decimal places ("pipettes"), where 10 pipettes = 1 pip.

**Pip value:** In a standard lot (100,000 units), 1 pip = approximately $10 for most USD-denominated pairs.

---

## The Bid-Ask Spread

Like stocks, FX has a **bid** (what market makers will buy at) and **ask** (what they'll sell at). The difference is the spread — your transaction cost.

\`\`\`
EUR/USD Bid: 1.08495
EUR/USD Ask: 1.08505
Spread: 1.0 pip
\`\`\`

Major pairs have tight spreads (0.5–2 pips). Exotic pairs can have spreads of 20–100+ pips — making them expensive to trade.

---

## Cross Rates (Minors)

Currency pairs that don't include USD are called **crosses** or minors:

- **EUR/GBP** — euro vs pound
- **EUR/JPY** — euro vs yen  
- **GBP/JPY** — pound vs yen (known as "the beast" for its volatility)
- **AUD/NZD** — Australian vs New Zealand dollar

Cross rates are often calculated from the two major pairs. EUR/JPY = EUR/USD × USD/JPY.

---

## Exotic Pairs

Pairs involving currencies from emerging or smaller economies:

- USD/TRY (Turkish lira) — very volatile, political risk
- USD/MXN (Mexican peso) — oil-correlated, NAFTA-sensitive
- USD/BRL (Brazilian real) — commodity and political exposure
- USD/ZAR (South African rand) — gold/mining correlated

Exotics have wide spreads, lower liquidity, and can gap dramatically on political events or central bank policy changes. Not suitable for beginners.

---

## Currency Correlation

Some currencies are highly correlated:
- **AUD/USD and NZD/USD** move together (both commodity-linked, Pacific geography)
- **EUR/USD and GBP/USD** often move together (both against USD)
- **USD/JPY and equity markets**: JPY is a risk-off currency — it strengthens during market stress (carry trade unwinding)
- **USD/CHF**: CHF is also a safe-haven currency; often moves inversely with EUR/USD

Understanding correlations prevents accidentally doubling your position by owning "different" pairs that are actually the same trade.
`,
  },
  {
    title: 'What Moves Exchange Rates',
    slug: 'what-moves-exchange-rates',
    order: 2,
    published: true,
    content: `## The Drivers of Currency Price

Exchange rates reflect the **relative value** of two economies. Everything that makes one economy more attractive to hold capital relative to another moves its currency.

---

## 1. Interest Rate Differentials (The Most Important Factor)

Money flows toward higher returns. If US interest rates are 5% and Japanese rates are 0.1%, investors borrow cheaply in yen and invest in dollars — **the carry trade**. This creates persistent buying of USD and selling of JPY.

When the Fed raises rates → USD tends to strengthen
When the ECB raises rates faster than the Fed → EUR tends to strengthen vs USD

**Key relationship:** A currency with higher real rates (nominal rate minus inflation) tends to appreciate over time.

---

## 2. Inflation Differentials (Purchasing Power Parity)

**Purchasing Power Parity (PPP)** theory says exchange rates should adjust so that a basket of goods costs the same in both countries. If inflation is higher in Country A than Country B, Country A's currency should depreciate to maintain purchasing power equivalence.

PPP is a terrible short-term predictor but a decent long-run anchor. The Economist's "Big Mac Index" illustrates this — it tracks whether currencies are over/undervalued relative to PPP by comparing Big Mac prices globally.

**Example:** Turkey's inflation hit 80%+ in 2022. The Turkish lira lost ~75% of its value against USD over 2–3 years — exactly what PPP theory would predict.

---

## 3. Economic Growth and Relative Performance

Faster-growing economies attract more investment (FDI, portfolio flows), creating currency demand. US GDP growth outpacing Europe in 2022–2024 contributed to USD strength.

**Key indicators traders watch:**
- GDP growth rate vs consensus expectations
- PMI (Purchasing Managers Index) — business activity survey
- Unemployment and employment data
- Retail sales, industrial production

A "better than expected" GDP print can cause a currency to rally sharply in minutes.

---

## 4. Trade Balance and Current Account

The **trade balance** = exports minus imports.

A country that exports more than it imports has foreigners buying its currency to pay for goods. Persistent surplus → currency appreciation pressure.

Japan (for decades) and Germany run large trade surpluses → structural demand for JPY and EUR.

The US runs the world's largest trade deficit → structural dollar weakness pressure, offset by the dollar's reserve currency status and capital account inflows.

---

## 5. Capital Flows and Risk Sentiment

Foreign investors buying US stocks need USD. During equity bull markets, international investors buying US assets create dollar demand.

**Safe-haven flows:** During global crises (2008, 2020 COVID crash, 2022 Ukraine war), investors flee to "safe haven" currencies:
- **USD**: world's reserve currency, deepest and most liquid market
- **JPY**: Japan's large net creditor position — Japanese investors repatriate foreign assets during stress, buying JPY
- **CHF**: Switzerland's political neutrality and strong current account

In March 2020, even gold sold off initially because investors needed dollars — USD liquidity becomes everything in a crisis.

---

## 6. Political Risk and Policy Uncertainty

Elections, policy changes, and geopolitical events create currency volatility.

**Examples:**
- **GBP** fell 15%+ on the 2016 Brexit vote overnight
- **TRY** (Turkish lira) crashed 30% when Erdogan fired central bank governors who raised rates
- **GBP** fell sharply in 2022 when UK PM Truss announced unfunded tax cuts, triggering a gilt crisis
- **EM currencies** broadly weakened during 2018 US-China trade war on risk-off sentiment

---

## The Dollar Smile Theory

A useful framework: the dollar tends to strengthen in two scenarios:
1. **US outperformance** — US economy grows faster than the world → capital flows to US
2. **Global risk-off** — global recession/crisis → safe-haven demand for USD

The dollar weakens in the middle — when global growth is synchronized and risk appetite is high, capital flows away from the US into higher-growth markets.
`,
  },
  {
    title: 'Central Banks and Currency Policy',
    slug: 'central-banks-currency-policy',
    order: 3,
    published: true,
    content: `## Central Banks: The 800-Pound Gorillas of FX

Central banks can create or destroy their own currency at will. Their policy decisions are the single largest driver of exchange rate moves. Understanding them is non-negotiable for FX.

---

## The Major Central Banks

| Central Bank | Currency | Key Focus |
|-------------|---------|-----------|
| Federal Reserve (Fed) | USD | Dual mandate: inflation + employment |
| European Central Bank (ECB) | EUR | Price stability (2% inflation target) |
| Bank of Japan (BoJ) | JPY | Deflation fight, yield curve control |
| Bank of England (BoE) | GBP | Inflation target, financial stability |
| Swiss National Bank (SNB) | CHF | Currency level, price stability |
| Reserve Bank of Australia (RBA) | AUD | Inflation, employment, currency |
| Bank of Canada (BoC) | CAD | 2% inflation target |
| People's Bank of China (PBoC) | CNY | Managed exchange rate, growth |

---

## How Rate Decisions Move Currencies

When the Fed raises rates:
1. US bonds become more attractive (higher yield)
2. Global capital flows toward US assets
3. Demand for USD rises → USD strengthens
4. Emerging market currencies often weaken as capital leaves

When the Fed cuts rates:
1. USD becomes less attractive relative to other currencies
2. Capital seeks higher returns elsewhere
3. EM and commodity currencies often rally

**The "hawkish/dovish" spectrum:**
- **Hawkish**: focused on fighting inflation → rate hikes → currency strength
- **Dovish**: focused on growth/employment → rate cuts or low rates → currency weakness

---

## Currency Intervention

Central banks sometimes directly **intervene** in FX markets — buying or selling their currency to influence the exchange rate.

### Japan's Intervention History
The BoJ and Japanese Ministry of Finance regularly intervene when USD/JPY moves "too fast":
- 2022: Yen weakened to 152/USD → Japan sold $50B+ of USD to support yen
- 2024: Similar pattern — USD/JPY hit 160 → intervention

Japan holds ~$1 trillion in US Treasury reserves. Selling Treasuries gives them dollars to buy yen with, pushing the rate lower.

### The SNB's Extraordinary Intervention (2011–2015)
In 2011, the Swiss franc was so strong (safe-haven demand post-Euro crisis) that the SNB announced a **hard peg**: they would not allow EUR/CHF to fall below 1.20, promising to buy unlimited euros to defend it.

For 3.5 years, they printed Swiss francs and bought euros — amassing over CHF 500 billion in foreign reserves (nearly equal to Swiss GDP).

In January 2015, **they suddenly abandoned the peg**. EUR/CHF collapsed from 1.20 to 0.85 in minutes — a 30% move — one of the largest single-session currency moves ever seen. Multiple FX brokers went bankrupt. Retail traders with leveraged CHF positions lost everything before their stops could fill.

**Lesson: Never fight a central bank — and never assume a peg is permanent.**

---

## Yield Curve Control (YCC)

Japan ran an extraordinary policy called **Yield Curve Control** from 2016–2024:
- The BoJ set a cap on 10-year JGB yields (first 0%, then 0.25%, then 0.5%)
- To defend the cap, they bought unlimited JGBs — essentially monetizing government debt
- This kept rates ultra-low while the rest of the world hiked → massive JPY depreciation

When the BoJ finally started abandoning YCC in 2024, the yen rallied sharply and the global carry trade (borrow JPY, invest elsewhere) began unwinding.

---

## Reading a Central Bank Statement

Key things to look for:
1. **Rate decision** — obvious, but often already priced in
2. **Forward guidance** — "higher for longer," "data dependent," "gradual easing" — this is what moves markets
3. **Inflation language** — has inflation assessment changed?
4. **Growth assessment** — more/less optimistic?
5. **Dissents** — how many members voted differently? Signals future moves.

**Press conferences** often matter more than the statement itself. Ambiguous wording gets clarified. Traders parse every word for hawkish/dovish signals.

A Fed chair saying "we're *not* thinking about thinking about rate cuts" (Powell, June 2020) was a market-moving statement. Language is policy.
`,
  },
  {
    title: 'The Carry Trade and Interest Rate Differentials',
    slug: 'carry-trade',
    order: 4,
    published: true,
    content: `## What Is the Carry Trade?

The **carry trade** is one of the oldest and most consistently profitable strategies in FX — and one of the most dangerous when it unwinds.

**The mechanics:**
1. Borrow money in a **low-interest-rate currency** (historically JPY, CHF, EUR)
2. Convert to a **high-interest-rate currency** (AUD, NZD, BRL, TRY at various times)
3. Invest in that currency's assets
4. Profit = interest rate differential ("the carry") minus any exchange rate moves against you

---

## A Concrete Example

**The classic JPY carry trade (2020–2024):**

- Japan interest rate: 0.1%
- US interest rate: 5.25%
- Rate differential: **515 bps (5.15%)**

You borrow $10 million worth of yen at 0.1% → convert to USD → invest in US T-bills at 5.25%.

Annual income before any exchange rate move: ~$500,000

**The risk:** If JPY strengthens 6%+ against USD, you lose on the currency conversion more than you earn in carry. The entire position unwinds at a loss.

---

## Why the Carry Trade Works (And Why It Dies)

**Why it works:** Interest rate differentials persist because of structural differences in inflation, growth, and central bank policy. A country with persistently low rates and low inflation (Japan) will have persistently low yields. The carry can persist for years.

**Why it periodically blows up:** Carry trades are implicitly short volatility. They look like free money in calm markets. But when global risk appetite flips — a recession, a geopolitical shock, a financial crisis — everyone rushes to close their positions simultaneously.

To close a JPY carry trade: you sell high-yield assets (stocks, EM bonds) and buy back JPY. This creates:
1. Selling pressure in global risk assets
2. Sharp JPY appreciation
3. Higher losses as JPY rises, forcing more selling → feedback loop

---

## The August 2024 Carry Trade Unwind

One of the most dramatic carry trade unwinds in history:

**What happened:**
- Bank of Japan unexpectedly raised rates in July 2024
- USD/JPY had reached 162 — extreme yen weakness from years of near-zero rates
- The rate hike signal triggered massive carry trade unwinding
- USD/JPY fell from 162 to 142 in weeks — a 12% move

**The spillover:**
- Global equities sold off sharply (Nikkei 225 fell 12% in one day — largest single-day drop since 1987)
- Nasdaq dropped 10% in days
- Traders who had borrowed in yen to buy US tech stocks faced margin calls on both legs simultaneously

The estimated size of the yen carry trade at peak: **$4+ trillion**. When that unwinds, it's not a currency story — it's a global asset story.

---

## Measuring Carry: The Forward Rate

The **forward exchange rate** embeds the interest rate differential via **covered interest rate parity**:

\`\`\`
Forward Rate = Spot Rate × (1 + domestic rate) / (1 + foreign rate)
\`\`\`

If US rates are higher than Japanese rates, the USD forward rate is *lower* than the spot rate — the dollar is expected to depreciate to offset the carry advantage. In theory, you can't make risk-free carry arbitrage.

In practice, the "**uncovered interest rate parity**" (which says you'll lose on the exchange rate what you gain in carry) fails empirically — currencies with high rates often continue appreciating or stay flat, allowing carry trades to be profitable for extended periods.

---

## Currencies Known for Carry

| Role | Currencies | Reason |
|------|-----------|--------|
| **Funding** (borrow) | JPY, CHF, EUR | Persistent low rates |
| **High-yield** (invest) | AUD, NZD, BRL, TRY, ZAR | Higher rates, commodity exposure |

The riskiest high-yield carries are emerging market currencies (TRY, BRL, ZAR) — the interest rate differential looks attractive, but currency depreciation and political risk often outpace the carry. Turkey's lira, for example, has lost 90%+ of its USD value over the past decade despite offering 20%+ interest rates.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 5: TRADING & MARKET MECHANICS
// ---------------------------------------------------------------------------

const tradingCourse = {
  title: 'Trading & Market Mechanics',
  slug: 'trading-market-mechanics',
  summary: 'How markets actually work under the hood — order types, market microstructure, market makers, high-frequency trading, and the tools active traders use to manage risk.',
  tags: 'trading, HFT, market microstructure, order flow',
  published: true,
  order: 5,
};

const tradingLessons = [
  {
    title: 'Order Types: How Trades Actually Get Executed',
    slug: 'order-types',
    order: 0,
    published: true,
    content: `## Not All Orders Are Equal

Every trade you place is an instruction to the market. The *type* of order you use determines when you get filled, at what price, and what happens if conditions change. Understanding order types is the difference between good and terrible execution.

---

## Market Order

A **market order** executes immediately at the best available price. You're prioritizing speed over price certainty.

**Use when:** You need immediate execution and the bid-ask spread is tight (liquid stocks/ETFs).

**Risk:** In illiquid or fast-moving markets, you can experience significant **slippage** — the difference between the price when you submitted the order and the price you actually receive.

**Example:** Apple is trading at $185.00 bid / $185.01 ask. You place a market buy for 100 shares. You expect to pay ~$185.01. But if the stock is moving fast and multiple orders are ahead of yours, you might pay $185.05 or more.

---

## Limit Order

A **limit order** executes at your specified price *or better*. You're prioritizing price certainty over execution speed.

- **Buy limit**: execute at this price or *lower*
- **Sell limit**: execute at this price or *higher*

**Use when:** You have a specific entry/exit price in mind and can wait for it.

**Risk:** You might not get filled at all if the price never reaches your limit.

**Example:** AAPL is at $185. You place a buy limit at $183. If AAPL dips to $183 during the day, your order fills. If it never drops to $183, you don't buy.

---

## Stop Order (Stop-Loss)

A **stop order** triggers a market order when the price hits a specified level (the stop price). Most commonly used as a "stop-loss."

- **Stop-sell**: triggers below a price — protects against downside
- **Stop-buy**: triggers above a price — used to enter breakouts

**Example:** You own AAPL at $185, stop at $175. If AAPL drops to $175, your stop triggers and a market sell order is placed at the next available price.

**Risk:** In a fast-moving or gapping market, you might fill at $170 — well below your stop. This is called **gap risk**.

---

## Stop-Limit Order

Combines a stop trigger with a limit order — when the stop price is hit, it places a *limit* order rather than a market order.

**Example:** Stop at $175, limit at $173. If the stock drops to $175, a limit sell at $173 is placed. You won't sell below $173 — but you also might not sell at all if the stock gaps below $173.

Use stop-limits when you want price control; use stop-markets when you want guaranteed exit regardless of price.

---

## Trailing Stop

A **trailing stop** moves with the stock price in your favor but locks in if the stock reverses.

**Example:** You own a stock at $100. You set a 10% trailing stop ($90). Stock rises to $120 — your stop moves up to $108 (10% below $120). Stock then falls to $108 → sell triggered. You captured the rise from $100 to $108.

Trailing stops are powerful for letting winners run while protecting gains.

---

## Time-in-Force Conditions

Every order also has a duration:

| Condition | Meaning |
|-----------|---------|
| **DAY** | Cancels at end of trading day if unfilled |
| **GTC** (Good Till Cancelled) | Stays open until filled or manually cancelled |
| **IOC** (Immediate or Cancel) | Fill as much as possible immediately, cancel the rest |
| **FOK** (Fill or Kill) | Fill the entire order immediately or cancel entirely |
| **GTD** (Good Till Date) | Stays open until a specified date |

---

## Slippage: The Hidden Cost

**Slippage** is the difference between the expected execution price and the actual fill price. It's most common with:

- Market orders in volatile conditions
- Large orders relative to available liquidity
- Trading less-liquid stocks (small-caps, penny stocks)

**Example:** You see NVDA at $900 and place a 1,000-share market buy. The order book only has 200 shares at $900.01, 300 at $900.10, 500 at $900.25. Your average fill: ~$900.16 — 15 cents of slippage on a 1,000-share order = $150 execution cost.

Professional traders obsess over slippage because it's a real cost that compounds over hundreds of trades.
`,
  },
  {
    title: 'Order Books and Price Discovery',
    slug: 'order-books-price-discovery',
    order: 1,
    published: true,
    content: `## The Order Book: The Heart of a Market

Every exchange maintains an **order book** — a real-time record of all outstanding limit orders to buy and sell a security. Understanding how it works demystifies how prices are actually determined.

---

## The Basic Structure

\`\`\`
         AAPL Order Book
   BIDS (Buyers)       ASKS (Sellers)
   Price    Size       Price    Size
   $184.95  500        $185.00  200
   $184.90  1,200      $185.05  800
   $184.85  300        $185.10  1,500
   $184.80  2,000      $185.20  600
\`\`\`

- **Best bid**: $184.95 (highest price anyone will pay)
- **Best ask**: $185.00 (lowest price anyone will sell for)
- **Spread**: $0.05 (5 cents)
- **Mid price**: $184.975

---

## How Trades Execute

When a market buy order arrives for 300 shares:
1. It hits the best ask ($185.00) and buys 200 shares (entire available quantity)
2. The best ask is now exhausted — it moves to $185.05
3. Remaining 100 shares execute at $185.05

Result: 200 shares at $185.00 + 100 shares at $185.05 = average price $185.02

This is **walking the order book** — large orders eat through multiple price levels.

---

## Level 1 vs. Level 2 Data

**Level 1**: Best bid/ask only — what most retail trading apps show. Sufficient for casual trading.

**Level 2 (DOM — Depth of Market)**: The full order book showing all price levels and quantities. Active traders use this to gauge supply/demand and potential support/resistance levels.

**Level 3**: Full order flow — every single order and cancellation in real time. Available to market makers and institutions.

---

## What the Order Book Reveals

**Thin vs. thick books:**
- A thick order book (large quantities at many price levels) means the security is **liquid** — you can buy/sell large quantities without moving the price much.
- A thin book (small quantities, wide spreads) means the security is **illiquid** — even modest orders can move the price significantly.

**Iceberg orders**: Large institutions often break massive orders into small visible pieces to avoid showing their hand. An order book might show only 200 shares at a level, but 50,000 might be hidden ("iceberg"). The visible portion is the "tip."

---

## Price Discovery

**Price discovery** is the process by which market prices emerge from the interaction of buyers and sellers. It incorporates all publicly available information in real time.

When Tesla announces earnings above consensus:
1. Hundreds of traders simultaneously want to buy
2. Buy orders overwhelm the existing ask side of the book
3. The book shifts upward — price rises until new sellers emerge at higher prices
4. A new equilibrium price that reflects the new information is established

This happens in milliseconds. The **efficient market hypothesis** rests on the idea that price discovery is so fast and complete that it's nearly impossible to consistently trade on publicly available information.

---

## Dark Pools

Not all trading happens on lit exchanges. **Dark pools** are private trading venues operated by banks and broker-dealers (Goldman Sachs Sigma X, JPMorgan, Liquidnet, etc.) where large institutional orders execute anonymously.

**Why they exist:**
- Institutions moving $50M+ of stock would move the price against themselves if they executed on a lit exchange
- In a dark pool, the order isn't visible until after execution, minimizing market impact

**Approximately 35–40% of US equity volume** executes off-exchange in dark pools. Critics argue this fragmentation is harmful to price discovery; supporters argue it reduces institutional trading costs.
`,
  },
  {
    title: 'Market Makers and Liquidity',
    slug: 'market-makers-and-liquidity',
    order: 2,
    published: true,
    content: `## What Is a Market Maker?

A **market maker** is a firm (or individual) that continuously quotes both buy (bid) and sell (ask) prices for a security, committing to buy from and sell to the public at those prices. They are in the business of providing **liquidity**.

Without market makers, you'd have to wait for a natural buyer to appear every time you wanted to sell — markets would be illiquid, slow, and extremely inefficient.

---

## How Market Makers Profit

A market maker's edge is the **bid-ask spread**. They buy at the bid and sell at the ask:

\`\`\`
Bid: $99.98
Ask: $100.02
Spread: $0.04 (4 cents)

Buy from seller at $99.98
Sell to buyer at $100.02
Profit: $0.04 per share
\`\`\`

On a stock with 10 million shares of daily volume and a 4-cent spread, the market maker captures ~$400,000 per day — before costs.

**The challenge**: they don't know if the person selling knows something they don't. If Goldman Sachs is selling 1 million shares of XYZ because they know earnings will miss, the market maker is on the wrong side of an informed trade.

---

## Adverse Selection: The Market Maker's Core Risk

**Adverse selection** is the risk that the counterparty is better-informed than you. Market makers constantly manage this:

- **Uninformed order flow** (retail investors, index fund rebalancing) → market maker profits
- **Informed order flow** (institutional investors with information edge) → market maker loses

This is why market makers widen spreads when:
1. News is imminent (earnings, Fed meetings) — uncertainty increases
2. The stock is moving fast — someone might know something
3. Large institutional orders arrive — likely informed

---

## Payment for Order Flow (PFOF)

In the US, retail brokers (Robinhood, TD Ameritrade, etc.) send customer orders to **wholesale market makers** (Citadel Securities, Virtu) rather than directly to exchanges. The wholesale market maker pays the broker for this "order flow."

Why do wholesale market makers pay for retail orders? Because retail traders are the least likely to be informed — they're high-quality, profitable counterparties for the market maker.

The retail trader gets slightly better prices than the public exchange quote (called "price improvement"). The broker gets paid. The market maker profits from the spread.

**Critics** argue PFOF creates a conflict of interest — brokers are paid to route to market makers, not necessarily to achieve the best execution for their customers.

---

## Designated Market Makers vs. Electronic Market Makers

### NYSE Specialists (now DMMs)
The NYSE historically used human "specialists" who were obligated to maintain fair and orderly markets in assigned stocks — buying when no one else would, stabilizing prices during crashes.

**During the 1987 Black Monday crash**, some specialists abandoned their posts and stopped answering phones — a major regulatory failure. Rules were tightened afterward.

Modern **Designated Market Makers (DMMs)** on NYSE still have obligations to maintain two-sided markets and facilitate opening/closing auctions.

### Electronic Market Makers
Firms like **Citadel Securities**, **Virtu Financial**, and **Jane Street** run algorithmic market-making operations. They quote millions of securities simultaneously using sophisticated algorithms that adjust prices in microseconds based on order flow, volatility, and inventory.

Citadel Securities alone handles ~27% of all US equity volume.

---

## Liquidity Premium

Less liquid assets **must offer higher expected returns** to attract buyers willing to accept the trading friction. This is the **liquidity premium**.

- Small-cap stocks yield more than large-caps (partly)
- Corporate bonds yield more than Treasuries (partly)
- Private equity targets returns of 15–20%+ (partly because investors are locked up for 10 years)

When you accept illiquidity — as a long-term investor — you're implicitly collecting this premium. This is one genuine edge for patient, long-term investors over hyperactive traders.
`,
  },
  {
    title: 'High-Frequency Trading (HFT) Explained',
    slug: 'high-frequency-trading-hft',
    order: 3,
    published: true,
    content: `## What Is HFT?

**High-frequency trading (HFT)** is the use of powerful computers and algorithms to execute large volumes of orders at extremely high speeds — measured in microseconds (millionths of a second) or even nanoseconds.

HFT firms don't hold positions overnight. They aim to make tiny profits on enormous volume, completing thousands to millions of trades per day. A single HFT firm might turn over their entire portfolio hundreds of times per day.

---

## The Infrastructure Arms Race

Speed is everything in HFT. Every microsecond advantage translates to profit. Firms compete on:

### Co-location
HFT firms pay exchanges **$10,000–$50,000+ per month** to physically place their servers inside the exchange's data center. The closer your computer to the matching engine, the faster your orders arrive.

A server in Chicago sending an order to NYSE (New Jersey) takes ~17 milliseconds. A co-located server takes ~200 microseconds. That 16.8 millisecond edge is everything.

### Microwave and Laser Networks
Fiber optic cables are slower than the theoretical maximum because light travels slower in glass than in air. HFT firms built **microwave relay networks** between major financial centers — Chicago to New York, London to Frankfurt — to shave microseconds off transmission times.

The fastest route between Chicago and New York is now a series of microwave towers across the shortest geographical path. Some firms have even experimented with **laser communication systems** over open air.

### FPGAs and ASICs
Standard computer CPUs process instructions sequentially. HFT firms use **FPGAs** (Field-Programmable Gate Arrays) — specialized chips that can execute trading logic in hardware, not software, achieving nanosecond execution.

---

## HFT Strategies

### 1. Market Making
HFT firms act as automated market makers — continuously quoting bid and ask prices, profiting from the spread. They use predictive models to adjust quotes faster than any human can, managing inventory risk in microseconds.

### 2. Statistical Arbitrage (Stat Arb)
Exploiting temporary mispricing between related securities. If SPY (S&P 500 ETF) moves before ES (S&P 500 futures), an HFT firm can buy the lagging instrument before it catches up — a pure latency arbitrage.

### 3. Latency Arbitrage
If Stock X trades on NYSE and BATS, a price discrepancy might exist for 500 microseconds as information propagates between exchanges. HFT firms arbitrage this away — profiting from institutional traders who post limit orders on multiple venues.

### 4. Momentum and Quote Stuffing
Controversial strategies that involve flooding exchanges with thousands of orders per second to slow down competitors' systems ("quote stuffing") or detect and front-run large institutional orders by analyzing patterns in the order flow.

---

## The Flash Crash of May 6, 2010

At 2:32 PM on May 6, 2010, the US equity market experienced one of the most bizarre events in history:
- The Dow Jones fell ~1,000 points (9%) in minutes
- Stocks like Accenture briefly traded for $0.01
- Procter & Gamble fell from $60 to $39 in seconds
- Then, within 36 minutes, markets fully recovered

**What happened:**
A large mutual fund (Waddell & Reed) sold $4.1 billion of E-mini futures using a simple sell algorithm. HFT market makers, sensing unusual order flow, **withdrew their liquidity** simultaneously — leaving no buyers.

The SEC's investigation revealed fragility in automated markets: when HFT liquidity providers all withdraw at once, prices can move in ways impossible in traditional markets.

---

## The IEX Story

In 2013, a group of traders and technologists built **IEX** (Investor's Exchange) as a response to HFT practices they considered predatory. Their solution: a **350-microsecond speed bump** — a coil of fiber optic cable (38 miles!) built into their matching engine.

This tiny delay prevents HFT firms from latency-arbitraging price changes between IEX and other exchanges.

Michael Lewis documented the story in **Flash Boys** (2014) — which became a bestseller and sparked intense debate about whether HFT is good or bad for markets. The truth is nuanced: HFT has dramatically tightened bid-ask spreads and improved liquidity for retail investors, while simultaneously disadvantaging certain institutional traders.

---

## Does HFT Help or Hurt?

**Arguments FOR HFT:**
- Dramatically tightened bid-ask spreads since 2000s (from $0.10+ to <$0.01)
- Massive increase in liquidity — easier to execute large orders
- Price discovery happens faster and more accurately
- Arbitrage keeps prices consistent across venues

**Arguments AGAINST HFT:**
- Creates artificial volatility during stress (liquidity disappears when needed most)
- Front-running institutional orders effectively taxes long-term investors
- Arms race wastes enormous capital on infrastructure with no social utility
- Flash crashes demonstrate systemic fragility

**Bottom line:** HFT has lowered transaction costs for retail investors. But it has also created a two-tiered market where institutional investors with non-trivial order flow face systematic front-running. The debate is ongoing.
`,
  },
  {
    title: 'Technical Analysis: Charts, Patterns & Indicators',
    slug: 'technical-analysis',
    order: 4,
    published: true,
    content: `## What Is Technical Analysis?

**Technical analysis (TA)** is the study of historical price and volume data to forecast future price movements. Technicians believe all available information is already reflected in the price, and that patterns in price and volume repeat because human psychology repeats.

Contrast with **fundamental analysis**, which focuses on a company's business — earnings, cash flows, competitive position. Many successful investors combine both.

---

## The Building Blocks: Candlestick Charts

Most traders use **candlestick charts**, which originated in 18th-century Japan (rice futures markets).

Each candle represents a time period (1 minute, 1 hour, 1 day, etc.) and shows:

\`\`\`
         High ──── │
                   │
         Open ─── ┌─┐ ← Green/White = Close > Open (bullish)
                  │ │
         Close ── └─┘ ← Red/Black = Close < Open (bearish)
                   │
         Low  ──── │
\`\`\`

The **body** (rectangle) shows the open-to-close range. The **wicks** (thin lines) show the high and low.

**Key single-candle patterns:**
- **Doji**: open ≈ close — indecision
- **Hammer**: small body, long lower wick — potential reversal after downtrend
- **Shooting star**: small body, long upper wick — potential reversal after uptrend

---

## Support and Resistance

**Support**: a price level where buying demand has historically prevented further price decline. Traders watch for price to "bounce" off support.

**Resistance**: a price level where selling supply has historically prevented further price advance. Traders watch for price to "fail" at resistance.

**Why they work:** These levels exist in many traders' minds simultaneously. When price approaches a known support, enough traders place buy orders that it becomes self-fulfilling. This is the "reflexivity" of TA.

When support breaks, it often becomes resistance. When resistance breaks, it becomes support.

---

## Moving Averages

A **moving average** smooths out price data to show the underlying trend.

### Simple Moving Average (SMA)
Average of the last N closing prices.

**Golden Cross / Death Cross:**
- **Golden Cross**: 50-day SMA crosses above 200-day SMA → bullish signal
- **Death Cross**: 50-day SMA crosses below 200-day SMA → bearish signal

These are lagging indicators — they confirm trend changes after they happen.

### Exponential Moving Average (EMA)
Weights recent prices more heavily than older prices. More responsive to recent moves than SMA.

---

## Key Indicators

### RSI (Relative Strength Index) — Momentum
Measures the speed of price changes. Ranges 0–100.
- **Above 70**: overbought — potential reversal or correction
- **Below 30**: oversold — potential bounce
- Best used in ranging (sideways) markets; in strong trends, RSI can stay overbought for extended periods.

### MACD (Moving Average Convergence Divergence) — Trend
Plots the difference between 12-day EMA and 26-day EMA. A signal line (9-day EMA of MACD) is overlaid.
- MACD crossing above signal line → bullish
- MACD crossing below signal line → bearish

### Bollinger Bands — Volatility
A moving average with bands plotted 2 standard deviations above and below.
- Price touching the upper band → extended / overbought
- Price touching the lower band → extended / oversold
- **Bollinger Squeeze**: narrow bands signal low volatility → often precedes a big move (direction unknown)

---

## Volume: The Most Honest Indicator

**Volume** is the number of shares (or contracts) traded in a period. It's the only indicator that cannot be gamed by the price action itself.

Key principles:
- **Rising price + rising volume** → strong trend (conviction)
- **Rising price + falling volume** → weak trend (distribution — insiders selling into strength)
- **Price breaks support on high volume** → genuine breakdown (more reliable than low-volume break)
- **Volume spike at bottoms** → capitulation — potential trend reversal

---

## Does Technical Analysis Work?

The honest answer: **sometimes, for specific strategies, in specific markets, with strict risk management.**

Academic evidence is mixed:
- Many "classic" patterns (head and shoulders, cup and handle) have weak academic support
- Moving average crossover systems work in trending markets, fail in ranging markets
- Market microstructure research finds short-term price predictability at high frequencies — but not at retail trading speeds

Why technical levels still matter: they're **self-fulfilling**. If millions of traders watch the 200-day moving average, enough of them act on it that it becomes a meaningful support/resistance level. The belief creates the reality.

**The real edge in TA** is not pattern recognition but **risk management** — using technical levels to define entry points, set stops, and size positions.
`,
  },
  {
    title: 'Active Risk Management: Position Sizing, Drawdowns & Psychology',
    slug: 'active-risk-management',
    order: 5,
    published: true,
    content: `## Risk Management is the Entire Game

Experienced traders have a saying: "Everyone has a plan until they take a 30% loss." Risk management is not a supplemental skill — it's the core skill. The best traders in the world are not necessarily right more often; they simply lose less when wrong.

Paul Tudor Jones: *"Don't focus on making money; focus on protecting what you have."*

---

## The Kelly Criterion: Optimal Position Sizing

The **Kelly Criterion** calculates the theoretically optimal fraction of your portfolio to bet on each trade to maximize long-term growth:

\`\`\`
Kelly % = (Edge / Odds) = (bp - q) / b
\`\`\`

Where:
- b = decimal odds received (gain per unit)
- p = probability of winning
- q = probability of losing (1 - p)

**Example:**
- Trade wins 60% of the time
- Win: +20%, Loss: -15%
- Kelly = (0.60 × 0.20 - 0.40 × 0.15) / 0.20 = 17%

**The half-Kelly rule**: Many professional traders use *half Kelly* (8.5% in this example) because:
1. Estimates of edge are rarely precise
2. Full Kelly has very high variance
3. Half Kelly reduces drawdowns substantially with minimal impact on long-run growth

---

## Maximum Drawdown: The Number That Matters Most

**Maximum drawdown** is the largest peak-to-trough decline in portfolio value. It tells you the worst experience a strategy would have delivered historically.

\`\`\`
Example equity curve: 100 → 150 → 90 → 200
Maximum drawdown: (150 - 90) / 150 = 40%
\`\`\`

Why drawdown matters more than average return:
- A 50% drawdown requires a 100% return just to get back to even
- A 30% drawdown requires 43% to recover
- Large drawdowns test psychological endurance — most investors bail near the bottom

**Managing max drawdown:**
1. Position sizing limits (1–2% risk per trade)
2. Sector/correlation limits
3. Pre-defined maximum portfolio drawdown where you reduce risk (e.g., if portfolio drops 10%, cut risk 50%)

---

## The Sharpe Ratio: Return Per Unit of Risk

\`\`\`
Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Standard Deviation
\`\`\`

A Sharpe of 1.0 means you're earning 1% of excess return per 1% of volatility — acceptable but not great.
A Sharpe of 2.0+ is exceptional. Renaissance Technologies' Medallion Fund reportedly has a Sharpe of 5–6+ (before fees).

**The Sortino Ratio** improves on Sharpe by only penalizing *downside* volatility (positive volatility is not bad):
\`\`\`
Sortino = (Return - Risk-Free Rate) / Downside Deviation
\`\`\`

---

## Stop Losses: The Mechanics of Saving Yourself From Yourself

A **stop loss** is a pre-determined price at which you will exit a position. The word "stop" is key — it stops your loss from getting worse.

**Setting stop losses:**
- **Volatility-based**: place stop at 2× average daily range below entry (ATR stop)
- **Support-based**: place stop below a significant technical level
- **Percentage-based**: place stop at 5–8% below entry (common for swing traders)
- **Dollar-based**: risk a fixed dollar amount per trade (most consistent)

**The hard truth**: most retail traders move their stops lower when approached. This is catastrophic — it turns a disciplined system into a hope-based approach.

---

## The Psychology of Trading: Cognitive Traps

### Loss Aversion
People feel losses ~2× as intensely as equivalent gains. This causes traders to:
- Hold losing positions too long ("it'll come back")
- Cut winning positions too early (booking the dopamine hit)

The rational approach: cut losers quickly, let winners run. This is psychologically extremely difficult.

### FOMO (Fear of Missing Out)
Chasing price after a big move — buying the top because you're afraid of missing more upside. One of the most reliable ways to lose money.

### Revenge Trading
Taking larger, more aggressive positions after a loss to "make it back." Your emotional state is the worst input into a trading decision. Many single-day blowups come from traders who were down 5%, took a larger bet to recover, and ended the day down 30%.

### Anchoring
Excessive attachment to an entry price. "I bought at $50 and it's at $30 — I'll wait for it to get back to $50." The entry price is irrelevant to whether the stock is a good hold going forward.

---

## Building a Trading System

A professional trading approach includes:
1. **Defined edge** — why should this trade work? What information or structural advantage do I have?
2. **Entry criteria** — specific conditions that must be met before entering
3. **Position size** — calculated before entry based on risk parameters
4. **Stop loss** — defined before entry, not adjusted emotionally
5. **Take profit / management rules** — when/how to exit winners
6. **Trade log** — every trade recorded for review and improvement
7. **Periodic review** — are you actually executing the system? Is the edge still there?

Without a system, you're not trading — you're gambling. The markets will redistribute your capital to those with systems.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 6: MACRO INVESTING
// ---------------------------------------------------------------------------

const macroCourse = {
  title: 'Macro Investing',
  slug: 'macro-investing',
  summary: 'Understanding the big economic forces that drive all asset classes — monetary policy, fiscal cycles, business cycles, debt dynamics, and how global macro traders position around them.',
  tags: 'macro, central banks, business cycles, global',
  published: true,
  order: 6,
};

const macroLessons = [
  {
    title: 'Monetary Policy and Central Banks',
    slug: 'monetary-policy-central-banks',
    order: 0,
    published: true,
    content: `## What Is Monetary Policy?

**Monetary policy** is how a central bank manages the money supply and interest rates to achieve macroeconomic objectives. In the US, this is the Federal Reserve's primary job. Every major central bank in the world conducts monetary policy — and their decisions collectively set the price of money globally.

---

## The Fed's Dual Mandate

The Federal Reserve was established in 1913 with two Congressional mandates:

1. **Maximum employment** — keep unemployment as low as possible without triggering inflation
2. **Stable prices** — maintain inflation at approximately 2% per year

These two goals are often in tension. Low unemployment tends to push wages and prices higher (inflation). High inflation requires rate hikes that slow hiring and can cause unemployment to rise.

---

## How the Fed Controls Interest Rates

The **Federal Funds Rate** is the overnight lending rate between commercial banks. The Fed doesn't directly set all interest rates — it sets this one rate, which ripples through the entire economy.

**The transmission mechanism:**
\`\`\`
Fed Funds Rate 
  → Short-term bank lending rates
  → Prime rate (consumer and business loans)
  → Auto loans, credit card rates
  → Mortgage rates (via influence on 10-year Treasury)
  → Corporate bond yields
  → Economic activity: spending, borrowing, investing
\`\`\`

**When the Fed raises rates:** Borrowing becomes more expensive → businesses invest less → consumers spend less on credit → economic activity slows → inflation eventually falls

**When the Fed cuts rates:** Borrowing becomes cheaper → stimulus for economic activity → higher asset prices → potentially higher inflation

---

## The FOMC

Rate decisions are made by the **Federal Open Market Committee (FOMC)** — 12 voting members including the Fed Chair, the NY Fed President, and rotating district Fed presidents.

They meet **8 times per year** (every 6–7 weeks). Between meetings, the Fed communicates via speeches, interviews, and testimony to signal upcoming decisions — a process called **forward guidance**.

Markets price Fed decisions with probabilities using Fed Funds futures. A "75% chance of a 25 bps hike" means the market has largely priced the move — it's the surprise moves (or surprises in the statement language) that cause the biggest market reactions.

---

## Quantitative Easing (QE) and Quantitative Tightening (QT)

When rates reach zero, the Fed loses its primary tool. This happened in 2008 and again in 2020. The response: **Quantitative Easing (QE)**.

**QE:** The Fed buys long-term Treasury bonds and mortgage-backed securities, injecting reserves into the banking system. This:
- Pushes down long-term interest rates (lower mortgage rates, corporate borrowing costs)
- Forces investors out of safe assets into riskier ones ("portfolio rebalancing effect")
- Supports asset prices

**The Fed's balance sheet** expanded from ~$900B in 2008 to ~$8.9T in 2022.

**QT (Quantitative Tightening):** The reverse — the Fed allows bonds to mature without reinvestment (or actively sells), shrinking the balance sheet. This tightens financial conditions and pressures asset prices. The Fed ran QT aggressively in 2022–2024.

---

## How to Read a Fed Statement and Press Conference

**What to look for in the statement:**
- Rate decision (buy/hold/sell) — usually known in advance via futures
- Changes to the economic assessment paragraph — is growth stronger/weaker?
- Changes in inflation language — "elevated," "sticky," "moving toward 2%"
- Vote count — any dissents?

**Press conference signals:**
- "Higher for longer" → rates staying elevated, bond prices fall
- "Data dependent" → future moves uncertain, volatility rises
- "Prepared to act if needed" → potential hike still on table
- "We're cautious about easing too soon" → hawkish; short rates stay high

A Fed chair who says "we're not even thinking about thinking about raising rates" (Powell, 2021) is giving very strong forward guidance. Markets move more on surprises than on confirmed moves.

---

## The ECB, BoJ, and BoE

**European Central Bank (ECB)**: Manages policy for 20 eurozone countries. The fundamental tension: Germany wants price stability (scarred by Weimar hyperinflation) while southern European countries need stimulus. The 2012 euro debt crisis was resolved partly by ECB President Draghi's "whatever it takes" speech — 8 words that ended a sovereign debt crisis.

**Bank of Japan (BoJ)**: Fought deflation for 30 years (1990s "Lost Decade" through 2020s). Used zero interest rate policy (ZIRP) continuously and ran the world's most aggressive QE program relative to GDP. When the BoJ finally pivoted to rate hikes in 2024, it triggered a global carry trade unwind.

**Bank of England (BoE)**: Set an important precedent in 2022 — the UK's Truss government announced large unfunded tax cuts, triggering a gilts crisis. The BoE had to reverse its own QT program and buy bonds to prevent pension fund collapse — demonstrating how rapidly fiscal policy mistakes can destabilize bond markets.
`,
  },
  {
    title: 'Fiscal Policy, Deficits, and Government Debt',
    slug: 'fiscal-policy-deficits-debt',
    order: 1,
    published: true,
    content: `## Fiscal Policy vs. Monetary Policy

| | Monetary Policy | Fiscal Policy |
|-|----------------|---------------|
| Who controls it | Central bank (independent) | Government/legislature |
| Tools | Interest rates, QE/QT | Spending, taxes |
| Speed | Fast (FOMC meets 8x/year) | Slow (legislative process) |
| Scope | Financial conditions, money cost | Aggregate demand, income redistribution |

Monetary policy works by making money cheaper or more expensive. Fiscal policy works by directly injecting or removing money from the economy.

---

## Government Spending and the Multiplier Effect

When the government spends $1, it doesn't just create $1 of economic activity. The recipient spends some of it, who creates income for someone else, who spends some of that, and so on.

**Fiscal multiplier** = total GDP increase / initial government spending

In practice, multipliers range from 0.5 to 1.5 depending on:
- How the spending is financed (taxes, borrowing, or money printing)
- Whether the economy is at full capacity or has slack
- The type of spending (infrastructure has higher multipliers than transfers)
- The level of interest rates (in a liquidity trap, multipliers are higher)

**Keynesian economics**: government should spend during recessions to stimulate demand. The 2009 American Recovery and Reinvestment Act ($787 billion) and the 2020 CARES Act (~$2 trillion) are examples.

---

## Deficits and National Debt

**Budget deficit** = government spending - tax revenues (for a single year)

**National debt** = accumulated deficits over all years

The US federal debt crossed $35 trillion in 2024, with annual deficits running $1.5–2 trillion. This matters because:

1. **Interest payments**: At 5% rates, the US pays $700–800 billion per year just in interest on existing debt — more than the entire defense budget
2. **Crowding out**: Government borrowing competes with private sector for capital, potentially pushing up long-term rates
3. **Debt sustainability**: At what point does the market demand higher yields to hold government debt?

---

## Debt-to-GDP: The Key Ratio

**Debt-to-GDP** compares the stock of debt to the size of the economy — a measure of debt sustainability.

| Country | Debt/GDP (approx. 2024) |
|---------|------------------------|
| Japan | ~260% |
| Italy | ~145% |
| US | ~120% |
| France | ~110% |
| Germany | ~65% |
| Australia | ~55% |

Japan has carried 200%+ debt/GDP for decades without a crisis — because it borrows in its own currency, the BoJ can monetize debt, and most debt is held domestically (Japanese savers don't flee to foreign assets).

The risk is different for countries that borrow in foreign currencies (common in emerging markets) — as we discussed in the FX course.

---

## Bond Vigilantes

**Bond vigilantes** are bond market participants who force fiscal discipline by selling government bonds (pushing yields higher) when they believe fiscal policy is irresponsible.

James Carville (Clinton advisor): *"I used to think that if there was reincarnation, I wanted to come back as the president or the pope... But now I want to come back as the bond market. You can intimidate everybody."*

**The 2022 UK Gilt Crisis:**
When PM Liz Truss announced £45 billion of unfunded tax cuts in September 2022:
1. UK gilt (government bond) yields spiked sharply
2. The pound fell 4% in a day
3. Pension funds using liability-driven investment (LDI) strategies faced margin calls
4. The Bank of England had to intervene to prevent a systemic collapse
5. Truss resigned after 45 days — the shortest-serving UK PM in history

Bond markets ended a government. This is the bond vigilante mechanism in action.

---

## Modern Monetary Theory (MMT): The Controversial Alternative

**MMT** argues that governments that issue their own currency (the US, UK, Japan) can never truly "run out of money" and can always print to service debt. The real constraint on spending is inflation, not fiscal solvency.

MMT policy implication: don't worry about deficits; if inflation rises, raise taxes to reduce money supply.

**Mainstream pushback:** MMT ignores:
- Confidence in the currency (hyperinflation risk)
- International holders of USD debt who can flee
- The transmission mechanism of inflation becoming entrenched
- Political difficulty of raising taxes when needed

The 2020–2021 COVID fiscal response (direct payments, enhanced unemployment) was the closest real-world MMT experiment. The result: inflation surged to 9% in 2022.
`,
  },
  {
    title: 'Business Cycles and Asset Class Performance',
    slug: 'business-cycles-asset-classes',
    order: 2,
    published: true,
    content: `## What Is a Business Cycle?

The **business cycle** is the recurring pattern of expansion and contraction in economic activity. No economy grows in a straight line — it oscillates between boom and bust, driven by credit cycles, inventory cycles, consumer confidence, and policy responses.

Understanding where you are in the cycle is the foundation of macro investing.

---

## The Four Phases

### 1. Expansion
- GDP growing above trend
- Employment rising, unemployment falling
- Corporate profits growing
- Consumer and business confidence high
- Credit availability increasing
- Inflation starting to pick up

**Asset class performance (historically best):**
- Equities — especially cyclicals (financials, industrials, consumer discretionary, tech)
- High-yield bonds (spreads compress)
- Commodities (demand rising)
- Real estate

### 2. Peak
- Growth at maximum but rate of change declining
- Full employment, wage growth accelerating
- Inflation elevated
- Central bank tightening (raising rates)
- Credit becoming more restrictive
- Corporate margins peaking

**Asset class shifts:**
- Equities → defensive sectors (healthcare, utilities, staples) outperform
- Commodities — often peak here (energy, metals)
- TIPS (inflation-linked bonds) outperform
- Short-duration bonds (avoid rate hike damage)

### 3. Contraction (Recession)
- GDP falling for two or more consecutive quarters
- Unemployment rising
- Corporate profits falling, earnings revisions negative
- Credit conditions tightening sharply
- Central bank cutting rates (eventually)

**Asset class performance:**
- Government bonds (Treasury rally as yields fall)
- Gold (safe haven, monetary hedge)
- Defensive equities (healthcare, utilities, consumer staples)
- Cash — capital preservation

**Badly hurt:**
- Equities — especially cyclicals
- High-yield bonds (spreads blow out)
- Commodities (demand destruction)

### 4. Trough
- Recession bottoming
- Economic data worst but starting to stabilize
- Fed cutting aggressively
- Sentiment at maximum pessimism (good time to buy)
- Leading indicators turning up

**Asset class performance (forward-looking):**
- Small-cap equities (recover fastest)
- Cyclicals and early growth sectors
- Credit spreads starting to compress
- Industrial metals (copper is the best leading indicator)

---

## Leading, Lagging, and Coincident Indicators

**Leading indicators** (turn before the economy):
- Yield curve (inverts before recession)
- ISM Manufacturing PMI (Purchasing Managers Index)
- Building permits, housing starts
- Stock prices (6 months ahead)
- Conference Board Leading Economic Index (LEI)

**Coincident indicators** (move with the economy):
- GDP
- Industrial production
- Personal income

**Lagging indicators** (turn after the economy):
- Unemployment (rises after recession starts; falls after recovery begins)
- CPI inflation (prices adjust slowly)
- Corporate profits (reported quarterly with delay)

**The NBER officially declares recessions** based on a committee's assessment of depth, duration, and diffusion across sectors — they often declare recessions months after they begin.

---

## Sector Rotation Framework

Different equity sectors outperform at different phases of the cycle:

| Cycle Phase | Outperforming Sectors | Underperforming |
|------------|----------------------|-----------------|
| Early Expansion | Financials, Consumer Discretionary, Tech | Utilities, Staples |
| Mid Expansion | Industrials, Materials, Energy | Defensives |
| Late Expansion | Energy, Materials, Healthcare | Tech, Consumer Disc |
| Recession | Healthcare, Utilities, Staples, Consumer Staples | Industrials, Financials |
| Early Recovery | Financials, Consumer Discretionary, Industrials | Defensives |

**Caveat**: This framework is helpful but imprecise — cycles vary in length, and the market is forward-looking (often rotating before the economic data confirms the shift).

---

## The Profit Cycle

Corporate earnings drive stock prices over the medium term. The **earnings cycle** lags the economic cycle:

1. Revenue turns down first (sales fall as economy slows)
2. Companies cut costs (reduce headcount, capex, inventory)
3. Margins contract before cost-cutting takes effect
4. Earnings trough, then recover with revenue
5. Operating leverage: as revenue recovers, margins expand rapidly (fixed costs spread over more units)

This is why companies with high **operating leverage** (lots of fixed costs: airlines, manufacturers, tech companies with high R&D) have amplified earnings cycles — they fall harder in recessions but recover faster and farther in expansions.
`,
  },
  {
    title: "Ray Dalio's Template: Debt Supercycles and Deleveraging",
    slug: 'dalio-debt-cycles',
    order: 3,
    published: true,
    content: `## The Productivity Machine Plus Two Debt Cycles

Ray Dalio's framework for understanding economies is one of the most intuitive macro models ever constructed. His animated video "How the Economic Machine Works" explains it in 30 minutes and has been watched over 40 million times. This lesson goes deeper.

The economy is driven by three forces:
1. **Productivity growth** — long-run driver, relatively steady
2. **Short-term debt cycle** — 5–8 years, driven by credit expansion and contraction
3. **Long-term debt cycle** — 50–75 years, the grand debt supercycle

---

## The Engine: Credit and Spending

**Credit** = the ability to buy something today with a promise to pay tomorrow.

Every transaction has a buyer and a seller. Every dollar spent creates a dollar of income for someone else. When credit expands, spending grows faster than productivity — the economy booms. When credit contracts, the reverse happens.

This creates cycles:

**Credit expansion phase:**
- Banks lend freely
- Consumers and businesses borrow to spend more
- Asset prices rise (stocks, real estate) — which makes people feel wealthier
- More borrowing against higher asset values
- Incomes rise → borrowers appear creditworthy → more lending → repeat

**Credit contraction phase:**
- Debt payments consume more income
- Spending slows
- Asset prices fall (collateral worth less)
- Banks tighten lending
- Incomes fall → borrowers struggle → defaults rise → bank losses → less lending → repeat

---

## The Short-Term Debt Cycle (5–8 Years)

This is what most people mean by "the business cycle." It's driven by monetary policy:

- Economy overheats → inflation rises → central bank raises rates
- Higher rates → credit contracts → economy slows → recession
- Inflation falls → central bank cuts rates
- Cheaper credit → expansion begins again

The key: each cycle typically ends with **a little more debt and a little higher asset prices** than the previous cycle. Debts are not fully extinguished — just rolled over and added to.

Over decades, this builds toward the long-term debt cycle peak.

---

## The Long-Term Debt Cycle (50–75 Years)

The US entered the long-term debt cycle peak around 2008. Historical examples include:
- US in 1929–1933 (Great Depression)
- Weimar Germany in 1920s
- Japan in 1989 (still working through it today)
- US in 2008 (Great Financial Crisis)

**Signs of a long-term debt peak:**
- Debt-to-income ratios at historical highs
- Asset prices at stretched valuations
- Interest rates near zero (no more ability to cut)
- Central bank balance sheet already large from previous cycles

---

## The Four Levers of Deleveraging

When a long-term debt cycle peaks, a **deleveraging** begins. There are only four ways to reduce debt burdens. How they're combined determines whether the deleveraging is:

### 1. Austerity (Deflationary)
Spending cuts and debt repayment. Reduces debt but crushes economic activity. Classic example: Greece 2010–2015. GDP fell 25%. Painful and politically unstable.

### 2. Debt Restructuring / Defaults (Deflationary)
Lenders take losses; debts written down. Banks become insolvent, credit contracts. Example: US in 1930–1933 — thousands of bank failures, severe depression.

### 3. Printing Money / Debt Monetization (Inflationary)
Central bank buys government debt (QE), injecting money. This is inflationary — it devalues the currency and reduces the real burden of debt. If overdone: hyperinflation. Example: Germany 1921–1923, Zimbabwe 2008, Venezuela 2017+.

### 4. Redistribution (via Taxes/Transfers) — Neutral
Tax wealthy/asset-holders to fund spending or debt service. Politically contentious but economically less deflationary than pure austerity.

---

## The "Beautiful Deleveraging"

Dalio argues a **"beautiful deleveraging"** is possible when:
1. The money printing (stimulative) roughly offsets the deflationary effects of debt reduction and austerity
2. Nominal GDP growth slightly exceeds nominal debt growth
3. Inflation stays modest (not hyperinflationary) and growth is positive

The US post-2008 response was broadly a "beautiful" deleveraging (by Dalio's own assessment):
- Fed ran aggressive QE (monetization)
- Government ran large deficits (redistribution/stimulus)
- Some debt restructuring (mortgage defaults, bank write-downs)
- Limited austerity
- Result: slow but positive growth, controlled inflation (until COVID-era fiscal)

---

## Where We Are Now

By most long-term debt cycle metrics, the developed world (especially the US) is still working through the aftermath of the 2008 peak — high debt levels, central bank balance sheets still elevated, demographics unfavorable (aging populations = more consumption, less production).

The key risk: if inflation returns structurally (which the 2021–2023 episode suggested is possible), central banks face an impossible choice — fight inflation with high rates (risk debt crisis) or allow inflation to run (real devaluation of debt burdens). This tension is likely to define macro investing for the next decade.

Dalio has argued we're in the "changing world order" phase where the dominant global power (US) faces challenges from a rising power (China) — historically correlated with geopolitical tension and shifts in reserve currency dynamics.
`,
  },
  {
    title: 'Global Macro Strategies: How Macro Investors Operate',
    slug: 'global-macro-strategies',
    order: 4,
    published: true,
    content: `## What Is Global Macro?

**Global macro** is an investment strategy that takes positions across asset classes — equities, bonds, currencies, and commodities — based on top-down analysis of global economic trends, policy shifts, and geopolitical dynamics.

Unlike stock pickers who focus on individual companies, macro investors trade themes: "the dollar is overvalued," "Chinese growth is slowing," "the yield curve will steepen," "energy is structurally undersupplied."

The greatest macro traders in history — George Soros, Stanley Druckenmiller, Paul Tudor Jones, Louis Bacon, Ray Dalio — have generated some of the highest risk-adjusted returns in investing history.

---

## The Macro Process: Theme → Instrument → Sizing

### Step 1: Develop a Macro View
A macro thesis might be:
- "The ECB will need to cut rates faster than the market expects because European economies are weakening"
- "US fiscal deficits are unsustainable and will eventually lead to dollar weakness and gold appreciation"
- "China's property sector deleveraging will reduce global commodity demand for 5+ years"

### Step 2: Choose the Right Instrument
The same macro view can be expressed through multiple instruments:

**View: "US recession coming"**
- Buy 2-year Treasuries (rates will fall as Fed cuts)
- Short S&P 500 futures
- Sell USD vs JPY (risk-off)
- Short high-yield credit (spreads will widen)
- Buy gold (safe haven, dollar hedge)

Each instrument expresses the view differently — different leverage, different timing, different convexity profile.

### Step 3: Size the Position
Even the best macro idea fails if sized incorrectly. Druckenmiller's rule: *"Put all your eggs in one basket and watch the basket carefully."* Macro traders size large when conviction is high and reduce when uncertain. George Soros is famous for saying a trade is not working when *"it hurts."*

---

## George Soros Breaking the Bank of England (1992)

The most famous macro trade in history illustrates the power of macro analysis:

**The setup:** The UK had joined the European Exchange Rate Mechanism (ERM) — a system that pegged European currencies within a band. The UK had entered at an overvalued rate during economic weakness. The UK was in recession but couldn't cut rates because doing so would break the ERM peg.

**The analysis:** Soros's team (primarily Stan Druckenmiller) concluded the peg was politically unsustainable. If the UK was forced to devalue, GBP would fall sharply. The risk: if the peg held, they'd pay modest carry costs. If it broke, they'd profit enormously.

**The trade:** Quantum Fund built a $10 billion short position in GBP. Others followed. The UK government tried to defend by raising rates to 15% in a single day (making the currency more attractive to hold) and buying GBP in the open market.

**The result:** On September 16, 1992 (now called "Black Wednesday"), the UK could not defend the peg. They were forced out of the ERM. GBP fell 20%. Soros/Druckenmiller made **$1 billion in a single day** — the most profitable single trade in history.

**The lesson:** Central banks have finite reserves. With enough coordinated selling, even sovereign institutions can be overwhelmed.

---

## Key Macro Relationships and Frameworks

### Relative Growth Differentials
The currency of the faster-growing economy tends to strengthen. Track:
- GDP growth revisions (faster upgrades = bullish currency)
- PMI differentials between countries
- Labor market strength comparisons

### Real Rate Differentials
The currency with higher real rates (inflation-adjusted) tends to attract capital. Track:
- 10-year yields minus inflation = real yield
- Changes in real rate differentials drive currency flows

### The Risk-On / Risk-Off Framework
Global macro markets have a primary mode: are investors in "risk-on" or "risk-off" mode?

**Risk-on:** Strong equities, credit spreads tight, USD weak, commodities strong, EM assets rally
**Risk-off:** Equities fall, credit spreads widen, USD/JPY/CHF strengthen, gold rallies, EM sells off

Many traders simply position around this regime — not trying to predict every individual market, but assessing whether the global environment is constructive or fearful.

---

## Why Macro Is Hard

1. **Being early is the same as being wrong** — a correct analysis can still lose money for years before playing out
2. **The market can stay irrational longer than you can stay solvent** (Keynes)
3. **Feedback loops**: policy can change in response to your analysis — a correctly identified unsustainable trend can be extended by government intervention
4. **Information overload**: with unlimited data, the discipline is knowing what matters
5. **Size and impact**: large macro funds can move markets with their trading — affecting the very prices they're trying to exploit

Stanley Druckenmiller's advice: *"Never invest in the present. It doesn't matter what a company is earning now, what matters is what they're going to earn. Think about where we'll be in 18 months."*

Macro investing is ultimately the practice of reasoning about complex adaptive systems where other intelligent actors are doing the same thing — and policy makers are actively trying to override the market's verdict. It is the highest level of the game.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 7: THE SGC STOCK SELECTION FRAMEWORK
// ---------------------------------------------------------------------------

const sgcFrameworkCourse = {
  title: 'The SGC Stock Selection Framework',
  slug: 'sgc-stock-selection-framework',
  summary: 'The practical, fundamental, long-only framework we use at SGC to find investable ideas — from top-down sources through sector-specific analysis, financial modeling, and thesis formation. This is the starting point for every SGC equity pitch.',
  tags: 'sgc, equity research, stock picking, framework',
  published: true,
  order: 7,
};

const sgcFrameworkLessons = [
  {
    title: 'Step 1 — Idea Generation: Why This Stock, Why Now?',
    slug: 'idea-generation',
    order: 0,
    published: true,
    content: `## The First Question at SGC: "Why Now?"

Most pitches fail at idea generation, not valuation. If you can't answer *why this stock* and *why right now*, the rest doesn't matter. At SGC, idea generation is about finding investable ideas — not valuing yet. We value last, after the business actually clears our quality and timing filters.

---

## 1.1 — Where Is the Opportunity Coming From?

Ask specific, concrete questions. Vague framings produce vague pitches.

### Macro / Top-Down Sources
Is this stock benefiting from a tangible macro force right now?
- **Falling or rising interest rates** — who gets a cost-of-capital tailwind?
- **Government spending programs** — IRA, CHIPS, defense rearmament, infrastructure bills
- **Regulatory change** — deregulation, antitrust, new safety standards, tax law
- **Demographic shifts** — aging population, millennial household formation, EM middle class
- **Technological adoption** — AI capex cycle, electrification, reshoring, automation

Then ask the question that separates structural from noise: **is this cyclical (temporary) or structural (multi-year)?** At SGC we price duration — a 2-year tailwind and a 10-year tailwind support very different multiples.

### Worked examples

| Sector | Macro driver | Nature |
|--------|--------------|--------|
| Banks | Rate cuts + easing credit conditions | Cyclical |
| Healthcare | Aging population + innovation cycle | Structural |
| Energy | Supply discipline + geopolitical risk | Mixed |
| Tech | Productivity gains + AI capex cycle | Structural (but rerates cyclically) |

---

## 1.2 — What Exactly Is "Trending"?

Be precise. Avoid buzzwords and undescriptive generalizations.

**Bad:** "AI is trending."
**Good:** "Hyperscaler accelerator spend is running at 3× the rate of enterprise software budgets, and the bottleneck has moved from GPUs to power and cooling."

### Break every theme down
- **Which sub-sector?** Infrastructure? Software? Semiconductors? Power?
- **Who is spending the money?** Governments? Enterprises? Consumers?
- **Is the spend discretionary or mandatory?** Discretionary spend gets cut in a slowdown. Mandatory (regulatory, replacement, maintenance) does not.

If you can't name the buyer and name the budget, you don't have a theme — you have a headline.

---

## 1.3 — Market Structure & Liquidity Check

SGC is a long-only shop. Liquidity matters because it gates exit. Always ask:

- Is this a **large-cap** at the forefront of the industry?
- A **mid-cap** with real room to grow and re-rate?
- A **small-cap** with liquidity risk the fund can't support?
- What is **average daily trading volume** (ADV)? Can we enter and exit a meaningful position in 3 days without moving the tape?
- Is **institutional ownership** rising or falling?
- Is this a **crowded trade** or is it under-owned?

### The liquidity / consensus 2×2

| | High liquidity | Low liquidity |
|---|---|---|
| **Crowded / high interest** | Growth expectations must be *justified* — the bar is set by sell-side | Dangerous — you own the bag alone |
| **Under-owned / improving fundamentals** | **Core hunting ground** — mispricing with an exit | Mispricing, but position-size small |

At SGC we mostly live in the bottom-right and top-left of this grid. The bottom-left (low liquidity + crowded) is where retail pitches go to die.

---

## 1.4 — The Early Quality Filter

Eliminate weak ideas *early* — before you spend 30 hours building a model you'll throw away.

Four questions, answered in under 15 minutes from the latest 10-K or Macrotrends:

1. **Is revenue growing?** (3-year and 5-year CAGR both)
2. **Is gross margin stable or improving?** (or is it being slowly competed away?)
3. **Is cash flow positive or trending toward positive?** Not just net income — actual operating cash flow minus capex.
4. **Does the company control its destiny, or is it dependent on one variable?** A single commodity price, a single regulator, a single customer (>20% revenue concentration), a single drug in trials.

If you answer **no** to most of these, move on. There are 7,000 listed US companies. Don't fight a losing hand.

---

## SGC Pro Tips

- **Read the last four earnings call transcripts before you build anything.** You will learn more in 60 minutes of management Q&A than in 10 hours of a research report.
- **Screen with a purpose.** Don't run 30-variable screens to "find something." Run 3-variable screens aligned to a macro thesis you already have.
- **Write the elevator thesis before the model.** If you can't say "This stock is cheap because ___ and the catalyst is ___" in one sentence at the idea stage, don't build the model.
- **Track your rejected ideas.** Good ideas that fail the liquidity or quality filter today often become great ideas 2 quarters later. Keep a watchlist.

---

## Summary

Step 1 is about **narrowing the universe** from 7,000 names to 5 credible pitches per semester. The outputs of this step are:

1. A clear macro/thematic hook ("*why now*")
2. A named sub-sector and named buyer ("*what exactly*")
3. A liquidity + consensus read ("*who owns this*")
4. A quality-filter pass/fail

Only now do we earn the right to go deep.
`,
  },
  {
    title: 'Step 2 — Deep Analysis: Macro → Sector → Company',
    slug: 'deep-analysis-macro-sector-company',
    order: 1,
    published: true,
    content: `## The SGC Analytical Order

At SGC we always analyze in the same order: **Macro → Sector → Company**. Never skip a layer, and never reverse the order. The reason is simple: a great company in the wrong macro regime is a bad investment, and a great sector backdrop can carry a mediocre company for years.

Most retail pitches start with "I like the product." That is the last thing that matters for a stock price.

---

## 2.1 — Macro Questions (Always First)

Before you write a single word about the company, answer these:

### Where are we in the economic cycle?
- **Early cycle** — rates falling, credit loosening, PMIs turning up. Favor cyclicals, small caps, banks.
- **Mid cycle** — trend growth, margin expansion, consumer strength. Favor broad equity exposure.
- **Late cycle** — margins peaking, labor market tight, Fed hiking. Favor quality, defensives, duration.
- **Recession** — Fed cutting, credit spreads widening. Favor Treasuries, staples, gold.

### What happens to this business if...
- Rates stay **higher for longer**?
- Growth **slows sharply**?
- Inflation **resurges**?
- A **geopolitical conflict** disrupts supply chains?
- There are **tariff concerns** or a trade war?

### Is this company helped or hurt by volatility?
Some businesses (insurance, market-makers, ratings agencies) earn more when volatility rises. Most do not. Knowing which camp the company is in is often more important than earnings estimates.

---

## 2.2 — The Macro Read: What to Actually Track

You don't need to be a macroeconomist, but you need to read the tape. SGC members should know where these data points are at all times:

| Indicator | Why it matters | Source |
|---|---|---|
| 2y / 10y Treasury yields | Cost of equity, yield curve shape | FRED, Bloomberg |
| Fed funds futures | Market-implied rate path | CME FedWatch |
| ISM Manufacturing PMI | Leading indicator for industrial activity | Released first business day of month |
| Unemployment rate + NFP | Consumer strength, Fed reaction function | BLS, first Friday |
| CPI / Core CPI | Inflation, Fed reaction function | BLS, mid-month |
| VIX | Equity risk appetite | CBOE |
| DXY (Dollar Index) | EM conditions, commodity prices | ICE |
| Credit spreads (IG, HY) | Corporate health, risk appetite | FRED: BAMLC0A0CM, BAMLH0A0HYM2 |

Glance at these before every SGC meeting. A pitch that ignores what the macro tape is saying is a pitch that hasn't been stress-tested.

---

## 2.3 — Understand the Business Better Than the Market

After macro, spend most of your time on the business itself. At SGC the goal is to understand the company deeply enough to say something *other than what the sell-side is saying*.

### The minimum the analyst must know

1. **Revenue composition** — by segment, by geography, by customer type, by recurring vs transactional
2. **Unit economics** — what does one incremental customer / widget / seat / gigawatt cost to acquire and serve?
3. **Capital intensity** — is every dollar of growth paid for with a dollar of capex? Or is this an asset-light franchise?
4. **Fixed vs variable cost structure** — operating leverage works both ways
5. **Management incentive structure** — read the proxy. What is management paid to optimize?
6. **Capital allocation history** — last 5 years of buybacks, dividends, M&A, debt paydown. This tells you who they are.

### Where to find the real information

The research report is the *last* place to look. SGC members should be pulling primary source material:

| Source | What you get |
|---|---|
| **10-K / 10-Q** (SEC EDGAR) | Risk factors, MD&A, segment economics, footnotes |
| **Proxy statement (DEF 14A)** | Executive comp, incentive structure |
| **Earnings call transcripts** | Management tone, Q&A tension, guidance language |
| **Investor day decks** | Long-term targets, unit economics disclosure |
| **Competitor filings** | Cross-reference claims about market share |
| **Trade publications** | Industry-specific granularity (pricing, capacity) |
| **Macrotrends / finviz** | Quick historicals without a terminal |

---

## 2.4 — Building the Mental Model

Before modeling, you should be able to answer:

1. **What does this company do, in one sentence, to someone with no finance background?**
2. **What single variable drives >50% of the P&L?** (Commodity price? Interest rate? Cloud consumption? Seat count?)
3. **What is the single biggest risk?** Not the boilerplate risk — the real one.
4. **Who would I be arguing with if I pitched this long?** Name the bears. What do they get right?
5. **What would make me change my mind?** (Define the kill switch *before* you fall in love.)

If you can't answer all five, go back to the filings.

---

## SGC Pro Tips

- **"Control-F" every 10-K for these terms:** *concentration, covenants, off-balance-sheet, going concern, restatement, impairment.* The real story lives in the boring sections.
- **Pull the three most recent sell-side notes on the name** before you write a thesis. Know what you're arguing against.
- **Talk to people who use the product.** A 15-minute call with an enterprise IT buyer tells you more than 15 sell-side models.
- **Write a 2-paragraph "business description" before touching Excel.** If you can't describe the business crisply, your model will be a pile of assumptions stacked on a misunderstanding.

---

## Summary

Step 2 is where SGC pitches earn their quality. The order is fixed: **macro first, sector second, company last.** Most of the analyst's time should be on the company, but none of it is wasted if the macro read is wrong.

Next lesson: the sector-specific frameworks that tell you *what to look at* once you're inside a given industry.
`,
  },
  {
    title: 'Sector-Specific Frameworks: Financials, Consumer, Healthcare, Energy, Industrials, Tech',
    slug: 'sector-specific-frameworks',
    order: 2,
    published: true,
    content: `## Every Sector Has Its Own Language

A good equity analyst at SGC knows the general framework from Step 2 — but a *great* analyst knows what to look at inside each specific sector. Financial analysts read a bank very differently from how they read a SaaS business. This lesson is the sector cheat-sheet we use.

For each sector we cover:
- **What actually drives the P&L**
- **The KPIs to extract from filings**
- **The key question** that separates a strong pitch from a weak one

---

## Financials & Real Estate

### Banks / Lenders

**Credit conditions** (the health of the loan book)
- Consumer strength: delinquency rates (credit cards, auto loans), charge-off rates, household debt-to-income, wage growth vs inflation
- Are lending standards tightening or loosening? (**Fed Senior Loan Officer Opinion Survey** — SLOOS — is the canonical source)

**Net interest margin (NIM)**
- How fast do assets reprice vs liabilities?
- In a rising rate environment, asset-sensitive banks benefit first, then deposit costs catch up
- Watch for **beta** — the fraction of rate rises passed through to depositors

**Deposit behavior**
- Deposit flight risk (SVB 2023 is the textbook case)
- Cost of deposits rising? Mix shift from non-interest-bearing to interest-bearing is a silent margin killer

**Capital strength**
- CET1 ratio (buffer above regulatory minimum)
- Stress test results (CCAR)
- Leverage ratio

> **Key question:** Can this bank grow earnings without taking more credit risk?

### Real Estate (REITs)

- **What drives demand?** Employment (office), migration (residential), e-commerce (industrial), demographics (healthcare REITs)
- **Lease structure** — short vs long duration, inflation escalators (CPI-linked bumps are gold in inflationary regimes)
- **Balance sheet** — debt maturity ladder, fixed vs floating rate mix, weighted average cost of debt vs cap rate
- **Property-level fundamentals** — occupancy, same-store NOI growth, rent spreads on new vs expiring leases

> **Key question:** Can cash flows grow faster than debt costs?

---

## Consumer & Telecom

### Consumer Discretionary

- **Elastic or inelastic demand?** Need-based or want-based?
- **Consumer health** — wage growth, credit usage, savings rate, credit card revolve rate
- **Pricing power** — are price increases sticking, or is volume falling in response? (Watch price/mix commentary on earnings calls)
- **Inventory levels** — days inventory outstanding rising = margin pressure coming (promotions, markdowns)

> **Key question:** Will consumers still spend on this if growth slows?

### Telecom

- **Revenue visibility** — subscription-based? Churn rates? ARPU trends?
- **Capital intensity** — spectrum costs, fiber build-out, network upgrade cycle (5G → 6G)
- **Competitive dynamics** — 3-player markets are stable; 4-player markets have price wars
- **Free cash flow** — *after* capex. Telecom reported EBITDA is misleading without capex discipline.

> **Key question:** Is this a utility-like cash flow story, or a competitive battlefield?

---

## Healthcare & Biotech

### Healthcare (non-biotech)

- **Who pays?** Government (Medicare/Medicaid), private insurers, or patients out-of-pocket? Each has different pricing dynamics.
- **Reimbursement risk** — CMS rate updates, PBM negotiations, IRA drug pricing provisions
- **Volume vs price growth** — long-run healthcare grows ~4-5% with aging demographics, but price caps compress
- **Defensive qualities** — demand typically holds in recessions (procedures may delay but not disappear)

### Biotech

- **Pipeline depth** — one drug or multiple? One-drug companies are binary outcomes and require different position sizing.
- **Clinical stage** — Phase I (safety), Phase II (dose/efficacy signal), Phase III (pivotal). Probability of approval jumps materially at each stage.
- **Probability-adjusted NPV** — not DCF. Build a rNPV model with probability-of-success haircuts at each phase.
- **Cash runway** — how many quarters of cash at current burn? If it's under 6, equity dilution is priced in.

> **Key question:** Is success already priced in — or is the market underestimating probability?

---

## Energy & Industrials

### Energy (E&P)

- **Cost curve position** — low-cost producer? (A shale company with a $35/bbl break-even in a $70 world mints money.)
- **Capital discipline** — buybacks and dividends vs over-investment in drilling
- **Break-even price** — below what commodity price does cash flow go negative?
- **Geopolitical sensitivity** — exposure to OPEC decisions, Russia, Venezuela, Iran

> **Key question:** Can this company make money even if prices fall?

### Industrials

- **Order backlog** — growing or shrinking? Book-to-bill above 1.0 is a positive leading indicator.
- **End-market exposure** — infrastructure, defense, manufacturing, automotive. Each cycles differently.
- **Operating leverage** — fixed cost structures magnify revenue swings into earnings swings
- **Cyclicality** — early-cycle (trucks, housing) vs late-cycle (capital goods, commercial aerospace)

> **Key question:** Is this a cycle recovery story, or a secular compounder?

---

## Technology

- **Revenue quality** — recurring SaaS vs transactional vs one-time license
- **Unit economics** — gross margin stability, LTV/CAC, dollar-based net retention (>120% is elite)
- **Customer concentration risk** — top 10 customers as a % of revenue
- **Innovation pipeline** — incremental product updates vs disruptive platform shifts
- **Capex cycle** — is this company *benefiting* from hyperscaler capex (semis, power, cooling) or *funding* its own capex (hyperscalers themselves)?

> **Key question:** Is growth durable — or dependent on hype and capital availability?

### The tech sub-sector decoder

| Sub-sector | Biggest single KPI |
|---|---|
| SaaS | Dollar-based net retention |
| Hyperscalers | Capex as % of revenue, operating margin trajectory |
| Semis | Book-to-bill, inventory days at distributors |
| Payments | Take rate, active user growth |
| Consumer internet | DAU/MAU, ARPU |
| Cybersecurity | ARR growth, number of customers with >$100k ACV |

---

## SGC Pro Tips

- **Read the competitor's filings.** You'll find admissions in JPMorgan's 10-K that help you price Citi. Bear of Stearns admitted to mortgage issues in its filings months before it went under.
- **Compare the company's claims to industry trade data.** If the company says "we gained share," but the industry association data says the whole category declined, someone is lying.
- **For cyclicals, never use trailing P/E.** Use EV/EBITDA over a cycle, or P/E on normalized (mid-cycle) earnings. Peak-cycle P/Es always look cheap.
- **Always check the proxy for comp structure.** A CEO paid on adjusted EBITDA growth will grow adjusted EBITDA, whatever it takes.

---

## Summary

Sector-specific analysis isn't optional. A bank pitch that ignores NIM or a SaaS pitch that ignores dollar-based retention is a pitch that will get torn apart in committee. Pick your sector lens before you open Excel.
`,
  },
  {
    title: 'Financial Modeling for SGC Pitches',
    slug: 'financial-modeling-for-sgc',
    order: 3,
    published: true,
    content: `## The SGC Modeling Standard

An SGC pitch model is not a valuation artifact. It is a **decision tool**. We model to stress-test our thesis, not to produce a target price. When a committee member asks "what if revenue growth is 3 percentage points lower?" the answer must be a keystroke away.

Every SGC equity research model has four required sections:

1. **Revenue build** — with explicit drivers
2. **Margin schedule** — assumptions tied to sector reality
3. **DCF with WACC sanity checks**
4. **Base / bull / bear scenarios**

---

## 1 — Revenue Growth Drivers, Clearly Stated

"Revenue grows 12% per year" is not an assumption. It's a wish.

A real revenue build disaggregates the top line into variables the business actually manages:

| Business type | Disaggregation |
|---|---|
| SaaS | Beginning seats × (1 + net retention) + new logo adds × ACV |
| Bank | Interest-earning assets × NIM + fee income |
| Retail | Store count × avg stores × SSSG + new store productivity |
| Semiconductor | Units × ASP (by product line) |
| Pharma | Patients × net price per script × probability of renewal |
| Oil & gas E&P | Production (BOE/day) × realized price − lifting cost |
| Utility | Rate base × allowed ROE + growth projects |

If your driver tree is "revenue × (1 + g)", you haven't modeled — you've extrapolated.

---

## 2 — Margin Schedule

Two rules at SGC:

1. **Every margin line must be justified** — operating leverage from the revenue base, mix shift, price/cost spread, scale economics. "Margins expand 100bps per year because management said so on the last call" is not justified.
2. **Terminal margin must be achievable** — don't assume a company will hit 40% operating margins if the best competitor in history hit 32%. Check the margin ceiling.

### Common margin drivers to track

- **Gross margin** — cost of raw materials, scale on COGS, price/mix
- **SG&A leverage** — does it scale with revenue or stay flatter?
- **R&D intensity** — are they under-investing (short-term boost, long-term decay) or over-investing?
- **D&A** — function of capex 4-7 years prior, not current revenue

---

## 3 — WACC That Reflects Rates, Risk, and Capital Structure

WACC is the single biggest DCF lever. Get it wrong and the target price is junk.

**WACC = E/V × Cost of Equity + D/V × Cost of Debt × (1 − Tax rate)**

### Cost of equity (CAPM)

**Ke = Rf + β × ERP**

- **Rf** — the 10-year Treasury yield on the valuation date
- **β** — rolling 5-year weekly beta vs S&P 500 (Damodaran's industry tables are a free sanity check)
- **ERP** — equity risk premium. At SGC we typically use **5.5%** as a baseline (Damodaran, historical + implied blend). Adjust up for emerging markets and down for very developed markets.

### Cost of debt

Use the company's current yield to maturity on its bonds if public debt exists. Otherwise synthetic rating × credit spread over Treasuries.

### Tax rate

Use the **effective cash tax rate**, not the statutory rate. Most large US companies pay 15-22%, not 21%.

### WACC sanity check

| Company profile | Reasonable WACC range |
|---|---|
| Mega-cap, investment-grade, US | 7-9% |
| Mid-cap, growth tech | 9-12% |
| Small-cap, cyclical | 11-14% |
| Emerging market corporate | 12-16% |
| Early-stage biotech | 15-20%+ |

If your WACC is 5%, you're valuing something that's not equity. If it's 25%, you're valuing a lottery ticket.

---

## 4 — Terminal Value Sanity Check

At SGC we run two terminal methods and reconcile:

**Method A — Gordon Growth (perpetuity)**
TV = FCF × (1 + g) / (WACC − g)

- g = long-run GDP growth (typically **2-4%**, never higher — you can't grow faster than the economy forever)
- TV should generally be **60-85%** of enterprise value for a mature business. If it's 95%+, your near-term forecasts are too conservative or you've got a terminal growth problem.

**Method B — Exit multiple**
TV = terminal EBITDA × peer group exit multiple

- Use a through-cycle multiple, not a peak multiple
- Reconcile to implied perpetuity g

If the two methods disagree materially, pick the more conservative and explain why.

---

## 5 — Base / Bull / Bear Cases

Every SGC model must have three explicit scenarios. The MSFT pitch (reference in the Equity Research course) is the template:

| Scenario | What changes | Why |
|---|---|---|
| **Base** | Your central-case view of growth, margins, WACC | What you think actually happens |
| **Bull** | +200-400bps revenue growth, +100-200bps margin expansion, -50bps WACC | Thesis plays out faster/bigger |
| **Bear** | -200-400bps revenue growth, -100-200bps margin, +100bps WACC | Thesis partially breaks |

### Position sizing rule of thumb

- If **base case upside < 15%**: not pitchable.
- If **bear case downside < 20%** and base upside > 30%: full-size position.
- If **bear case downside > 30%**: half-size or pass. (Asymmetric risk matters more than pointed targets.)

---

## 6 — The Sensitivity Table

Every SGC DCF ends with a 2D sensitivity on WACC × terminal growth. This is not optional. The MSFT pitch example shows the format:

| WACC ↓ / Growth → | 3.0% | 3.5% | 4.0% | 4.5% | 5.0% |
|---|---|---|---|---|---|
| 7.14% | | | | | |
| 7.64% | | | | | |
| 8.14% | | | | | |
| 8.64% | | | | | |
| 9.14% | | | | | |

This is where you'll notice if your thesis rests on 50bps of growth or 25bps of WACC — dangerous territory. A robust thesis survives ±100bps on both axes.

---

## SGC Pro Tips

- **Always color-code.** Blue = input, black = formula, green = link to another tab. Makes committee review 10× faster.
- **Build in dollars, not local currency, for multinationals.** Then FX-sensitize.
- **Never hard-code a number inside a formula.** Every assumption belongs in its own cell, labeled.
- **Tie out historicals to the 10-K before projecting.** If your historical EBITDA doesn't match the filed number, your projection is wrong before it starts.
- **Reconcile reported to adjusted.** Understand exactly what management is excluding from adjusted EPS, and whether you agree.
- **Check the cash tax rate against the stated GAAP tax rate.** They are different, and cash is what matters for FCF.

---

## Summary

Model to test the thesis, not to produce a target. At SGC, the model is a tool — the thesis drives the pitch. A pretty DCF and a weak thesis gets voted down. A messy Excel with a clear, testable thesis and sensible scenarios wins allocations.
`,
  },
  {
    title: 'Step 3 — Thesis Formation: Why the Market Is Wrong',
    slug: 'thesis-formation',
    order: 4,
    published: true,
    content: `## The Most Important Step in the Entire Framework

Everything you've done so far — idea generation, macro read, sector work, modeling — was preparation for this one question:

> **Why is the market wrong?**

A stock is not a good investment because the company is good. It is a good investment because **it will outperform expectations**. Everything else is noise. At SGC, if you cannot articulate the *variant perception* — the specific way your view differs from consensus — you do not have a pitch. You have a research summary.

---

## 3.1 — Compare Yourself to the Market

Before claiming the market is wrong, you need to know what the market is actually saying.

### Where does consensus live?

| Source | What it tells you |
|---|---|
| Bloomberg / FactSet / Visible Alpha consensus estimates | Revenue, EBIT, EPS, EBITDA by quarter and year |
| Sell-side analyst reports (at least 3 recent) | Narrative, assumptions, price targets and their logic |
| Options market — implied move around earnings | What the market thinks can happen |
| Short interest + days to cover | Who already disagrees with consensus |
| Insider transactions | What people inside the company are doing |

### Then ask: where do you disagree, specifically?

You should be able to fill in one or more of these sentences:

- *"Consensus assumes revenue growth of X%. I think it will be Y% because ___."*
- *"Consensus assumes margins expand to X%. I think they will get to Y% because ___."*
- *"Consensus applies X multiple. I think a Y multiple is justified because ___."*
- *"Consensus prices in event E. I think E has a higher/lower probability because ___."*

If your answer doesn't include a specific number and a specific reason, the thesis isn't sharp enough yet.

---

## 3.2 — Identify Real Catalysts

A thesis without a catalyst is a value trap. Cheap stocks stay cheap unless *something* forces the market to reprice.

### Vague vs real catalysts

| Not a catalyst | Real catalyst |
|---|---|
| "AI will benefit them" | "Q3 print will show hyperscaler customer #1 expanding seat count 2×" |
| "The sector is out of favor" | "Fed Sep meeting likely starts the cutting cycle that unlocks their rate-sensitive funding cost" |
| "Great management team" | "New CEO arrives March 1 with history of 400bps margin expansion at prior employers" |
| "Long-term tailwind" | "US Infrastructure Act allocates $XBn to their direct TAM, spend ramps Q4 2025" |

### The catalyst taxonomy SGC uses

1. **Earnings inflection** — first quarter where trajectory visibly changes
2. **Margin expansion** — pricing actions, mix shift, cost program hitting
3. **Rate moves** — cost of funding resets for rate-sensitive businesses
4. **Product launch** — with measurable early adoption metrics
5. **Regulatory approval** — FDA decisions, M&A clearances, policy announcements
6. **Balance sheet repair** — refi, deleveraging, covenant cure
7. **Management change** — proven operator arriving
8. **Capital return** — dividend initiation, buyback authorization
9. **Event-driven** — M&A, spin, activist involvement, legal resolution

Every pitch should have **at least one dated catalyst in the next 6 months** and **one thematic catalyst in the next 12-18 months.**

---

## 3.3 — Boil It Down to 2-3 Reasons

The MSFT pitch we reference has **four** thesis pillars. That's the ceiling. Most pitches should have 2-3. More than four and the committee stops listening.

Each pillar must be:
- **Specific** — not "strong brand," but "installed base of 450M seats with 6% paid seat growth and ARPU expansion via E5 + Copilot"
- **Evidence-based** — cited from filings, call transcripts, or industry data
- **Company-specific** — something that wouldn't apply to the three closest peers

### The SGC thesis pillar template

Each pillar in an SGC report follows a two-part structure, the same format as the MSFT pitch:

**Pillar Statement**
A single sentence that summarizes the mispricing. "The market is underestimating the durability of Azure's growth and revenue visibility because it is anchoring to near-term AI infrastructure intensity and capacity constraints rather than the scale of committed demand already reflected in Microsoft's commercial backlog."

**Driver**
The *fundamental* mechanism — the company data, KPIs, filing disclosures, or industry dynamic that makes the mispricing real. *"In FY26 Q2, Microsoft Cloud surpassed $50B in quarterly revenue (up 26% YoY), Commercial RPO increased to $625B (up 110% YoY)..."* Cite specific numbers from specific filings.

**Market Mispricing**
Why the market is wrong. *"Recent investor anxiety centers on whether AI-related capex and GPU scarcity are crowding out 'core Azure' growth and pressuring margins. This narrative overlooks that the company's backlog expansion and high growth in Azure indicate demand is not the constraint; supply timing is."*

This two-part format (**Driver** + **Market Mispricing**) is the SGC house style. Use it in every pitch.

---

## 3.4 — Example Thesis Architectures

Most SGC thesis structures map to one of these patterns:

### Pattern A — "Tailwind + Winner + Cheap"
1. **Industry tailwind** (with magnitude): "Fixed wireless TAM grows from $Xbn to $Ybn by 2028, a 20% CAGR"
2. **Company advantage** (why this one wins): "First to deploy standalone 5G across 80% of rural footprint"
3. **Valuation mismatch**: "Trading at 8× fwd EBITDA vs 11× peer average, despite higher FCF conversion"

### Pattern B — "Earnings Inflection"
1. **Why Q earnings are structurally reset upward**: Cost program completes, high-margin segment hits scale
2. **Why the market hasn't priced it in**: Sell-side behind the actual unit dynamics
3. **The catalyst that forces the reprice**: Q3 print on [date]

### Pattern C — "Narrative Break"
1. **Current market narrative**: "Legacy business is dying"
2. **Why the narrative is wrong**: Specific cash flow, TAM, or competitive evidence
3. **What forces the reprice**: Management investor day + first quarter of re-accelerating organic growth

---

## 3.5 — The Test: Can You Explain It Simply?

> *"If you cannot explain it simply, you do not understand it well enough."* — Feynman (and used by Druckenmiller in the SGC reading list)

Every thesis should survive this test: explain your pitch in 90 seconds to a first-year analyst with no background on the company. If they can't repeat your thesis back to you afterward, the thesis isn't clear — or it isn't a thesis.

At SGC, when we can't boil the pitch down to two pillars and a catalyst, we've usually confused *research volume* with *insight*. Go back and simplify.

---

## SGC Pro Tips

- **Write your thesis before you build the model.** Confirm or reject it *with* the model. Models that generate theses are post-hoc rationalizations.
- **Steelman the bear.** Spend 30 minutes writing the best possible short case before finalizing. If you can't rebut it cleanly, your pitch isn't ready.
- **Name the consensus number you're betting against.** If it's "I don't know what consensus is," you haven't done the work.
- **Every thesis needs a kill switch.** Define ahead of time: "If revenue growth falls below X%, or margins contract more than Y bps, the thesis is broken and we exit."

---

## Summary

Step 3 is the soul of the pitch. A good analyst at SGC can describe every business they've researched. A *great* analyst tells you *exactly* where their view departs from consensus, names the evidence, and dates the catalyst. That's the whole job.
`,
  },
  {
    title: 'Step 4 — Presentation: What to Show, What to Cut',
    slug: 'presentation-what-to-show',
    order: 5,
    published: true,
    content: `## The SGC Presentation Principle

The temptation after 40 hours of research is to show everything you found. Resist it. A great pitch presents the **minimum evidence** needed to support the thesis — no more. The rest lives in the report, the appendix, or the Q&A.

> **Key rule at SGC: Do not list everything you researched. Only present what drives the stock.**

---

## The Standard SGC Pitch Structure

Whether it's a 5-minute verbal pitch in committee or a 15-page written report, the skeleton is the same:

1. **One-sentence summary** — "[Name] is a Buy at $X, target $Y ([Z]% upside) because [the variant perception]."
2. **2-3 key pillars** — the thesis pillars (Driver + Market Mispricing format from the last lesson)
3. **Evidence for each pillar** — one chart or one data point per pillar. Not five.
4. **Price target and upside** — the number, the method (DCF/comps/SOTP), and the WACC/terminal growth assumptions
5. **Risks** — the 2-3 things that would break the thesis, and why they're manageable
6. **Sizing + catalyst** — recommended position size and the dated trigger

---

## 1 — The One-Sentence Summary

The opening sentence does the heavy lifting. It is the *only* sentence committee members remember five minutes after the pitch.

### Format
*"[Company] is a [Buy/Hold/Sell] at $[current price], target $[PT] ([X]% upside), because [the one specific mispricing]."*

### Good
*"Microsoft is a Buy at $356.77, target $469.64 (31.6% upside), because the market is anchoring to near-term AI capex intensity and missing $625B of committed backlog that increasingly converts to revenue as capacity ramps."*

### Bad
*"Microsoft is a high-quality compounder with AI exposure trading at a reasonable valuation."*

The first version says something. The second says nothing.

---

## 2 — Pillars: 2-3, Not 7

If you listed all the reasons Microsoft is good, you'd have 40. Cut ruthlessly to 2-3 that are:

- **Causally tied to the stock price** — not "nice to have" features
- **Non-consensus** — things the sell-side hasn't already capitalized
- **Supportable in 60 seconds of evidence**

Four is acceptable only when each pillar is independently sufficient to justify the Buy. Five is a sign of an undisciplined thesis.

---

## 3 — One Chart (or One Data Point) Per Pillar

The single most common mistake in student pitches is putting 4 charts on one slide.

### The rule
- One claim per pillar.
- One piece of evidence per claim.
- If you can't pick the best chart, you don't know your own thesis.

### Chart selection hierarchy (best to worst)
1. **A direct KPI time series** from company filings (Azure growth, RPO, paid seats)
2. **A comparison chart** — company vs peers vs consensus
3. **A sensitivity** — your DCF output vs WACC/growth
4. **A valuation chart** — historical multiple ranges
5. **Generic industry charts** — usually unnecessary, stock ones from sell-side decks are the weakest

---

## 4 — The Price Target Slide

Three things, in this order:

1. **The number** — $469.64
2. **The method** — "5-year DCF, WACC 8.14%, terminal growth 4.0%"
3. **The sensitivity** — "target ranges from $423 to $526 under ±50bps WACC / ±50bps terminal growth"

A single point estimate is never enough. A range with the drivers disclosed shows the committee you understand what your model is actually sensitive to.

---

## 5 — Risks: The Part Most Analysts Mess Up

Risks are not a checkbox at the end of the pitch. They are where the committee actually *grades* you.

### Weak risks (what not to do)
- "Market risk"
- "Competition"
- "Macro slowdown"
- "Valuation could decline"

### Strong risks (SGC standard — see MSFT pitch)
Each risk in the SGC format has three parts:

1. **The risk itself** — specific and named ("AI infrastructure capital intensity compresses margins and reduces near-term cash generation")
2. **Impact rating** — high / medium / low
3. **Mitigation / how we monitor it** — ("Track Cloud gross margin trajectory and guidance, capex mix between short-lived and long-lived assets, commentary on supply/demand balance")

If you name a risk without a mitigation, you're just listing fears. If you can't monitor it, you can't size around it.

---

## 6 — Sizing and Catalyst

End with action, not description.

- **Recommended sizing** — full weight? Half? Starter?
- **Entry level** — at current price, on a pullback to $X, after event E?
- **First catalyst** — date and what to watch for
- **Kill switch** — the specific thesis-break condition that ends the trade

This slide separates analysts from *PMs-in-training*. Recommending a position forces you to own the decision.

---

## What to Cut

Everything that doesn't directly support the 2-3 pillars or the risks. Specifically:

- ❌ Company history (they can Google it)
- ❌ Every segment's revenue trajectory (only the ones that matter for the thesis)
- ❌ The full org chart
- ❌ ESG overview (unless it's thesis-relevant)
- ❌ A product-by-product walkthrough
- ❌ Every competitor (only the 2-3 that matter)
- ❌ The same chart in three variants

At SGC, if a slide doesn't advance a pillar or test a risk, it doesn't belong in the deck. It belongs in the appendix.

---

## The 5-Minute Verbal Pitch Timing (covered in its own course)

For completeness, here's the timing pattern (full course is *The 5-Minute SGC Pitch*):

| Time | Content |
|---|---|
| 0:00 - 0:30 | One-sentence thesis + price target + upside |
| 0:30 - 2:00 | Pillar 1 (Driver + Market Mispricing) |
| 2:00 - 3:30 | Pillar 2 (Driver + Market Mispricing) |
| 3:30 - 4:30 | Valuation + sensitivity |
| 4:30 - 5:00 | Top risk + mitigation + your ask |

---

## SGC Pro Tips

- **Rehearse the pitch standing up.** You present better, and you catch weak sentences you wouldn't notice seated.
- **Every slide must fail quickly if it's not contributing.** Give each slide a "what's the one sentence this slide proves?" test. If you can't answer, cut it.
- **The committee's first question is often on risks.** Preempt it by having a clean "top 3 risks" slide *before* they ask.
- **Color matters less than clarity.** A clean black-and-white pitch beats a rainbow one every time.
- **Print the deck before presenting.** You'll see formatting errors on paper that you miss on screen.

---

## Final Principle

You are not buying a stock because it is "good." You are buying it because **it will outperform expectations**.

Every SGC pitch, report, and presentation exists to prove exactly that — the specific, dated, evidence-backed reason the market is underestimating the company. Everything else is backdrop.

Next up: put it all together in an SGC equity research report.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 8: WRITING AN SGC EQUITY RESEARCH REPORT
// ---------------------------------------------------------------------------

const sgcReportCourse = {
  title: 'Writing an SGC Equity Research Report',
  slug: 'writing-sgc-equity-research-report',
  summary: 'Section-by-section guide to writing a full SGC equity research report in the house style — from Company Snapshot to Disclosures. Modeled directly on published SGC reports like the MSFT pitch. This is the canonical reference for anyone publishing on the SGC research page.',
  tags: 'sgc, equity research, report writing, template',
  published: true,
  order: 8,
};

const sgcReportLessons = [
  {
    title: 'The SGC Report Structure (At a Glance)',
    slug: 'sgc-report-structure',
    order: 0,
    published: true,
    content: `## The SGC Report Template

Every SGC equity research report follows the same structural skeleton. This isn't a style preference — it's how the research page is organized, how members onboard to read each other's work, and how committee review happens. Writing outside the template slows everyone down.

Use the published MSFT report ([stgeorgecapital.ca/equity-research/MSFT](https://www.stgeorgecapital.ca/equity-research/MSFT)) as the canonical reference throughout this course.

---

## The 11 Required Sections (in order)

1. **Header** — Recommendation, Target Price, Implied Upside, Date, Analyst, Sector
2. **Company Snapshot & Price Performance** — key stats + price chart
3. **Executive Summary / Investment Thesis** — 2-4 pillars, each in *Driver + Market Mispricing* format
4. **Business Model & Economics** — what the company does, Unit Economics, Economic Moat
5. **Industry & Competitive Landscape** — industry structure, competitive positioning, secular vs cyclical
6. **Catalysts & Timeline** — Near-Term (0-6m) and Medium-Term (6-18m) with rated impact
7. **Valuation Analysis** — Comps table, DCF output, sensitivity table, methodology
8. **Sentiment & News Flow** — current tape, event buckets, signal strength
9. **Bull & Bear Cases** — from the DCF scenarios, with written justification
10. **Key Risks** — specific risks with impact rating + mitigation / what to monitor
11. **AI & Data Strategy** *(for applicable names)* — Current Deployment, Strategic Impact, Limits & Risks
12. **Important Disclosures** — SGC standard disclaimer

---

## What Each Section Is For

| Section | What it proves to the reader |
|---|---|
| Header | "This is the verdict — Buy/Hold/Sell, target, and author accountability" |
| Snapshot | "Here are the facts any reader needs before the narrative starts" |
| Investment Thesis | "Here's why the market is wrong — the core of the report" |
| Business Model | "Here's what you need to understand before evaluating the thesis" |
| Industry & Competitive | "Here's the context that makes the company's position meaningful" |
| Catalysts | "Here are the dated triggers that force the reprice" |
| Valuation | "Here's how we get from the thesis to a specific target price" |
| Sentiment | "Here's what the tape is saying right now" |
| Bull & Bear | "Here's how we think about asymmetry and scenario outcomes" |
| Key Risks | "Here's what would break the thesis, and what we're monitoring" |
| AI & Data Strategy | "Here's our take on the AI angle — if relevant" |
| Disclosures | "Here's how we protect the Society legally" |

---

## The Tone (Non-Negotiable)

SGC reports are **analytical, specific, and non-promotional**. Read the MSFT report carefully. Notice:

- No hype. No "amazing opportunity." No "massive."
- Specific numbers in every paragraph. Cited to specific filings.
- Every claim is argued, not asserted.
- The tone is that of a sell-side analyst writing to an institutional PM — confident, evidence-backed, willing to admit ambiguity.
- Rating is earned, not marketed.

The sentence model to study:
> *"Recent investor anxiety centers on whether AI-related capex and GPU scarcity are crowding out 'core Azure' growth and pressuring margins. This narrative overlooks that the company's backlog expansion and high growth in Azure indicate demand is not the constraint; supply timing is."*

Notice the structure: **current narrative → what the narrative misses → the specific counter-evidence.** This is the SGC voice. Adopt it.

---

## Length Guidelines

| Section | Typical length |
|---|---|
| Header | 1 block, fits above the fold |
| Snapshot | 1 page, mostly tabular |
| Investment Thesis | 2-4 pages, one per pillar |
| Business Model | 1-2 pages |
| Industry & Competitive | 1-2 pages |
| Catalysts | 1 page, bullet format |
| Valuation | 2-3 pages |
| Sentiment | 0.5 page |
| Bull & Bear | 1 page |
| Key Risks | 1 page |
| AI & Data Strategy | 0.5-1 page if applicable |
| Disclosures | 1 paragraph |

**Total: 10-15 pages.** Anything >20 is probably padded. Anything <8 is probably under-evidenced.

---

## The Naming Convention

All SGC reports follow this header format:

\`\`\`
St. George Capital • Equity Research

[Company Name]

[TICKER] • [EXCHANGE]

Recommendation: BUY / HOLD / SELL
Target Price: $X
Implied Upside: X%

[Date in "Month Day, Year" format]
[Analyst Name]

[SECTOR] • [SUB-INDUSTRY]
\`\`\`

Stick to this exactly. The website renders it this way; deviations break the layout.

---

## What Comes Next in This Course

The following lessons walk through each section in detail, with the MSFT report as the working reference. By the end, you should be able to open a blank document and produce a publishable SGC report without the template in front of you.

| Lesson | Section |
|---|---|
| 2 | Company Snapshot & Executive Summary |
| 3 | Investment Thesis — Driver + Market Mispricing |
| 4 | Business Model & Economics — Unit Economics + Moat |
| 5 | Industry & Competitive Landscape |
| 6 | Catalysts & Timeline |
| 7 | Valuation Analysis (DCF, Comps, Sensitivity) |
| 8 | Bull & Bear Cases, Key Risks, AI & Data Strategy, Disclosures |

---

## SGC Pro Tips

- **Write the thesis first. Everything else exists to support it.** If you write the business description before the thesis, your thesis drifts to match what you wrote.
- **Cite every number.** "Revenue grew 26% YoY" → "Revenue grew 26% YoY (FY26 Q2 earnings release, Jan 30, 2026)". The citations make the report defensible in committee.
- **Publish dates matter.** Markets move — always print the pricing date at the top and commit to it. If the price moves 10% while you're editing, you decide: republish with new numbers, or publish as of the original date with a clear timestamp.
- **Your name goes on it.** Every SGC report names the analyst. Write every sentence like the buy-side PM reading this will Google you in 3 years.
`,
  },
  {
    title: 'Writing the Company Snapshot & Executive Summary',
    slug: 'company-snapshot-executive-summary',
    order: 1,
    published: true,
    content: `## The Snapshot: Get the Facts Right Before You Write a Word

The **Company Snapshot & Price Performance** section is pure data. There is no narrative here. Its job is to put every reader on the same factual footing before the thesis begins.

### The required fields

Match the MSFT report exactly:

| Field | Notes |
|---|---|
| Date of Price | The pricing date — lock it and do not move it mid-report |
| 52-Week Range | Low–High, from pricing data |
| Market Cap | In billions or trillions |
| Fiscal Year End | Many companies aren't December (MSFT is June) |
| Shares O/S | Outstanding, from latest 10-Q |
| P/E Ratio | Trailing, GAAP EPS |
| Forward P/E (DCF) | *Your* projection |
| Forward P/E (Consensus) | Street consensus |
| Dividend Yield | % |

**Source line at bottom:** *"Source: Company data, Bloomberg, Alpha Vantage API"* — or whichever sources you actually used.

### Recent reported EPS

An 8-quarter EPS table, current year vs prior year, side by side:

| Quarter | EPS | Quarter | EPS |
|---------|-----|---------|-----|
| Q4 25 | $4.14 | Q4 24 | $3.23 |
| Q3 25 | $3.72 | Q3 24 | $3.3 |
| Q2 25 | $3.65 | Q2 24 | $2.95 |
| Q1 25 | $3.46 | Q1 24 | $2.94 |

This visual side-by-side is intentionally chosen — it forces the reader to see the YoY trajectory immediately.

### Recent share price trend

A short block showing:
- Start price (e.g., 52-week period beginning)
- End price
- Period move (%)
- Plus the chart with 52W High and 52W Low marked

The reader should be able to tell, in 3 seconds, whether the stock is trading toward its highs or its lows going into the thesis. That framing is critical — a Buy on a 52-week low and a Buy at an all-time high are different conversations.

---

## The Executive Summary / Investment Thesis

This is the **core of the report**. Everything else exists to support it. On the published SGC site, the Executive Summary is what most readers will fully read. The Business Model, Industry, and Valuation sections are deep-dive references.

### The layout

**Header block (top of section):**
- Current Price: $X
- Price Target: $Y

**Then: Investment Thesis** — 2-4 titled pillars, each following the *Driver + Market Mispricing* structure.

---

## The Pillar Structure (the SGC House Format)

Every thesis pillar has three components, in this order:

### 1. Pillar title
A crisp phrase that names the mispricing. Not a full sentence. Examples from the MSFT pitch:

- "Durability of Key Revenue Segments"
- "High Margin Profit Engine"
- "Easy Adoption Due to Compliance and Security Standards"
- "Classic Franchises Still Reign Supreme"

Keep titles 4-8 words. They appear in navigation and committee summaries.

### 2. Thesis statement (one paragraph, under the title)
A single paragraph naming the *specific* mispricing. This paragraph is the pillar's "one sentence" — if the reader only reads this, they must leave understanding what you think the market gets wrong.

**MSFT example:**
*"The market is underestimating the durability of Azure's growth and revenue visibility because it is anchoring to near-term AI infrastructure intensity and capacity constraints rather than the scale of committed demand already reflected in Microsoft's commercial backlog."*

Template:
> *"The market is [underestimating / overestimating / anchoring to / missing] [specific feature] because [specific market anchor or bias]."*

### 3. Two subsections: **Driver** and **Market Mispricing**

**Driver** — the *fundamental evidence*. Cite specific numbers from specific filings. This is where the filings work pays off.

**MSFT example:**
*"In FY26 Q2, Microsoft Cloud surpassed $50B in quarterly revenue (up 26% YoY), while Azure and other cloud services grew 39% YoY—driven by broad workload demand. Commercial RPO increased to $625B (up 110% YoY) with ~25% expected to be recognized as revenue within the next 12 months, providing unusually strong forward visibility for a hyperscale platform."*

Every numerical claim should be traceable to the earnings release, 10-Q, or investor day.

**Market Mispricing** — why the market is wrong. Name the *prevailing narrative* and explain what it gets wrong.

**MSFT example:**
*"Recent investor anxiety centers on whether AI-related capex and GPU scarcity are crowding out 'core Azure' growth and pressuring margins. This narrative overlooks that the company's backlog expansion and high growth in Azure indicate demand is not the constraint; supply timing is. As capacity catches up, revenue recognition should increasingly track committed demand, improving confidence in growth durability."*

Template:
> *"Recent [market narrative / investor anxiety] centers on [X]. This narrative overlooks [Y]. As [condition] plays out, [reprice mechanism]."*

---

## How Many Pillars?

- **2 pillars:** acceptable if each is independently sufficient. Focused pitches.
- **3 pillars:** the SGC default. Most reports land here.
- **4 pillars:** acceptable for complex multi-segment businesses (MSFT). Each must still be distinct.
- **5+:** cut. You're padding.

---

## Writing Pillars That Pass Committee

### Checklist for every pillar

1. ✅ Title is 4-8 words and names the mispricing
2. ✅ Thesis statement identifies a specific market anchor or bias
3. ✅ Driver cites ≥3 specific numbers traceable to filings
4. ✅ Market Mispricing names the prevailing narrative in the market
5. ✅ Market Mispricing explains the reprice mechanism (what forces the market to update)
6. ✅ Pillar is *company-specific* — wouldn't apply to peers identically

If a pillar fails any of these, rewrite before submitting.

---

## Common Pillar Mistakes

| Mistake | Fix |
|---|---|
| "Strong management team" | Name the decisions they've made that support the thesis |
| "Growing TAM" | Quantify TAM, quantify share, quantify growth magnitude |
| "AI tailwind" | Name the sub-segment, the buyer, and the measurable early adoption metric |
| "Conservative valuation" | Move valuation to the Valuation section; pillars argue *why* the stock will reprice, not *what multiple* |
| "Industry tailwind" (alone) | Every peer has the same tailwind — the pillar must be company-specific |

---

## SGC Pro Tips

- **Read the pillar out loud.** If you trip over a sentence, the reader will too.
- **Limit each Driver paragraph to 3-5 sentences.** Longer = weaker.
- **Your Market Mispricing paragraph should name a real sell-side concern.** If you can't name who is worried about the thing you're rebutting, you haven't understood consensus.
- **Never open a pillar with "We believe."** Open with the claim. The report is already branded with your name and SGC — every sentence is "we."
- **Title every pillar before you write it.** If you can't title the mispricing, the mispricing isn't crisp.

---

## Summary

The Executive Summary / Investment Thesis is the report. Everything else supports it. Use the pillar structure — Title → Thesis Statement → Driver → Market Mispricing — on every pillar, every time. Cite specific numbers. Name the consensus narrative you are rebutting.

Next lesson: the Business Model & Economics section — the context readers need to evaluate the thesis.
`,
  },
  {
    title: 'Business Model & Economics — Unit Economics and Economic Moat',
    slug: 'business-model-and-economics',
    order: 2,
    published: true,
    content: `## The Business Model Section

After the thesis, the Business Model section gives the reader the *context they need to evaluate the thesis*. Its job is not to list every product. Its job is to explain:

1. How the company makes money
2. What the unit economics look like
3. Why competitors can't easily replicate it (the moat)

This is where you establish that you understand the business deeply. It's also the section where weak analysts expose themselves — if you can't describe the unit economics of the company you're pitching, you don't own the thesis.

---

## 1 — Structure of the Section

Follow the MSFT report layout:

1. **Opening 1-2 paragraphs** — high-level overview of what the company does and how revenue breaks out
2. **Subsection: Unit Economics**
3. **Subsection: Economic Moat**

Target length: 1-2 pages total.

---

## 2 — The Opening Overview

The first paragraph should answer, crisply:
- What segments does the company have?
- Which is the biggest *revenue* contributor?
- Which is the biggest *profit* contributor?
- How do they reinforce each other?

**MSFT example (study this):**
*"Microsoft operates three segments with complementary monetization models and strong cross-segment reinforcement: Productivity and Business Processes, Intelligent Cloud, and More Personal Computing. In FY2025, Microsoft generated $281.7B of revenue and $128.5B of operating income, with segment revenue and operating income showing that Productivity and Business Processes is the largest profit pool while Intelligent Cloud is the largest growth engine."*

Notice what this does: in two sentences, the reader knows the three segments, the scale, and the economic character of each. No buzzwords.

The **second paragraph** should explain the *character* of each segment — how does revenue get generated?

**MSFT example:**
*"Productivity and Business Processes is anchored by Microsoft 365 Commercial/Consumer subscriptions, collaboration (Teams), security/compliance within suites, Dynamics, and LinkedIn. Intelligent Cloud is centered on Azure (consumption-based cloud + AI services), hybrid server products (e.g., SQL Server), and enterprise services. More Personal Computing includes Windows licensing, devices, gaming, and search/news advertising."*

Followed by a *third paragraph* that names the **structural advantage** — the core reason this business model is durable.

**MSFT example:**
*"The business model is structurally advantaged because (i) mission-critical productivity subscriptions generate high-margin recurring cash flow, (ii) Azure converts customer compute demand into consumption revenue, and (iii) identity/security/compliance capabilities create switching costs and 'suite attach,' reinforcing both adoption and pricing power across the stack."*

Three reinforcing reasons, stated as mechanism, not as conclusion.

---

## 3 — Unit Economics Subsection

This is the technical heart of the section. For each major revenue driver, explain:

- **What scales the revenue?** (Seats × ARPU? Consumption × rate? Units × ASP?)
- **Where does incremental margin come from?** (Platform fixed costs? Mix shift? Scale on COGS?)
- **What are the key sensitivities?** (Utilization? Pricing? Capex/revenue?)

### The format SGC uses (from the MSFT report)

Label each "engine" and break it down:

**1) Microsoft 365 (seat-based SaaS):** Growth driven by installed base expansion (paid seats), ARPU uplift (suite upgrades like E5), and incremental attach of paid AI capabilities (Copilot). The key economic characteristic is high incremental margin on ARPU increases because core platform costs are largely fixed at the user layer, while price realization and attach flow through. Productivity and Business Processes delivered 60% operating margins in FY26 Q2.

**2) Azure (consumption-based cloud):** Revenue scales with workload consumption and usage intensity; economics are governed by utilization, power efficiency, cooling, and silicon cost/performance. Management explicitly frames optimization in terms of "tokens per watt per dollar," highlighting that AI workloads make infrastructure efficiency a first-order profit driver. A key near-term tradeoff is that scaling AI infrastructure and AI product usage pressures cloud gross margins; Microsoft Cloud gross margin was 67% in FY26 Q2 and management guided to roughly ~65% near term due to AI investment.

### Why this format works
- Each engine has a name
- Each has a growth driver specifically named
- Each has margin behavior explained
- Each has a specific current data point (60% margins, 67% gross margin)

Apply this to your company: 2-4 labeled engines, one paragraph each.

### The cash conversion note

After engines, add a paragraph on **cash conversion** — how well does reported operating income convert to free cash flow?

*"Cash conversion is increasingly governed by the capex cycle. In FY26 Q2, capex was $37.5B (with ~two-thirds in short-lived assets like GPUs/CPUs), and free cash flow was pressured by the higher cash capex mix—while operating cash flow benefited from strong cloud billings and collections."*

For any asset-heavy business (hyperscalers, utilities, E&P, industrials) this is essential. For asset-light businesses (SaaS, asset managers, brands), you can be briefer.

---

## 4 — Economic Moat Subsection

The Moat section explains **why this business model is defensible**. Don't just say "they have a moat." Name it, name the mechanism, and name the evidence.

### The SGC moat categories

Match your company to one or more:

| Moat type | Mechanism | Evidence to cite |
|---|---|---|
| **Network effects** | Value rises as users join (2-sided or direct) | MAU/DAU growth, density metrics |
| **Switching costs** | Migrating is expensive, risky, or disruptive | Gross retention, cohort analysis |
| **Installed base + distribution** | Embedded into workflow/infrastructure | Customer count, ACV, cross-sell metrics |
| **Scale economies** | Costs fall materially with volume | Unit economics vs peers |
| **Brand / reputation** | Customers pay a price premium for trust | Gross margin vs peers, share in premium tier |
| **Regulatory / IP** | Patents, licenses, or regulatory approval create legal barriers | Patent life, regulatory approvals list |
| **Proprietary data / learning** | Data advantage compounds over time | Data volume metrics, model performance |
| **Infrastructure ownership** | Physical network, real estate, or capex lead | Asset locations, replacement cost |

### The SGC moat paragraph format

Each moat should be a labeled paragraph with the mechanism named in bold.

**MSFT example (study the rhythm):**

*"**Installed base + switching costs:** Microsoft 365 is deeply embedded in enterprise workflows; migrations are costly due to training, compliance, document formats, and integration into identity and device management.*

*"**Platform bundling power:** Suites (not point products) allow Microsoft to bundle productivity, security, compliance, and now AI into a single procurement motion, protecting share and expanding ARPU via 'standardization' and attach (e.g., E5 + Copilot).*

*"**Hyperscale infrastructure + distribution:** Azure's scale and distribution through enterprise licensing relationships create a direct path to land-and-expand cloud consumption...*

*"**Data governance and trust:** Security, identity, and compliance capabilities serve as a critical control plane for AI deployments, raising switching costs and making Microsoft a 'safe default' partner for regulated enterprises..."*

Each moat:
- Named in bold
- Described as a mechanism
- Connected back to how it reinforces the thesis

For most SGC reports, 2-4 labeled moat paragraphs is the right count. More than 5 is padding.

---

## 5 — What NOT to Put in This Section

- ❌ Company history (put in Appendix if anywhere)
- ❌ Product feature catalog
- ❌ Generic industry overview (that's the next section)
- ❌ Management bios (Appendix)
- ❌ ESG commentary (only if thesis-relevant)

---

## SGC Pro Tips

- **Every "moat" claim must have a mechanism.** If you can't explain *how* the moat works, you're describing an outcome, not a moat.
- **Cite the segment margins and growth rates.** Every SGC moat claim should have a KPI that proves it.
- **For each engine, write one "this is where the bull case lives" line and one "this is where the bear case attacks" line.** That exercise exposes gaps.
- **Avoid "best-in-class."** Either show a specific comparison table, or cut the claim. "Highest gross margin among the top 5 peers at 67%" beats "best-in-class margins."
- **Keep segment economics tight to the thesis.** Every paragraph in this section should be something the thesis needs. If it's just general info, it belongs in an appendix.

---

## Summary

Business Model & Economics establishes that you understand the company. Three parts: overview, unit economics (labeled engines), and moat (labeled mechanisms). Each engine and each moat comes with a specific number or mechanism. This section is also where weak analysis shows — vagueness here signals the analyst didn't read the filings.

Next lesson: Industry & Competitive Landscape.
`,
  },
  {
    title: 'Industry & Competitive Landscape',
    slug: 'industry-competitive-landscape',
    order: 3,
    published: true,
    content: `## The Industry Section

This section answers: **does the company's competitive position hold up under real market conditions?** It sits between business model (what the company is) and catalysts (what forces the market to notice).

Three required subsections, in order:

1. **Industry Structure & Dynamics** — the shape of the market
2. **Competitive Positioning** — where the company sits inside it
3. **Secular vs Cyclical Forces** — what's temporary vs structural

Target length: 1-2 pages.

---

## 1 — Industry Structure & Dynamics

Open with the **shape of the market**: is it an oligopoly, fragmented, monopolistic, or a commoditized race to the bottom? Name the participants and cite the share data.

**MSFT example:**
*"Cloud is an oligopoly: market data indicates the 'big three' hyperscalers account for roughly two-thirds of cloud infrastructure spending, with enterprise cloud spend accelerating sharply in 2025 as generative AI demand increased. In IaaS, Gartner estimates AWS leads with ~37.7% share in 2024, followed by Microsoft at ~23.9%."*

Notice what this paragraph does in 60 words:
- Names the structure (oligopoly)
- Quantifies concentration (two-thirds to big three)
- Names the leader and share (AWS 37.7%)
- Names the subject company's share (MSFT 23.9%)
- Cites the source (Gartner)

### The industry structure checklist

- **Market shape** — oligopoly, fragmented, monopoly, regulated
- **Participants** — who are the top 3-5, and what's their share?
- **Growth rate** — is the pie growing, shrinking, or churning?
- **Barriers to entry** — what stops a new entrant?
- **Ongoing structural shifts** — consolidation waves, regulatory reshaping, technology reshaping

### The next paragraph: industry dynamics specific to the thesis

Then a second paragraph that ties the industry structure to *what matters for your thesis*. For MSFT, that was the AI reshaping of competitive advantage:

*"Generative AI shifts industry competition toward (i) compute supply chains (GPUs, power, cooling), (ii) model/platform ecosystems, and (iii) enterprise governance layers. These amplify the advantage of incumbents that can integrate AI across infrastructure and applications while providing compliance/security controls demanded by large organizations."*

---

## 2 — Competitive Positioning

This is where you position the company *within* the industry structure. Three key moves:

### Move 1 — Name the closest 2-3 competitors, not 10

Pick the direct competitors. Not the entire watchlist. For MSFT in the cloud section, that's AWS and Google Cloud. In productivity, that's Google Workspace and Salesforce. Don't drown in peer irrelevance.

### Move 2 — Explain the company's edge in the specific dimensions that matter

**MSFT example:**
*"Versus Google Cloud and AWS, Microsoft's differentiated position stems from the combination of (a) hyperscale cloud, (b) ubiquitous enterprise application distribution (Microsoft 365), and (c) integrated security/identity/compliance."*

Three specific edges. Named. Cited to the business model section. No "strong brand" hand-waving.

### Move 3 — For each major business line, address the positioning and the key competitive risk

**MSFT example (notice the format):**

*"**In cloud:** Microsoft is positioned to win AI and non-AI workloads via Azure's breadth and tight coupling with enterprise software procurement, while also benefiting from multi-year commitments (RPO expansion) that enhance visibility. The primary competitive concern is whether capacity allocation and pricing become a bottleneck (with demand exceeding supply) and whether rivals can outpace Microsoft in certain AI model/tooling ecosystems.*

*"**In productivity:** Microsoft's suite bundling and entrenched workflow integration create high switching costs versus point solutions, supporting stickiness and pricing power. The key competitive risk is that 'AI-native' workflow tools could slowly erode usage if Microsoft's Copilot experiences fail to deliver clear ROI over alternatives—though early large deployments indicate that enterprise standardization is actively underway."*

### Why this structure works
- Each business line gets its own labeled paragraph
- Each paragraph has two parts: **advantage** + **the competitive risk to monitor**
- Each risk is explicit and specific enough to track in catalysts/risks sections

---

## 3 — Secular vs Cyclical Forces

Every industry has both. The job of this subsection is to separate them so the reader knows which forces support *duration* in the thesis vs which are just current conditions.

### The labeled format (from MSFT)

*"**Secular tailwinds:** AI diffusion expands total addressable compute and software value, and Microsoft explicitly expects TAM expansion 'across every layer of the stack.' Continued migration to cloud and modernization of data platforms remain multi-year trends, reinforced by AI workload requirements.*

*"**Cyclical variables:** enterprise IT budgets can tighten in macro slowdowns, impacting new seat growth, project pace, and certain transactional components (e.g., devices, ads). More Personal Computing illustrates this—Q2 FY2026 segment revenue declined due to gaming softness, even while Windows OEM benefited from end-of-support dynamics."*

### Why this matters for the thesis

A thesis built entirely on cyclical forces has a 6-12 month lifespan — you need to be right on timing.

A thesis built on secular forces has a 3-5 year lifespan — you have more room for error on entry price.

Most SGC theses mix the two: **secular tailwind + cyclical entry point**. Stating which is which makes it clear the analyst understands the duration of the bet.

---

## Examples of Secular vs Cyclical Framing, by Sector

| Sector | Secular tailwinds | Cyclical variables |
|---|---|---|
| Banks | Digital banking adoption, payments platform consolidation | Rate cycle, credit cycle |
| Energy | Capital discipline era, supply chain underinvestment | Oil price cycle, OPEC decisions |
| Healthcare | Aging demographics, innovation productivity | Reimbursement cycles, drug pricing policy |
| Semis | AI compute demand, reshoring | Inventory cycle, capex cycle |
| Consumer | Premiumization, e-commerce shift | Wage cycle, credit availability |
| Industrials | Automation, reshoring, infrastructure spending | Capex cycle, inventory cycle |

Use this kind of table as a mental check when writing your own section.

---

## What NOT to Do in This Section

- ❌ Paste a generic industry overview from a McKinsey deck
- ❌ List every competitor ever
- ❌ Quote sell-side TAM estimates without naming the assumption behind them
- ❌ Skip the secular vs cyclical breakdown (it's the part that tells the committee you understand duration)
- ❌ Present the company as best-in-class without naming the dimensions

---

## SGC Pro Tips

- **Draw the market share pie on paper before writing.** You should be able to draw it from memory if you've done the work.
- **Cross-reference peer filings.** If your company says "we gained share," check whether the two closest peers say the same thing. Someone is wrong.
- **Trade publications beat sell-side research for granularity.** Sector-specific outlets (e.g., S&P Global Platts for energy, SNL for financials, IBISWorld for consumer) have the pricing and capacity data sell-side aggregates.
- **Describe dynamics, not categories.** "The industry is consolidating" is weak. "Three acquirers have closed $X+ in deals in the last 18 months, reducing the top-3 share from 55% to 68%" is strong.
- **Your positioning paragraphs should align directly to thesis pillars.** If your thesis pillar is about competitive advantage in cloud, the cloud positioning paragraph must name that advantage.

---

## Summary

The Industry section establishes the external context that makes the company's thesis meaningful. Three parts: **structure** (shape of the market), **positioning** (where the company sits), **secular vs cyclical** (what's durable vs temporary). Every paragraph should serve the thesis — if it doesn't, cut it.

Next lesson: Catalysts & Timeline.
`,
  },
  {
    title: 'Catalysts & Timeline (Near-Term and Medium-Term)',
    slug: 'catalysts-and-timeline',
    order: 4,
    published: true,
    content: `## Why Catalysts Matter

A cheap stock can stay cheap forever. What turns a thesis into a trade is the **dated event that forces the market to reprice**. Without catalysts, you're running a sit-and-wait portfolio — which is fine for a 5-year compounder thesis, but still requires explaining *why this will play out within our horizon*.

At SGC we require two buckets:

1. **Near-Term Catalysts (0–6 months)** — the events that validate or break the thesis quickly
2. **Medium-Term Catalysts (6–18 months)** — the structural reprice drivers

Longer-term catalysts (18m+) go in the thesis narrative, not the Catalysts section. If your only catalyst is "3 years from now the market will wake up," you have a compounder — but still name a near-term confirming event.

---

## 1 — The Format (From the MSFT Report)

Each catalyst has three components:

1. **Catalyst statement** — what the event is
2. **Impact rating** — high / medium / low
3. **Interpretation** — what triggering the catalyst (or not) means for the thesis

**MSFT example — Near-Term Catalyst #1:**

> **FY26 Q3 earnings and guidance (cloud growth, margins, capex cadence)**
>
> **high**
>
> Confirmation of Azure growth durability and RPO conversion (especially the portion recognized in the next 12 months) can improve confidence in forward growth; clearer capex normalization signals can reduce multiple compression risk linked to capital intensity.

This is the standard. Match it.

---

## 2 — What Counts as a Catalyst

### The SGC catalyst taxonomy

| Catalyst type | Example | Typical impact |
|---|---|---|
| **Earnings release** | Next print, with specific KPIs called out | High |
| **Guidance change** | Raise/lower, first-time initiation, withdrawal | High |
| **Analyst / investor day** | Set long-term targets, unit economics disclosure | Medium-High |
| **Product launch** | Dated launch with measurable adoption metrics | Medium |
| **Regulatory decision** | FDA approval, antitrust ruling, policy enactment | High (often binary) |
| **M&A / strategic action** | Announced or expected deal, spin, sale | High |
| **Macro policy** | Fed meeting that changes cost of funding | Medium |
| **Legal resolution** | Pending ruling, settlement, patent case | Varies |
| **Operational milestone** | Capacity online, new facility opens | Low-Medium |
| **Capital return action** | Buyback announcement, dividend initiation | Medium |

### What is NOT a catalyst

- "Continued execution" — not an event
- "AI adoption" — not dated
- "Long-term growth" — belongs in thesis
- "The stock is cheap" — valuations don't self-correct without catalysts

---

## 3 — Writing the Near-Term Catalyst Block

Target: **3 catalysts for most reports, 2-4 acceptable.** More than 5 and the committee stops reading.

### Structure each catalyst as:

1. **Bold statement** of the event — active voice, includes the KPI to watch
2. **Impact rating** — high / medium / low
3. **1-3 sentence interpretation** — what confirmation/rejection means and the reprice mechanism

### Two more MSFT examples to study the rhythm:

> **Evidence of accelerating Copilot monetization in Microsoft 365 (seat adds + ARPU contribution)**
>
> **medium**
>
> If management continues to show record seat adds and highlights ARPU expansion driven by E5 + Copilot, investors can reframe Copilot from "adoption disappointment" to "multi-year ARPU engine," supporting a bullish multiple on durable earnings.

> **Update on AI infrastructure efficiency and supply availability (custom silicon + datacenter scaling)**
>
> **medium**
>
> Demonstrated improvement in cost/performance (tokens per watt per dollar) and incremental capacity addition can reduce fears that AI growth is supply-constrained and margin-destructive, supporting both Azure growth and cloud gross margin stabilization.

### Why these work

- Each names a **specific observable**: "seat adds," "ARPU expansion commentary," "tokens per watt per dollar"
- Each specifies the **reprice mechanism**: "reframe Copilot from disappointment to engine"
- Each is dateable — will happen in next 6 months (earnings, conferences)

---

## 4 — Medium-Term Catalysts (6–18 Months)

Medium-term catalysts are the **structural drivers** that make the reprice last. They are less dateable but more important for the *size* of the move.

### MSFT examples:

> **Broad enterprise standardization of Copilot and agents across large tenants**
>
> **medium**
>
> Growth in "very large" Copilot deployments can drive sustained ARPU expansion on a large paid seat base, increasing operating leverage in the highest-margin segment...

> **AI capacity build-out transitions from constraint to monetization**
>
> **medium**
>
> As GPU/CPU supply ramps and Microsoft optimizes infrastructure, utilization and inference cost curves can improve, supporting Azure growth...

> **Windows end-of-support aftereffects + AI PC cycle bolster OEM and services attachment**
>
> **medium**
>
> Persistent refresh dynamics following Windows 10 end of support and rising Windows 11 base can support OEM licensing...

### The tell for a good medium-term catalyst
- It is *trackable* — you can update your view quarter to quarter
- It is *directly tied* to one of your thesis pillars
- It implies a *specific magnitude* of reprice when it plays out

---

## 5 — Impact Ratings (How to Decide)

**High impact** — if this plays out as expected, the stock reprices 10%+ in a short window, *or* definitively validates/invalidates the thesis.

**Medium impact** — confirms trajectory, accumulates into a reprice over 2-3 quarters, or moves a pillar from uncertain to confirmed.

**Low impact** — adds confidence but doesn't move the market alone. (Most "low" catalysts should be cut unless they're part of a cluster.)

### Impact ratings are not vibes
They reflect:
- **Magnitude** of potential reprice
- **Probability** that the catalyst plays out as you expect
- **Price sensitivity** — is the market currently priced for this outcome?

If the market already expects the catalyst outcome (priced in), even a "high magnitude" event is low-impact.

---

## 6 — Common Catalyst Mistakes

| Mistake | Fix |
|---|---|
| Listing earnings without naming the KPI | "Q3 earnings on Apr 30, 2026 — watch Azure growth, cloud gross margin" |
| "Regulatory uncertainty resolves" | Name the regulation and the expected decision date |
| "Sentiment improves" | Not a catalyst — name what forces sentiment to change |
| "Multiple expansion" | An *outcome*, not a catalyst |
| 8 catalysts of equal weight | Rank. Max 3-4 near-term, 3-4 medium-term. |
| Vague dates ("later this year") | Use quarters: "H2 2026," "FY27 Q1" |

---

## 7 — The Catalyst-Thesis Alignment Check

Before submitting the report, every catalyst should map to a thesis pillar. If a catalyst doesn't tie back to a pillar, either:

- It's not actually catalytic (cut it), or
- The thesis is missing a pillar (add it)

**Example alignment:**

| Thesis pillar | Confirming catalyst | Breaking catalyst |
|---|---|---|
| Azure growth durability | Q3 earnings showing Azure ≥35% growth | Q3 Azure growth <30% + cautious guidance |
| Copilot ARPU monetization | Record seat adds + ARPU call-out | Paid seats flat/declining YoY |
| Security platform attach | Large deal announcements, E5 mix up | Attach rates flat, security revenue decel |

If you can draw this table for your own pitch, the pitch is cohesive.

---

## SGC Pro Tips

- **Always name the date (or date range) of the catalyst.** "Q3 earnings" → "Q3 earnings, expected late April 2026." Datelessness = not a catalyst.
- **Your top catalyst should be the one that most decisively validates your pillar #1.** If it's not, your thesis and your catalysts are out of sync.
- **Track the catalyst calendar after pitching.** Update the team when the dates slip or land.
- **Avoid anchoring to sell-side catalysts.** If the 3-4 catalysts are "reading the sell-side script," your pitch is consensus — and consensus doesn't generate alpha.
- **Build a reverse table.** For each near-term catalyst, write the *negative* outcome that would break the thesis. This is the foundation of the Risks section.

---

## Summary

Catalysts give the thesis *time*. A well-written Catalysts section names 2-4 near-term events, 2-3 medium-term drivers, each with a specific KPI to watch, an impact rating, and a written reprice mechanism. Every catalyst should tie to a thesis pillar. Every catalyst should have a date.

Next lesson: Valuation Analysis — DCF, comps, sensitivity.
`,
  },
  {
    title: 'Valuation Analysis: DCF, Comps, and Sensitivity',
    slug: 'valuation-analysis',
    order: 5,
    published: true,
    content: `## The Valuation Section

By the time the reader reaches Valuation, the thesis is already made. This section exists to **translate the thesis into a defensible price target** — with enough transparency that the committee can poke at every assumption.

Four required subsections, in order:

1. **Comparable Companies** — where the stock trades vs peers
2. **DCF Output** — target, current, upside
3. **Revenue Growth & Margin Forecast** — the model drivers
4. **Sensitivity Analysis** — 2D table on WACC × terminal growth

Optionally:
5. **Valuation Methodology** — explains the DCF approach

Target length: 2-3 pages.

---

## 1 — Comparable Companies

The peer table is a reality check. If your DCF target implies the stock trades at 40× forward earnings when peers trade at 18×, you have a thesis problem, not a valuation problem.

### The SGC comp table format (from MSFT)

| Company | Mkt Cap | EV/Rev | EV/EBITDA | P/E | Fwd P/E | P/S | Rev Growth | EBITDA Margin | Beta |
|---|---|---|---|---|---|---|---|---|---|
| Microsoft Corp (MSFT) | $2720B | 8.9× | 14.5× | 22.9× | 19.5× | 8.9× | 16.7% | 57.4% | 1.11 |
| Alphabet (GOOGL) | $3398B | 8.8× | 19.7× | 26.0× | 26.3× | 8.4× | 18.0% | 37.3% | 1.11 |
| Meta (META) | $1385B | 7.5× | 14.2× | 23.3× | 19.9× | 6.9× | 23.8% | 50.7% | 1.28 |
| Apple (AAPL) | $3717B | 8.4× | 24.0× | 32.0× | 28.8× | 8.5× | 15.7% | 35.1% | 1.12 |
| Amazon (AMZN) | $2227B | 3.1× | 13.5× | 29.0× | 25.8× | 3.1× | 13.6% | 20.3% | 1.42 |
| Salesforce (CRM) | $173B | 4.5× | 15.0× | 23.8× | 14.8× | 4.2× | 12.1% | 30.2% | 1.31 |
| Oracle (ORCL) | $410B | 8.6× | 17.9× | 25.6× | 18.7× | 6.4× | 21.7% | 42.8% | 1.65 |

### What to include (required columns)

- **Market cap** — scale reference
- **EV/Revenue** — useful for growth companies and pre-profit names
- **EV/EBITDA** — best cross-capital-structure comparison
- **P/E (trailing)** — the headline number most investors see
- **Forward P/E** — what the market is pricing going forward
- **Revenue growth** — tie valuation to growth
- **EBITDA margin** — tie valuation to profitability
- **Beta** — cost of equity input

### Choosing the peer set

- **4-8 peers maximum.** Fewer than 4 and the average is unreliable; more than 8 and the reader stops reading.
- **Only direct business-model peers.** If you're valuing a SaaS company with 85% gross margins, don't include legacy on-prem licensing peers.
- **Cross-reference management's stated peer group** in the proxy. They'll tell you who they see as comps.

### The peer paragraph

Write 1-2 sentences below the table naming *how* the company compares:

*"Microsoft trades at a modest discount on EV/Revenue (8.9×) relative to high-growth hyperscaler peers despite comparable growth and significantly higher EBITDA margins (57.4% vs the peer median of ~38%), suggesting the market is pricing in incremental AI investment drag that this report argues is transient."*

---

## 2 — DCF Output Block

Mirror the MSFT report layout:

- **Intrinsic Value**: $469.64 per share
- **Current Price**: $356.77 market quote
- **Upside/(Downside)**: 31.6% to target
- **Valuation Method**: DCF, 5yr + Terminal

Then 1-2 sentences of context:

*"Our DCF model values **Microsoft Corporation** at **$469.64 per share**, representing a **31.6% upside** to the current market price of $356.77."*

This block exists to give the reader the verdict before diving into the methodology.

---

## 3 — Revenue Growth Trajectory and Margin Forecast

### Revenue Growth

A short paragraph that explains the trajectory in plain English. From MSFT:

*"Growth moderates from 15.3% to 20.0% as the company matures, converging to long-term 4.0% terminal rate."*

Then a visual — growth by year for the forecast period. If no chart, a table works:

| FY26 | FY27 | FY28 | FY29 | FY30 | Terminal |
|---|---|---|---|---|---|
| 16.5% | 15.3% | 13.0% | 11.5% | 9.8% | 4.0% |

### EBIT Margin Forecast

Same format. From MSFT:

*"EBIT margins average 44.3% across forecast period, reflecting stable operational efficiency."*

With a margin trajectory table or chart.

### Key Operating Assumptions

Everything material the reader needs to know, in one compact table:

| Assumption | Value |
|---|---|
| Capex as % of Revenue | 18.1% |
| D&A as % of Revenue | 9.3% |
| NWC Change as % of Revenue Δ | 2.0% |
| Cash Tax Rate | 20.1% |

For every SGC DCF, disclose:
- Capex intensity (critical for asset-heavy names)
- D&A intensity
- Working capital assumption
- Cash tax rate (not statutory rate)

---

## 4 — Terminal Value

Disclose:

| Line | Value |
|---|---|
| Perpetual Growth Rate | 4.00% |
| Terminal Value | $4,665.2B |
| % of Enterprise Value | 85.7% |

Terminal value as % of EV is a critical sanity check:

- **60-85%:** healthy for mature businesses
- **85-95%:** defensible for durable compounders but flag to the reader
- **95%+:** either your near-term forecasts are too conservative, or your terminal growth is too high, or both

Follow with one-sentence justification: *"Terminal value assumes 4.00% perpetual growth, in line with long-term GDP expectations."*

---

## 5 — Sensitivity Analysis (Critical)

The single most important table in the valuation section. A 2D sensitivity on **WACC × Terminal Growth**.

From the MSFT report:

| WACC ↓ / Growth → | 3.0% | 3.5% | 4.0% | 4.5% | 5.0% |
|---|---|---|---|---|---|
| 7.14% | $495.10 | $556.27 | $636.92 | $748.14 | $911.35 |
| 7.64% | $439.13 | $486.23 | $546.27 | $625.43 | $734.60 |
| **8.14%** | $394.09 | $431.32 | **$477.56** | $536.49 | $614.21 |
| 8.64% | $357.07 | $387.14 | $423.69 | $469.08 | $526.94 |
| 9.14% | $326.10 | $350.82 | $380.35 | $416.24 | $460.80 |

The base case (bolded) sits at the center. Color coding in the actual report: blue = base, green = upside, red = downside.

### What the sensitivity tells the reader

- **Robustness**: if 50bps moves in WACC or growth break the thesis, the thesis is fragile
- **Asymmetry**: is the upside case 2× the downside case, or is it symmetric?
- **Where the stock currently sits**: if current price is at, say, $356.77, that implies the market is pricing a ~9.14% WACC with 3.5% growth. Your thesis must explain why that's wrong.

### Always write the line

*"Blue cell indicates base case valuation. Green = upside scenarios, Red = downside scenarios."*

Use the sensitivity to *argue*, not just disclose.

---

## 6 — Valuation Methodology Paragraph

Close with 4-5 numbered bullets explaining the DCF approach. From MSFT:

*"The DCF model employs a Free Cash Flow to the Firm (FCFF) approach, valuing Microsoft Corporation based on cash flows available to all capital providers. The methodology includes:*

*1. **Explicit Forecast Period (5 years):** Operating performance projected based on management guidance, historical trends, and industry dynamics.*

*2. **Terminal Value:** Represents value beyond the explicit forecast, calculated using perpetuity growth at 4.00%. Accounts for 85.7% of total enterprise value.*

*3. **Discount Rate:** All cash flows discounted at WACC of 8.14%, reflecting the company's cost of capital and risk profile.*

*4. **Bridge to Equity Value:** Enterprise value adjusted for net debt ($21.5B) to derive equity value attributable to common shareholders."*

This paragraph exists so that committee members who didn't build the model can still understand what you did.

---

## 7 — When DCF Is Not Enough

DCF is the SGC default, but for some businesses it needs a companion:

| Company type | Primary method | Companion method |
|---|---|---|
| Mature compounder (MSFT-type) | DCF | EV/EBITDA comp |
| Growth tech (pre-profit) | EV/Revenue + exit multiple | DCF with terminal |
| Bank | P/BV × ROE (Gordon growth) | P/E |
| Insurance | P/BV (adjusted) + ROE trajectory | — |
| REIT | AFFO yield vs peer cap rate | NAV (Net Asset Value) |
| Biotech (pipeline) | rNPV (risk-adjusted NPV) | Peer EV/Revenue if late-stage |
| Cyclical industrial | Normalized earnings × through-cycle multiple | EV/EBITDA |
| SOTP situations | Sum-of-the-parts | Comps on each piece |

If you use a non-DCF primary method, explain why in the methodology paragraph.

---

## 8 — Common Valuation Mistakes

| Mistake | Fix |
|---|---|
| Picking a WACC to hit the target | WACC comes from first principles, not the desired outcome |
| Terminal growth > GDP | Capped at ~GDP (~3-4% long-run nominal) |
| TV > 95% of EV | Extend forecast period or lower terminal growth |
| No sensitivity | Always 2D sensitivity. Non-negotiable. |
| Peer set chosen to flatter the stock | Include the closest structural peers, not the cheapest |
| DCF without cross-check | Always sanity check vs comps multiples |
| Using statutory tax rate | Use cash effective tax rate |
| Ignoring net debt | Bridge from EV to equity value explicitly |

---

## SGC Pro Tips

- **Disclose every major assumption.** If the committee has to ask, your report is incomplete.
- **Your WACC should be citable.** "8.14% reflects a 4.2% Rf, 1.11 beta, 5.5% ERP, and effective 4.7% cost of debt at 20.1% cash tax rate, weighted 95% equity / 5% debt."
- **Run the bear case WACC.** In the MSFT report, bear case uses 9.01%. That +87bps is explicit, not hidden.
- **For illiquid or emerging market names, use Damodaran's country risk adjustments.** Linked in the curated resources.
- **The target price is a point estimate. The sensitivity is the reality.** Always discuss both.

---

## Summary

Valuation translates the thesis into a number. Comps table → DCF output → growth/margin forecast → terminal → sensitivity → methodology. Every assumption disclosed. Every result sanity-checked. The sensitivity table is the soul of the section — it tells the reader whether your target is robust or fragile.

Next lesson: Bull & Bear Cases, Key Risks, AI & Data Strategy, and Disclosures — the closing sections of the report.
`,
  },
  {
    title: 'Bull/Bear Cases, Key Risks, AI Strategy, and Disclosures',
    slug: 'bull-bear-risks-ai-disclosures',
    order: 6,
    published: true,
    content: `## Closing the Report

The final sections of an SGC report are where the most rigorous analysts distinguish themselves. A weak analyst slaps on generic risks and a boilerplate disclaimer. A strong analyst uses these sections to prove they've genuinely considered how the thesis can break.

Four remaining sections:

1. **Sentiment & News Flow** — current tape read
2. **Bull & Bear Cases** — DCF scenarios with written justification
3. **Key Risks** — named risks with impact + mitigation
4. **AI & Data Strategy** *(when applicable)* — Current Deployment, Strategic Impact, Limits & Risks
5. **Important Disclosures** — SGC standard

---

## 1 — Sentiment & News Flow

This section captures the current market tape so the reader understands the *sentiment backdrop* going into the pitch.

### The MSFT format

*"bullish | 30-day window | Pulled Apr 2, 3:42 PM"*

Then a short paragraph summarizing:
- Number of articles across sources
- Coverage theme concentration (what subjects the tape is focused on)
- Top contributing source
- Signal strength (1-100)
- Bullish / Bearish / Neutral split

**MSFT example:**
*"50 recent articles across 28 sources, with coverage centered on technology, financial_markets, economy_macro. Most of the tape is tied to ai, earnings, analyst action. Top contribution came from MarketBeat."*

### The "Why it matters" line
One sentence on what the current tape means for the setup:

*"Live news flow is bullish with high conviction. Sentiment is constructive while the stock is still trading off over the last five sessions. The heaviest event bucket right now is ai."*

### Event bucket table

| Event bucket | Articles | Average sentiment |
|---|---|---|
| ai | 25 | +0.17 |
| earnings | 18 | +0.14 |
| analyst action | 11 | +0.18 |
| company update | 8 | +0.11 |
| guidance | 7 | +0.18 |
| product | 7 | +0.15 |
| macro | 6 | +0.22 |
| capital return | 5 | +0.19 |

### Why this section matters
- Positions the reader to understand whether your pitch is *with* sentiment or *against* it
- A Buy recommendation against a bearish tape is different from a Buy aligned with a bullish tape
- For committee review, shows the analyst has the current tape in their head

For names without a quantified sentiment system yet, a two-paragraph qualitative summary of the last 30 days of coverage works — referencing 5-10 specific recent headlines.

---

## 2 — Bull & Bear Cases (from DCF)

These are the scenario outputs from your DCF model, translated into narrative.

### The Bull Case block

| Metric | Bull Case |
|---|---|
| Intrinsic Value/Share | $498.60 |
| Enterprise Value | $3,909.05B |
| WACC | 7.49% |

*Assumptions: Higher revenue growth, margin expansion, lower discount rate.*

### The Bear Case block

| Metric | Bear Case |
|---|---|
| Intrinsic Value/Share | $357.85 |
| Enterprise Value | $2,811.59B |
| WACC | 9.01% |

*Assumptions: Lower growth, margin pressure, higher discount rate.*

### The Justification (mandatory — this is where it matters)

Generic "assumptions tables" are worthless without a narrative. Every SGC report must include a paragraph explaining *how the world looks* in each scenario.

**MSFT example:**
*"In the bear case, AI monetization fails to 'catch' on the schedule implied by capex: Azure growth decelerates materially as capacity constraints persist and competition pressures pricing, while Microsoft Cloud gross margin remains structurally depressed due to ongoing AI infrastructure scaling. Simultaneously, Copilot adoption plateaus—remaining a limited add-on rather than a broad standard—reducing ARPU uplift and weakening investor confidence in Microsoft 365 as the primary AI profit lever. Under this scenario, the market re-rates Microsoft from 'durable compounder with AI upside' toward 'capital intensive AI infrastructure builder,' compressing the multiple as earnings visibility and incremental returns are questioned, even if absolute revenue growth remains positive."*

### Why the MSFT bear case is strong
- Names *specific* things that would have to fail (Azure growth, Copilot adoption)
- Explains the **narrative shift** in the market (from compounder to capex infra)
- Connects the narrative shift to the **multiple compression** mechanism
- Accepts that revenue can still grow in the bear case

### Writing your own bull/bear justification

Structure each as:
1. **What fails (bear) or accelerates (bull)** — specific pillars
2. **How the narrative shifts** — what the market calls this company in the bear/bull world
3. **The reprice mechanism** — why the multiple moves

Target length: 1 paragraph per scenario, 80-150 words.

### Position sizing implication

If the spread between bull and bear targets is asymmetric (e.g., bull +40%, bear 0%), note it. Committee allocation often uses this asymmetry to decide position size.

---

## 3 — Key Risks (The Section Most Analysts Mess Up)

Risks are *not* a disclaimer. They are a **pre-mortem** — what would break the thesis? The committee grades reports on the quality of the risk section.

### The SGC risk format (from MSFT)

Each risk has three components:

1. **Risk statement** (descriptive, specific)
2. **Impact rating** (high / medium / low)
3. **Mitigation / monitoring** — what you track to see if the risk is materializing

**MSFT Risk #1 example:**

> **AI infrastructure capital intensity compresses margins and reduces near-term cash generation**
>
> **high impact**
>
> Microsoft Cloud gross margin has been pressured by AI infrastructure scaling and AI product usage; management signaled continued AI-driven gross margin pressure near term. If capex remains elevated longer than expected or utilization lags, the market could continue de-rating the stock on lower incremental returns.
>
> **Mitigation:** Track (i) Cloud gross margin trajectory and guidance, (ii) capex mix (short-lived vs long-lived assets), (iii) evidence of improving efficiency and utilization, and (iv) explicit commentary on supply/demand balance.

### How to write the risk statement

Every risk statement is: **[named thing] → [mechanism] → [impact on stock]**.

Avoid:
- ❌ "Market risk"
- ❌ "Competition"
- ❌ "Macro"

Write:
- ✅ "AI infrastructure capex outpaces monetization for 2+ quarters, compressing incremental returns on capital and triggering multiple de-rating"
- ✅ "Regulatory ruling against default-browser bundling forces MSFT to unbundle Edge, reducing search revenue and attach"
- ✅ "Major enterprise customer switches Azure consumption to a competing hyperscaler ahead of renewal"

### The number of risks

- **Minimum: 3.** Fewer and you've under-thought the pitch.
- **Typical: 3-5.** Enough to cover the real ways the thesis breaks.
- **Max: 6.** More and you're padding. If you see 8+ risks on a pitch, the analyst is hedging.

### The mitigation section

Every risk must include a **monitoring plan**. What specific metrics do you track quarterly? If you can't monitor a risk, you can't size around it — and you can't exit before it becomes severe.

---

## 4 — AI & Data Strategy (When Applicable)

Not every company needs this section. But for names with a material AI or data strategy, the SGC template includes a dedicated subsection.

### Three required subsections

**1. Current AI Deployment** — what AI capabilities does the company actually have in the field, right now?
- Specific products or features shipped
- Adoption metrics (customer counts, usage statistics)
- Infrastructure or data advantages

**MSFT example:**
*"Microsoft is deploying AI across three tightly coupled layers: (1) Azure infrastructure ('token factory'), (2) AI/agent platform services, and (3) high-value Copilot experiences embedded in workflows."*

Then bullet evidence:
- 15M paid Microsoft 365 Copilot seats (record adds; >160% YoY seat adds)
- 4.7M paid GitHub Copilot subscribers (up 75% YoY)
- 24B Copilot interactions audited by Purview in the quarter (up 9x YoY)
- Custom silicon (Maia, Cobalt) + NVIDIA/AMD GPUs with large incremental power capacity additions

**2. Strategic Impact** — how does AI change the thesis?
- Revenue expansion mechanism (new monetization, ARPU lift)
- Platform defensibility impact (moat reinforcement, switching costs)
- Capital structure implications (capex intensity, margin trajectory)

**3. Limits & Risks** — the AI-specific risk cluster
- Supply chain / capacity constraints
- Margin/cash flow tradeoffs
- Customer ROI and change management
- Concentration / volatility in AI revenue commitments

### When to include this section

**Include when** the company has:
- Material AI product or capex commitment
- AI explicitly cited in the investment thesis
- AI driving a measurable revenue or margin shift
- Competitive dynamics materially shaped by AI positioning

**Skip** for pure commodity businesses, small financials with no AI exposure, or companies where AI is only a risk (not a thesis driver).

---

## 5 — Important Disclosures

Every SGC report must end with the standard disclosure. **Copy it exactly** — this is a legal requirement, not a stylistic choice:

*"This report has been prepared by St. George Capital for educational purposes only. It does not constitute investment advice or a solicitation to buy or sell securities. St. George Capital and its members may hold positions in the securities discussed. Past performance does not guarantee future results. Investors should conduct their own due diligence and consult with qualified financial advisors before making investment decisions."*

Published date is appended below.

### Why this matters

SGC is a student educational society, not a registered investment advisor. The disclosure is what permits members to publish research under the SGC banner without triggering registration requirements. Do not edit the disclosure. If you want to add something, run it past leadership first.

---

## 6 — The Final Pre-Submission Checklist

Before submitting an SGC report, confirm:

- [ ] Header has Recommendation, Target Price, Implied Upside, Date, Analyst, Sector
- [ ] Snapshot has all 9 required fields + EPS table + price performance
- [ ] Thesis has 2-4 pillars, each with Title + Statement + Driver + Market Mispricing
- [ ] Business Model has overview + Unit Economics (labeled engines) + Moat (labeled mechanisms)
- [ ] Industry has structure + positioning + secular vs cyclical
- [ ] Catalysts has 2-4 near-term (0-6m) and 2-3 medium-term (6-18m) with impact ratings
- [ ] Valuation has comps table + DCF output + growth/margin forecast + 2D sensitivity + methodology
- [ ] Sentiment block included with event bucket table
- [ ] Bull/Bear cases include justification paragraph
- [ ] Key Risks: 3-5 with impact ratings and monitoring plan
- [ ] AI section included where applicable
- [ ] Disclosures present, unedited
- [ ] Every number traceable to a filing or cited source
- [ ] Analyst name and pricing date clearly stated

If any checkbox is unchecked, the report isn't ready for publication.

---

## SGC Pro Tips

- **Write the risks section right after the thesis.** Your thesis is sharper when you've already thought about what would break it.
- **The bull/bear justification is where analysts reveal whether they understand the business.** Don't fill these with "assumptions" — tell a story.
- **Any risk you can't monitor is a risk you can't size around.** Every risk gets a monitoring plan or it gets cut.
- **Read the MSFT report end-to-end before writing your first SGC report.** Internalize the tone, structure, and specificity.
- **Disclosures stay as-is.** Don't experiment.

---

## Summary

The closing sections — Sentiment, Bull/Bear, Risks, AI Strategy, Disclosures — are where strong analysts separate from mediocre ones. Generic risk lists and template-filled disclosures get reports rejected. Specific, evidence-backed risks with monitoring plans, narrative bull/bear justifications, and tight AI sections (when applicable) make reports publishable.

That completes the SGC equity research report course. Next: the 5-minute SGC pitch — how to translate this report into a live presentation.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 9: THE 5-MINUTE SGC STOCK PITCH
// ---------------------------------------------------------------------------

const sgcPitchCourse = {
  title: 'The 5-Minute SGC Stock Pitch',
  slug: 'five-minute-sgc-pitch',
  summary: 'How to deliver a 5-minute SGC-style stock pitch — from the one-sentence thesis to Q&A survival. Distilled from the SGC equity research template and sharpened for live presentation in committee, at conferences, and in recruiting.',
  tags: 'sgc, stock pitch, equity research, interview, presentation',
  published: true,
  order: 9,
};

const sgcPitchLessons = [
  {
    title: 'The 5-Minute Timing Skeleton',
    slug: 'pitch-timing-skeleton',
    order: 0,
    published: true,
    content: `## Why 5 Minutes Matters

The 5-minute stock pitch is the industry standard — in SGC committee, in IB/ER/HF interviews, at student conferences. It is long enough to communicate a real thesis, and short enough that every word has to work. Members who can deliver a crisp 5-minute pitch get SGC allocations, internships, and return offers.

This lesson walks through the standard SGC timing skeleton.

---

## The Skeleton

| Time | Content | Purpose |
|---|---|---|
| 0:00 – 0:30 | One-sentence thesis + price target + upside | Tell them what you think before they decide whether to listen |
| 0:30 – 2:00 | Pillar 1 (Driver + Market Mispricing) | The strongest reason |
| 2:00 – 3:30 | Pillar 2 (Driver + Market Mispricing) | The second reason |
| 3:30 – 4:30 | Valuation + sensitivity | How you get to the target |
| 4:30 – 5:00 | Top risk + mitigation + your ask | Close with discipline, not with a whimper |

That's 2 pillars, not 3. In 5 minutes, 2 pillars delivered sharply beats 3 pillars delivered fuzzily. Save pillar 3 for Q&A.

---

## 0:00 – 0:30 — The One-Sentence Opener

The opener is the only sentence the listener remembers at minute 6. Make it carry weight.

### Format
*"[Company] is a [Buy/Hold/Sell] at $[current], target $[PT] ([X]% upside), because [specific variant perception]."*

### Strong opener
*"Microsoft is a Buy at $356.77, target $469.64 — 31.6% upside — because the market is anchoring to near-term AI capex intensity and missing $625B of committed backlog that is increasingly converting to revenue as capacity ramps."*

### Weak opener
*"I'm going to pitch Microsoft today. Microsoft is a great business and I think it's a Buy."*

The weak version gives the listener no reason to lean in. The strong version tells them *exactly* what you think, why it's different from consensus, and how much money is on the table. It also pre-answers their first question: what's your target?

### Timing tip
You should be able to deliver the full opener in under 20 seconds. Practice it standing up. If it takes longer, you're either over-qualifying or including a second thought. Cut.

---

## 0:30 – 2:00 — Pillar 1 (Driver + Market Mispricing)

Ninety seconds is about 200 words, or roughly:

**~30 seconds** — state the pillar claim clearly
**~40 seconds** — deliver 2-3 specific data points (the Driver)
**~20 seconds** — state the market's current narrative and why it's wrong (the Market Mispricing)

### Example (MSFT pillar 1)

*"First, Azure's growth durability is being underappreciated.*

*In their most recent quarter, Azure grew 39% year over year. Commercial remaining performance obligations hit $625 billion — up 110% — with 25% expected to recognize as revenue within the next 12 months. That's as much forward visibility as any hyperscale platform has ever reported.*

*"The bear narrative is that AI capex is crowding out core Azure and pressuring margins. That narrative confuses the problem: demand is not the constraint, supply timing is. As capacity comes online, revenue recognition tracks demand — which is already committed. That's a mispricing waiting to close."*

~180 words. Delivered in 90 seconds. Three specific numbers, a named narrative, and a named reprice mechanism.

---

## 2:00 – 3:30 — Pillar 2

Same structure, same discipline. Do not repeat evidence from pillar 1. Do not drift into a third topic.

If you find yourself saying "and also..." — stop. That's the instinct to dump everything you researched. Cut it.

### Pro tip
Rehearse the transitions. "First" → "Second" or "Beyond Azure, the second driver is..." A clear verbal signpost is worth 10 seconds of clarity.

---

## 3:30 – 4:30 — Valuation

You have one minute. Cover:

1. **The target and the method** (15s) — "Our DCF values MSFT at $469.64, a 31.6% upside. 5-year forecast, WACC 8.14%, terminal growth 4%."
2. **The sensitivity** (20s) — "Target ranges from $423 to $526 under ±50bps on WACC and terminal growth. The thesis holds under any combination that's reasonable for a mega-cap compounder."
3. **The peer cross-check** (25s) — "At 19.5× forward earnings, MSFT trades in line with Apple and Alphabet despite higher EBITDA margins. We're not paying up for growth here — we're paying in line for durability the market is mispricing."

The valuation minute is not a DCF lecture. It is a defense of the target against the two most likely committee questions: "what's your WACC?" and "how does this compare to peers?"

---

## 4:30 – 5:00 — Top Risk + Ask

### The top risk (20s)
Name the #1 risk, the impact rating, and one line on what you're monitoring.

*"The top risk is AI capex compressing cloud gross margins longer than expected — a high-impact risk. We're monitoring Cloud gross margin guidance quarter over quarter. If margins compress below 63% without a capex normalization, the thesis is under review."*

### The ask (10s)
End with *action*. Not "any questions?" but a specific recommendation.

*"We're recommending a full-size position at current levels. Position updates post FY26 Q3 earnings on April 30."*

---

## What Goes to Q&A (Not in the Pitch)

The 5 minutes are tight. Much of what you researched belongs in **Q&A, not the pitch**:

- Pillar 3 (if you have one)
- Second and third risks
- Industry map and peer context beyond the headline comp
- Management bios / incentive structure
- Deep unit economics
- Macro regime sensitivity
- Full bull/bear range

Know these cold, ready to pull in the first 60 seconds of Q&A.

---

## Timing Discipline: Why It Matters

Going over 5 minutes is the **fastest way to fail** a pitch. It signals:
- You can't prioritize
- You don't respect the audience's time
- You're hiding a weak thesis in a wall of evidence

Coming in at 4:30 is fine. Coming in at 6:00 is fatal. Always err short.

### Practicing timing
- Record yourself on your phone. Listen back.
- Time each section separately. 30-90-90-60-30.
- Deliver the pitch to someone who doesn't know the company and ask them to repeat back the thesis.

---

## The Visual Deck (When You Have Slides)

In SGC committee, verbal pitches are often backed by a 5-slide deck:

| Slide # | Content |
|---|---|
| 1 | Header + one-sentence thesis + price target + chart (1 slide) |
| 2 | Pillar 1 — one chart |
| 3 | Pillar 2 — one chart |
| 4 | Valuation — DCF output + sensitivity + peer comp table |
| 5 | Top risks + mitigation + the ask |

Five slides. Not ten. If you need more slides, you haven't prioritized.

---

## SGC Pro Tips

- **Rehearse standing up.** You present better, and the tempo forces you to cut.
- **The opener is the only thing you memorize word-for-word.** Everything else should be fluent but not scripted.
- **If you say "um" more than 3 times in 5 minutes, you need more reps.** Record yourself.
- **Deliver the pitch in the committee context.** Wear what you'd wear, stand where you'd stand, use the actual deck. Don't let the first time feel "real" be the pitch itself.
- **The first question in Q&A is always either "what's your top risk" or "why now."** Have both pre-loaded in 20-second answers.

---

## Summary

The 5-minute pitch skeleton is: **opener → pillar 1 → pillar 2 → valuation → risk + ask.** 30 seconds, 90, 90, 60, 30. Anything outside that structure is material for Q&A, not the pitch itself. Discipline on timing is a discipline on thinking.

Next lesson: the one-sentence thesis — the single most important sentence in the pitch.
`,
  },
  {
    title: 'Nailing the One-Sentence Thesis',
    slug: 'one-sentence-thesis',
    order: 1,
    published: true,
    content: `## The Most Leveraged Sentence in the Pitch

Every 5-minute pitch lives or dies on the opening sentence. It is:

- The **only** sentence the audience remembers at minute 30
- The sentence that decides whether they lean in or check their phone
- The sentence you'll be asked to repeat in follow-up conversations

If you can deliver the one-sentence thesis crisply, you've already won half the pitch. If you can't, the rest is rescue work.

---

## The Anatomy of a Great One-Sentence Thesis

> *"[Company] is a [Buy / Hold / Sell] at $[current], target $[PT] ([X]% upside), because [specific variant perception]."*

Four components:

1. **The name and rating** — "Microsoft is a Buy"
2. **The price context** — "at $356.77, target $469.64"
3. **The magnitude** — "31.6% upside"
4. **The variant perception** — "because the market is anchoring to AI capex intensity and missing $625B of committed backlog"

The *variant perception* is everything. It is the part that says: *"I'm not telling you the stock is good, I'm telling you the market is wrong about it in a specific way."*

---

## Good vs Bad Variant Perceptions

### Bad: describes the business

| Bad | Why it fails |
|---|---|
| "Microsoft is a high-quality compounder" | Everyone knows that |
| "Microsoft has strong AI positioning" | Priced in |
| "Microsoft has a wide moat" | Generic, not a mispricing |
| "Microsoft is cheap on P/E" | Cheap relative to what? And why? |

### Good: describes the mispricing

| Good | Why it works |
|---|---|
| "The market is anchoring to AI capex intensity and missing $625B of committed backlog" | Names the market anchor AND the missed evidence |
| "Consensus is pricing 15% Azure growth; capacity schedule supports 25% when supply catches up in Q4" | Names the consensus number AND the bet |
| "The market has classified MSFT as a capex-infra builder; the Copilot ARPU trajectory argues for a software compounder re-rating" | Names the current narrative AND the rerating mechanism |

The common structure: **[consensus view] + [specific evidence the consensus ignores] + [reprice mechanism].**

---

## The 4-Step Construction Drill

A reliable way to build a sharp thesis sentence:

### Step 1: What does consensus believe right now?
Be specific. "Consensus expects 15% FY26 revenue growth." Don't write "consensus is bearish."

### Step 2: What specific evidence contradicts consensus?
A number from a filing. A management comment. A KPI trend. *Specific.*

### Step 3: What forces the market to update?
The reprice mechanism. Usually an earnings print, a product launch, or a regulatory event.

### Step 4: Compress into one sentence.
Use "because" to join the rating to the variant perception. No qualifiers. No "we believe." No "in our view."

### Worked example

**Company:** Micron (MU)
**Step 1:** "Consensus has Micron at 55% gross margin peak in FY26, before memory cycle rolls over."
**Step 2:** "HBM3E shipments are already 8% of total bits at 75%+ gross margin; company guided to 15% mix by year-end."
**Step 3:** "Q3 earnings (Jun 25) likely shows HBM mix crossing 12%, forcing consensus to re-rate margin ceiling above 60%."
**Step 4:**
> *"Micron is a Buy at $112, target $148 (32% upside), because consensus caps gross margins at 55% while HBM3E mix trends toward 15% — a shift Q3 earnings likely confirms, forcing a margin-ceiling rerating the cycle hasn't priced in."*

One sentence. Four components. Specific numbers. Named catalyst.

---

## Length and Delivery

Target: **25-40 words**, delivered in **15-20 seconds**.

### Too short
*"Buy MSFT, target $469, 31.6% upside."*
No thesis. This is a recommendation, not a pitch.

### Too long
*"We believe Microsoft represents a compelling investment opportunity at current levels given its strong positioning in multiple high-growth secular tailwinds including cloud computing, AI, productivity software, and cybersecurity, with a target price of $469 implying approximately 31.6% upside from current levels, driven by our view that the market is underappreciating the durability of Azure's growth..."*
No one remembers the opening. You've spent 45 seconds saying "we like it."

### Just right
*"Microsoft is a Buy at $356.77, target $469.64 — 31.6% upside — because the market is anchoring to near-term AI capex intensity and missing $625B of committed backlog that increasingly converts to revenue as capacity ramps."*

38 words. 17 seconds at normal pace. Names the mispricing and the reprice mechanism.

---

## Six Common Failure Modes

### 1. Burying the rating
*"Microsoft has some interesting dynamics in cloud... we're a Buy."*

The rating goes **first**. Every time.

### 2. Leading with the company, not the thesis
*"Microsoft is a $2.7T market cap technology company that operates across three segments..."*

They know what Microsoft is. Lead with what you think, not what they already know.

### 3. The "multi-driver" trap
*"We like MSFT because of (a) Azure, (b) Copilot, (c) security, and (d) Windows."*

No one-sentence thesis has four "becauses." Pick the strongest one. The others come out in pillars 1 and 2.

### 4. Hiding in hedging
*"We think there could be upside if things go well and if the macro environment remains supportive..."*

Either you have conviction or you don't. If you don't, don't pitch it.

### 5. Generic mispricing
*"The market doesn't appreciate the story."*

Meaningless. What story? Why don't they appreciate it?

### 6. Not naming a number
*"Microsoft is undervalued."*

How undervalued? Undervalued against what?

---

## The Audience's First Question

After your one-sentence thesis, the audience almost always asks one of:

1. *"What's the target price methodology?"* — expect this. Have it ready in 15 seconds.
2. *"What's the top risk?"* — also expect. 20 seconds, named, with mitigation.
3. *"Why now?"* — answer with the dated catalyst. 20 seconds.

A pitch that triggers *better* questions than these is a good pitch. If the first question is "wait, what does the company do?" — your opener failed.

---

## Practice Drill

Pick an SGC report or a name you know well. Write 10 versions of the one-sentence thesis. Read them out loud. Time them. Pick the sharpest one.

Then ask a teammate to listen to just the one sentence and repeat it back to you. If they can't, rewrite.

This drill takes 15 minutes. Do it for every pitch.

---

## SGC Pro Tips

- **Write the thesis sentence before building the model.** If you can't state the mispricing before you have a target price, your research is drifting.
- **Say it out loud.** Written theses that read well often feel clunky verbally. Rehearse out loud.
- **Test it on a non-finance person.** If they can repeat back what you think the market is missing, it's sharp enough.
- **Update the thesis as new data comes in.** A thesis that stays identical for 6 months despite 2 earnings prints is a thesis you haven't stress-tested.
- **Never lead with "I believe" or "I think."** Lead with the claim. The report is yours; every sentence is implicitly your claim.

---

## Summary

The one-sentence thesis is the highest-leverage sentence in the pitch. Four components: name + rating, price context, magnitude, variant perception. The variant perception is where the real work shows — it names consensus, cites specific contradicting evidence, and identifies the reprice mechanism. If you can nail this sentence, the rest of the 5 minutes flows.

Next lesson: delivering evidence concisely under time pressure.
`,
  },
  {
    title: 'Delivering Evidence Under Time Pressure',
    slug: 'evidence-under-time-pressure',
    order: 2,
    published: true,
    content: `## 90 Seconds to Prove a Pillar

Every pillar in a 5-minute pitch gets ~90 seconds. That's roughly 200 words, or three well-chosen data points. Most analysts try to deliver seven. The result is a blur that convinces no one.

This lesson is about **evidence discipline**: picking the right data points, ordering them, and delivering them without losing the thread.

---

## The 3-Point Rule

For each pillar: **maximum 3 data points, minimum 2.** Any more and the pillar becomes noise.

### Why 3?
- It's the maximum an audience can hold in working memory
- It forces you to prioritize — which strengthens your own thinking
- It leaves air in the pitch for inflection, not just content

### Ranking your evidence

When you have 10 data points supporting a pillar, rank them by:

1. **Specificity** — a specific filing number beats a trend
2. **Recency** — last quarter beats last year
3. **Non-consensus visibility** — something the sell-side hasn't digested beats something they've already modeled
4. **Causal clarity** — a data point directly connected to the reprice mechanism beats a tangential one

Pick the top 3. Write them down. Cut the rest.

---

## The Evidence Sentence Template

Each data point should be delivered as a **sentence**, not a fact fragment.

### Bad (fragment)
"Azure grew 39%."

### Good (full sentence tied to the thesis)
"Azure grew 39% YoY in the most recent quarter, outpacing both AWS and Google Cloud — a sign that the AI workload cycle is accelerating Microsoft's share of incremental cloud spend, not just total cloud growth."

Notice what the good version does:
- States the number
- Places it in context (vs peers)
- Connects it to the thesis mechanism

---

## The Order Matters: Strongest → Implication

Structure each pillar as:

1. **Pillar claim** (one sentence, ~30 seconds)
2. **Strongest evidence first** (~25 seconds)
3. **Supporting evidence** (~20 seconds)
4. **Implication / reprice mechanism** (~15 seconds)

### Worked example (MSFT pillar 1)

**Claim (30s):**
*"First pillar: Azure's growth durability is underappreciated because the market is confusing supply constraints with demand weakness."*

**Strongest evidence (25s):**
*"Commercial remaining performance obligations hit $625 billion in FY26 Q2 — up 110% year over year — with 25% expected to recognize as revenue within 12 months. That is three times the forward visibility of any other hyperscale platform."*

**Supporting evidence (20s):**
*"Azure itself grew 39% year over year, and management was explicit that demand continues to exceed supply. Capacity additions, not customer demand, are the rate limiter."*

**Implication (15s):**
*"As capacity catches up through calendar 2026, revenue recognition tracks the backlog — not the capex headlines. That's a mispricing the next two earnings prints force to close."*

90 seconds. Three data points: $625B RPO, 39% growth, and the management supply constraint quote. Clear sequence. Clear implication.

---

## How to Cite Numbers Out Loud

Saying "Q2 FY26" in a pitch sounds clunky. Translate to plain English.

| Written | Spoken |
|---|---|
| "FY26 Q2" | "this most recent quarter" or "the December quarter" |
| "26% YoY" | "up 26% from last year" |
| "CET1 ratio of 13.2%" | "capital ratio of 13.2%, well above the regulatory minimum" |
| "EV/EBITDA of 14.5x" | "trading at 14.5 times EBITDA" |
| "bps" | "basis points" (write "bps" in the deck, say "basis points") |

Finance jargon is fine when the audience is analysts. In mixed audiences (interviews at tech funds, recruiting panels), translate without condescension.

---

## What to Cut: The "Interesting But Not Thesis" Trap

Every analyst has found genuinely interesting things that don't support the thesis. The instinct is to include them — "well, I spent 2 hours on this, it's going in the deck."

**Cut them.** Every data point that doesn't directly advance the pillar is a tax on the audience.

### A test
For every data point in a pillar, ask: "Does this make the **reprice mechanism** more likely or more specific?"
- **Yes** → keep
- **No** → cut, or move to Q&A backup

### The "I researched it so I'll say it" mistake
*"I noticed that their 10-K discloses 34 different segments, operating in 190 countries, with a sales force of 180,000 people..."*

All true. None of it matters to the thesis. Cut.

---

## Citing Sources Verbally

Name the source **when it adds credibility** — especially for non-obvious claims.

### Strong: "management explicitly said on the Q2 call that demand exceeds supply"
The audience trusts a management quote on this specific topic.

### Strong: "Gartner pegs AWS at 37.7% share versus Azure at 23.9%"
The audience trusts Gartner on share data.

### Weak: "Seeking Alpha wrote an article saying..."
Don't cite retail aggregators in a professional pitch.

### Skip citation when: the number is widely known
"Microsoft grew revenue 16% last year" doesn't need a source. It's in the earnings release.

---

## Handling the "I Don't Know" Moment

Sometimes you cite a data point and someone asks: "What was that in FY22?"

If you don't know:

### Good
*"I don't have that FY22 number in front of me — it grew from roughly 18% to 26% in the period we're focused on, but I'll verify and follow up."*

Short, honest, commitment to follow up.

### Bad
Making up a number. Hedging with "approximately ... probably ... I think around ..."

In SGC committee and interviews, **honesty about what you don't know** is a positive signal. Fabrication is a career-ender.

### Pre-work
Before any pitch, anticipate the top 5 follow-up data questions and memorize the numbers. "Historical margin trajectory" and "customer concentration" are the most common.

---

## The Visual Counterpart: One Chart Per Pillar

When your pitch has slides, each pillar gets **one chart**. The chart visualizes the strongest data point.

### Chart selection rules

1. The chart proves the pillar's *strongest* evidence — not a nice-to-have trend
2. Time series > snapshot (shows trajectory)
3. Comparison > single line (company vs peers, company vs consensus)
4. Company data > stock chart (operational evidence is stronger than price)

### Examples (good pillar charts)

| Pillar | Chart |
|---|---|
| Azure growth durability | Quarterly Azure YoY growth + RPO growth, 2-year chart |
| Margin expansion | Quarterly EBIT margin + segment margin mix, 3-year chart |
| Copilot monetization | Paid seat count (log scale) over time + "large deployment" counter |
| Peer valuation discount | Fwd P/E box-whisker for peer set with company highlighted |

Charts should be **clean**: gridlines off, 2 data series max, annotated with the inflection or current quarter.

---

## The "Do You Have a Chart For That?" Test

In Q&A, someone will say: "Interesting, do you have a chart on that?" If you confidently produce a clean, on-thesis chart, your credibility jumps.

Have **3 backup charts in your appendix**:
- Historical operating margin
- Peer valuation scatter
- Customer / segment concentration

These cover 80% of the charts interviewers and committee members ask for.

---

## SGC Pro Tips

- **Say the number before the context.** "39% growth" before "...outpacing AWS and Google Cloud." The audience latches onto the number first.
- **When delivering three numbers, use numerical signposts.** "First, ... second, ... third, ..." helps the audience follow.
- **Round in speech, be precise in writing.** "Roughly 40% growth" is fine verbally; the deck shows 39%.
- **Cite management quotes sparingly and exactly.** *"Management said 'demand continues to exceed supply' — that's a direct quote."* Don't paraphrase management on material points; quote.
- **For every data point in your pitch, know the *trajectory*, not just the level.** "Azure at 39%" is a level. "Azure accelerating from 31% to 39% over the last three quarters" is a trajectory. Trajectories win pitches.

---

## Summary

Evidence discipline is the skill that separates polished pitches from rambling ones. Three data points per pillar, ordered strongest-first, tied to the reprice mechanism. Sentences, not fragments. Cite sources selectively. One chart per pillar. Know what you don't know, and say so.

Next lesson: handling Q&A — the real grade.
`,
  },
  {
    title: 'Handling Q&A — The Part That Determines Your Grade',
    slug: 'handling-qa',
    order: 3,
    published: true,
    content: `## The Pitch Ends, Then the Real Grading Starts

The 5-minute pitch is the setup. **Q&A is the exam.**

Committee members, PMs, and interviewers have heard polished 5-minute pitches before. They've seen slick deliveries from analysts who didn't read the 10-K. What they use Q&A for:

- Test whether you actually *understand* the business
- Probe the weakest part of your thesis
- See how you handle pressure
- Decide whether to invest / allocate / hire

Q&A is where conviction and knowledge are earned visibly. If you bomb the pitch but nail Q&A, you can recover. If you nail the pitch and bomb Q&A, you're done.

---

## The Three Question Archetypes

Virtually every Q&A question falls into one of three buckets:

### 1. Test-the-thesis questions
*"What's your top risk?"* *"Why isn't this already priced in?"* *"If you had to pick one pillar to defend, which is it?"*

These test whether you have real conviction and have thought adversarially.

### 2. Test-the-knowledge questions
*"What was gross margin in FY22?"* *"Who are the top 3 customers?"* *"Walk me through the revenue segments."*

These test whether you've done the reading. Shallow research gets exposed here fast.

### 3. Test-the-frame questions
*"What would change your mind?"* *"If the catalyst slips two quarters, do you still like it?"* *"Would you rather own this or the closest peer?"*

These test whether you think like an investor, not a research analyst.

Prepare for all three. We'll walk each.

---

## 1 — Answering Test-the-Thesis Questions

These are the *most important* questions in Q&A. How you handle them determines whether the thesis survives.

### "What's your top risk?"

**Wrong answer:** "There are several risks, including macro, competition, execution..."

**Right answer:** Name *one* top risk, impact-rate it, name the mitigation, and name what you'd be watching.

*"The top risk is that AI capex compression takes 3+ quarters to normalize — high impact. The mitigation is that ~65% of their capex is already in short-lived assets that depreciate quickly, so the drag is bounded. I'm watching Cloud gross margin guidance. If it stays below 63% for two consecutive quarters without a capex normalization commentary, the thesis is under review."*

30 seconds. Confident. Specific. Named kill switch.

### "Why isn't this already priced in?"

**Wrong:** "I think it is underappreciated."

**Right:** Name the *specific anchor* the market is using and the *specific evidence* the anchor ignores.

*"The market is anchoring to near-term capex intensity — which is visible in headlines every quarter. The evidence the market is ignoring is the $625B RPO, which hasn't been widely modeled because it's a relatively new disclosure and most analysts are still using bookings instead. As RPO flow-through becomes the standard framework, consensus earnings shift upward."*

### "Who's on the other side?"

They want to know: *who's selling at the current price, and why are they wrong?*

**Right:** Name a credible bear and rebut them specifically.

*"The credible short case right now is from [specific seller / specific thesis] — they argue Copilot ARPU will plateau because seat-level ROI is unclear. My counter is the large-deployment data: customers with >35k seats tripled YoY. That's not a plateau signature. That's an adoption curve inflecting."*

---

## 2 — Answering Test-the-Knowledge Questions

These require preparation — there's no improvising through them.

### The pre-pitch knowledge checklist

Before pitching, know these numbers cold for the company:

- [ ] Last 3 years of revenue, EBIT, EBITDA, FCF
- [ ] Segment breakdown (revenue and operating income mix)
- [ ] Top 5 customers or customer concentration (if disclosed)
- [ ] Total TAM (your estimate, source)
- [ ] Market share (your estimate, source)
- [ ] Current valuation (P/E, EV/EBITDA, vs peer median)
- [ ] Gross margin trajectory (last 3 years + current)
- [ ] Operating margin trajectory (last 3 years + current)
- [ ] Capex as % of revenue (last 3 years)
- [ ] Net debt / net cash position
- [ ] WACC and how you built it
- [ ] Share count and buyback activity
- [ ] Management + largest shareholders

If you don't know a number, say so:

*"I don't have that number in front of me, but I can follow up. The trajectory was [directional answer]."*

Do not make up numbers. Ever. The committee/interviewer will often ask a question they *already know the answer to* — a test.

### The "walk me through the revenue segments" trap

This is a common opening. They want to see if you know the business.

**Weak:** "So the company has cloud, productivity, and gaming..."

**Strong:** Name each segment, its revenue, its operating income, its growth rate, and its strategic role.

*"Microsoft has three reportable segments. Productivity and Business Processes was $121B revenue last year at 51% operating margin — the profit pool. Intelligent Cloud was $106B at 44% margin — the growth engine. More Personal Computing was $55B at 30% margin — the legacy franchise. In the most recent quarter, Intelligent Cloud crossed $30B and has been the segment driving incremental operating income."*

One minute. Every segment named. Revenue and margin for each. Growth trajectory. This is the answer level.

---

## 3 — Answering Test-the-Frame Questions

These are the hardest to prepare for because they test whether you think like an investor.

### "What would change your mind?"

They want specifics. Not "if the fundamentals deteriorate." Specifics.

**Right:** *"Three things. First, Azure growth dropping below 30% for two consecutive quarters without a capacity story. Second, Copilot seat adds decelerating sequentially. Third, cloud gross margin sustained below 63%. Any two of those three, the thesis is broken."*

### "If the catalyst slips, do you still like it?"

Catalyst-dependent thesis vs multi-catalyst thesis.

**Right:** *"Yes, because the underlying mechanism — RPO conversion to revenue — compounds quarter over quarter regardless of when exactly the market reprices. A 2-quarter slip pushes the implied IRR from 31% annualized to ~22%, still well above portfolio hurdle."*

### "Would you rather own this or [closest peer]?"

They want to see you think in **relative terms**.

**Right:** *"MSFT over GOOGL at current prices. Both are mega-cap compounders with AI exposure, but GOOGL's search cash flows are under regulatory pressure that the market hasn't fully priced. MSFT's AI monetization is more visible because the seat-based framework translates to ARPU more cleanly. If GOOGL traded at a 20% discount to here, I'd flip, but the current spread doesn't justify it."*

You picked one. You named the specific reason. You named the price at which you'd flip. That's a PM answer.

---

## The Pressure Tactics

Good interviewers will pressure you. Be ready.

### "I don't buy that."
Do not retreat. Say something like: *"Fair. The bear case on this specific point is [X]. My counter is [Y]. What I'm monitoring to see who's right is [Z]."*

Acknowledge the disagreement. Rebut with specifics. Name the data point that settles it.

### Silence after your answer.
They want you to keep talking until you trip. Don't. Let silence sit for 2 seconds after your answer ends. Let *them* ask the next question.

### "That's a weak answer."
Even harsher. Don't apologize. Reframe.

*"Let me say it better. The core point is [X]. The reason I said it the first way was [Y]. The cleaner way to state it is [Z]."*

### "So you're saying [X]?" where X is a distortion of what you said.
Firmly correct. *"Not quite. What I'm saying is [accurate version]. The reason matters because [Y]."*

Don't let them put words in your mouth.

---

## The "I Don't Know" Answer

This is the single most important Q&A skill. Done right, it *enhances* credibility. Done wrong, it ends the pitch.

### Right
*"I don't have that in front of me. Here's what I know that's adjacent: [related info]. I'll follow up with the specific number."*

### Wrong
- Making something up
- "I think it's approximately around roughly..."
- "That's actually a great question" (filler)
- Changing the subject

### The 30-second rule
If you can't answer in 30 seconds, say you don't know and move on. Silence is better than fabrication.

---

## Recovery From a Weak Pitch

If the pitch went poorly, Q&A is where you recover. Be proactive:

- Early in Q&A, acknowledge a weak spot if relevant: *"Earlier I glossed over margin trajectory — let me come back to it."*
- Volunteer something that shows depth: *"One thing I didn't fit into the 5 minutes — the competitive dynamics in [sub-segment]..."*
- Turn each question into a chance to show knowledge, not defend

Good interviewers know a 5-minute pitch is hard. They're watching how you recover.

---

## The Q&A Pre-Pitch Drill

Before every committee pitch or interview, do this 15-minute drill:

1. **List the 10 hardest questions you expect.** Think like a skeptical PM.
2. **Write 2-sentence answers for each.**
3. **Read them out loud.** If any answer feels wobbly, rework it.
4. **Identify the 3 questions you're least confident on.** These are probably the ones you'll get. Rehearse them twice.

15 minutes. Do it every time.

---

## SGC Pro Tips

- **Land the answer, then stop talking.** Most weak Q&A answers start strong and wander.
- **Restate the question briefly when it's complex.** Buys you 3 seconds and confirms you understood.
- **Name numbers and sources when challenged.** "That's in the FY26 Q2 earnings release, footnote 4."
- **The first Q&A question is usually about risk or 'why now.'** Pre-load both.
- **End Q&A confidently.** Don't fade. If the clock runs out mid-answer, finish with a one-sentence summary of your thesis, not a trailing thought.

---

## Summary

Q&A is the real grading. Three archetypes: thesis, knowledge, frame. Know your numbers cold, name specific risks and mitigations, defend against credible bears by name, say "I don't know" when you don't, and never fabricate. A strong Q&A can rescue a mediocre pitch. A weak Q&A cannot be rescued by a strong pitch.

Next lesson: common pitch pitfalls and how to avoid them.
`,
  },
  {
    title: 'Common Pitch Pitfalls (And How to Avoid Them)',
    slug: 'common-pitch-pitfalls',
    order: 4,
    published: true,
    content: `## The Pitch Graveyard

Most pitches fail in recognizable ways. This lesson catalogs the dozen most common failure modes and the fix for each. Before every SGC pitch, read this list. Most improvements are about removing mistakes, not adding brilliance.

---

## 1. The "Everything I Researched" Pitch

**Symptom:** You hit 7 minutes and have said three things about the company's founding, five things about the product portfolio, and mentioned the CEO's background. You haven't yet said why the stock will go up.

**Fix:** Every pitch is *subtractive*, not additive. Start by writing down every claim. Then cut 70% of it. The 30% that survives is the pitch.

### The "one-sentence per paragraph" test
For every paragraph of the pitch, ask: "If I delete this paragraph, does the thesis still stand?"
- **Yes** → delete
- **No** → keep

Most pitches keep 30-40% of what analysts want to include.

---

## 2. The Consensus Pitch

**Symptom:** The pitch sounds like a sell-side summary. "Great company, strong fundamentals, secular tailwinds, trades at a reasonable multiple."

**Fix:** Ask "what does the sell-side already say?" — then your pitch must say something *different*. If you can't name the consensus-departing claim, it's not a pitch.

### The "why aren't sell-side PTs here already?" test
If your target price is roughly where consensus sits, you don't have a pitch. You have a timing bet.

Re-state the variant perception. If you can't, either drop the pitch or rework the thesis.

---

## 3. The Over-Valuation Pitch

**Symptom:** You spend 3 minutes on DCF mechanics and 30 seconds on the thesis. The committee knows your WACC better than your variant perception.

**Fix:** Valuation is *translation*, not thesis. Keep it to 60 seconds max. Move every additional minute back into thesis, evidence, and risk.

### The right mental model
"What would this company be worth if my thesis is right?" → that's the target. Not: "I built a DCF and the answer is X."

---

## 4. The No-Catalyst Pitch

**Symptom:** "The company is cheap and will eventually work out."

**Fix:** Every pitch needs a *dated event*. If your thesis is "the market will eventually see the value," pitch it differently — name the compounding mechanism and the review date.

### The Druckenmiller test
Would a multi-billion-dollar PM allocate capital to this tomorrow? If there's no catalyst, the answer is probably "not yet." Re-examine why *now*.

---

## 5. The "Great Company, Great Price" Trap

**Symptom:** Everything you say about the company is positive. No trade-offs. No risks you actually wrestle with.

**Fix:** A thesis is strongest when the analyst can *steelman the bear*. If you can't rebut the strongest short case, you don't understand your own pitch.

### The discipline
Before every pitch, spend 20 minutes writing the best possible short case. Post it. Read it. Rebut it in your risks section. This exercise dramatically sharpens the thesis.

---

## 6. The "Too Many Pillars" Problem

**Symptom:** 5 or 6 pillars. Each gets 30 seconds. None lands.

**Fix:** Two strong pillars > five weak pillars. Pick the two that best explain the variant perception. Move everything else to Q&A.

### The prioritization drill
Rank all your pillars by: (1) strength of evidence, (2) non-consensus, (3) directness of catalyst. Keep the top 2. Absolute max 3. Cut the rest.

---

## 7. The Jargon Wall

**Symptom:** "The company's FCF conversion benefits from working capital optimization, RPO recognition, and SBC moderation offsetting PP&E intensity..."

**Fix:** Use jargon when it's *precise*, not when it sounds smart. Translate to plain English wherever possible.

### The mom test
If your mom (or a non-finance friend) can't follow the narrative arc of your pitch, translate. The substance stays — the language doesn't.

### A rough translation table

| Jargon | Plain |
|---|---|
| RPO | "committed future revenue" |
| CAC / LTV | "how much they spend to win a customer, vs what the customer pays over time" |
| Operating leverage | "when revenue grows faster than costs" |
| Capex intensity | "how much they have to invest to grow" |
| Beta | "how much the stock moves with the market" |

---

## 8. The Forgotten Risk

**Symptom:** Analysts say "no real risks here" or list generic macro risks. When asked the top risk in Q&A, they fumble.

**Fix:** The top 3 risks are part of the pitch itself. Write them down *with impact ratings and mitigations* before submitting. If you can't name 3, you haven't thought about the pitch hard enough.

### The pre-mortem drill
Imagine it's 12 months from now and the trade is down 30%. What went wrong? Write the 3 most likely reasons. Those are your risks.

---

## 9. The Uncommitted Recommendation

**Symptom:** "This could be a Buy if certain conditions are met..." or "We like it on a pullback..."

**Fix:** If the pitch doesn't recommend a clear action *now*, don't pitch it. "Not yet" is a legitimate conclusion — but pitch it as "watch list with conditions," not as a hedged Buy.

### The PM perspective
PMs don't trade on "we like this eventually." They trade on specific positions at specific prices. Your pitch should mirror how a PM would act on it tomorrow.

---

## 10. The Static Thesis

**Symptom:** Analyst pitched the stock 3 months ago, earnings happened twice, and the thesis has not been updated.

**Fix:** Theses are living documents. After every earnings print, revisit: Did the pillars strengthen or weaken? Did a catalyst trigger or slip? Did the sensitivity shift?

### The standing meeting
Every SGC pitch should be reviewed at the next earnings print. If no one on the team can speak to how the thesis has evolved, the pitch is stale.

---

## 11. The Peer-Ignoring Pitch

**Symptom:** Beautiful thesis on MSFT, but the analyst has no idea whether GOOGL has the same tailwind.

**Fix:** Every pitch must answer: "Why this name over the closest 2 peers?" If the thesis applies equally to a cheaper peer, you're pitching the wrong name.

### The 3-peer test
Name the 3 closest peers. State why your pick wins on:
- Relative growth
- Relative margin trajectory
- Relative valuation
- Idiosyncratic catalyst

If the answer is "they're all the same but this one is cheapest" — pitch the sector ETF, not the stock.

---

## 12. The "I Love This Company" Bias

**Symptom:** Emotional attachment to the pitch. Every question gets defended instead of considered.

**Fix:** An analyst's job is to be right, not to be loyal. Explicitly acknowledge strong bear points. Say "that's a fair concern, here's how I'm monitoring it" rather than "no, the bear is wrong."

### The kill switch discipline
Before pitching, write down the specific condition under which you would *exit* the trade. If you can't, you're not analyzing — you're cheerleading.

---

## Bonus: Delivery Pitfalls

### Nervous tics

- **Filler words** — "um," "like," "so," "basically," "kind of"
- **Verbal hedges** — "I think," "we believe," "we feel" (the report is branded with your name; every sentence is "I think")
- **Upspeak** — ending statements as questions
- **Pacing** — speaking too fast under nerves

**Fix:** Record yourself. Count the filler words. Most analysts say "um" 8-12 times in 5 minutes. Target: under 3.

### Body language

- Don't read off the slide deck — the audience can read
- Make eye contact with the person most likely to ask the first question
- Plant your feet. Don't pace.
- Hands at your sides or loosely holding notes — not in pockets, not crossed

### The pause

After big statements, **pause one second**. Let the number land.

Weak: *"Azure grew 39% year over year and commercial RPO hit $625 billion up 110% and we think this—"*

Strong: *"Azure grew 39% year over year. [pause] Commercial RPO hit $625 billion, up 110%. [pause] That's forward visibility you don't get in this category."*

The pauses carry as much weight as the numbers.

---

## The SGC Pre-Pitch Checklist

Ten minutes before pitching, run through:

- [ ] Can I deliver the one-sentence thesis in 15 seconds without stumbling?
- [ ] Do I have exactly 2-3 pillars, each with 2-3 data points?
- [ ] Do I know the valuation method, the WACC build, and the sensitivity range?
- [ ] Do I have 3 risks with impact ratings and mitigations?
- [ ] Do I know the answer to "why now" in under 20 seconds?
- [ ] Do I know the answer to "top risk" in under 20 seconds?
- [ ] Do I know the top 2 numbers for each of the 3 closest peers?
- [ ] Do I know what would change my mind?
- [ ] Have I rehearsed the pitch in full at least twice?
- [ ] Have I cut at least one thing I wanted to include?

If any checkbox is unchecked, the pitch isn't ready.

---

## SGC Pro Tips

- **Cut, don't add.** Most pitch improvements are about removing mistakes, not inserting brilliance.
- **Get feedback from non-experts.** If a teammate from outside the sector can repeat your thesis back, it's clear.
- **The second pitch is always better than the first.** Pitch every idea twice internally before pitching externally.
- **Track your pitches over time.** What did the stock do 6 months later? 12 months? Your hit rate is the only long-term signal that matters.
- **Watch other people's pitches critically.** You learn more from watching a bad pitch and diagnosing it than from watching 10 polished ones.

---

## Summary

Most pitches fail in 12 recognizable ways: too much content, consensus thinking, over-valuation focus, no catalyst, no risks, too many pillars, jargon, uncommitted recommendation, static thesis, peer-ignorant, emotionally attached, or delivery weak. Before every SGC pitch, check this list. The pitch that avoids the common pitfalls is already better than 80% of what the committee sees.

That completes *The 5-Minute SGC Stock Pitch*. Next: writing an SGC "Our Take" — the macro and thematic article format.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 10: WRITING AN SGC "OUR TAKE"
// ---------------------------------------------------------------------------

const sgcOurTakeCourse = {
  title: 'Writing an SGC "Our Take"',
  slug: 'writing-sgc-our-take',
  summary: 'The SGC "Our Take" is our macro and thematic research format — the place where we argue about regimes, catalysts, policy, and structural trends. This course teaches how to pick a theme, structure the piece, and write in the SGC voice. Modeled on published SGC articles like the petrodollar piece, the private credit piece, and the Big Beautiful Bill piece.',
  tags: 'sgc, macro, thematic, writing, research articles',
  published: true,
  order: 10,
};

const sgcOurTakeLessons = [
  {
    title: 'What an "Our Take" Is (and Isn\'t)',
    slug: 'what-an-our-take-is',
    order: 0,
    published: true,
    content: `## The SGC "Our Take" Format

An "Our Take" is SGC's macro and thematic research. Unlike equity research reports — which are about a specific company and a specific mispricing — an Our Take is about an **idea, a regime, a policy, or a structural trend**.

These are the articles published on [stgeorgecapital.ca/research](https://www.stgeorgecapital.ca/research). Recent examples:

- *"With all the Changes in the World Who Would've Thought We Would Still be Talking About Oil"* — petrodollar and oil supply dynamics (Kabir Dhillon, 3/30/2026)
- *"Private Credit Stress, Software Exposure, AI Disruption, and Systemic Spillovers"* — the $3.5T private credit risk (Kabir Dhillon, 3/5/2026)
- *"Growth Over Austerity: Why the U.S. Must Invest Its Way Out of Debt"* — fiscal policy and AI productivity (Kabir Dhillon, 7/4/2025)
- *"Why a Weaker Dollar is Inevitable Under Trump — And How Emerging Markets Will Win Big"* — FX regime and EM impact (Kabir Dhillon, 1/29/2025)

Read 2-3 of these before writing your first piece. They define the house style.

---

## What an "Our Take" IS

✅ **A thesis-driven argument** about a market or economic theme
✅ **Analytically grounded** — every claim cited or reasoned
✅ **Non-promotional** — no sales, no product pitches, no self-congratulation
✅ **Written in the analyst voice** — confident, specific, willing to admit ambiguity
✅ **~1,500-3,500 words** — long enough to argue, short enough to read in one sitting
✅ **Signed** — every Our Take has a named analyst and a published date

---

## What an "Our Take" IS NOT

❌ **A stock pitch** — that's equity research, different format
❌ **A news summary** — reporting on what happened without an argument
❌ **A sector overview** — generic "state of X" pieces belong elsewhere
❌ **An opinion rant** — conviction is fine; unfounded assertion is not
❌ **A listicle** — "5 ways AI is changing finance" is not an Our Take
❌ **Recycled sell-side narrative** — every Our Take should contain something you can't find on Bloomberg

---

## The Tone: What SGC Sounds Like

Every Our Take should read like something **a credible institutional analyst** would hand to a PM. Study this sentence from the petrodollar article:

> *"The 'petrodollar' is best understood as a subsystem inside a much larger architecture of U.S. dollar dominance: dominant-currency trade invoicing, deep capital markets, global banking and credit intermediation, and the legal/institutional infrastructure around dollar assets. Oil pricing conventions matter, but the dollar's structural advantages are broader than oil which is why headlines about 'the end of the petrodollar' routinely overstate what is actually at risk."*

What this sentence does:
- **Redefines** the reader's framing ("best understood as a subsystem…")
- **Cites specific mechanisms** (trade invoicing, banking, legal infrastructure)
- **Disputes the common headline** — calmly, without sensationalism
- **Uses precise vocabulary** without jargon wall

That is the SGC voice. Adopt it.

### Tone checklist
- ✅ Specific numbers (*$3.5 trillion* private credit, not "huge")
- ✅ Named mechanisms (*decline rates, legal/institutional infrastructure*)
- ✅ Hedged where appropriate (*"best understood as"* rather than *"is"*)
- ✅ Reframes the common narrative — doesn't just repeat it
- ❌ No hype (*"massive," "huge," "game-changing"*)
- ❌ No click-bait (*"shocking," "stunning," "you won't believe"*)
- ❌ No ideological editorializing (analyze policy, don't endorse it)

---

## The Four Article Archetypes

Most SGC Our Takes fall into one of four archetypes. Picking your archetype shapes the structure.

### Archetype 1 — "Regime Change"

The world has shifted in a way the consensus hasn't caught up with.

**Example:** *"Why a Weaker Dollar is Inevitable Under Trump"*
- Names the old regime (strong USD consensus)
- Identifies what has changed (trade war, fiscal deficit, policy mix)
- Walks through the mechanism of the shift
- Names the beneficiaries and losers

### Archetype 2 — "Structural Misunderstanding"

A widely held view is wrong in a specific, defensible way.

**Example:** *"With all the Changes in the World Who Would've Thought We Would Still be Talking About Oil"*
- Names the conventional wisdom (oil is fading with renewables)
- Explains why the wisdom is wrong (hard constraints, decline rates, petchem demand)
- Adds a live event overlay (Iran / Hormuz disruption)
- Closes with the implication for markets

### Archetype 3 — "Systemic Risk / Vulnerability"

A part of the financial system has quietly grown large enough to matter, and few are watching.

**Example:** *"Private Credit Stress, Software Exposure, AI Disruption, and Systemic Spillovers"*
- Scales the problem ($3.5T private credit)
- Names the specific channels of fragility (corporate refinancing, fund leverage, liquidity mismatches)
- Identifies the plausible crisis shape (protracted vs sudden)
- Ends with what to monitor

### Archetype 4 — "Policy as Investment Signal"

A policy choice will reshape asset class returns.

**Example:** *"Growth Over Austerity: Why the U.S. Must Invest Its Way Out of Debt"*
- Sets up the fiscal math (interest payments, deficit path)
- Frames the choice (austerity vs growth)
- Reviews the historical precedent (post-WWII)
- Identifies current policy direction and its implications

Identify your archetype before writing. Then follow its native structure.

---

## The Two-Question Test Before You Write

Before starting an Our Take, answer these two:

### 1. "What is the non-consensus claim I'm making?"

If the answer is something everyone in the media already says, don't write the article. If the answer is something you could defend in 2 hours of pushback, you have a piece.

### 2. "Why would a sophisticated reader care?"

Not "this is interesting." Not "this is important." Specifically: what will the reader *do differently* after reading? Watch a different indicator? Reprice a different asset? Reconsider a regime assumption?

If you can't answer this, you're writing commentary, not an Our Take.

---

## Length and Structure

| Archetype | Typical length | Structural core |
|---|---|---|
| Regime Change | 2000-3000 words | Old regime → triggering event → new regime → who wins/loses |
| Structural Misunderstanding | 1800-2800 words | Consensus view → data that contradicts it → live overlay → implication |
| Systemic Risk | 2500-3500 words | Scale → channels → likely shape of crisis → what to monitor |
| Policy as Signal | 2000-3000 words | Fiscal math → policy choice → historical precedent → implications |

Most published Our Takes land in the **2000-3000 word** range. Shorter is usually sharper.

---

## The Readership

Who reads SGC Our Takes? Three audiences:

1. **SGC members** — current and alumni, mostly finance/quant/engineering students
2. **Prospective members** — reading to decide if SGC is serious
3. **Industry professionals** — recruiters, PMs, journalists occasionally citing our work

Write for audience 3, the institutional reader. If the piece holds up for them, it holds up for everyone. Write-down to audience 1 sounds juvenile; write-up to audience 3 forces rigor.

---

## SGC Pro Tips

- **Read 2-3 published Our Takes before drafting your first.** The petrodollar, private credit, and fiscal policy pieces are the clearest models of the house voice.
- **Have a teammate read your draft with only the headline and first paragraph — then ask them what you're going to argue.** If they can't predict, the opener isn't sharp enough.
- **Do not publish something you can't defend for 30 minutes under pushback.** Every claim should be defensible.
- **The goal is not to be first. The goal is to be *right* and *distinctive*.** Breaking-news commentary is easy and crowded; regime analysis is hard and valuable.
- **Mark up a published SGC piece you admire with notes on structure.** Diagram the argument. Then use that diagram for your own.

---

## Summary

An Our Take is a thesis-driven macro or thematic argument — not a summary, not a rant, not a listicle. Four common archetypes: regime change, structural misunderstanding, systemic risk, policy-as-signal. The voice is analytical, specific, non-promotional, and confident. Written for an institutional reader.

Next lesson: picking a theme that earns publication.
`,
  },
  {
    title: 'Picking a Theme That Earns Publication',
    slug: 'picking-a-theme',
    order: 1,
    published: true,
    content: `## The 80% of the Work Happens Before the First Sentence

The hardest part of writing an Our Take isn't writing — it's **picking the right theme**. A great theme writes itself. A weak theme produces 3,000 words of filler that doesn't get published.

This lesson walks through how to find themes worth writing and how to filter out themes that aren't.

---

## Four Sources of Great Themes

### 1. Regime mismatches between the data and the narrative
The market tape is telling one story; the underlying data is telling another. Your Our Take closes the gap.

**Signals:**
- Consensus narrative has been unchanged for 6+ months while underlying data has shifted
- The most-cited analyst view is being repeated without updates
- A specific indicator has turned but hasn't been picked up by commentary

**Example:** The dollar-weakness piece identified that consensus was still pricing USD strength even as trade policy and fiscal math implied weakness.

### 2. Structural growth outpacing its coverage
An economic or financial thing has quietly grown to a scale that matters for markets — but doesn't yet get the attention it deserves.

**Signals:**
- A sector/asset class has doubled in size in 3-5 years with limited mainstream coverage
- Disclosure gaps (hard to get clean data) signal an under-covered area
- Regulators are starting to ask questions while journalists haven't

**Example:** The private credit piece — $3.5T asset class that had grown from niche to systemic without corresponding coverage.

### 3. Live events exposing structural fragility
A specific, current event reveals a deeper structural truth the market was discounting.

**Signals:**
- A geopolitical or macro event has moved asset prices, but the *structural* implication hasn't been fully extracted
- A single-point event (a default, a policy shift, a conflict) is being treated as idiosyncratic when it's really systemic

**Example:** The oil piece used the Iran/Hormuz disruption as the live hook to discuss structural oil supply fragility.

### 4. Policy decisions that reset long-term asset returns
A concrete policy — proposed, enacted, or being debated — changes the return profile of whole asset classes.

**Signals:**
- A bill, rule, or executive action has measurable fiscal implications
- The market's initial reaction is noise; the structural implication is underpriced
- Historical precedents exist for similar policy moves

**Example:** The "Growth Over Austerity" piece used the Big Beautiful Bill as the anchor for a fiscal regime argument.

---

## The Five Filters: Is This Theme Publishable?

Before committing to write, run the theme through five filters. If it fails two or more, pick a different theme.

### Filter 1 — Non-Consensus
Can you say something that isn't the consensus view?

**Test:** Read the top 5 pieces from Bloomberg, WSJ, FT, and the most-cited sell-side research on the topic. Is your take different?

- **Same as consensus** → don't write it (you're summarizing)
- **Opposite for opposition's sake** → don't write it (contrarianism isn't analysis)
- **Different and defensible** → write it

### Filter 2 — Defensible
Can you defend the argument for 30 minutes against a skeptical PM?

**Test:** Write down the 3 strongest counterarguments. Can you rebut each with specific evidence?

- **No clean rebuttal** → your thesis needs more work
- **Clean rebuttal with evidence** → write it

### Filter 3 — Durable
Will the argument still be relevant in 12 months?

Hot-take articles about the last 24 hours of market movement age poorly. SGC's format favors pieces that hold up.

**Test:** Imagine a reader finds the article in 12 months. Is the argument still valuable?

- **Timebox < 3 months** → probably write it short, if at all
- **Timebox 6-24 months** → ideal
- **Timebox > 24 months** → too structural — consider tightening to a concrete thesis

### Filter 4 — Distinct
Is this adding something SGC readers can't get elsewhere?

**Test:** Would a reader who subscribes to Morning Brew, Matt Levine, and Bloomberg still learn something?

- **No** → probably redundant
- **Yes, because of X specific angle** → write it, and lead with that angle

### Filter 5 — Actionable
Does reading this change how the reader thinks about positioning?

Not "here's a trade idea" — that's equity research. But an Our Take should update the reader's *regime model*.

**Test:** Finish this sentence: *"After reading this, the reader should rethink [X]."* 

- **Can't fill in X clearly** → the piece isn't yet a thesis
- **Can fill in X with specificity** → write it

---

## The Theme Scoping Exercise

Once you have a theme candidate, scope it with this 5-minute exercise.

### Step 1 — Write the headline
A 10-word maximum title that captures the argument.

**Weak:** "Thoughts on Private Credit" (no argument)
**Strong:** "Private Credit Stress, Software Exposure, AI Disruption, and Systemic Spillovers" (argument + mechanism + scope)

### Step 2 — Write the 2-sentence summary
What would appear as the article description on the SGC research page.

**Example (from the private credit piece):**
*"The private credit asset class has reached a scale of macroeconomic consequence, transforming from a niche middle-market financing tool into a $3.5 trillion global shadow-banking pillar. However, the most plausible systemic crisis emanating from this sector is not a rapid, 2008-style household insolvency spiral. Rather, the prevailing risk profile points to a protracted mix of corporate refinancing stress, deeply embedded fund-level leverage, and liquidity mismatches in retail-facing wealth channels."*

Notice: scale, counter-narrative, and the shape of the risk — all in two sentences.

### Step 3 — List the 3-5 pillars you will argue
Each pillar becomes a section in the piece.

**Example (private credit):**
1. Scale of the asset class and why it's now systemic
2. Why the crisis shape is protracted, not sudden
3. Channel 1: Corporate refinancing stress
4. Channel 2: Fund-level leverage
5. Channel 3: Liquidity mismatches in retail vehicles

### Step 4 — List the data you need
For each pillar, name 2-3 specific data points / sources you'll use.

**Example pillar: "Scale of the asset class"**
- Oliver Wyman / BCG / Apollo estimates of private credit AUM
- Share of middle-market lending captured by private credit vs banks
- Growth trajectory (2015 → 2026)

### Step 5 — Name the open question
What do *you* not yet know? What's the part of the thesis you're least sure about?

Every strong Our Take names at least one open question. This is a credibility signal, not a weakness.

---

## Themes to Avoid

### 1. "State of the market"
Generic quarterly reviews belong in newsletters, not Our Takes.

### 2. "What I learned from [book / conference]"
Summaries of other people's work aren't original research.

### 3. "The future of [technology]"
Unless you have a specific regime/market/return claim, this is futurism, not finance.

### 4. Post-mortems of yesterday's news
The market has already priced the obvious news. Your value add must be structural, not reactive.

### 5. Single-stock deep dives without a broader theme
That's equity research. Use the ER template instead.

### 6. "Why [political faction] is wrong about [economic topic]"
SGC is non-partisan in tone. You can analyze policy and its implications; you do not endorse or attack political actors personally. Kabir's pieces on Trump/dollar dynamics are analytical, not editorial.

---

## The Most Common Theme Mistake

**Trying to cover too much.**

The temptation: "I'll write about private credit, commercial real estate, and the banking sector — they're all connected."

The result: 4,500 words that argue nothing clearly.

The fix: Pick the *specific* thesis. Private credit's systemic shape. Commercial real estate's maturity wall. Regional banks' CRE exposure. Pick *one*. Argue it deeply. Reference the others as context.

Better to win one argument than to gesture at three.

---

## SGC Pro Tips

- **Keep a "theme backlog."** Whenever a regime mismatch or under-covered trend catches your attention, note it. Most great Our Takes come from a theme that sat in the backlog for a month before the writer returned to it.
- **Talk to 2-3 practitioners before writing.** If you're writing about private credit, find someone at a credit fund or a banker who's been displaced. 30 minutes of conversation beats 3 hours of reading.
- **Test the theme on a smart non-finance friend.** If they say "that's interesting, I hadn't heard of it that way," you have a theme. If they say "isn't that what [CNBC] has been saying?" — you don't.
- **Pre-commit to the archetype** (regime, misunderstanding, systemic risk, policy) — it forces structural discipline from draft 1.
- **If the theme is right, the piece writes itself in a weekend.** If you're grinding for days and it's not flowing, the theme is weak. Step back and re-scope.

---

## Summary

Picking the right theme is 80% of an Our Take's quality. Great themes come from regime mismatches, structural growth outpacing coverage, live events exposing deeper truths, or policy decisions that reshape returns. Filter every candidate through five tests: non-consensus, defensible, durable, distinct, actionable. Pre-scope the headline, summary, pillars, data, and open questions before writing. Avoid generic themes and multi-topic sprawl.

Next lesson: structuring a macro/thematic piece.
`,
  },
  {
    title: 'Structuring a Macro/Thematic Piece',
    slug: 'structuring-macro-thematic',
    order: 2,
    published: true,
    content: `## The SGC Our Take Structure

The structure of an Our Take is less rigid than an equity research report — but good pieces share a consistent underlying architecture. This lesson maps that architecture and shows how the published SGC pieces use it.

---

## The 6-Part Skeleton

Every strong Our Take has six parts, in roughly this order:

1. **The hook** (opening paragraph)
2. **The claim** (1-2 paragraphs)
3. **The setup** (2-4 paragraphs — history / context / current state)
4. **The argument** (3-6 sections — your pillars)
5. **The tension** (1-2 paragraphs — steelman the counter / acknowledge uncertainty)
6. **The implication** (closing paragraphs — what the reader should do or watch)

Target proportions:

| Section | ~Share of word count |
|---|---|
| Hook + Claim | 10% |
| Setup | 15-20% |
| Argument | 50-60% |
| Tension | 10% |
| Implication | 10% |

---

## 1 — The Hook

The first paragraph decides whether the reader continues. Its job is to set up the argument and pull the reader in.

### Hook patterns that work

**Pattern A — the reframe**
Open by redefining something the reader thought they understood.

*"The 'petrodollar' is best understood as a subsystem inside a much larger architecture of U.S. dollar dominance..."*

**Pattern B — the scale reveal**
Lead with a number the reader didn't know, to establish stakes.

*"The private credit asset class has reached a scale of macroeconomic consequence, transforming from a niche middle-market financing tool into a $3.5 trillion global shadow-banking pillar."*

**Pattern C — the historical parallel**
Anchor the current moment to a precedent.

*"The U.S. is facing a fiscal inflection point—one that pits austerity against ambition. With federal interest payments topping $1 trillion and deficits projected to exceed 6% of GDP, the old playbook of cutting spending and balancing budgets no longer fits economic or political reality."*

**Pattern D — the live event hook**
Open with a specific recent event that concretizes the abstract theme.

*"As of late March 2026, the war involving Iran and the effective closure/disruption around the Strait of Hormuz has moved the system from a 'headline risk premium' episode toward a flow shock problem..."*

Pick the pattern that matches your archetype.

### Hook mistakes

❌ **"Recent market volatility has led many to wonder..."** — passive, generic, no claim
❌ **"In this article, we will explore..."** — announcing the article instead of arguing
❌ **"Let me start by defining [term]..."** — boring, slow, reader bounces
❌ **"[Famous person] once said..."** — quote-opening is almost always weak

---

## 2 — The Claim

After the hook, **within the first 2-3 paragraphs**, state the full argument. Do not bury the thesis.

### The claim should be:
- **One to two paragraphs** in length
- **Specific** — not "the market is wrong about X," but "the market is wrong about X in this specific way, and here's the mechanism"
- **Testable** — the reader should be able to describe what evidence would disprove it

### Example claim paragraph (private credit piece)

*"However, the most plausible systemic crisis emanating from this sector is not a rapid, 2008-style household insolvency spiral. Rather, the prevailing risk profile points to a protracted mix of corporate refinancing stress, deeply embedded fund-level leverage, and liquidity mismatches in retail-facing wealth channels."*

What this does:
- Names the counter-narrative ("not a 2008-style spiral")
- Specifies the shape of the alternative ("protracted mix")
- Previews the three channels (refinancing, fund leverage, retail liquidity) that will structure the rest of the piece

Readers who only read the first 3 paragraphs still walk away knowing what you argue.

---

## 3 — The Setup

The setup provides context the reader needs to evaluate the argument. It is *not* a generic overview.

### What the setup should include

- **Scale and definition** — what is the thing you're talking about, and how big is it?
- **Historical context** — how did we get here? (Brief — 2-4 sentences, not a history lesson)
- **The current narrative** — what does consensus currently say? This is important because your piece argues *against* this.
- **The data that reframes the picture** — 2-3 specific data points that start to push against the consensus

Target: 15-20% of total word count. Keep moving — the setup is scaffolding, not the main argument.

### Setup mistakes

❌ **Starting the setup at the Renaissance** (or any "brief history of" that is actually long)
❌ **Listing 10 data points** when 3 move the argument
❌ **Defining terms the target reader already knows**
❌ **Not naming the consensus** — if you never state what you're arguing against, the argument loses teeth

---

## 4 — The Argument (the core)

This is the substance. 3-6 sections, each making one part of the full claim.

### Section structure

Each section follows a mini-skeleton of its own:

1. **Section heading** (H2) — names the sub-argument
2. **Opening sentence** — states the sub-claim
3. **Evidence** — 2-4 specific data points / mechanisms
4. **Mechanism** — explanation of *why* the data means what you say it does
5. **Counter** — a sentence or two acknowledging the alternative view (optional but strong)
6. **Close** — one sentence connecting this section to the next

### Length per section

Most Our Take sections are **300-600 words**. Longer than 800 and the reader loses the thread. If a section balloons, it's probably two arguments.

### The section ordering decision

Two common approaches:

**Approach A — Strongest first**
Lead with the pillar you're most confident in. Good if your readers are skeptical — you need them on board quickly.

**Approach B — Scaffold logically**
Move from definition → mechanism → implication. Good if the argument requires prior steps to land.

Pick one. Both are fine. The private credit piece uses Approach B (defining scale first, then walking through channels). The dollar-weakness piece uses Approach A (leading with the policy reasoning, then the market implications).

---

## 5 — The Tension

This is the section most analysts skip. It is the section that makes the piece credible.

### What the tension section does
- **Names the best counter-argument**
- **Acknowledges what you don't know**
- **Specifies the conditions under which the thesis would fail**

### Example (private credit piece)

The article acknowledges:
- "The most plausible systemic crisis... is *not* a rapid, 2008-style household insolvency spiral."
- That the outcome is a *mix* of channels — not a single trigger.
- That the shape is *protracted*, not sudden.

By naming what the crisis isn't, the piece makes the positive claim more defensible.

### Tension patterns

- **"The strongest counter-argument is [X]. Here is why it doesn't undermine the thesis: [Y]."**
- **"We are less certain about [Z], which could shift the timing / magnitude."**
- **"If [specific data point] moves against expectation, the argument weakens."**

### Why this matters

Readers trust writers who show their limits. Omniscient tone is a red flag. When you name the uncertainty, the parts where you are confident become more credible.

---

## 6 — The Implication

The close is what the reader walks away with. It should be concrete.

### What to include

- **Restate the thesis** (one sentence — slightly reworded, not verbatim)
- **Name what to watch** — the 2-3 indicators that will validate or break the argument
- **State the action / shift in framing** — what the reader should do differently

### Example closing structure (from the dollar-weakness piece)

*"A softer dollar means cheaper debt, surging foreign investment, and a commodity boom that could supercharge economies built on raw materials... This article unpacks why the dollar must weaken, how it will reshape the global economy, and which markets are best positioned to capitalize on the shift."*

Note the structure:
- Restates the regime shift
- Names the mechanism (cheaper debt, investment flows, commodity boom)
- Identifies the beneficiary set (raw-materials economies)

### Closing mistakes

❌ **"Only time will tell"** — lazy, no commitment
❌ **A second essay masquerading as a conclusion** — the close is brief
❌ **Ending with a question** — unless the question is the entire point of the piece, rhetorical questions weaken the close
❌ **Restating the full argument** — trust the reader to remember

---

## Section Headings: The House Style

Our Takes use a hierarchy:

- **H1** — the article title
- **H2** — major section headings (hook is unlabeled, claim is unlabeled, setup may be labeled, each argument pillar is H2)
- **H3** — sub-sections within an argument pillar (optional)
- **Bold** — key terms the reader should retain
- **Italics** — emphasis, not for long passages

### Heading tone

Headings should be **informative**, not cute. Match the published style:

✅ "Private Credit's Retail-Facing Liquidity Mismatch"
✅ "The Dollar's Structural Advantages Extend Beyond Oil"
✅ "Why Decline Rates Matter More Than Renewables Headlines"

❌ "The Real Story" (vague)
❌ "What's Next?" (lazy)
❌ "The Bombshell" (sensational)

---

## Using Markdown Properly

SGC Our Takes render from markdown. Use the conventions consistently:

### Dividers

Use \`---\` on its own line to create a horizontal rule between major sections. This is the SGC visual break. Use sparingly — maybe 3-5 times per article.

### Emphasis

- **Bold** for the first appearance of a key term or for the emphasized noun in a claim
- *Italics* for short emphasis, foreign terms, or titles
- Don't use ALL CAPS for emphasis (reserved for acronyms only)

### Lists

- Use bullets when listing 3+ parallel items
- Use numbered lists when the order matters (steps, rankings)
- Keep list items short — if a bullet exceeds 2 sentences, it should probably be a paragraph

### Tables

Use tables for:
- Comparing options / scenarios
- Summarizing data across 3+ categories
- Presenting before/after, base/bull/bear

Keep tables short — 3-8 rows max. Longer tables belong in a report, not an Our Take.

### Code blocks
Rare in Our Takes, but useful for quoting SEC language, regulatory text, or specific formulas.

### Blockquotes
Use \`>\` for long quotes (>30 words) from analysts, policy documents, or official releases.

---

## SGC Pro Tips

- **Draft the claim paragraph first.** If you can write a clean 2-paragraph claim, the rest of the piece flows. If the claim is fuzzy, the piece will be fuzzy.
- **Write section headings before paragraphs.** They act as an outline and force structural discipline.
- **Read the draft out loud once.** Any sentence that trips you up is a sentence the reader will trip over.
- **Cut the weakest 20% before submitting.** Every piece has 20% padding — pre-emptively cutting it makes the remaining 80% land harder.
- **Pre-write the first and last paragraph.** If the first and last work, the middle almost always works. If they don't, the middle is rescue work.

---

## Summary

Every SGC Our Take has a 6-part skeleton: hook, claim, setup, argument, tension, implication. Claim goes in the first 2-3 paragraphs. Argument is 50-60% of the piece and is broken into 3-6 sections, each following its own mini-structure. Tension section is where credibility is built. Headings are informative, not cute. Markdown is used consistently.

Next lesson: using evidence like an institutional analyst.
`,
  },
  {
    title: 'Using Evidence Like an Institutional Analyst',
    slug: 'evidence-like-institutional-analyst',
    order: 3,
    published: true,
    content: `## Where Evidence Separates Serious Analysis From Opinion

The defining feature of an SGC Our Take — and the thing that separates institutional-grade research from op-eds — is **how evidence is deployed**. Every claim is anchored to a specific data point, a specific source, or a specific mechanism. Nothing rests on "it seems obvious that..."

This lesson covers:

1. What kinds of evidence are appropriate
2. How to cite them
3. How to layer evidence within a paragraph
4. How to avoid the common evidence failures

---

## 1 — The Evidence Hierarchy

Not all evidence is equal. Use the stronger forms when possible; use the weaker forms sparingly and always name the limitation.

### Tier 1 — Primary data (strongest)

- **Government data** (BLS, BEA, FRED, BIS, IMF, OECD)
- **Central bank publications** (Fed, ECB, BOE, BOJ, PBOC)
- **Regulatory filings** (SEC EDGAR — 10-K, 10-Q, 8-K, proxy, S-1)
- **Official statistics** (Census, trade data, energy agency data from EIA / IEA)
- **Direct primary source quotes** (policy text, central bank minutes, treaties)

Cite with source + date + specific indicator / line. *"According to the BIS H1 2026 review, dollar invoicing covers 75% of global trade outside of Europe."*

### Tier 2 — Institutional research

- **IMF working papers**
- **BIS research bulletins**
- **Fed research notes** (FEDS Notes, Regional Fed publications)
- **Top-tier sell-side research** (Goldman, JPM, Morgan Stanley published notes — cite by publication, not by analyst)
- **Ratings agency research** (S&P, Moody's, Fitch)
- **Major consulting reports** (McKinsey, Oliver Wyman, BCG, when dated and specific)

Cite with organization + publication name + date. *"Oliver Wyman's 2025 Private Credit Outlook estimates the asset class at $3.2T."*

### Tier 3 — Company filings and disclosures

- **10-Ks / 10-Qs** (MD&A, risk factors, footnotes)
- **Earnings call transcripts**
- **Investor day presentations**
- **Press releases for material events**

Cite with company + filing + date + specific section. *"Microsoft's FY26 Q2 earnings release notes Commercial RPO of $625B, up 110% YoY."*

### Tier 4 — Market data

- **Bloomberg / FactSet / Refinitiv** (cite as "Bloomberg data")
- **Pricing data, yields, spreads** (cite the instrument explicitly)
- **Trading volumes, ADV, open interest**

Most SGC readers won't have Bloomberg, so when citing Bloomberg, explain *what* the data says rather than asking the reader to verify independently.

### Tier 5 — Trade and specialty publications

- **Trade publications** (S&P Global Platts for energy, SNL for financials, Variety for media)
- **Industry association data** (SIFMA, NAREIT, SEMI)
- **Specialty wire services** (Reuters, Bloomberg News)

Useful for granularity, but always triangulate — trade publications sometimes repeat industry-sponsored numbers.

### Tier 6 — News commentary (weakest; use carefully)

- **Bloomberg News, Reuters, WSJ, FT** for current event context (not data claims)
- **The Economist, FT Alphaville, Barron's** for framing (not for data)

Never cite news as the *authority* for a data claim. It's ok to say "as reported by the FT on [date]..." when quoting a specific piece of reporting.

### Tier 7 — Retail aggregators (avoid)

- **Seeking Alpha, Motley Fool, Yahoo Finance articles** — do not cite as authority in SGC work
- **Twitter / X posts** — do not cite (except when quoting a named institutional voice directly)
- **Reddit** — never cite in SGC work

---

## 2 — How to Cite (In-Flow Citations)

SGC Our Takes use **in-flow citations**, not footnotes. The source is named in the sentence or parenthetically — not in a footnote list.

### The pattern

[Specific claim + number] + [source] + [date / period]

### Examples

> *"U.S. federal interest payments topped **$1 trillion** in fiscal 2025 (CBO May 2025 projection), with deficits projected to exceed **6% of GDP** through the decade."*

> *"Microsoft Cloud surpassed **$50B** in quarterly revenue (up **26% YoY**) in FY26 Q2, with Commercial RPO of **$625B** (up **110% YoY**)."*

> *"**Dominant-currency trade invoicing** — where the dollar's share exceeds 80% in emerging-market trade outside Europe (BIS, 2024) — is the mechanism most directly at stake in 'petrodollar' discussions."*

### Formatting conventions
- **Bold the key number or term** when it's part of the argument
- Parentheticals for the source + year / date: *(CBO May 2025)*, *(BIS, 2024)*, *(FY26 Q2 earnings release)*
- No footnote markers, no endnotes — everything in-flow

### When to cite in full sentence form

For policy text, central bank minutes, or executive statements, quote directly:

> *"As Powell noted in the May 2025 FOMC press conference: 'We are attentive to the possibility that tariffs could lead to a more persistent inflation dynamic.'"*

Use this sparingly — quoted material loses impact if every paragraph has one.

---

## 3 — Layering Evidence Within a Paragraph

A strong analytical paragraph layers **multiple data points** to make a single argument. Each data point reinforces the others.

### Example (private credit scale)

*"Private credit has compounded from under $500 billion in 2015 to roughly **$3.5 trillion globally in 2026** (BCG, Apollo estimates). Middle-market lending share has shifted from banks to non-banks — direct lenders now originate more than **two-thirds** of transactions in the U.S. middle market (SEC, 2024 Market Structure Report). BDC AUM alone has grown **4×** since 2018 (Lipper/Refinitiv)."*

Three data points. Three sources. One argument: the scale is systemic. Each number reinforces the next.

### Layering patterns

**Pattern A — Scale + Share + Velocity**
- *Scale*: total size of the thing
- *Share*: what fraction of the broader market it represents
- *Velocity*: how fast it's been changing

**Pattern B — Historical + Current + Projected**
- *Historical*: where it was 5-10 years ago
- *Current*: where it is now
- *Projected*: where leading forecasters expect it

**Pattern C — Cross-source triangulation**
- *Official source*: government / central bank data
- *Industry source*: trade association or rating agency
- *Market source*: pricing / transaction data

When you can hit pattern C, the claim feels unchallengeable.

---

## 4 — Mechanism Over Correlation

Strong SGC analysis explains *why* — the mechanism — not just *what* — the correlation.

### Weak: correlation only
*"When the Fed cuts, small caps outperform. The Fed is cutting. Therefore small caps will outperform."*

### Strong: correlation + mechanism
*"Small-cap companies have **~40% floating-rate debt** vs **~20% for S&P 500** (FactSet), so each 25bps of Fed cuts translates more directly into small-cap interest expense relief. Combined with earlier-cycle operating leverage, the cutting phase historically sees the Russell 2000 outperform the S&P 500 by 600-900bps in the first 12 months."*

The second version works because it names the mechanism (floating-rate exposure, operating leverage), quantifies the mechanism, and only *then* cites the outcome.

### The one-sentence mechanism check

After writing each argument paragraph, ask: "Is the *why* in this paragraph?"

- **Yes, named** → strong
- **Assumed / implicit** → rewrite to name the why
- **Not there** → add a sentence on mechanism

---

## 5 — The Common Evidence Failures

### Failure 1 — The naked claim
*"Inflation is becoming entrenched."*

No number, no source, no mechanism. Cut or replace.

### Failure 2 — The vague source
*"Studies have shown..."*
*"Experts say..."*
*"According to economists..."*

Name the specific source or don't include it. "Studies have shown" is worse than no citation.

### Failure 3 — The misused statistic
*"Private credit is 12.6% of total credit."*

Compared to what? Measured how? On what base? Numbers without context are decoration.

### Failure 4 — The outdated reference
*"Per 2018 McKinsey research..."*

If the data is over 3 years old, either find a newer source or explain why the older data is still relevant.

### Failure 5 — The false precision
*"The yen/dollar rate should settle at 142.37 in Q3."*

Spurious precision damages credibility. Round to the meaningful digit. *"The yen/dollar rate should settle around 140-145 in Q3, below spot of ~152."*

### Failure 6 — The single-source argument
An entire Our Take built on one consulting report or one research paper. Triangulate.

### Failure 7 — The loaded frame
Evidence presented as *the* answer when it's actually *one view*.

*"As Lael Brainard has argued, fiscal expansion is not inflationary."*

Attribute. Then present the opposing view. Then explain why you weight one over the other.

---

## 6 — Building Your Evidence Arsenal

Before writing, gather more evidence than you'll use — aim for **3× the data points you'll actually cite**. This gives you backup for Q&A, lets you pick the strongest data, and prevents the one-source trap.

### The evidence-gathering checklist for any Our Take

- [ ] 3+ Tier 1 / Tier 2 sources (government, central bank, top research)
- [ ] At least 1 primary source quote (policy text, minutes, speech)
- [ ] At least 1 data series (FRED, BIS, IMF, or equivalent)
- [ ] At least 1 market data point (yield, spread, price)
- [ ] At least 1 trade publication / industry data reference
- [ ] At least 1 historical analog (specific episode, with dates)

If your evidence pool is thin, the piece will feel thin.

---

## 7 — The "One Number Per Paragraph" Rule

A pragmatic discipline: every body paragraph of an Our Take should contain *at least one specific number* or *one specific mechanism*.

If a paragraph is entirely prose without either, it's probably opinion — and either needs evidence added or needs to be cut.

### Test before submitting
Scan the article. Highlight every number, every specific institutional source, every named mechanism.

- **Few highlights** → the piece reads as opinion
- **Balanced highlights** → the piece reads as analysis

---

## SGC Pro Tips

- **Cite your sources in-flow, not in footnotes.** Most SGC readers don't click footnotes. Put the credibility in the sentence.
- **Include at least one non-obvious data point per argument section.** Everyone has seen the headline number; the differentiated analyst finds the sub-component.
- **Cross-reference every material number against a second source** before publishing. Errors kill credibility permanently.
- **When quoting policy text or minutes, copy-paste exactly.** Paraphrasing risks error. Use blockquotes for anything over 30 words.
- **Keep a running "facts and sources" file per article.** When challenged in follow-up comments, you'll have the citation one click away.

---

## Summary

Evidence is the difference between SGC analysis and opinion. Use the strongest source tier available. Cite in-flow with specific numbers and specific dates. Layer evidence to build single arguments — pattern options: scale/share/velocity, historical/current/projected, or three-source triangulation. Always name the mechanism, not just the correlation. Avoid the seven common evidence failures. Collect 3× the evidence you use.

Next lesson: the SGC voice — how the writing actually sounds.
`,
  },
  {
    title: 'The SGC Voice: Analytical, Specific, Non-Promotional',
    slug: 'sgc-voice',
    order: 4,
    published: true,
    content: `## How SGC Writing Actually Sounds

Every research house has a voice. Goldman Sachs research sounds different from Bloomberg Opinion, which sounds different from Matt Levine. SGC's voice is deliberate — analytical, specific, and non-promotional.

This lesson names the principles of the SGC voice and gives you before/after examples. After this lesson, your writing should match the published SGC pieces even without an editor catching the style.

---

## The Three Defining Qualities

### 1. Analytical
The writing *argues* rather than *describes*. Every paragraph advances a claim or supports one. Pure descriptive writing — "here is what happened" — doesn't belong unless it's brief scaffolding for an argument.

### 2. Specific
Every meaningful claim is tied to a specific number, source, or mechanism. Vague language ("a lot," "massive," "soon," "many") is almost always a sign the writer hasn't done the work.

### 3. Non-Promotional
No hype, no sales language, no self-congratulation. SGC's research is read because it's useful, not because it's loud. Promotional language ("game-changing," "unprecedented," "seismic") actively harms credibility.

---

## Voice Principle #1 — Specific Over General

### Before
*"Private credit has grown a lot in recent years."*

### After
*"Private credit has compounded from under $500 billion in 2015 to roughly $3.5 trillion globally in 2026 (BCG, Apollo estimates) — a **7× increase in a decade**, during which banks ceded the majority of middle-market lending."*

The specific version doesn't just add numbers. It names the time frame, the sources, and the broader shift. The reader learns something.

### The 3-Specific-Things test

For each paragraph, check: "Does this paragraph contain at least 3 specific things?"

Examples of "specific things":
- A number with units
- A named institution (Fed, BIS, BCG)
- A named mechanism (decline rates, funding mismatch, rate beta)
- A named period (FY26 Q2, 2015-2024)
- A named actor (Treasury, ECB, OPEC)

If a paragraph has fewer than 3, it's probably generalizing. Rewrite.

---

## Voice Principle #2 — Claims, Not Qualifications

### Before
*"It is possible that the market may potentially be underpricing certain risks in the private credit asset class."*

### After
*"The market is underpricing corporate refinancing risk in private credit, specifically in the 2026-2027 maturity wall."*

The first version hides the claim in qualifiers. The second version states it.

### The qualifier detox

Remove or replace:
- "It seems that..." → state the claim
- "Perhaps..." → state the claim, then hedge once at the end if warranted
- "One could argue..." → who is "one"? Name them or own the argument.
- "It is widely believed..." → by whom? Cite, or state your own view.
- "In our view" / "we believe" / "we think" — acceptable **sparingly**, but usually the sentence is stronger without it.

### The one-hedge rule

Each section gets **one** hedge at most. If you're unsure, name the uncertainty once clearly in the tension section — then write the rest of the section with conviction.

---

## Voice Principle #3 — Mechanism Before Moral

### Before
*"The government's fiscal irresponsibility is destroying our children's future."*

### After
*"Federal interest payments exceeded $1 trillion in fiscal 2025, and the **duration-weighted maturity profile** of the debt means the weighted-average coupon continues to rise mechanically for the next 5 years even if no new debt is issued. The question is whether growth outpaces the interest tax, not whether the tax exists."*

SGC writing analyzes policy; it doesn't moralize about it. If you catch yourself using words like "irresponsible," "reckless," "absurd," "outrageous" — rewrite. Pick the mechanism and name it.

### Exceptions
When quoting another actor making a moral claim, attribute it: *"Critics call the policy 'reckless fiscal expansion' (WSJ, May 2025); the analytical question is whether the growth multiplier offsets the interest expense."*

Quoted moralizing that you analyze > your own moralizing.

---

## Voice Principle #4 — Clean Prose, Not Clever Prose

### Before
*"In a macroeconomic plot twist of Shakespearean proportions, the dollar — once the darling of global finance — may be losing its luster faster than you can say 'reserve currency.'"*

### After
*"The dollar's dominance in reserves and trade invoicing is narrower today than in 2015, and the shift — while slow — tracks specific policy drivers: sanctions architecture, fiscal deficits, and the emergence of alternative settlement rails."*

Finance writing that tries to be funny or literary almost always sacrifices clarity. SGC writing is direct — the data is interesting enough without embellishment.

### What to avoid

- ❌ Strained metaphors (*"the dollar is dancing on a knife's edge"*)
- ❌ Rhetorical questions (*"But what if the Fed is wrong?"*)
- ❌ Pun-based section headings (*"Bonding Over Volatility"*)
- ❌ Cliché phrases (*"perfect storm," "black swan," "elephant in the room"*)
- ❌ Reference jokes to pop culture (*"This is the 'Inception' of macro"*)

### What to use instead
- Precise vocabulary from finance and economics
- Specific historical analogs
- Clean verbs (the dollar "declines" rather than "falters"; interest rates "rise" rather than "soar")

---

## Voice Principle #5 — Confidence Without Overreach

The SGC voice is **confident on what's defensible** and **explicit about what's uncertain**.

### Before
*"We are confident that AI will revolutionize every industry by 2030."*

### After
*"AI is reshaping cost structures first in software, customer service, and content generation — with measurable deployment metrics and ROI evidence. The timing and magnitude of transformation in more capital-intensive sectors (manufacturing, healthcare delivery, infrastructure) is less clear, and will depend heavily on regulatory pathways and capex cycles."*

The second version is *more* confident — because it names *where* confidence is earned and *where* it isn't.

### Common overreach signals

- "Definitely" / "certainly" / "without a doubt" — rarely defensible
- Predictions of specific outcomes at specific dates without conditions
- Claims about "what everyone knows"
- Generalizing from one data point

### The confidence gradient

When writing claims, choose the right level on the gradient:

| Level | Phrasing | When to use |
|---|---|---|
| Near-certain | "Is," "does," "reflects" | Established mechanisms, hard data |
| Expected | "Should," "is likely to," "implies" | Forward-looking claims grounded in mechanism |
| Possible | "Could," "may," "might" | Tail scenarios, alternative paths |
| Uncertain | "We don't yet know whether..." | Open questions |

Match the phrasing to the claim's strength. Don't use "could" when you mean "is," and don't use "is" when you mean "could."

---

## Voice Principle #6 — Active Voice, Direct Subjects

### Before
*"It can be observed that it is the case that inflation expectations have been shifting in a manner that suggests..."*

### After
*"Inflation expectations have shifted: the 5-year breakeven rate rose from 2.1% to 2.6% over the past two quarters."*

Passive voice and hedge-stacking are the two most common style weaknesses in student writing. Fix both.

### The verb test

Before each paragraph, identify the main verb. Is it:
- **Active** (*"rose," "expanded," "contracted," "cut"*) → good
- **Passive** (*"was observed to have," "has been influenced by"*) → rewrite
- **Hedge-stacked** (*"has been suggesting that it may have been the case that"*) → rewrite

---

## Voice Principle #7 — Argue Against Strong Positions, Not Strawmen

### Before
*"Some people think the dollar will stay strong forever."*

### After
*"The strongest case for dollar strength — made by DB's research team in their May 2025 note — rests on three pillars: relative real rates, capital flow dominance, and the lack of credible alternatives. Each of these is defensible but eroding..."*

The SGC voice engages with the **best version of the opposing view**, names its proponents where appropriate, and rebuts with evidence. It does not erect strawmen.

### Strawmen to avoid

- "Some think X" (who?)
- "The consensus says X" (without naming the consensus or citing it)
- "Critics argue X" (without naming critics or citing them)
- "Bears believe X" (without a specific bear)

---

## Formatting and Markdown Discipline

### Use \`---\` dividers deliberately

Use between major sections, not decoratively. 3-5 horizontal dividers per article is typical. Don't pepper them between every paragraph.

### Emphasis usage

- **Bold** — for the first appearance of a key term, for the defining number in a claim, for the answer in a "because" construction.
- *Italics* — for short emphasis, named publications, or foreign terms.
- Don't bold entire sentences. Don't italicize entire paragraphs. If everything is emphasized, nothing is.

### List usage

Use bullets for:
- 3+ parallel items
- Mechanisms or channels being enumerated
- Criteria / tests being applied

Use numbered lists for:
- Sequential steps
- Rankings
- References to earlier numbered sections

Don't use lists for narrative flow — if the items connect with "and" or "which means," write them as prose.

### Tables sparingly

Tables are good for:
- Base/bull/bear scenarios
- Before/after regime comparisons
- Side-by-side option comparisons

Don't use tables to hide a lack of argument. A table without explanatory prose below it is incomplete.

---

## The Editor's 7-Point Check Before Publishing

Run through this list on every draft:

1. [ ] **Opening paragraph states the claim** (not the setup, the claim)
2. [ ] **Every body paragraph has a specific number, source, or mechanism**
3. [ ] **No hype words** (massive, huge, unprecedented, game-changing, seismic)
4. [ ] **Qualifiers limited to tension / open-question sections**
5. [ ] **Active voice dominant** (passive <15% of sentences)
6. [ ] **No strawmen** — opposing views named and steelmanned
7. [ ] **Closing paragraph has a specific indicator to watch**

If any checkbox is unchecked, the piece isn't ready.

---

## Before / After: A Full Paragraph

### Before
*"In recent months, there has been a lot of talk about how inflation might be coming back. Some economists are worried about tariffs and others think the Fed is behind the curve. There are good reasons to believe that inflation could potentially become a problem again if these trends continue, and investors should be aware of the risks."*

Problems:
- "Recent months" — vague
- "A lot of talk" — no sources
- "Some economists are worried" — who?
- "Good reasons" — what reasons?
- "Could potentially" — hedge stack
- "Investors should be aware" — vague ask

### After
*"The 5-year breakeven inflation rate has risen from 2.1% to 2.6% over the past two quarters (FRED, T5YIE), while average tariff rates on imported goods sit ~11 percentage points above pre-2024 levels (USTR). These two moves share a single mechanism: imported goods inflation flows to CPI with a 2-4 quarter lag, which has not yet fully passed through the March 2026 inflation print. The open question is whether the Fed reads the initial pass-through as a 'one-time level adjustment' — in which case cuts continue — or as a persistence signal, in which case cuts pause."*

One paragraph, four specific numbers, two sources, a named mechanism, a dated reference, and a framed open question. That's the SGC voice.

---

## SGC Pro Tips

- **Read the piece aloud before submitting.** Ear catches voice problems that the eye misses.
- **Ctrl-F for "very," "really," "just," "actually."** These four words are almost always cut.
- **Ctrl-F for hype words** ("massive," "huge," "game-changing," "seismic," "unprecedented"). Replace or cut.
- **Circle every number in the draft. Check every citation.** Credibility dies at the first bogus number.
- **Cut one adjective per sentence.** Most sentences have one too many.
- **Ask: "Would Goldman Sachs or Bridgewater research publish this sentence?"** That's your voice target.

---

## Summary

The SGC voice is analytical (argues rather than describes), specific (tied to numbers and sources), and non-promotional (no hype, no moralizing, no cleverness). Seven principles: specific over general, claims over qualifications, mechanism before moral, clean prose not clever prose, confidence without overreach, active voice, engagement with strong positions. Run the 7-point check before publishing. If you write in the SGC voice consistently, your work is indistinguishable from institutional research — which is the point.

That completes *Writing an SGC "Our Take."* Next course: writing an SGC Investment Strategy.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 11: WRITING AN SGC INVESTMENT STRATEGY
// ---------------------------------------------------------------------------

const sgcStrategyCourse = {
  title: 'Writing an SGC Investment Strategy',
  slug: 'writing-sgc-investment-strategy',
  summary: 'How to write an SGC Strategy & Research document — the longer-form format that sits between macro thematic work and the fund\'s actual positioning decisions. Used for regime calls, portfolio construction proposals, and multi-asset theses.',
  tags: 'sgc, investment strategy, portfolio, regime',
  published: true,
  order: 11,
};

const sgcStrategyLessons = [
  {
    title: 'What a Strategy Document Does',
    slug: 'what-a-strategy-document-does',
    order: 0,
    published: true,
    content: `## Strategy vs Our Take vs Equity Research

At SGC there are three published research formats. They serve different roles.

| Format | Subject | Length | Decision it supports |
|---|---|---|---|
| **Equity Research** | One company | 10-15 pages | Position in one stock |
| **Our Take** | A macro / thematic argument | 1,500-3,500 words | Updates the reader's regime model |
| **Investment Strategy** | A portfolio-level view | 3,000-6,000 words | Actual positioning / allocation decisions |

An **Investment Strategy** document is the format closest to what an institutional PM actually uses. It combines the regime analysis of an Our Take with the instrument specificity of equity research — then adds sizing, implementation, and monitoring logic.

Investment Strategy pieces are where SGC translates analysis into *portfolio action*.

---

## The Three Common Use Cases

### 1. Regime calls
A comprehensive view on how the macro / market regime is changing, and what portfolio construction response is warranted.

**Example:** *"The 2026 Monetary Easing Cycle: Positioning Across Rates, Credit, and Equity Factors"* — would argue the regime, name the trades, size them, and set kill switches.

### 2. Asset class deep dives
A structural view on a single asset class or sub-class.

**Example:** *"Private Credit: Why Retail Wealth Channels Are the Weak Link — And How to Hedge It"* — would identify the vulnerability, propose hedge instruments, and monitor triggers.

### 3. Portfolio construction proposals
How to build or rebalance a model portfolio given current conditions.

**Example:** *"The SGC 2026 Long-Only Equity Book: Factor Positioning and Name-Level Additions"* — would start with factor view, move to sector allocation, close with specific name additions and sizing.

---

## The Strategy Document Skeleton

Six-part structure, larger than an Our Take:

1. **Executive summary** (1 page) — the verdict up front
2. **Regime identification** — what world are we in? What has changed?
3. **Framework / thesis** — the analytical backbone
4. **Implementation** — instrument selection and sizing
5. **Monitoring & triggers** — what to watch, kill-switch conditions
6. **Risks & open questions**

Target: 3,000-6,000 words. Longer than Our Takes, shorter than a book.

---

## Difference From an Our Take

An Our Take can argue a regime without suggesting what to do about it. A Strategy document **must** suggest what to do about it — and must specify the instruments, sizing, triggers, and risks.

The Strategy document is a higher-stakes format. It implicitly says: *"If you acted on this, here's the portfolio you'd have."* Writing it requires standing behind the implementation, not just the thesis.

---

## SGC Pro Tips

- **Don't write a Strategy document if the conclusion is "monitor the situation."** That's an Our Take. Strategy requires an actionable position.
- **Pre-commit to the implementation before writing.** If you don't know the instruments, sizing, and triggers, the piece isn't ready.
- **Use existing SGC equity research as building blocks.** A Strategy that leans on 3 previously published SGC equity reports is stronger than one that introduces 3 new names in the same piece.
- **Default to range-based sizing.** *"5-8% of the long book"* is better than a single number that will immediately be wrong.

---

## Summary

Strategy documents are SGC's highest-stakes research format — portfolio-level, action-oriented, with explicit sizing and monitoring. Three use cases: regime calls, asset class deep dives, portfolio construction proposals. Six-part structure. Never write one without a specific, implementable conclusion.
`,
  },
  {
    title: 'Regime Identification: What World Are We In?',
    slug: 'regime-identification',
    order: 1,
    published: true,
    content: `## The Regime Frame

Every SGC Investment Strategy opens with a regime identification section. **Regime** = the combination of macro conditions that meaningfully changes which assets work and which don't.

A strategy written for the wrong regime is a losing strategy no matter how sharp the individual ideas. The regime call is the upstream decision.

---

## The Four-Axis Regime Model

SGC uses a four-axis regime model. For each axis, identify the current state and the direction of change.

### Axis 1 — Growth

- **Accelerating** — PMIs rising, payroll growth positive, earnings revisions higher
- **Stable** — trend growth, no meaningful acceleration or deceleration
- **Decelerating** — PMIs below 50 and falling, earnings revisions lower
- **Contracting** — real GDP negative, broad employment weakness

### Axis 2 — Inflation

- **Rising** — core CPI accelerating, breakevens widening, wage growth above productivity
- **Stable** — core CPI within central bank target band
- **Falling** — disinflation, headline surprises to the downside
- **Deflationary** — persistent negative CPI prints, especially in goods

### Axis 3 — Policy / Liquidity

- **Tightening** — central bank hikes, QT, fiscal restraint
- **Neutral** — on hold, balance sheet stable, fiscal impulse muted
- **Easing** — cuts, QE, fiscal expansion
- **Emergency easing** — large unscheduled actions (COVID-era, 2008-era)

### Axis 4 — Risk Appetite

- **Risk-on** — equities up, credit spreads tight, VIX low
- **Mixed / rotating** — leadership shifting, no dominant tone
- **Risk-off** — spreads widening, equities down, USD/JPY/CHF/gold stronger
- **Crisis** — liquidity gaps, dislocations, forced selling

---

## The Regime Matrix

Combinations of axes produce classic regimes. Pattern-match your current moment to one of these:

| Regime name | Growth | Inflation | Policy | Risk | What works |
|---|---|---|---|---|---|
| **Reflation / early cycle** | Accelerating | Rising | Easy | Risk-on | Small caps, cyclicals, commodities, EM |
| **Mid-cycle compounder** | Stable | Stable | Neutral | Risk-on | Broad equities, credit |
| **Late cycle / tightening** | Stable→Decelerating | Rising | Tightening | Mixed | Quality, cash, short duration |
| **Stagflation** | Decelerating | Rising | Tightening | Risk-off | Commodities, gold, pricing power equities, short rates |
| **Disinflationary slowdown** | Decelerating | Falling | Easing | Mixed | Duration, growth equities, gold |
| **Recession / crisis** | Contracting | Falling | Emergency easing | Risk-off→Crisis | Treasuries, cash, gold, eventually re-risk |
| **Deleveraging** | Contracting | Deflationary | Ultra-easy | Risk-off | Long duration, USD, cash |

### The current regime call

In the regime section, state:
1. **Which regime are we in now?**
2. **What is the trajectory?** (staying, transitioning to...)
3. **What is the trigger for the next regime shift?**

Example opening: *"We identify the current regime as late-cycle tightening, with the key divergence from mid-2025 being the Fed's shift toward data-dependent pause-or-cut. The next regime transition — into disinflationary slowdown — is gated on services inflation dropping below 3.5% core on a 3-month annualized basis, which we expect by Q3 2026."*

---

## What a Good Regime Call Looks Like

The regime section should answer four questions **with specifics**:

### 1. What has changed from the prior regime?
Not "things are uncertain," but: specific indicators have shifted. Name the indicator and the magnitude.

### 2. What is consensus about the regime?
Name the prevailing view. Is it "soft landing"? "Recession in 6 months"? "Higher for longer"? You are about to agree or disagree — state what you're arguing with.

### 3. What is your regime call?
One sentence. Specific. Testable.

### 4. What would change the call?
The condition under which your regime call breaks. This is the kill switch at the top of the document.

---

## The Regime Dashboard

A well-written Strategy opens with a **regime dashboard** — a table summarizing the current read:

| Axis | State | Direction | Key indicator |
|---|---|---|---|
| Growth | Stable | ↓ Decelerating | ISM Manufacturing 49.1 (Mar 2026) |
| Inflation | Falling | ↓ Easing | Core CPI 2.9% YoY (Mar 2026) |
| Policy | Tightening | → Pause | Fed funds 4.25-4.50%, pause through Q2 |
| Risk appetite | Risk-on | → Stable | VIX 14, HY spread 320bps |

This dashboard sets the reader's frame in 10 seconds. Every subsequent claim should connect back to it.

---

## Historical Analogs

Strategy documents often reference historical regime analogs. Use them carefully:

### Good use
*"The current setup — tightening complete, disinflation underway, services leadership eroding — rhymes with 1995 more than with 2006. In 1995, the Fed pause gave way to small-cap outperformance of ~15% over 12 months as earnings expectations caught up."*

Specific. Named. Quantified magnitude.

### Bad use
*"This feels like 2008 all over again."*

Hype, no mechanism, no specifics. Cut.

### The rule
Analogs must be *named, dated, and quantified*. Otherwise they're noise.

---

## The Pitfalls of Regime Analysis

### 1. "The regime will stay this way" bias
Most strategists are over-anchored to the *current* regime. Build the analysis so it catches early transitions.

### 2. Over-precision
Calling "we will transition to disinflationary slowdown in Q3 2026" is false precision. Better: "we expect transition within 2-4 quarters, with triggers being X and Y."

### 3. Single-indicator reliance
Regimes are defined by *clusters* of indicators, not by one. If your regime call depends on one data point (e.g., the 10-year Treasury), name that and be explicit.

### 4. Ignoring global divergences
"The regime" for the US can differ from Europe or China. For most SGC strategies, anchor in the US regime but note divergences.

---

## SGC Pro Tips

- **Write the regime section last, after you've done all the research.** Your regime call often sharpens as you go.
- **Track your regime calls over time.** A document library of past regime calls vs outcomes is the highest-quality training data for judgment.
- **Disagree with consensus only when you can name the mechanism.** "Consensus is wrong" is weak; "consensus is anchoring to headline CPI while services disinflation has stalled" is strong.
- **The regime is what makes or breaks the strategy.** Spend proportionally more time on the regime call than on the implementation.

---

## Summary

Regime identification is the upstream decision of every strategy document. Four axes (growth, inflation, policy, risk appetite), seven common regimes. A good regime call names the current state, the trajectory, the trigger for transition, and the condition for being wrong. Use historical analogs only when named, dated, and quantified.

Next lesson: translating the regime view into instruments and sizing.
`,
  },
  {
    title: 'From View to Instruments and Sizing',
    slug: 'view-to-instruments-sizing',
    order: 2,
    published: true,
    content: `## The Translation Problem

A correct regime call with a wrong instrument choice is still a losing strategy. Most new analysts underestimate how much of the Strategy document's value is in **translation** — turning a view into specific trades with specific sizes.

Two principles frame this translation:

1. The same macro view can be expressed through many instruments — each has a different risk/return signature.
2. Sizing is not an afterthought. It is often *the* decision.

---

## From Regime to Instrument

Once you have the regime call, brainstorm how the view can be expressed. At SGC we typically enumerate **3-5 instrument options per trade idea** before picking.

### Example — "US recession likely in next 6 months"

The same view expressed across instruments:

| Instrument | Direction | Rationale | Drawback |
|---|---|---|---|
| 2-year US Treasury | Long | Rates rally hard as Fed cuts | Carry cost if Fed pauses instead |
| S&P 500 futures | Short | Direct equity exposure | Short squeeze risk, high margin |
| USD/JPY | Short | Risk-off currencies strengthen | Intervention risk, carry cost |
| IG→HY spread | Long (go long IG, short HY) | Credit spreads widen in recession | Less liquid, slower to play out |
| Gold | Long | Safe haven + Fed cut beneficiary | Can diverge from risk-off in early recession phase |
| S&P 500 put spreads | Long put spreads | Defined risk downside | Theta decay, timing-dependent |

Each expresses the same view differently. The Strategy picks **1-3** primary expressions and sizes each.

---

## Selecting Among Instruments

Three criteria:

### 1. Convexity
How asymmetric is the payoff? Put spreads on index futures have high convexity (small premium, large payoff if thesis plays out); long 2-year Treasuries have linear payoff.

Prefer convexity when conviction is high on the scenario but timing is uncertain.

### 2. Carry / theta
What does it cost to hold the position if the thesis takes longer than expected?

- Long Treasuries: positive carry (you collect coupons)
- Short SPX futures: roughly flat carry
- Long equity puts: strongly negative carry (theta decay)

If timing is uncertain, lean toward positive-carry or neutral-carry instruments.

### 3. Correlation and overlap
If you hold long Treasuries AND long gold AND long JPY, you're really holding 3x the same trade (risk-off). Check correlations before stacking.

### 4. Liquidity & implementation
Can the book actually enter and exit the position in sensible size? SGC is long-only in equities primarily — for macro strategies, consider ETF proxies or liquid futures rather than illiquid instruments.

---

## Sizing: The Discipline

Position sizing is where most student strategies fall apart. Strategies either over-size (all conviction, no risk management) or under-size (hedged so much it doesn't matter if they're right).

### The three-tier sizing framework

For any idea, the Strategy should specify one of three size categories:

| Tier | Size | When to use |
|---|---|---|
| **Starter** | 1-3% of book | High conviction regime, instrument adds new exposure |
| **Core** | 3-7% of book | High conviction on both regime and instrument, earnings / price visibility |
| **Max** | 7-12% of book | Highest-conviction trades only; typically after confirmatory data |

Anything >12% is a concentrated bet — typically reserved for the one or two highest-conviction trades in a book.

### Sizing triggers

Beyond initial sizing, a Strategy should specify sizing *adjustments*:

- **Scale-in** trigger — *"add 200bps on break below 4200 on SPX"*
- **Scale-out** trigger — *"trim 200bps if VIX compresses below 12"*
- **Add on confirmation** — *"upsize from starter to core if ISM prints below 47"*

Sizing rules in advance protect against emotional sizing during stressful market events.

---

## The Soros / Druckenmiller Sizing Principle

*"Put all your eggs in one basket — and watch the basket carefully."* — Druckenmiller

The practical interpretation: when conviction is genuinely highest, size concentrated. But be prepared to exit quickly when the thesis starts to break.

This is **not** a license to go 30% concentrated on every idea. It is a rule that says: don't dilute your best ideas by putting them alongside 15 medium ones.

### The "top 3 ideas" test

Before finalizing sizing, run this test:

*"If I could only hold my top 3 ideas in this document, which would they be?"*

Those three should collectively be **40-60% of the book**. If they're 15%, you're under-sizing conviction. If they're 90%, you're not diversified.

---

## Implementation Table (Required)

Every Strategy document must include a summary implementation table:

| Trade | Direction | Instrument | Size | Entry trigger | Exit / kill-switch |
|---|---|---|---|---|---|
| Rates rally on cuts | Long | 2Y UST | 6% | Current or 4.80% break | 2Y yields below 3.50% (target) or regime shift (kill) |
| Equity risk-off hedge | Long | SPY Jun $500 put spreads | 1% (premium) | Current or VIX < 13 | VIX > 25 (take profit) or Apr 2026 earnings season clean (kill) |
| EM dispersion | Long MXN / Short TRY | FX NDFs | 2% | Current | MXN < 18.50 or TRY > 35 for 2 weeks |

This table is what a reader actually uses. Every prior section builds to this.

---

## SGC Pro Tips

- **Brainstorm 5 instrument expressions before picking one.** Forces you to understand the trade's convexity/carry profile.
- **Make sizing explicit, not implicit.** "We like long duration" isn't a sizing decision. "6% of book in 2Y USTs" is.
- **Cap maximum single-trade size at ~12% of book** (outside of extraordinary conviction events). Concentration is valuable only with active risk management.
- **Model out the cost of being early.** If carry is -4%/year and your thesis takes 18 months, the carry drag alone is -6%. That can wipe out the alpha.
- **Pre-specify all triggers.** Entry, scale-in, scale-out, kill-switch. Makes the document actionable rather than aspirational.

---

## Summary

Translation from regime view to instruments is where strategies succeed or fail. Select instruments on convexity, carry, correlation, and liquidity. Size using the three-tier framework (starter, core, max). Concentrate in your top 3 ideas (40-60% of book) while keeping overall diversification. Always include an implementation table with trade, direction, instrument, size, entry trigger, and exit/kill.

Next lesson: monitoring, triggers, and when to close.
`,
  },
  {
    title: 'Monitoring, Triggers, and When to Close',
    slug: 'monitoring-triggers-when-to-close',
    order: 3,
    published: true,
    content: `## The Part Most Strategy Documents Skip

Most student Strategy documents end with the trade list. That is a publication ending, not a portfolio management ending. The final section of an SGC Strategy — **Monitoring, Triggers, and When to Close** — is what separates SGC from blog-post research.

This section answers three questions:

1. What do we watch on a daily / weekly / monthly basis to validate the thesis?
2. Under what conditions do we *add* to winning positions?
3. Under what conditions do we *exit* — even before the full thesis plays out?

---

## The Monitoring Dashboard

Every Strategy should include a monitoring dashboard — a list of 5-10 indicators that will tell you, in real time, whether the thesis is working.

### The structure

| Indicator | Current level | Thesis target | Trigger level | Frequency |
|---|---|---|---|---|
| ISM Manufacturing | 49.1 | >52 by Q3 | <47 = kill switch | Monthly |
| Core CPI YoY | 2.9% | <2.5% by Q3 | >3.5% = kill switch | Monthly |
| 2Y Treasury yield | 4.30% | 3.80% (target) | >4.80% or <3.50% = review | Daily |
| HY credit spread | 320bps | tighten to 280bps | >450bps = crisis signal | Weekly |
| Fed funds implied path | 2.5 cuts priced | 3-4 cuts | Change of >1 cut pricing = review | Daily |

This table is the *live* part of the Strategy. In practice, an SGC member owning the Strategy updates it quarterly (or after major events).

---

## Confirmation Triggers vs Kill Switches

For each thesis, specify two categories of triggers:

### Confirmation triggers
Conditions under which the thesis is **being validated** — you may add to the position, consider scaling up from starter to core, or increase conviction.

**Example:** *"If core CPI prints below 2.5% in any of the next 3 months, increase 2Y UST long from starter (3%) to core (6%)."*

### Kill switches
Conditions under which the thesis is **breaking** — you exit the position, regardless of P&L.

**Example:** *"If core CPI rises above 3.5% YoY for two consecutive prints, exit 2Y UST long entirely. The regime thesis is wrong."*

### Why pre-specified triggers matter

When markets are stressed and positions are losing, the temptation is to hold and hope. Pre-specified kill switches protect against this. The analyst who wrote the Strategy at a calmer moment had clearer thinking than the analyst watching the P&L in real time.

A kill switch is not failure. It is a disciplined acknowledgment that **the world is different from what the thesis assumed**.

---

## The Three Kill-Switch Types

### 1. Thesis-break kill switch
A specific, measurable condition that invalidates the thesis.

*"If services inflation accelerates above 4.5% YoY, the regime is not disinflationary — exit duration long."*

### 2. Stop-loss kill switch
A P&L or price threshold that forces exit regardless of thesis.

*"If 2Y USTs sell off such that yields exceed 5.00%, exit the long. Something has changed the market is not pricing yet."*

### 3. Time-based kill switch
A calendar trigger that forces re-evaluation if the thesis hasn't played out.

*"If by Sep 30, 2026, the Fed has not cut and core CPI hasn't fallen below 2.5%, re-underwrite the entire thesis."*

Most trades should have at least **two** of these three kill switches. A trade without any kill switch is a trade that will be held indefinitely.

---

## The Update Cadence

### Monthly — the "hot sheet"
The Strategy owner publishes a short note updating the monitoring dashboard with the last month's data. What moved? What confirmed? What's trending toward a trigger?

### Quarterly — the full re-underwrite
The Strategy is re-read in full. Is the regime call still correct? Have instruments shifted in relative attractiveness? Any trades to close or add?

### Event-driven — after major data or policy events
After a Fed meeting, a major earnings season, a surprise CPI print, or a geopolitical event — the Strategy owner should publish a same-day or next-day update.

---

## When to Close Even When You're Right

This is the hardest discipline. A position can be *right* on the thesis but *wrong* on the expected path — or right on both but now fully priced in.

### Take profit when:
- **The target price / level is hit.** Don't get greedy. If 2Y USTs rally to your target, take at least partial profit.
- **Thesis is fully reflected in market consensus.** If sell-side notes, media commentary, and market positioning all reflect your thesis — you're no longer in a variant perception. The asymmetry is gone.
- **Risk/reward has compressed.** You entered at 3:1 risk/reward; now it's 1:1 or worse. Ride out with the remaining position or exit.
- **A better idea exists.** Capital is scarce. If you've found a sharper opportunity with similar risk, redeploy.

### Exit even at a loss when:
- A kill switch triggers
- The regime assumption is clearly wrong
- You can't articulate the thesis without caveats you didn't have originally

---

## The Loss Discipline

Every Strategy should specify a **book-level drawdown tolerance**. *"If the overall strategy is down more than X% from peak, reduce gross exposure by half and re-underwrite every position."*

This prevents the scenario where every individual position has 20% to go to its kill switch, but collectively the book is down 15% — and the analyst can't bring themselves to cut.

---

## Monitoring in Practice: The SGC Strategy Review Meeting

Every SGC published Strategy should be owned by a named analyst and reviewed in a standing meeting at a specified cadence. Minimum:

- **Monthly** — dashboard review, flag any indicators near triggers
- **Quarterly** — full re-underwrite of each trade
- **Event-driven** — ad hoc updates after material events

The review meeting exists so positions don't quietly decay while everyone is busy with new work.

---

## Closing Out: The Post-Mortem

When a Strategy document is retired — because the thesis played out, the kill switch triggered, or the regime changed — the analyst should write a **brief post-mortem**:

1. **What was the call?**
2. **What happened?**
3. **What did we get right?**
4. **What did we get wrong?**
5. **What would we do differently?**

Post-mortems over time are the training data that makes future analysts better. They're also SGC's institutional memory — otherwise every cohort relearns the same lessons.

---

## SGC Pro Tips

- **Write the kill switches when you write the thesis.** You'll be clearer-headed then than you will be 6 months later when the position is losing.
- **Review the monitoring dashboard weekly, not just monthly.** Even a 5-minute scan catches indicators approaching triggers.
- **Don't rationalize past a kill switch.** If the trigger hit, exit. You can always re-enter later if the thesis re-forms.
- **Re-underwrite after 2 cut-through kill switches.** If two positions in a strategy have kill-switched, the regime call is probably wrong, not just the individual trades.
- **Always post the post-mortem.** Success and failure are both instructive — the analyst who publishes their failures teaches everyone else.

---

## Summary

The monitoring and triggers section is what makes an SGC Strategy an actual portfolio management document. Include a monitoring dashboard, pre-specified confirmation triggers, and pre-specified kill switches for every trade. Update monthly, re-underwrite quarterly, update after events. Take profit when targets are hit or when your thesis has become consensus. Exit at a loss when kill switches trigger. Close out every retired Strategy with a post-mortem.

That completes the Writing an SGC Investment Strategy course. Next: Sales & Trading primer for members considering that path.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 12: SALES & TRADING PRIMER FOR SGC MEMBERS
// ---------------------------------------------------------------------------

const sgcSalesTradingCourse = {
  title: 'Sales & Trading Primer (for SGC Members)',
  slug: 'sales-and-trading-primer',
  summary: 'For SGC members considering a Sales & Trading career — how the trading floor actually works, the difference between sales and trading, desk-by-desk mechanics, how P&L and risk are managed, and how to prepare for S&T recruiting. Tailored to the SGC member profile (U Toronto, often with quant or engineering background).',
  tags: 'sgc, sales and trading, career, recruiting, S&T',
  published: true,
  order: 12,
};

const sgcSalesTradingLessons = [
  {
    title: 'Sales vs Trading: Two Jobs on the Same Floor',
    slug: 'sales-vs-trading',
    order: 0,
    published: true,
    content: `## The Defining Distinction

Sales and Trading sit on the same trading floor, typically about 20 feet apart, and are organized into the same coverage teams. But they do different jobs, have different skill sets, and are compensated and promoted against different metrics.

Most SGC members considering S&T come in knowing the terms but not the distinction. This lesson clarifies it.

---

## Trading: Who They Are

A **trader** at a sell-side bank is responsible for:

1. **Managing the desk's inventory** — positions the desk holds at any moment
2. **Pricing** — quoting bid/offer spreads that clients trade on
3. **Hedging** — offsetting risks the desk takes from client flow
4. **Generating P&L** — typically from bid/offer capture, inventory management, and principal risk

There are two broad types of sell-side traders:

### Flow traders (dominant category today)
- Make markets in highly liquid instruments (Treasuries, major FX pairs, blue-chip equities, vanilla options)
- Profit from the bid/offer spread times volume
- Typically hold small positions, turnover is fast
- Focused on risk management and hedging

### Principal / risk traders (smaller, more specialized)
- Take larger directional or relative-value positions
- Hold positions longer (days to weeks)
- Generate P&L from directional views or trade structure
- Less common post-Dodd-Frank (Volcker Rule restrictions)

### What the job actually looks like
- 6:30 AM desk time, reading overnight moves and research
- 7:30 AM morning meeting — senior trader's view on the day
- 9:30 AM market open — client flow, hedging, market-making
- Throughout the day: quoting prices, managing inventory, hedging, reading news
- 4:00 PM close — mark the book, P&L check, risk review
- 5:00-6:00 PM end of day, often longer on volatile days

---

## Sales: Who They Are

A **salesperson** at a sell-side bank is responsible for:

1. **Covering clients** — a defined list of hedge funds, asset managers, pensions, insurers
2. **Generating trade ideas** — relayed from research, traders, or developed independently
3. **Executing client orders** — passing trades to the desk trader
4. **Client relationships** — entertaining, advising, keeping the account active

### The morning call
Every S&T desk starts the day with a morning call where:
- Traders discuss their views on the day
- Research shares overnight moves and analyst notes
- Sales writes a quick summary they'll send to clients (the "morning note")
- The best trade ideas are flagged to push to specific clients

### What the job actually looks like
- 6:30 AM desk time, reading overnight and research
- 7:00 AM — morning call on the desk
- 7:30 AM — calls to top clients, sending tailored trade ideas
- 8:00 AM – 4:00 PM — client flow, pushing trades, relaying bids
- Client entertainment (dinners, events) often in evenings
- 5:00-6:00 PM EOD, longer on volatile days

---

## The Core Difference

**Trading: market expertise.** You need to understand the specific asset class deeply — what moves it, how it trades, where risk concentrations sit. Your P&L comes from being good at pricing and risk.

**Sales: relationships and synthesis.** You need to understand a wide range of asset classes well enough to talk intelligently, but your edge is **who you know** and **what ideas you can relay compellingly**. Your P&L comes from commission credit on client trades.

---

## Comp Structures

### Trading
- Base salary + discretionary bonus
- Bonus heavily tied to desk P&L and personal contribution to that P&L
- In good years, top traders earn multiples of base
- In bad years, bonuses can go to zero

### Sales
- Base salary + discretionary bonus
- Bonus tied to "commission credit" — allocated share of client trades
- More revenue stability than trading, less upside
- Top salespeople are paid well but trading heads typically out-earn sales heads at the same seniority

---

## Which Fits Which Person?

### Trading suits you if:
- You love markets and want to spend your career deeply inside one (rates, credit, equities, FX, commodities)
- You thrive on quick decisions under pressure
- You're comfortable with high-volatility P&L (your bonus can swing 5x year-to-year)
- You're analytical / quantitative in temperament
- You want to be paid for *alpha*, not *effort*

### Sales suits you if:
- You're highly social and genuinely enjoy building relationships
- You can synthesize complex information quickly and communicate it clearly
- You thrive on variety (different clients, sectors, asset classes)
- You want more revenue stability than trading offers
- You're comfortable in the service economy — the client comes first

---

## Which SGC Members Should Consider S&T

### Trading-leaning members
- Quantitative strength (math, physics, CS, engineering)
- Interest in specific asset classes (rates, FX, commodities, derivatives)
- Comfort with defined skill-based work and live P&L

### Sales-leaning members
- Strong communication skills and client orientation
- Interest in working across asset classes and macro themes
- Energy for high-volume client interaction

### Hybrid paths
Some banks have **Structuring** roles (designing complex derivatives products for clients) and **Cross-Asset Solutions** roles that blend research, sales, and structuring. These suit members who want intellectual range beyond flow market-making.

---

## Sell-Side vs Buy-Side (Brief)

S&T at a bank is **sell-side**. You're "selling" liquidity and ideas to the buy-side (hedge funds, asset managers, pensions).

Many successful traders and salespeople eventually move to the **buy-side** — portfolio manager roles at hedge funds or systematic trading shops. The paths:

- **Flow trader → HF execution or systematic fund** — common
- **Flow trader → PM at a hedge fund** — requires developing a view-generating process
- **Salesperson → HF marketer or IR** — natural fit for client-facing skillset
- **Quant trader → Quant HF** — most common path for quant-leaning traders

---

## The Industry Structure Today

Key facts SGC members should know:

- **Post-Dodd-Frank**: prop trading at banks has been heavily curtailed (Volcker Rule)
- **Flow dominant**: most sell-side trading today is flow, not principal
- **Electronification**: major asset classes (Treasuries, FX majors, index equities) are heavily electronic. Human traders focus on size, complexity, and client relationships rather than quoting small tickets.
- **Growth in structured and credit**: where electronification is slower, the human trader still earns bid/offer
- **Banks vs market-makers**: specialized firms (Citadel Securities, Jane Street, Virtu, Flow Traders) now handle enormous share of market-making. They compete directly with banks and recruit heavily from engineering programs.

For SGC engineers considering S&T: the **quant market-making firms** are often the best employer — higher comp, better intellectual environment, lean teams, and very strong training.

---

## The Toronto / Canada Context

For SGC members at U Toronto:

- **Canadian banks** (RBC, TD, BMO, CIBC, Scotia) have S&T groups in Toronto, with smaller operations in NY / London / Hong Kong
- **US BBs in Toronto** (Goldman, Morgan Stanley, JPM) recruit for their Canadian desks
- **Many Canadian hires do their first 2 years in Toronto, then move to NY or London**
- **Prop/market-making** — firms like Optiver and Flow Traders have smaller presences; Toronto quant HF scene is growing (ex: Ewing Morris, Polar Asset Management)
- Recruiting is more aggressive from UK universities (for London) and US Ivies (for NY) — SGC members compete by being *unusually well prepared on markets*

---

## SGC Pro Tips

- **Read Bloomberg / FT every morning** — even for 15 minutes. S&T is a news-driven job; candidates who don't read are immediately obvious.
- **Develop a market view, then defend it.** "I think rates go higher because ___" is a stronger position than "I like markets."
- **Watch the economic calendar** — Fed meetings, NFP, CPI. Know when they are and what the consensus expectations are.
- **Learn to read a yield curve and a credit spread chart.** These are two of the most commonly shown charts in S&T interviews.
- **Do not pitch ER-style stock pitches in an S&T interview** — the S&T interviewer wants market thinking, not DCF methodology.

---

## Summary

Sales and Trading are two different jobs on the same floor. Trading = market expertise and P&L from market-making. Sales = client relationships and trade idea synthesis. Quant SGC members often fit trading (especially at market-making firms). Communication-strong SGC members often fit sales. For Canadian members, first job is usually in Toronto with potential to move to NY or London. The industry is dominated by flow trading and increasingly electronified — the survivors are quant market-makers and specialized human desks.

Next lesson: how trading desks are actually organized.
`,
  },
  {
    title: 'The Trading Floor: How Desks Are Organized',
    slug: 'trading-floor-desk-organization',
    order: 1,
    published: true,
    content: `## The Layout of the Floor

A bank's trading floor looks chaotic from the outside but is highly structured. Understanding the desk organization is the foundation for S&T interviewing — you cannot credibly answer "which desk do you want to work on?" without understanding what each desk does.

---

## The Primary Asset Class Divisions

Most S&T floors organize along **five primary asset classes**:

1. **Rates** (government bonds, interest rate derivatives)
2. **Credit** (corporate bonds, CDS, distressed)
3. **Equities** (cash equities, equity derivatives, prime brokerage)
4. **FX** (spot, forwards, options)
5. **Commodities** (physical + financial — energy, metals, ags)

Each asset class has its own traders, salespeople, and research analysts.

---

## Rates

### The sub-desks
- **Govvies (government bonds)** — US Treasuries, Canadian / UK / German govt bonds, EM local currency sovereigns
- **Swaps / SOFR / OIS** — interest rate swaps, cross-currency swaps
- **Rates options / volatility** — caps, floors, swaptions
- **Inflation** — TIPS, inflation swaps, breakeven trading

### What it feels like
- Morning is driven by economic data releases (CPI, NFP, ISM) and central bank speakers
- Afternoon activity tied to auction schedules (US Treasury auctions at 1:00 PM ET)
- Positioning is heavily macro / policy-driven

### Why SGC engineers / quants often fit here
- Heavy use of curve math, duration, convexity
- Clean derivatives math (swap curves, forward rates)
- Algorithmic execution for liquid USTs

---

## Credit

### The sub-desks
- **Investment Grade (IG) flow** — blue-chip corporates, new issues
- **High Yield (HY) flow** — sub-investment grade, more spread, more volatility
- **CDS / credit derivatives** — single-name and index CDS
- **Distressed / special situations** — bankruptcies, reorganizations
- **Loans** — levered loans, middle-market

### What it feels like
- Less electronified than rates or equities — still heavy on phone / chat
- News-driven: earnings, ratings actions, M&A announcements all move bonds
- Analyst quality matters more here — credit analysts ("credit sales") are often the edge

### Why it's interesting
- One of the few desks where a detailed company view (similar to ER) actually earns money
- Private credit boom has made credit one of the fastest-growing buy-side opportunities

---

## Equities

### The sub-desks
- **Cash equities** — stock trading (single names, sectors)
- **Equity derivatives** — options, variance swaps, structured products
- **Delta One** — ETFs, futures, swaps, synthetic products
- **Prime Brokerage (PB)** — financing and securities lending for hedge funds
- **Program trading / index arbitrage** — basket trading, index rebalances
- **Systematic / electronic trading** — algo execution, smart order routing

### What it feels like
- Most volume is electronic; voice trading is reserved for blocks and complex orders
- Mornings shaped by overnight moves and earnings (pre-market)
- Lots of execution-focused work — low-touch, high-volume

### Why SGC members often gravitate here
- Equities are the asset class SGC members are most familiar with from ER
- Equity derivatives desk combines quant skill and market feel
- Prime brokerage is a great seat for understanding the hedge fund landscape

---

## FX

### The sub-desks
- **G10 FX spot** — major currency pairs (EUR/USD, USD/JPY, GBP/USD)
- **EM FX** — emerging market currencies
- **FX forwards and swaps** — hedging and funding trades
- **FX options** — vanilla and exotic
- **Structured FX** — custom products for corporate clients

### What it feels like
- One of the most electronified desks — 90%+ of G10 spot is algorithmic
- Human edge is in exotic options, EM, structured products, large client blocks
- 24-hour market, handoffs between London / NY / HK

### Why it's a strong quant desk
- Clean math (interest rate parity, volatility surfaces)
- Heavy use of stochastic models for options
- A natural fit for engineers interested in systematic trading

---

## Commodities

### The sub-desks
- **Energy** — crude oil, natural gas, refined products, power
- **Metals** — gold, silver, copper, aluminum, industrial metals
- **Agricultural** — corn, wheat, soy, softs
- **Emissions / environmental** — carbon credits, RECs
- **Physical trading** — actual movement of commodities (more common at physical traders — Glencore, Trafigura, Vitol — than at banks post-regulation)

### What it feels like
- Highly physical and operational — knowing storage, transport, regulations matters
- Event-driven (weather, OPEC meetings, supply disruptions)
- Smaller quant depth than rates / FX, more human judgment
- Many banks have exited or reduced commodities since 2014; physical traders and specialized hedge funds have gained share

---

## The Support Functions

### Research
Sell-side research analysts cover companies / sectors / macro topics. They're *on the trading floor* but technically a separate function. Research provides:
- Morning notes
- Trade ideas to sales
- Model updates
- Client meetings

### Structuring
Designs bespoke products for clients — custom swaps, principal-protected notes, tax-optimized structures. Sits between trading and sales. Heavy math and legal overlap. Great fit for engineers interested in financial product design.

### Electronic Trading / Quant Strategy
Builds the algorithms and systems that execute most of the flow. Some of these are "Quant Strategy" groups that sit with traders; others are separate tech orgs. Direct competitors to pure quant HFs.

### Risk and Middle Office
Not front office but critical. Monitors VaR, limits, stress tests. Often a feeder to trading roles later.

---

## The Physical Layout

Walking onto a typical trading floor, you'll see:

- **Long rows of desks** with 4-8 monitors per seat
- Each desk corresponds to an asset class; within each, sub-desks cluster
- **Sales** sits at one end of each desk, **traders** at the other
- **Voice boxes / squawk boxes** connect desks and regional offices
- **TV screens** overhead showing Bloomberg, CNBC, sector-specific data
- **Trading tools**: Bloomberg terminals, bank-internal systems, custom analytics

### Seating tells hierarchy
- Most senior trader (the "head") usually in the middle of the row
- Most profitable trader typically adjacent
- Junior traders and analysts at the edges or around the sides

---

## Career Tracks on the Desk

### Trading track
Analyst → Associate → VP → Director → Managing Director
Typical tenure: 2-3 years per rung, faster if you're a top performer
Most desks tend to promote from within — it's unusual to lateral in mid-career without a very strong book

### Sales track
Similar titles, typically similar timing
Sales often has a slightly less steep promotion curve but more lateral mobility between firms
Top salespeople can become managers or move to capital raising roles at alts

### Exit opportunities
- **Flow trader → HF PM or execution trader** — direct skill transfer
- **Market-making prop firm → HF or stay** — top quant firms compete with HFs for talent
- **Sales → HF IR / Marketing / Capital Raise** — relationships transfer
- **Structuring → Buy-side structured products, or fintech product roles**
- **Research → Buy-side analyst / PM** — very common exit
- **Any S&T → Corporate role (Treasury, Capital Markets group)** — slower but stable

---

## What to Know Going In

If you're interviewing or starting in S&T, know:

- Your desk's **core product** inside and out (rates curves, credit spreads, FX pairs, etc.)
- **Recent market moves** in your desk's asset class — at least the last 2 weeks
- Two or three **long-standing structural themes** relevant to the desk
- How the desk is compensated (flow vs principal)
- Who the **top clients** are (you won't know their names but should know the client *type* — asset managers, hedge funds, central banks, etc.)

---

## SGC Pro Tips

- **Read the Bloomberg desk-specific newsletters.** Free for universities with access. They teach you how practitioners actually write about each asset class.
- **Pick a single asset class to go deep on.** A rates-focused candidate who knows the yield curve cold beats a "well-rounded" candidate who knows everything vaguely.
- **Intern on rotation if offered.** Many S&T programs rotate across desks in the summer. Use this to find fit.
- **Ask current traders what moves their day.** "What was the biggest news in your asset class this week?" gives you a free tour of the desk's current concerns.

---

## Summary

Trading floors organize along five primary asset classes: rates, credit, equities, FX, commodities. Each has sub-desks with different pace, skill emphasis, and electronification. Support functions — research, structuring, electronic trading, risk — sit alongside. Quant-leaning SGC members often fit rates, FX, or equity derivatives. Communication-leaning members often fit credit or equities cash sales. The floor's physical layout maps to the hierarchy; seating is cultural signal.

Next lesson: market making, flow trading, and the mechanics of P&L.
`,
  },
  {
    title: 'Market Making, Flow Trading, and P&L',
    slug: 'market-making-flow-trading-pnl',
    order: 2,
    published: true,
    content: `## How a Flow Desk Actually Makes Money

If you ask a student, "how do sell-side traders make money?" — the answer is usually "they bet on prices going up or down." This is mostly wrong. Modern flow desks make money from **bid/offer spread capture, client flow, and inventory management** — not from directional betting.

This lesson explains how a flow desk P&L actually works.

---

## The Bid / Offer Spread

The foundational mechanic.

A market maker quotes two prices:
- **Bid** — the price at which they will buy (e.g., $99.50 for a bond)
- **Offer (or Ask)** — the price at which they will sell (e.g., $99.55)

The difference (5 cents) is the **bid/offer spread**, or just **the spread**.

If a client sells at the bid and another client buys at the offer, the market maker captures the spread without taking directional risk. In the example:
- Bought at $99.50 (from a seller client)
- Sold at $99.55 (to a buyer client)
- Profit: $0.05 per unit × size

### Spread capture at scale
Assume $1B notional trades at a 5bp spread: $0.05 per $100 × $10M (= 100 × 1B/100) = $500K. That's what a day of reasonably active trading can look like on a large desk.

Most flow desk P&L is the compounding of many such captures across the day.

---

## The Inventory Problem

Here's the complication: buyers and sellers never arrive in perfect balance.

- On day 1, a client sells you $500M of bonds at the bid
- You now hold $500M of inventory you don't want, hoping for a buyer
- If the market sells off before a buyer arrives, you're now underwater on the inventory

This is **inventory risk**. Managing it is the core skill of a flow trader.

### How traders manage inventory

1. **Hedge the position** — if you're long bonds, short a correlated instrument (similar-duration swaps, bond futures)
2. **Work the book** — call salespeople with "axes" (positions they want to unwind) so sales can push them to buyers
3. **Reprice the market** — lower your bid, lower your offer slightly so you're less likely to get hit again on the same side
4. **Take a loss and move on** — exit at a small loss if the market is moving against you, rather than holding hoping

Inventory management is where traders earn their real P&L. It's not sexy — it's grinding work — but the compound effect over months is significant.

---

## Principal Risk vs Agency

### Principal trading
The desk takes a position onto its own book. Profits and losses accrue to the desk. This includes market making (where the "profit" is spread capture, but the desk holds inventory risk).

### Agency trading
The desk routes the client's order to the market without taking the risk. The desk earns a commission but no mark-to-market P&L.

### The mix today
Post-Volcker, most large sell-side desks are primarily **principal market makers** in liquid asset classes — taking inventory risk but not running large directional books. Smaller desks or specialized franchises (e.g., distressed credit) can still take more principal directional risk.

---

## The P&L Components

A flow trader's daily P&L breaks into:

### 1. Spread capture
Net of: trades done at bid + trades done at offer, minus the mid-market price.

### 2. Inventory markup / markdown
How did the value of the inventory you're carrying change day-over-day? If you're long $100M of 10Y bonds and the market rallies 0.25 points, that's $250k of markup.

### 3. Hedge P&L
If you hedged your inventory, the hedge itself has a P&L. Usually roughly offsetting the inventory markup, but not perfectly (basis risk).

### 4. Carry / financing
Positions that earn coupons (bonds, swaps) have daily carry. Positions that finance via repo pay or receive carry.

### 5. Realized vs unrealized
Mark-to-market P&L vs actual trade-by-trade gains. Over time these converge; intra-day they can diverge meaningfully.

### Example daily P&L

A rates flow trader's Tuesday:

| Line | P&L |
|---|---|
| Spread capture (client flow) | +$320k |
| Inventory markup (long position in a rally) | +$180k |
| Futures hedge P&L | -$150k |
| Carry (positive) | +$15k |
| **Total day P&L** | **+$365k** |

The inventory and hedge mostly offset because the trader was correctly hedged. The real "alpha" was the spread capture.

---

## Risk Limits

Every trader operates inside pre-defined risk limits:

### Position limits
- Max notional long / short in a specific instrument
- Max duration (for rates), DV01, or other sensitivity-based limits

### VaR limits
- Max Value at Risk — e.g., "95% 1-day VaR cannot exceed $2M"

### Stress limits
- "Position must survive a 50bp rate shock with max loss of $10M"

### Concentration limits
- Max exposure to any single issuer / counterparty

If a trader exceeds a limit, they need to reduce the position. Exceeding limits repeatedly is a career-ender.

### Pre-trade check discipline
Before putting on a position, the trader should know:
- What's my desk's current exposure?
- Where is my limit?
- What's the expected hold time?
- How will I hedge?

If any answer is "I'm not sure," don't put the trade on.

---

## Electronification and Its Effects

Over the last 15 years, liquid markets have shifted dramatically to electronic trading:

- **US Treasuries**: ~65% electronic for on-the-run securities
- **G10 FX spot**: ~85% electronic
- **S&P 500 index futures**: >95% electronic
- **IG corporate bonds**: ~35-45% electronic (growing)
- **HY corporate bonds**: ~15-25% electronic (voice still dominant)

### Effect on human traders
- Spreads on the most liquid instruments compressed dramatically
- Pure market-making of plain-vanilla instruments is now dominated by algorithmic firms (Citadel Securities, Virtu, Jane Street)
- Human traders survive in areas where size, complexity, and client relationship matter
- "Voice" trading persists in HY, distressed, structured, emerging markets, and large block execution

### Effect on hiring
- Banks have reduced headcount in flow trading for the most electronified products
- Quant firms have aggressively expanded, hiring heavily from engineering programs
- For quant-leaning SGC members, a Jane Street / Citadel / Optiver internship is increasingly competitive with — or above — BB S&T in brand

---

## The Morning Run-Through

A flow trader's first 30 minutes of the day:

1. Check overnight P&L (what did the book do while asleep?)
2. Scan overnight moves in relevant markets
3. Read morning research notes
4. Review client axes (positions clients are trying to unwind)
5. Update desk view for the morning call
6. Hedge any overnight moves that require adjustment

This is a routine drilled into every junior trader. Getting it wrong on day 1 tells the whole floor.

---

## How Traders Get Fired

Two paths:

### 1. Risk incidents
A trader exceeds limits, makes an unauthorized bet, or causes a significant loss. Often one large incident is enough.

### 2. Slow decline
P&L consistently below desk averages, limited contribution to client flow, no view-generating ability. A trader in the bottom quartile of their desk for 2-3 years becomes a casualty of the next round of cuts.

### What survivors do
- Hit their risk limits close to their max capacity (using the risk budget)
- Generate consistent spread capture
- Develop client relationships (even as a trader, the sales desk likes working with you)
- Have a defensible view on their asset class
- Take risk when opportunities are clear, cut risk when they're not

---

## SGC Pro Tips

- **Practice pricing bid/offer spreads.** Pick any liquid instrument; learn what a "normal" spread is today. This is commonly tested in S&T superdays.
- **Understand duration and DV01** for rates, **gamma and vega** for options. The math is not difficult, but it is *assumed* in interviews.
- **Read a trader's P&L attribution.** If a mentor or internship lets you see one, you'll learn more in 30 minutes than in a semester of textbook reading.
- **Quant market-making firms are a strong alternative path.** Citadel Securities, Jane Street, Virtu, Flow Traders — SGC engineers in particular should apply.
- **Don't oversell directional views in interviews.** A trader who says "I'd put on a huge rates short" sounds like they want to gamble. A trader who says "given curve pricing, I'd look at a flattener at these levels" sounds like they want to manage risk.

---

## Summary

Modern flow desks earn P&L primarily from bid/offer capture and inventory management, not directional betting. Every position is bounded by explicit risk limits (position, VaR, stress, concentration). Electronification has compressed spreads in liquid markets and shifted market share to quant firms. Surviving as a flow trader requires consistent risk discipline, spread capture, and client flow generation — not heroic P&L calls.

Next lesson: the sales side of the desk — client coverage and the morning call.
`,
  },
  {
    title: 'Sales: Client Coverage, Ideas, and the Morning Call',
    slug: 'sales-client-coverage-morning-call',
    order: 3,
    published: true,
    content: `## The Sales Job, Demystified

"Sales" at a sell-side bank is confusingly named. It's not direct-to-consumer selling. It's relationship-based advisory and execution for institutional clients — hedge funds, asset managers, pensions, insurance companies, sovereign wealth funds, corporates.

A sales role at Goldman S&T is a **client advisor + trade idea generator + execution quarterback** — not a person "selling" anything in the retail sense.

---

## The Coverage Model

Every salesperson covers a **defined list of accounts** (clients). For a mid-career Associate, that might be 15-30 clients ranging from $500M hedge funds to $50B asset managers.

For each account, the salesperson is responsible for:

1. **Relationship maintenance** — regular check-ins, dinners, events
2. **Idea flow** — sending relevant trade ideas
3. **Execution** — handling orders, relaying bids/offers between the client and the trader
4. **Intel gathering** — understanding what the client is doing / thinking, so the desk can position accordingly
5. **Wallet share** — ensuring the client does their trading through your bank

Top salespeople "own" their top 3-5 accounts in a way that the client calls them first for anything in their asset class.

---

## The Morning Call

The single most important 30 minutes of the sales day.

### The flow

**6:30 AM** — Sales arrives, reads overnight news, research, and pre-market moves.

**7:00 AM** — The desk morning call. Typically:
- 5 min overnight / Asia review from the desk's most senior trader
- 10 min views / trade ideas for the day
- 10 min research analyst update on the most important scheduled event
- 5 min Q&A

**7:30 AM** — Sales writes the morning note (to email clients) and starts the phone round.

**8:00 AM** — Key accounts get dedicated calls; smaller accounts get the note.

**9:00 AM** — Execution mode as the market opens (Europe already open, NY about to).

### What goes in the morning note

- Overnight moves in the key products on your desk
- 2-3 trade ideas (one tactical, one longer-term, one idiosyncratic)
- Relevant data releases for the day
- Market color — what the desk is seeing in flow

### Why this matters
The morning note is the only piece of paper the client may read from your bank that day. It frames the relationship. Written well over years, it becomes the reason the client picks up your call instead of a competitor's.

---

## Generating Trade Ideas

The most valued sales skill after relationship management.

### Where ideas come from

1. **From traders** — the desk's current view on the market, often distilled by the head trader
2. **From research** — the analyst's upgrade / downgrade / catalyst view
3. **From you** — your own synthesis, often cross-asset

### The idea format

A well-written idea has 5 parts:

1. **The thesis** — one sentence
2. **The mechanism** — what drives the move
3. **The expression** — specific instrument, direction, size
4. **The catalyst** — what forces the reprice
5. **The risk** — what could go wrong

**Example (rates sales idea):**
*"Long 5Y USTs vs short 30Y USTs (curve steepener, DV01-neutral, -50bps of carry). The front end is pricing 2 cuts in 2026; we see at least 4 once services inflation rolls over by mid-year. The catalyst is the Apr 10 CPI print; mechanism is real rate normalization at the front. Risk: if services inflation re-accelerates, the front end sells off and the trade unwinds."*

Five sentences. Specific. Actionable. A client can evaluate this in 30 seconds.

---

## Client Calls

The bread and butter of sales.

### Types of calls

**Daily check-ins (2-5 min)** — "How's the morning? Anything specific I can help with?" — light-touch, maintains presence without being annoying.

**Idea pitches (5-15 min)** — walks the client through a specific trade, often after the note has piqued interest.

**Deep dives (30-60 min)** — full regime discussion, cross-asset view, positioning walk. Usually scheduled, often at client request.

**Execution calls (as needed)** — "I can work that 50 at 99-27 if you want, but I'm seeing better offers in 50mm size at 99-26." Fast, transactional, market-relevant.

### The skill difference between average and top sales
- **Average**: relays information from research and trading
- **Top**: synthesizes across sources and adds a personal view; becomes the client's first call

The top sales calls more often with *specific* ideas; average sales calls more often with *general* updates.

---

## Building the Client Relationship

Long-term relationship value comes from three sources:

### 1. Idea quality over time
The client remembers whose ideas made them money. One good idea a quarter compounds.

### 2. Trust under stress
When markets are volatile, clients call the salesperson who picks up the phone and shoots straight. Sales who hide during stress lose the relationship permanently.

### 3. Going the extra step
Sending an unexpected write-up on something the client is working on. Getting them into an event. Making an intro. Small favors compound into significant relationships.

### The entertainment question
Yes, client entertainment is part of the job. Dinners, concerts, sports tickets, industry conferences. For certain client segments (especially hedge funds and asset managers), this is a real component. But it's **not** the job — if you can't generate ideas and execute, no amount of dinners substitutes.

---

## Commission Credit

Sales comp is largely driven by **commission credit** — an internal metric for how much trading a client does *because of* the salesperson.

### How it works
- Each trade by the client has a commission / spread attached
- That revenue is allocated among the people who contributed: the idea originator, the cover salesperson, the trader, sometimes research
- Sales who are "on the top" of the account get the largest share
- Internal politics determine allocations at the margin

### Why this matters for the job
- It's hard to replace a client — once you've built the relationship, the credit flows
- But losing a client can happen quickly — if your coverage slips, another salesperson can take over
- Allocation conversations happen annually, sometimes quarterly; top salespeople advocate hard for their credit

---

## Common Sales Archetypes

### The product expert
Deeply knows one product; clients rely on them for that specific asset class. Works well in rates, FX, options.

### The macro synthesizer
Connects dots across asset classes. Often has research-like analytical depth. Useful for long/short and multi-strategy hedge fund clients.

### The relationship engineer
Knows everyone in the industry. Great at connecting clients with each other, introducing decision-makers. Often becomes a capital introduction specialist.

### The execution specialist
Known for getting the hard trades done. Complex, large, illiquid — clients call them when a normal salesperson would struggle.

Most successful salespeople blend 2-3 of these. Junior salespeople should develop one first.

---

## Sales vs Research vs Structuring

Three adjacent functions with different emphases:

| Function | Primary output | Primary metric | Skill emphasis |
|---|---|---|---|
| **Sales** | Client trade ideas and execution | Commission credit | Synthesis, relationships |
| **Research** | Written reports, analyst views | Votes (from clients on quality) | Deep analysis, writing |
| **Structuring** | Bespoke products for clients | P&L from structured books | Product math, legal fluency |

Many salespeople have done stints in research or structuring. Moving between functions is common.

---

## What a Top Sales Day Looks Like

**6:30 AM** — Overnight scan, reading research, pre-market data
**7:00 AM** — Morning call
**7:30-8:30 AM** — Morning note, top client calls
**8:30-10:30 AM** — Execution as markets open, trade relays, specific idea pitches
**10:30-12:30 PM** — Client meetings (internal or external), deep-dive calls
**12:30-2:00 PM** — Lunch with client or at desk
**2:00-4:00 PM** — Continued flow work, client follow-ups, research updates
**4:00-5:00 PM** — EOD wrap, client feedback on the day, planning tomorrow's ideas
**5:00 PM+** — Client dinners / events (2-3 nights a week is typical)

---

## SGC Pro Tips

- **Learn to write a morning note.** Pick a desk, imagine you cover it, write a 200-word morning note on yesterday's moves + today's data. Do this every week.
- **Read the Goldman / JPM / Morgan Stanley morning notes** (many are public via podcasts and newsletters). They model the tone.
- **Build relationships early.** Every SGC alum in S&T is a future client. Maintain contacts.
- **In interviews, pitch an idea, not a view.** Views are free; a specific idea with instrument, size, catalyst, and risk shows sales readiness.

---

## Summary

Sales is relationship-based advisory: client coverage, trade idea generation, execution quarterbacking. The morning call and the morning note are the daily ritual. Comp is via commission credit — allocated share of client trading revenue. Top sales distinguishes itself by idea quality, stress reliability, and going the extra step. Several archetypes (product expert, macro synthesizer, relationship engineer, execution specialist) — most successful salespeople blend several.

Next lesson: S&T interview prep — markets questions, brainteasers, and "why S&T."
`,
  },
  {
    title: 'S&T Interview Prep: Markets, Brainteasers, and "Why S&T"',
    slug: 'st-interview-prep',
    order: 4,
    published: true,
    content: `## The S&T Interview Format

S&T interviews are different from IB and ER. They test:

1. **Market awareness** — do you follow markets and have a view?
2. **Quantitative reasoning** — can you do mental math and estimation under pressure?
3. **Personality fit** — can you handle pressure, communicate concisely, be coachable?
4. **"Why S&T"** — specifically why S&T, and within S&T, why a particular desk?

Unlike IB, S&T interviews typically do *not* test:
- Detailed accounting
- DCF / comps mechanics
- Stock pitches (though relevant if interviewing for equity cash)

---

## Structure of the Process

### Round 1 — Phone / video (30 min)
- Why S&T / why this desk
- Basic market question (name one thing moving markets today)
- One brainteaser or mental math question
- Fit / resume walk

### Round 2 — Superday (3-4 interviews, ~30 min each)
- Deeper markets discussion
- More brainteasers / probability / mental math
- Behavioral with senior traders or salespeople
- "Pitch me a trade" — expect this

### Final round / networking sessions
- Meet with the desk or regional head
- Culture fit
- Sometimes a mock trading game

---

## Why S&T, Really

The single most important answer. Rehearse a clean, specific 60-second version.

### Weak answers (do not use)
- *"I like the fast pace"* (everyone says this)
- *"I'm interested in markets"* (everyone says this)
- *"I want to work in finance"* (too vague)
- *"I'm good with numbers"* (not a reason)

### Strong answer template

1. **Origin story** — when did you first get interested in markets? Specific experience.
2. **What you've done to explore it** — SGC, personal trading, books, shadowing, a class that hooked you.
3. **What specifically draws you to S&T over IB / ER / PE / HF** — the immediacy of markets, the live feedback, the specific asset class appeal.
4. **Why this desk / firm** — fit to your interests, the culture, the people you've met.

### Example (for a rates-leaning SGC member)

*"I got hooked on markets during the 2022 Fed tightening cycle — watching how the entire asset class hierarchy reshaped around rate expectations. I joined SGC because it was the most rigorous finance group at U Toronto, and I've since led equity research and written on macro topics like the petrodollar and fiscal expansion. But the more I learned, the more I realized rates is where the macro regime actually expresses itself — the yield curve is the scoreboard. What draws me to S&T specifically is the immediacy: my thesis isn't vindicated in a 6-month target price, it's visible in real time on the tape. I've spoken with three members of your rates desk — Name, Name, and Name — and the culture of coaching and the focus on thinking probabilistically is the fit I'm looking for."*

~ 90 seconds. Specific experiences, specific interest, specific desk, specific people.

---

## Market Question Preparation

### Core questions you will get

**"What's moving markets today?"**
Cite 1-2 specific things from this morning's tape. Connect to a broader theme. Explain the mechanism.

*"Core CPI came in at 0.3% MoM — above consensus of 0.2%. 2-year yields rose 7bps on the print, and the dollar strengthened ~40 pips. It's pushing the market toward fewer 2026 cuts — the June cut now priced at ~45% vs 60% yesterday. Underlying driver is services inflation persistence, which the Fed has flagged as their remaining concern."*

**"What's your view on [rates / credit / equities / FX]?"**
Have a pre-formed view on each major asset class. Don't straddle — pick a side, defend it, acknowledge the counter.

*"I'm biased bullish on 2Y USTs over 12 months. Reason: services inflation is rolling over more visibly than headline, Fed has signaled comfort with cutting once services is below 3.5%. Risk is a 2026 tariff-driven reacceleration in goods inflation, which would delay cuts 6+ months. If I had to size, I'd start small and add on confirmation at the June FOMC."*

**"What was the biggest market move of the past week?"**
Have 1-2 examples. Not just the move — the *why*.

### Scheduled data you must know

- **NFP / Unemployment** — first Friday of the month, 8:30 ET
- **CPI** — mid-month, 8:30 ET
- **FOMC meetings** — 8 times a year
- **ISM PMI** — first business day of the month
- **GDP** — end of quarter month (advanced), + revisions

You should be able to say, in any S&T interview: "The next data release that matters is [X] on [date], consensus is [Y], and it matters because [Z]."

---

## Brainteasers

Don't panic. They test approach, not raw IQ.

### The method
1. Clarify the problem — can you take 10 seconds to restate it?
2. Break into parts — what simpler version can you solve first?
3. Estimate / approximate — round aggressively for mental math
4. State your answer clearly, then stop

### Classic types

**Estimation (Fermi problems)**
*"How many golf balls fit in a 747?"*
Not an actual S&T staple anymore, but Fermi-style estimation is common. Approach: volume of plane × packing efficiency × ratio of interior to ball volume.

**Probability / statistics**
*"I flip a fair coin 10 times. What's the probability of exactly 5 heads?"*
= C(10,5) × (0.5)^10 = 252 / 1024 ≈ 24.6%

*"I roll two dice. What's the expected value of the maximum?"*
Expected max of two dice = 4.47. (Enumerate outcomes or recognize the symmetry.)

**Mental math**
*"What's 17 × 38?"*
= 17 × 40 − 17 × 2 = 680 − 34 = 646

*"What's 1/7 as a decimal to 4 places?"*
0.1428

*"What's the square root of 180?"*
√180 = √(36 × 5) = 6√5 ≈ 6 × 2.236 ≈ 13.4

Practice these. Being fluent to 3 decimal places on common roots and products is expected.

**Market-specific brainteasers**
*"A bond has a 5% coupon, 10-year maturity, and yield rises 100bps. What's the approximate price impact?"*
Duration is roughly 8 for a 10Y 5% coupon bond. Price impact ≈ -8% × 1% = -8%.

*"What's the breakeven for a straddle on SPX with 20% implied vol, 1 month?"*
20% annual / √12 ≈ 5.77% / month. Breakeven ~5.77% move either way.

### Rapid brainteaser practice
Work through:
- Heard on the Street (classic question bank)
- Practicing Wall Street (by Erez Ayalon)
- Jane Street mental math drills online

Target: solve 10-15 brainteasers in an hour with consistent approach.

---

## The "Pitch Me a Trade" Question

Very common in Round 2. Have one trade *ready* for each of:
- A rates trade
- An equity (single-name or index) trade
- An FX trade
- Optionally, a credit or commodity trade

### The trade pitch template (S&T version)

1. **One sentence** — "I'd do X because Y."
2. **Instrument** — specific (not "bonds" but "5Y USTs" or "the 10s/2s curve")
3. **Size orientation** — small / medium / large, with risk-reward in mind
4. **Thesis** — 2-3 sentences of mechanism
5. **Catalyst** — specific event or condition
6. **Risk** — what breaks it

### Example (equities, simple)

*"I'd buy QQQ at current levels, ~$520, with a target of $560 (7.7% upside). Thesis: mega-cap tech earnings are tracking high-single-digit revenue growth and margin expansion from AI-driven efficiencies, but the index is trading at a discount to its 5-year forward P/E average. The catalyst is Q1 earnings season starting Apr 15. Risk is a tariff-driven selloff that would pressure semiconductors first; I'd size this 3% and kill below $495."*

---

## Behavioral Questions

S&T behavioral questions focus on:

### "Tell me about a time you handled pressure"
Specific situation. What was the pressure. What you did. What the outcome was. Keep to 90 seconds.

### "Tell me about a time you were wrong about a market / investment"
They want to see self-awareness. What was the call. What you missed. What you learned.

### "Tell me about a time you had a disagreement with a teammate"
Not the right time to say "I don't have disagreements." They want to see that you can push back respectfully and take feedback.

### "What's a weakness?"
**Avoid**: "I work too hard" (dishonest).
**Use**: a real weakness with a specific mitigation. *"I have a tendency to over-engineer analysis when a quick estimate would suffice. I've learned to set a 30-minute timer before diving deep — if I can't frame the problem in 30, I find a practitioner or mentor to bounce it off before continuing."*

### "What do you do outside of work / studies?"
Have an answer. They're looking for a full person, not just a resume.

---

## Red Flags You Should Avoid

1. **No market view** — "I don't really have one" is disqualifying
2. **Pitching a trade as a "buy because it'll go up"** — S&T wants probability-adjusted thinking
3. **Complaining** — about school, courses, prior internships, anything
4. **Name-dropping** without follow-through — "I spoke with John at Goldman" should be followed by "and he told me specifically..."
5. **Incorrect math** — rough approximations are fine; wrong magnitudes are not
6. **Inability to say "I don't know"** — faking knowledge is immediately detected

---

## The Networking Component

S&T recruiting is heavily networking-driven. More than in ER or IB.

### Coffee chat approach
- 15-20 minutes with each contact
- Ask specific questions about their desk, their typical day, what they look for in juniors
- End with *"what's one thing I should be doing differently to prepare?"* — actionable
- Follow up in writing with a thank you

### Sequence
1. First-year: reach out to 5-10 seniors via LinkedIn / SGC network — build awareness
2. Second-year: deepen 2-3 relationships, apply for internships
3. Third-year: full-time recruiting

### Canadian-specific reality
- Toronto desks hire from U Toronto, Queen's, Western, Ivey heavily
- NY desks hiring Canadians: HBA / Ivey, U Toronto Commerce, engineering + finance dual paths
- SGC provides competitive edge — mention SGC work specifically in networking conversations

---

## SGC Pro Tips

- **Track every market in a journal for 2 months before interviews.** Daily, 5 lines: major moves, why, what it means. Builds instinct and gives you content.
- **Know your top 3 trade pitches cold.** Each ready to deliver in 90 seconds with detail.
- **Practice mental math daily.** 10 minutes a day for a month transforms your interview baseline.
- **Use SGC research in interviews.** *"I wrote a piece on private credit for SGC — here's the thesis..."* is a credibility multiplier.
- **Be able to say "I don't know"** — and follow with "but here's how I'd approach it."

---

## Summary

S&T interviews test market awareness, quantitative reasoning, personality fit, and "why S&T." Prepare a 60-second "why S&T" that is specific to origin, experience, and desk. Know what's moving markets today and have a view on each major asset class. Practice 100+ brainteasers across estimation, probability, and mental math. Have trade pitches ready for 3-4 asset classes. Network aggressively and early.

That completes the S&T primer. Next course: Finance for Engineers — for SGC members coming from engineering who want to move into finance roles.
`,
  },
];

// ---------------------------------------------------------------------------
// COURSE 13: FINANCE FOR ENGINEERS (SGC MEMBERS TRANSITIONING)
// ---------------------------------------------------------------------------

const sgcEngineersCourse = {
  title: 'Finance for Engineers (SGC Transition Track)',
  slug: 'finance-for-engineers',
  summary: 'For SGC members from engineering or CS who want to move into finance roles — not just quant or software. Covers which roles reward engineering backgrounds, the translation of technical skills, the finance skills you actually need, and the recruiting strategy for non-business students. Tailored to the SGC engineer profile.',
  tags: 'sgc, engineering, career transition, recruiting, quant, finance',
  published: true,
  order: 13,
};

const sgcEngineersLessons = [
  {
    title: 'Why Engineering Is a Strong Path Into Finance',
    slug: 'why-engineering-strong-path',
    order: 0,
    published: true,
    content: `## The Engineer → Finance Move

Many SGC members come from engineering, computer science, physics, or applied math — not Commerce or Rotman. The conventional framing is that they'll do "quant" or "software." This is incomplete. Engineers have a **significantly broader path into finance** than most assume.

This course is for SGC engineers who want options. Quant and software are great — but so are roles in Investment Banking (tech M&A coverage), Equity Research (semis / tech / FinTech), Sales & Trading (market-making, rates, equity derivatives), and investing (growth equity, private equity tech, hedge funds).

---

## What Engineers Actually Bring

### 1. Quantitative fluency
You've spent 3-4 years solving problems that other students haven't tried. First-principles thinking, mathematical modeling, comfort with uncertainty. Finance uses none of the hardest math you've seen, but it uses it *consistently* — and being comfortable at that level is a competitive advantage.

### 2. Systems thinking
Engineers see businesses as systems — inputs, processes, outputs, feedback loops. This maps directly to how investors and analysts think about companies. A software engineer pitching Datadog immediately understands the retention flywheel in a way a Commerce student often has to learn.

### 3. Technical credibility
In sectors like software, semiconductors, hardware, biotech, and energy transition, **understanding the technology matters**. An equity research analyst covering Nvidia who can actually read a CUDA kernel spec is more effective than one who can't. A tech M&A banker who understands the difference between a transformer and a CNN has better conversations with CTOs.

### 4. Project discipline
Engineering projects require breaking a complex goal into components, assigning work, delivering to deadline, debugging when things break. These skills translate cleanly to running a deal team, managing a research model, or coordinating a trade build-out.

### 5. Scarcity
In many finance orgs, only 10-25% of the analyst class comes from engineering. This is **not** a disadvantage — it means your profile is distinct. The "too many Commerce majors" complaint from recruiters is real.

---

## The Conventional Engineer Paths (Briefly)

These are the paths most engineers assume are the only ones:

### Quantitative trading / research
- **Firms:** Jane Street, Citadel, DE Shaw, Two Sigma, Optiver, Hudson River, Flow Traders
- **What it is:** Designing and running systematic trading strategies, building quant models, running experiments on market data
- **Engineer fit:** Excellent for math / CS / physics / statistics backgrounds
- **Path:** internships in undergrad, strong OOP + probability + math preparation

### Quantitative development (Quant Dev)
- **Firms:** Same as above + sell-side banks + quant hedge funds
- **What it is:** Building the infrastructure that makes trading strategies actually work — market data pipes, execution systems, research platforms
- **Engineer fit:** Natural home for strong CS / systems engineers
- **Path:** internships, strong SWE fundamentals + interest in markets

### Trading technology / Infrastructure engineering
- **Firms:** HFT firms, banks, exchanges
- **What it is:** Ultra-low-latency systems, matching engines, colocation
- **Engineer fit:** C++ / systems engineering specialists
- **Path:** competitive programming, OS / distributed systems expertise

These paths are excellent. The rest of this course focuses on the **less-obvious paths** that engineers often don't know are accessible.

---

## The Non-Quant Paths That Reward Engineers

### 1. Technology Investment Banking (Tech M&A)
- **Firms:** Goldman TMT, Morgan Stanley Tech, Qatalyst Partners, Evercore Tech
- **What it is:** M&A advisory for technology companies — IPOs, acquisitions, mergers, spin-offs
- **Why engineers fit:** Technical credibility with CEOs / CTOs who are themselves engineers; understanding of software / semis / hardware business dynamics
- **Compensation:** Top bracket in IB; analysts $150-250k all-in first year
- **Exit opportunities:** Growth equity, PE, hedge fund, start a startup, CFO track at scale-ups

### 2. Equity Research — Technology / Semis / Biotech / Energy
- **Firms:** Morgan Stanley (Katy Huberty on tech), Goldman, Evercore ISI, Bernstein, sell-side boutiques
- **What it is:** Deep analytical coverage of a sector or set of companies
- **Why engineers fit:** Sector expertise; ability to critically evaluate technical claims in management pitch decks; systems thinking applied to company analysis
- **Notable advantage:** Being able to build and debug a financial model in Excel is expected; engineers often learn this faster than Commerce students
- **Exit opportunities:** Buy-side analyst, hedge fund analyst, venture capital, corporate strategy

### 3. Systematic / Macro Hedge Funds
- **Firms:** Bridgewater, Renaissance (hard to access), Two Sigma, AQR, Man AHL, Millennium pods, Balyasny
- **What it is:** Portfolio management using data-driven methods — macro, equity long/short, systematic strategies
- **Why engineers fit:** Heavy data infrastructure, modeling, and back-testing
- **Path:** Start in quant research or analyst roles, move into PM track

### 4. Venture Capital (especially tech-focused)
- **Firms:** a16z, Sequoia, Accel, Founders Fund, Lightspeed, on the growth side Insight Partners, Tiger Global, Coatue
- **What it is:** Investing in private technology companies (seed to late-stage)
- **Why engineers fit:** Technical evaluation of startups; understanding of software economics, AI/ML, infrastructure, hardware
- **Path:** Often after 2-3 years at a high-growth startup, consulting, or banking. Increasingly, firms hire Associates directly from undergrad.

### 5. Growth Equity / Tech PE
- **Firms:** Vista Equity Partners, Thoma Bravo, Silver Lake, General Atlantic, Warburg Pincus Tech
- **What it is:** Late-stage private tech investing, often majority acquisitions of profitable software companies
- **Why engineers fit:** Technical due diligence, product / market fit evaluation, operating improvement
- **Path:** Typically IB first, then transition; some firms recruit from consulting or directly from operating roles

### 6. Fintech Product / Strategy
- **Firms:** Stripe, Ramp, Plaid, Robinhood, big bank FinTech orgs
- **What it is:** Product management, strategy, biz dev for financial technology companies
- **Why engineers fit:** Built for engineers; technical + business fluency
- **Path:** Direct from undergrad into Associate Product Manager roles; or rotate from SWE into PM

---

## Reading the Market: Which Path Fits Which Engineer

### Heavy math / stats / ML fluency
→ Quant research at Jane Street, Citadel, Two Sigma, DE Shaw
→ Systematic hedge fund research (AQR, Man AHL)
→ Quant trading

### Strong OOP / systems / infrastructure
→ Quant development at any quant firm or bank
→ Trading tech at HFT firms
→ FinTech senior SWE roles

### Technical fluency + strong communication / business interest
→ Tech M&A at Goldman TMT, Evercore Tech, Qatalyst
→ Equity research (tech / semis / biotech)
→ Corporate development / strategy at scale-ups

### Technical fluency + operating / building instinct
→ Growth equity / tech PE
→ Venture capital
→ FinTech product / strategy
→ Operating roles at high-growth startups (eventually → VC)

### Macro / systems / cross-asset interest
→ Macro / multi-strategy hedge fund research
→ Sell-side rates / FX trading
→ Portfolio research at pensions / sovereign wealth

The best move is to identify **which 2-3 paths fit your specific temperament** early, then tailor your internships and preparation accordingly.

---

## The Advantage You Shouldn't Waste

One of the highest-leverage things an engineering student can do: **start learning finance before third year**.

Most Commerce students spent years 1-2 learning accounting and basic finance. An engineer who learns these by year 2 has closed that gap while retaining the technical edge. By year 3, the engineer is differentiated: quant sharpness + finance fluency.

The SGC curriculum you're reading now is precisely this. Members who work through this curriculum + do side research + build a small personal modeling portfolio are the ones who land at Goldman TMT or Evercore or a top quant shop.

---

## Common Objections from Engineers — Rebutted

### "I don't have finance classes"
Most top investors (buy-side and VC) don't either. Finance is learnable in 6-12 months of focused work. Your comparative disadvantage is in accounting, which is learnable in a few months.

### "I can't compete with Commerce students on soft skills"
This is a real but overstated concern. Commerce students are trained on *case interviews*, not on actually understanding businesses. Engineers who invest 2 months in mock interviews and case prep close the gap.

### "I have no investment experience"
Any student can: run a paper portfolio, join SGC, write research, publish a blog, take on a project. The bar for a "finance-adjacent" profile is much lower than most engineers assume.

### "Finance pays less than software"
Partly true for year 1. **Not true by year 3-5.** Top-tier IB associates, Vice Presidents, hedge fund PMs, and growth equity principals dramatically outpace FAANG compensation by mid-career. The upside tail is higher in finance (though also more variable).

### "I'll have to do 80-hour weeks"
True for IB, false for most other paths. Quant trading, asset management, VC, PE at certain firms, and FinTech all have much better hour profiles than IB. Pick your path knowing the tradeoff.

---

## SGC Pro Tips

- **Don't default to just one path.** Most SGC engineers look at quant only. Cast wider — 3-5 paths on your radar in year 1.
- **Build one deep finance project by end of year 2.** Could be an SGC equity research piece, a macro thesis, or a trading model. This is what makes your profile credible.
- **Talk to SGC alumni early.** Year 1-2 members should reach out to SGC members now working in each of these fields. One 15-minute conversation beats 10 hours of googling.
- **Learn Python + Excel + basic accounting before year 3.** Python and Excel you probably have; accounting requires 20-30 hours of focused learning.
- **Apply to 2-3 types of internships in summer 1 and 2.** Don't put all eggs in one basket before you know which path fits.

---

## Summary

Engineering is a strong path into finance — not a detour. Technical credibility, quantitative fluency, systems thinking, and scarcity all work for you. The conventional quant path is one option among many; non-quant paths (tech IB, equity research in technical sectors, growth equity, VC, macro HFs) often suit engineers equally well and offer equal or better long-term compensation. Start building finance fluency early. Cast a wide net in internships. Pick 2-3 paths to explore deeply rather than locking in on one too early.

Next lesson: translating your technical skills to finance interviews.
`,
  },
  {
    title: 'Translating Technical Skills to Finance Interviews',
    slug: 'translating-technical-skills',
    order: 1,
    published: true,
    content: `## The Translation Problem

Engineers often struggle to explain why they're applying to finance. The stories that earned you an A in 4th year ECE don't automatically land in a Goldman TMT interview. The content is there; the translation is the work.

This lesson covers how to frame your engineering background for three target audiences: **investment banking (IB)**, **equity research (ER)**, and **sales & trading (S&T)**.

---

## The Universal Translation Framework

Every story an engineer tells should hit three elements:

### 1. What you built / solved
A specific, technical outcome. Not "worked on a team project" — "built a real-time image segmentation pipeline processing 4K video at 30 FPS."

### 2. The business / financial relevance
How this connects to an analyzable problem in finance. Not "it was cool technology" — "this pipeline is the kind of inference workload driving Nvidia's data-center revenue; understanding the compute economics is exactly what an analyst covering GPUs needs to price."

### 3. The transferable skill
What the experience demonstrates about how you'd perform in the role.

---

## Translating Specific Engineering Experiences

### Coursework / labs → finance relevance

| Course | Translation for IB / ER / S&T |
|---|---|
| Probability & statistics | "I can reason about risk distributions, which is directly relevant to [DCF sensitivity / portfolio risk / options pricing]." |
| Machine learning | "I understand why AI workloads are compute-heavy and why hyperscaler capex is structurally different from prior cycles — directly relevant to TMT coverage." |
| Data structures / algorithms | "I understand the software complexity curve that makes enterprise SaaS consolidation possible — and why certain AI platforms have real moats." |
| Operating systems | "I can evaluate claims about infrastructure advantage critically — which matters for covering hyperscalers and semis." |
| Control systems | "I think about feedback loops, which is how I'd approach monetary policy transmission or market microstructure." |
| Signal processing | "I'm comfortable with noisy time-series data, which is what every market or macro analyst actually works with." |

### Research / capstone projects

Whatever you worked on, identify:
- **The scale** (10M rows of data, 20 TB of ingestion, 4 GPU cluster, 15% error reduction)
- **The methodological discipline** (controlled experiments, ablation studies, sensitivity analyses)
- **The surprise** (what you learned that was non-obvious)

These translate into a research-like mindset — which is what ER, VC, and hedge fund analyst roles specifically look for.

### Internships (if software / research)

**Software internship at a FAANG**:
- Business: "I worked on [product feature] that drives [specific metric]. Understanding how software products are monetized at scale is relevant to covering software companies."
- Technical credibility: "I understand cloud infrastructure economics from the inside."
- Skills: "Collaborative development, reading large codebases, shipping on deadline."

**ML / research internship**:
- Business: "I worked on [model type] which is directly analogous to the workloads driving AI capex at hyperscalers."
- Technical credibility: "I have an informed view on the cost curve of AI — critical for covering or investing in the space."

**Hardware / embedded / systems internship**:
- Business: "Semiconductor and infrastructure covering requires understanding of [specific tech area]."
- Technical credibility: "I can evaluate semiconductor company claims in a way non-engineers cannot."

---

## Framing Your "Why Finance" for Engineers

Most engineers default to: *"I've always been interested in markets"* or *"I want to use my quantitative skills."* Both are weak openers.

### The engineer's "why finance" — stronger template

1. **The engineer's tension** — you've realized that technical capability is amplified by understanding the systems in which it operates (markets, capital, incentives).
2. **The trigger experience** — a specific project, reading, or SGC work where you saw this.
3. **The destination** — the specific role / desk / path, and why it aligns.

### Example

*"I'm a 4th year ECE specializing in machine learning. I spent last summer optimizing inference throughput at a startup, and I kept running into the same question: who decides what workloads justify this compute spend? At a capex level, that decision is being made across data-center investments, earnings calls, and allocation decisions. I joined SGC and wrote an equity research piece on Nvidia's Q4 capex guidance — which was the clearest line from the engineering work I'd been doing to an analyzable business question. I want to cover semiconductors or AI infrastructure at a bank or buy-side shop, because that's where the technical-business bridge is most valuable."*

Notice the arc: engineering specific → tension → SGC proof → role ask. This is the pattern.

---

## Interview-Specific Framing by Role Type

### For Investment Banking (IB)

The interviewer wants: technical credibility + client-ready communication + grit

**Frame technical work as preparation for:**
- Modeling complex businesses
- Understanding technical due diligence in tech M&A
- Working long hours on complex projects

**Key stories to have:**
- A technical project you led / owned
- A time you managed a deadline under pressure
- A business / financial question you've dug into (SGC work is perfect)

### For Equity Research (ER)

The interviewer wants: analytical depth + writing clarity + sector passion

**Frame technical work as preparation for:**
- Evaluating technical claims in management presentations
- Understanding competitive moats in technical industries
- Original research (your ECE research process is directly analogous)

**Key stories to have:**
- A stock pitch (even informal) you've developed
- An SGC piece or personal blog post on a company / sector
- A long-form research / data project from coursework

### For Sales & Trading (S&T)

The interviewer wants: quantitative sharpness + markets view + pressure handling

**Frame technical work as preparation for:**
- Mental math / pricing under pressure
- Complex systems thinking applied to markets
- Quick iteration based on new information

**Key stories to have:**
- A probability / statistics problem you solved cleverly
- A market view with specific instruments and sizing
- A technical project where conditions changed mid-way

---

## The "You're Not a Commerce Major" Question

Almost every engineer gets a version of: *"Why didn't you just do Commerce?"*

### Weak answers
- "I wanted to keep my options open."
- "I was more interested in math/physics/CS at first."
- "I didn't know at the time."

### Strong answer

*"Commerce teaches accounting and basic finance — I can learn those in a few months. ECE teaches how to model complex systems rigorously, and that's the lens I bring. When I look at a software company, I'm not starting from 'how do I read an income statement' — I'm starting from 'what's the unit economics of compute and where does the gross margin actually live.' That's the profile I want to bring to research / banking / S&T."*

The answer reframes "I didn't do Commerce" from a weakness into a specific strength.

---

## The "What Are You Weak On?" Question

Engineers should anticipate specific gaps:

### Likely gaps
- **Accounting fluency** — specifically 3-statement linkages
- **DCF / comps mechanics** — building models from scratch in Excel
- **Industry / sector vocabulary outside your technical domain**
- **Client / communication polish** — for IB especially

### The strong answer structure
*"My weakest area going into this role is [specific gap]. I've addressed it by [specific action taken]. I plan to continue by [specific future action]."*

### Example
*"My weakest area is Excel modeling speed — I'm comfortable with the concepts but slower than a Commerce student who's done 10 LBOs. I've worked through Wall Street Prep's self-study course and built 3 full DCFs from scratch over the last month. My plan is to do one model per week leading up to the internship."*

Specific weakness, specific action, specific plan. Do not list fake weaknesses ("I'm too detail-oriented").

---

## Soft Skills Engineers Should Practice

Engineering culture and finance culture differ in a few ways you should intentionally bridge:

### 1. Speaking in headlines, not walkthroughs
Engineers tend to explain in logical sequence ("first... then... finally..."). Finance culture leads with the punchline.

**Practice:** State your conclusion first, then support it. In every answer.

### 2. Rounding aggressively
Engineers want precision. Finance wants speed + reasonable approximation.

**Practice:** Mental math to 2 significant figures in real time. Don't say "approximately 24.67%" — say "around 25%."

### 3. Reading room / dress codes
Finance interviews have a professional polish that software interviews often don't. Learn the conventions — suit for IB / ER / S&T final rounds, even if less formal now.

### 4. Confident without arrogance
Engineer culture is often humble / technical. Finance rewards confident communication. This doesn't mean bragging — it means making claims clearly.

### 5. Client-readiness
For IB and sales, imagine how you'd present to a CFO. For research, imagine how you'd present to a PM. This framing sharpens your communication.

---

## Resume Positioning

For an engineer applying to finance:

### Section order
1. **Education** (degree + major, GPA if >3.6, any finance / economics coursework listed explicitly)
2. **Experience** (most recent first) — emphasize business-relevant engineering work
3. **SGC / Finance Projects** (dedicated section if you have 2+ items)
4. **Skills** (modeling, Excel, Python, SQL)
5. **Interests / activities** (if meaningful)

### Language adjustments
- "Optimized" → "Built and deployed" / "Reduced" / "Drove"
- "Algorithm" → "Trading logic" / "Decision model" / "Automated process"
- Specific metrics — "increased accuracy by 18%" → business translation when possible

### Key: include a line about finance interest
Often resume scanners discard engineering resumes assuming they're not finance-targeted. A single line in your interests or in your education section — "Active member of St. George Capital, equity research on [specific sectors]" — prevents this.

---

## SGC Pro Tips

- **Rehearse your "why finance" out loud 10 times** before the first interview. Record and listen back.
- **Have 3 pre-built "bridge stories"** — technical project + business relevance + transferable skill. Use them for every question you can.
- **Learn finance vocabulary** proactively. "Operating leverage," "LTV/CAC," "EV/EBITDA," "net debt." You don't need to over-use them, but you need to be fluent.
- **Don't hide your technical background** — lead with it. The technical credibility is your advantage.
- **Rehearse with a Commerce student you trust.** They can tell you when you're explaining something in "engineering terms" that sound obvious to them but technical to a finance interviewer.

---

## Summary

Translating technical skills to finance requires reframing: every engineering story should have a business / financial relevance layer. Frame your "why finance" as the intersection of technical depth and systems understanding — not as a pivot. Have bridge stories ready for each role type (IB, ER, S&T). Anticipate "why not Commerce" and "what's your weakness" with specific, confident answers. Adjust resume language and soft skill habits to match finance culture without losing engineer-specific credibility.

Next lesson: the specific finance skills you need to build.
`,
  },
  {
    title: 'The Finance Skills You Actually Need',
    slug: 'finance-skills-you-need',
    order: 2,
    published: true,
    content: `## The Real Skill Gap

Engineers worry that they "don't know finance." The truth is more specific: there are about 8-12 concrete skills that differentiate a finance-ready candidate from a not-yet-finance-ready one. These are learnable in 2-4 months of focused work.

This lesson lists those skills in order of priority and shows you how to build each.

---

## Tier 1 — The Non-Negotiables (Must Have)

You cannot interview for IB, ER, S&T, or buy-side roles without these.

### Skill 1 — The 3-Statement Financial Model

Can you build an integrated income statement, balance sheet, and cash flow statement in Excel? The three statements must link correctly:

- Net income flows from IS to CFS (top line of operating activities)
- Depreciation adds back in CFS but reduces PP&E (via accumulated depreciation) on BS
- Net income flows to retained earnings on BS
- Cash on BS is the ending balance of the CFS

**How to build this skill (10-20 hours):**
- **Wall Street Prep** (paid, ~$500) or **BIWS Modeling Core** — the industry standard
- **Financial Modeling Prep** — free YouTube channel
- Do 3-5 full models from blank sheets. Do not just follow along.

**Sanity check:** Can you build a 3-statement model on MSFT or GOOGL from their 10-K in 4 hours, without a template? If not, keep practicing.

### Skill 2 — DCF Valuation

Build a DCF from scratch:
- 5-year revenue and margin forecast
- Project FCFF (or FCFE)
- Calculate WACC (CAPM for equity)
- Terminal value (perpetuity growth method)
- Sum and discount, bridge EV → equity value
- Sensitivity on WACC × terminal growth

**How to build this skill (10-15 hours):**
- Same resources as above
- Build at least 3 DCFs on different industries — hyperscaler, consumer, bank (different methodology!)

**Sanity check:** Can you state WACC in plain English and build it from scratch, including how beta and ERP are sourced?

### Skill 3 — Comparable Company Analysis

Build a comps table:
- Select 4-7 peers
- Pull EV/Revenue, EV/EBITDA, P/E, Fwd P/E, revenue growth, margin
- Calculate median / mean
- Compare target company to peer set
- Interpret: is the discount / premium justified?

**How to build this skill (5-10 hours):**
- Use MacroTrends + 10-Ks to pull numbers
- Build 3-5 comps tables across different sectors

### Skill 4 — Reading a 10-K / 10-Q

Not cover-to-cover. Know where to find:

| What you need | Where it is in the 10-K |
|---|---|
| Business description | Item 1 |
| Risk factors | Item 1A |
| MD&A | Item 7 |
| Financial statements | Item 8 |
| Footnotes (segments, revenue recognition, debt) | End of Item 8 |
| Executive compensation | DEF 14A (proxy) |

**How to build this skill:**
- Read 5 10-Ks in companies you're interested in. Mark up what surprises you.

### Skill 5 — Basic Accounting Fluency

Understand:
- Gross margin vs operating margin vs net margin
- Free cash flow (operating CF − capex)
- Working capital (receivables + inventory − payables)
- Enterprise Value (market cap + debt − cash + preferred + minority interest)
- EBITDA, Adjusted EBITDA, FCF (know the differences)
- Accrual vs cash accounting
- Revenue recognition (especially subscription / long-term contract)

**How to build this skill (20-30 hours):**
- Khan Academy Accounting
- Corporate Finance Institute free accounting courses
- "Accounting for Non-Accountants" or similar primer

---

## Tier 2 — Highly Valuable (Differentiators)

These are what separates a solid candidate from a standout.

### Skill 6 — Sector-Specific Fluency

Pick 1-2 sectors and go deep. For an engineer, natural choices:
- Semiconductors (fab dynamics, foundry vs IDM, cycle analysis)
- Software / SaaS (unit economics, retention, rule of 40)
- Internet / consumer tech (network effects, CAC/LTV)
- Cloud / infrastructure (hyperscaler capex cycles)
- Energy transition (LCOE, PPA structures)

**How to build this:**
- Read 3-5 sell-side initiations in your sector (ask an SGC senior for access or find free ones)
- Read all 10-Ks in the top 5-10 companies
- Listen to 3-4 sector earnings calls each quarter

### Skill 7 — LBO Modeling (for PE/IB tracks)

Core components:
- Sources and uses of funds
- Debt schedule (mandatory amortization, cash sweep)
- Returns analysis (MoIC, IRR)
- Sensitivity on purchase multiple and exit multiple

**How to build this (15-20 hours):**
- BIWS Premium LBO course or WSP
- Build 3-5 LBOs on different profiles (stable consumer, growth software, cyclical industrial)

### Skill 8 — Excel Mastery

**Must-know shortcuts:**
- F2 (edit cell), F4 (toggle absolute/relative), F9 (calculate)
- Ctrl + arrow keys (navigate), Ctrl + shift + arrow (select range)
- Alt + E + S + V (paste special values), Alt + H + I (insert)
- INDEX/MATCH (replace VLOOKUP), SUMIFS, CHOOSE, OFFSET for advanced lookups

**Formatting conventions:**
- Blue = input, Black = formula, Green = link to another tab
- Commas and percentages
- No hard-coded numbers inside formulas
- Color code consistently

**Practice target:** 30 WPM on Excel shortcuts. Get to a point where you almost never touch the mouse during modeling.

### Skill 9 — Markets Fluency (for S&T / macro roles)

Know:
- Yield curves (shape, what drives each end)
- Credit spreads and their cyclicality
- FX basics (interest rate parity, carry trade)
- Options basics (calls/puts, implied vol, the Greeks at a high level)
- Major economic indicators (NFP, CPI, ISM, GDP) and the release schedule

**How to build this (ongoing):**
- Read FT or WSJ daily (15 min)
- Bloomberg Markets podcast on the commute
- SGC macro pieces and Our Takes

---

## Tier 3 — Nice to Have (Bonus Points)

### Skill 10 — Python for Finance

Not required for most roles, but a huge differentiator for:
- Quant research and trading
- Data-heavy buy-side analyst roles
- FinTech

**Core libraries:**
- pandas (data manipulation)
- numpy (numerical)
- matplotlib / seaborn (visualization)
- yfinance / alpha_vantage (data fetching)
- scikit-learn (ML)

**Target capability:** can you pull historical price data, compute rolling returns, and build a simple backtest of a trading strategy in 2 hours?

### Skill 11 — SQL

Essential for any role that works with data beyond Excel. Quant, product analytics, FinTech, research all use SQL regularly.

**Target capability:** SELECT, JOIN, window functions, GROUP BY, CTEs.

### Skill 12 — Presentation / Deck Building

For IB / ER especially. Learn:
- PowerPoint shortcuts
- Tombstone / football field / ownership summary slides
- Clean chart formatting
- The "magazine-style" two-column layout

---

## How to Build All of This (the 90-Day Plan)

### Weeks 1-3: Accounting + Excel fundamentals (25 hours)
- Khan Academy or CFI Accounting
- Build 2 basic 3-statement models from scratch

### Weeks 4-6: DCF + Comps (20 hours)
- WSP or BIWS intro modeling
- Build 3 DCFs on different sectors
- Build 2 comps tables

### Weeks 7-9: Deep sector (15 hours)
- Pick 1 sector. Read top 5 10-Ks. Read 2 sell-side initiations. Listen to 4 earnings calls.

### Weeks 10-12: SGC work + interview prep (20 hours)
- Write 1 SGC equity research report
- Practice 30 brainteasers
- 10 mock interviews

### Ongoing: markets fluency (15 min/day)
- FT / Bloomberg / WSJ scan
- One podcast per week

**Total:** ~80 hours over 90 days, roughly 6-8 hours per week. Plus daily markets. This puts you in the top quartile of applicants across all metrics.

---

## What NOT to Prioritize (Common Wastes of Time)

### CFA Level 1
Useful but overrated. For undergrad IB / ER / S&T, a CFA Level 1 pass doesn't meaningfully outweigh a good SGC portfolio + solid modeling skills. Time is better spent on practical work.

### Options pricing derivatives (Black-Scholes PDE)
Useful for quant roles. Not tested in IB / ER / fundamental buy-side interviews.

### Every Excel shortcut
The 15 shortcuts above cover 95% of modeling speed. Don't obsess.

### Reading every finance book
Read 3-5 specific books tied to your interest (e.g., *The Outsiders* for general investing, *Reminiscences of a Stock Operator* for trading, *Genius of the System* for tech investing). More doesn't equal better.

---

## SGC Pro Tips

- **Build a personal modeling portfolio.** 3-5 complete equity models on different companies that you can walk through in an interview. This is often what tips a candidate over the edge.
- **Practice in the actual environment.** If the interview is an Excel modeling test, practice on a laptop with a 15-inch screen, not a 30-inch monitor.
- **Do a mock SGC committee pitch with real members before your first banking interview.** The verbal muscles are different from the technical ones.
- **Separate "understanding" from "speed."** You can understand a DCF in 2 hours. You need 20 hours to build one in 2 hours under pressure.
- **Use SGC resources first.** This curriculum + the library + the MSFT pitch example + previously published work covers 80% of what a finance-ready candidate needs.

---

## Summary

The finance skills gap for engineers is specific and closeable. Tier 1 (3-statement model, DCF, comps, 10-K reading, accounting) is non-negotiable and takes 40-60 hours. Tier 2 (sector fluency, LBO, Excel mastery, markets) differentiates candidates and takes another 30-40 hours. Tier 3 (Python, SQL, presentation) is bonus. A structured 90-day plan — 6-8 hours per week — transforms an engineering student into a credible finance candidate. Skip CFA Level 1, obscure Excel shortcuts, and long unfocused reading lists in favor of practical portfolio building.

Next lesson: recruiting strategy for non-business students.
`,
  },
  {
    title: 'Recruiting Strategy for Non-Business Students',
    slug: 'recruiting-strategy-non-business',
    order: 3,
    published: true,
    content: `## The Recruiting Reality for Engineers

Engineering students applying to finance face a few specific structural disadvantages:

1. **Recruiting pipelines are built around business programs.** OCR (on-campus recruiting) at U Toronto heavily favors Rotman Commerce for traditional finance roles.
2. **Engineering advisors rarely know the finance timeline** — you have to find out yourself.
3. **Your resume is an outlier** — recruiters may need extra context to place you.
4. **Recruiting timelines are earlier than you think** — IB and some HF positions close 18-24 months before the start date.

This lesson covers how to recruit as an engineer targeting non-quant finance roles. (Pure quant recruiting — Jane Street, Citadel, etc. — has its own dynamics, often OCR-parallel for engineering students.)

---

## The Timeline: Know It Cold

### For Summer Internships Starting Summer 2028 (for current second-years)

| Timing | What happens |
|---|---|
| **Year 1 spring / summer** | Start building knowledge + SGC portfolio |
| **Year 2 summer** | Many firms open IB / ER / S&T applications (August-October of year 3) |
| **Year 2 fall** | Apply, interview. Many offers extended Nov-Jan of year 3. |
| **Year 3 spring / summer** | Summer internship |
| **Year 3 fall** | Full-time return offer extended |
| **Year 4** | Some year 4 recruiting for students without returns, usually smaller firms |

**Key dates to know (U Toronto):**
- Goldman, Morgan Stanley, JPM, BMO CM, RBC CM, etc. typically post applications in **late August through September** of your junior year (i.e., year 3 undergrad, or year 4 for ECE).
- Engineering-heavy firms (DRW, Jane Street, Citadel Securities, Optiver) often recruit year-round but have fall deadlines too.

**Canadian program note:** U Toronto ECE / Eng Sci / CS programs are 4 years. The finance recruiting cycle treats you as a third-year for junior internships. If you're doing PEY (professional experience year / co-op), align your finance internship with third-year summer.

---

## The Three-Phase Engineer Strategy

### Phase 1 (Year 1-2): Build the Profile

Goal: enter junior year recruiting with a resume that survives the first screen.

**Actions:**
- Join SGC year 1 or 2
- Complete the SGC curriculum (this course + equity research + our take)
- Build 2-3 finance projects (an equity research piece, a macro piece, a personal trading portfolio with rationale)
- Take 1-2 finance / economics courses as electives
- Attend campus finance events even if you don't need to
- Build a network list — 20 SGC alumni working in relevant areas

### Phase 2 (Early Year 3 / Junior Year): Apply Aggressively

Goal: generate interviews across target firms.

**Actions:**
- Apply to 30-50 firms. Engineers need quantity because some recruiters will skip engineering resumes.
- Leverage SGC network — ask for referrals from alumni at your target firms
- Target firms that specifically value engineers: GS TMT, MS Tech, Evercore Tech, Qatalyst, BMO Tech, RBC TMT, and on the buy-side / prop side: Citadel, Jane Street, DRW, Two Sigma, Balyasny
- Apply to 2-3 "stretch" firms (GS, MS, Evercore), 2-3 "core" firms (BMO, RBC, TD, CIBC, Scotia), 2-3 "insurance" firms (boutiques)

### Phase 3 (Junior Year Summer): Convert the Internship

Goal: get a return offer.

**Actions:**
- Be early, be late, be unfailingly responsive
- Build 2-3 internal allies (mid-level associates / VPs)
- Ask for extra work when slow
- Get explicit feedback mid-internship — "what can I improve?"
- Make sure seniors know you want the return

---

## Networking: The Disproportionate Lever

For engineers, networking is *more* important than it is for Commerce students. Three reasons:

1. **Your resume is non-standard** — a warm intro gives the recruiter context.
2. **Finance culture values relationships** — a coffee chat is not a waste of anyone's time.
3. **SGC network is under-leveraged** — most SGC alumni will respond to a well-written outreach email.

### The networking system

**Target:** 30-50 informational conversations across year 2 and early year 3.

### How to find contacts
- **SGC alumni** — ask current seniors for intros
- **LinkedIn** — filter "U Toronto" + "Goldman Sachs / MS / Evercore / etc."
- **Blackbird / Junket / equivalent** — specialized finance networking platforms
- **Campus events** — note attendees, follow up 1-2 weeks later
- **Friends of friends** — asking "do you know anyone who does X" to everyone in your network

### The cold email template

> **Subject:** U Toronto ECE student — interested in [TMT at Goldman]
>
> Hi [Name],
>
> I'm a [year] Engineering Science / ECE / CS student at U Toronto and a member of St. George Capital's equity research team. I've been working on a thesis on [specific topic — e.g., hyperscaler capex vs monetization] and have been researching how this intersects with sell-side TMT coverage.
>
> I saw you worked on [specific deal / area] at Goldman and would genuinely value 15 minutes to learn about your path and the TMT group's current focus. I'm flexible on your schedule and happy to do Zoom or phone.
>
> For context, I've attached my resume and a short summary of my recent research.
>
> Thank you for considering,
> [Name]

### Why this works
- Specific to the person (deal / area they worked on)
- Shows you've done research (SGC, specific thesis)
- Asks for a reasonable ask (15 min)
- Signal of seriousness (attached work product)

**Response rate:** typical 20-35% with well-targeted lists. Much higher through warm intros (60-80%).

### After the call
- Thank-you email within 24 hours
- Follow-up every 2-3 months with a brief, specific update
- Before application season: "I'm applying to [firm]. Any advice on the process?" — this is when the network pays off.

---

## Application Materials

### Resume — specific adjustments for engineers

1. **One-line objective or headline at top**: "Fourth-year ECE at U Toronto; equity research focus on semiconductors / AI infrastructure at SGC"
2. **Education** — if you have finance / econ / accounting coursework, *list it explicitly* ("Advanced Financial Accounting, Financial Markets")
3. **Experience** — emphasize business-relevant work; translate technical achievements into business impact
4. **Finance / SGC section** — dedicated section if you have 2+ items. Include the title of research / project + a one-line description.
5. **Skills** — modeling (Excel), Python, SQL. Don't over-list (skip "Microsoft Word").

### Cover letter (when required)

Most US finance applications don't require a cover letter. Canadian banks and some boutiques do.

Keep it to 3 paragraphs:
1. Why this firm specifically (reference a recent deal / research / person you've spoken with)
2. Why you (technical + finance translation)
3. Closing + availability

---

## The Interview Sequence

### HireVue / first-round recorded video
Practice ahead of time:
- "Walk me through your resume"
- "Why [role / firm]?"
- "Tell me about a time..." (have 4-5 STAR stories ready)
- "Any questions?"

Film yourself. Review. Adjust. Tone is everything — confident, not rushed, not monotone.

### Phone / video technical + fit (first round)
Expect:
- "Walk me through your resume" (90 seconds)
- "Why [role / firm / group]?" (60-90 seconds)
- 1-2 technical questions appropriate to the role
- "Any questions for me?" (prepare 5, ask 2)

### Superday (typically on-site, 4-5 back-to-back interviews)
Expect:
- Technical modeling or brainteaser round
- Behavioral
- Stock pitch (for ER / buy-side), trade idea (for S&T)
- Senior / partner fit

### Decisions
- Offers usually within 2-10 days of superday
- "We'll get back to you" without a timeline is usually a rejection
- If you haven't heard in 3 weeks, one polite follow-up is fine

---

## The Internship — Converting to Return Offer

### The 80/20 of internship success
- **Reliability:** do what you said, when you said you'd do it
- **Quality:** clean work, few revisions needed
- **Visibility:** seniors know who you are and what you're working on
- **Fit:** people want to spend time with you
- **Grit:** first in, last out, visible without performative

### What kills return offers
- **Missing deadlines** (once is recoverable, twice is not)
- **Sloppy work** in models or write-ups
- **Invisibility** — people can't remember your name at review time
- **Poor communication** — "I'm confused" is ok; being silent and confused is not
- **Fit issues** — arrogance, disrespect, mixing up the hierarchy

### Mid-internship conversations
Ask for explicit feedback at the 3-4 week mark. *"What would you want me to do differently for the back half?"* Most summer analysts don't ask. The ones who do are remembered as hungry.

---

## The Canadian Context for Engineers

### OCR at U Toronto
- **Engineering Career Centre** doesn't host finance recruiting (Rotman Commerce does)
- You can often attend Commerce recruiting events if you show up
- Some firms have engineering-specific tracks (e.g., GS Strats, MS Quant)

### Canadian banks vs US BBs
- **Canadian banks** (RBC, TD, BMO, CIBC, Scotia) are more accessible for engineering students — they have more year-round hiring and less "brand" recruiting bias
- **US BBs in Toronto** are smaller groups; more competitive
- **US BBs recruiting Canadians for NY / London** are competitive and typically prefer candidates who have a US BB internship on their resume

### The Toronto to NY move
Common path:
- 2 years at a Toronto BB / Canadian bank
- Move to NY after the Analyst program
- Lateral opportunities at mid-senior level

For engineers interested in working abroad eventually, this is usually a cleaner path than applying directly to NY from U Toronto.

---

## SGC Pro Tips

- **Start networking in year 2, not year 3.** By the time you're applying, you should have 30-50 warm contacts.
- **Apply to 50 firms minimum.** Engineering resumes get filtered more than you realize.
- **Use SGC as your anchor credential.** "I wrote a piece for SGC on [topic]" — if you've done the work, this is a credibility lever that Commerce students don't always have.
- **Attend Commerce recruiting events.** Most firms don't check your program affiliation at the event door.
- **Don't accept the first offer unless it's clearly the top choice.** Once you have one, the next offer negotiation usually improves.

---

## Summary

Recruiting for non-business engineering students requires: earlier awareness of the timeline, more deliberate profile building, heavier networking than Commerce peers, and volume in applications. Build the profile year 1-2 (SGC, modeling, 2-3 projects), apply aggressively year 3, convert the internship. Network 30-50 coffee chats. Cold email works with specificity and warmth. Tailor resume explicitly to show finance interest. Canadian banks are accessible starting points; US BBs are competitive but beatable with preparation. Your engineering background is an asset if framed correctly — stop apologizing for not being a Commerce major.

Next lesson: your first year on the desk — what engineers find easier and harder.
`,
  },
  {
    title: 'Your First Year on the Desk — What Engineers Find Easier and Harder',
    slug: 'first-year-on-desk',
    order: 4,
    published: true,
    content: `## The Transition In

You've landed the offer. Now what? Engineers often find the transition into a finance team both easier and harder than expected — in specific ways. This lesson is about what to expect in your first 6-12 months and how to accelerate your ramp.

---

## What Engineers Find Easier

### 1. Technical modeling
You've been solving quantitative problems for years. A 3-statement model is small compared to a numerical methods project or a distributed systems design. Your modeling should ramp fast.

### 2. Working long hours under pressure
If you survived engineering labs and exam season, 80-hour IB weeks are manageable. The hours hurt, but the hours themselves don't shock you.

### 3. Reading complex technical disclosures
10-Ks for tech, semis, or biotech companies include technical details that non-engineers skim. You read them directly. This becomes an edge in discussions about the company's actual product or science.

### 4. Debugging and error-catching
Models break. Decks have formatting errors. Engineers are trained to debug systematically — look for the error, isolate the cause, fix the root issue. This makes you valuable early because you can fix other people's work.

### 5. Building tools
If you're in a role that allows it, you can automate repetitive work — macros, scripts for data pulls, dashboards. Juniors who build tools become known.

---

## What Engineers Find Harder

### 1. Office politics and social dynamics
Engineering cohorts are often flat socially. Finance hierarchies are *explicit* and matter. Senior associates, VPs, directors, and MDs have specific authority, specific deference owed, specific ways to handle conflict. This takes months to internalize.

**Specific patterns:**
- You don't "correct" a VP on a point in front of an MD. You raise it privately later.
- Credit flows up: you can't openly take credit for what your team did.
- Some things are said that you don't challenge, even if you disagree.

### 2. Ambiguity of "good work"
Engineering feedback is often binary (it compiles, it works, the test passes). Finance feedback is subjective and expectation-dependent — "this analysis is solid but the narrative doesn't land." Calibrating to senior preferences takes 3-6 months.

### 3. Client-facing communication
Clients, senior bankers, and external counterparties have their own style. Being too technical, too blunt, or too question-heavy can erode trust. Polished professional communication is a skill you'll build over months.

### 4. Time management across parallel work
Engineering project pace is typically 1-2 weeks per milestone. Banking / trading can have 6 parallel workstreams with different senior owners, all wanting updates. The context-switching cost is high. Engineers with deep-focus instincts often struggle with this until they adjust.

### 5. Presentation / deck polish
Engineering decks are typically dense and text-heavy. Finance decks are visual, punchy, and story-driven. Learning to think in slides and tight bullets is a specific skill — most engineers rewrite 3-5 iterations of their first deck.

---

## The First 30 Days

Focus areas:

### Learn the team's rhythm
- What time do most people arrive / leave?
- When are status updates expected?
- Who reviews what? Who formally does what?
- What's the communication norm — email, chat, in-person?

### Set up your tools
- Bloomberg / FactSet / CapIQ / PitchBook — get trained
- Excel and PowerPoint — practice shortcuts. Goal: never touch the mouse.
- Internal document systems (SharePoint, Drive, etc.)
- Learn the firm's model templates

### Learn the vocabulary
Every firm has internal slang. Your desk has specific terms. Listen carefully — in the first 2 weeks, ask "what does X mean" freely. After month 1, you should be using the terms yourself.

### Build allies
Find 2-3 mid-level colleagues (associates, VPs) who seem approachable and aligned. They will answer questions the MDs won't have time for, and they will advocate for you in review season.

---

## The First 3-6 Months

### Build your model / ideas portfolio
By month 3, you should be able to build any standard model on your desk end-to-end. By month 6, you should have started contributing original ideas / observations to your seniors.

### Understand the politics
Who works well with whom? Where are the tensions? Who is the rising MD, and who is plateaued? Where are the allocation battles?

You don't need to play politics. You need to *understand* them, so you don't accidentally stumble.

### Get specific feedback
Around month 3, ask each of your direct supervisors: *"What's the single thing I could improve in the next 3 months?"*

Most junior analysts get generic feedback at formal review. Specific feedback at month 3 is actionable and shows hunger.

### Start developing a view
By month 6, you should have opinions — on the companies you cover, the deals you're staffed on, the markets you trade. Opinions don't need to be shared constantly; they need to exist. The best mentees develop their own perspective alongside their work.

---

## The First Year

By the end of the year, you should:

- Be able to operate independently on standard workstreams
- Have a defensible view on at least one sector / strategy
- Have 3-5 senior advocates internally
- Know where you want to go next (stay, lateral, buy-side)

---

## How to Accelerate Your Ramp

### 1. Keep a daily log
5 minutes at end of day: what I learned, what confused me, what I want to fix tomorrow. Within a month you'll see patterns in your gaps.

### 2. Study the MD / senior VP you admire
What do they do differently? How do they open conversations? How do they handle disagreement? How do they use their time?

### 3. Own a recurring deliverable
Every team has recurring work — weekly updates, market recaps, sector trackers. Volunteer to own one. This builds a visible track record.

### 4. Read above your level
Read what associates and VPs read. Subscribe to trade publications. Listen to senior-facing podcasts. Absorb the vocabulary and framing of 2-3 levels above you.

### 5. Build one tool / automation
If you can save your team 3 hours a week with a macro or script, you're known as the engineer who adds leverage.

---

## The Hybrid Engineer Identity

One of the strongest career moves for engineers on the desk is leaning *into* your technical background, not away from it.

### Engineer-flavored edges
- **The technical diligence analyst:** known for digging into product specs, patents, science, or code
- **The automation analyst:** builds tools that save the team time
- **The quant-flavored analyst:** runs regressions, backtests, data analysis on company or market data
- **The systems analyst:** sees the broader system in a business — how incentives, technology, and capital create competitive dynamics

These identities are valued *because* engineers are rare on most finance teams. Don't hide your background.

---

## Exit Opportunity Landscape (End of Year 2)

For engineers in particular, good exit opportunities after 2 years:

### From IB (TMT / Tech M&A)
- Growth equity (Vista, Silver Lake, Thoma Bravo, General Atlantic)
- Venture capital (especially growth-stage firms)
- Tech hedge funds (Tiger, Coatue, Lone Pine, Citadel GQS, Point72 Cubist)
- Corp dev at a hyperscaler or high-growth tech company
- Operating role at a scaled startup (CFO track)

### From ER (Tech / Semis / Biotech)
- Buy-side analyst at a long-only (Fidelity, T. Rowe Price, Dodge & Cox)
- Hedge fund analyst (sector or generalist)
- Venture capital
- Research at a tech company

### From S&T
- Hedge fund PM (systematic or discretionary)
- Portfolio management at asset manager
- Quant market-making firms (Citadel Securities, Jane Street, Virtu)
- Fintech roles
- Sell-side lateral (move to better desk / firm)

### From Quant Research / Trading
- Stay and specialize
- Move to a more concentrated hedge fund (higher comp, higher risk)
- Research at a crypto / blockchain firm
- Academic research or PhD

### From Growth Equity / VC
- Stay and build partner track
- Start a company (common)
- Move to a hedge fund
- Move to operating role at a portfolio company

The engineer-origin path preserves optionality well — most of these exits actively value the technical background.

---

## SGC Pro Tips

- **The first 3 months determine the next 3 years.** Reputation sticks. Be over-prepared, over-reliable, and over-communicative early.
- **Find a senior mentor in the first 60 days.** A 30-minute monthly coffee with a VP or Director has massive compound value.
- **Track your work.** Every deal, report, model, or trade you've touched. When review / exit time comes, you'll be glad you did.
- **Don't over-optimize for year-1 comp.** The seat and the trajectory matter much more than bonus 1 vs bonus 2.
- **Stay in touch with SGC.** Future SGC members will be your analysts. Current SGC members will be your peers. SGC is a decades-long network.

---

## Summary

Engineers find some parts of the first year on the desk easier (technical modeling, long hours, debugging, complex disclosures) and some harder (office politics, ambiguity, client communication, context-switching, deck polish). The first 30 days are about learning the rhythm, tools, and vocabulary. The first 3-6 months are about building allies, getting specific feedback, and developing your own view. The first year closes with operational independence, a defensible sector view, senior advocates, and clarity on the next step. Lean into — don't hide — your engineering background. Exit opportunities after 2 years are strong for tech-oriented engineers across growth equity, VC, hedge funds, and corporate roles. Track your work, find mentors, and stay in touch with SGC.

That completes the Finance for Engineers course — and this entire SGC curriculum series on career paths. Everything you've learned here (idea generation, the SGC framework, writing the research report, pitching, the Our Take, strategy documents, S&T, engineering transitions) is meant to be used together. Use it, publish, contribute, and pay it forward for the next cohort.
`,
  },
];

// ---------------------------------------------------------------------------
// MAIN SEED FUNCTION
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding SGC Learning Hub...\n');

  // ── Curated Resources ───────────────────────────────────────────────────
  console.log('📚 Seeding curated resources...');
  for (const item of curatedItems) {
    await prisma.learningCuratedItem.upsert({
      where: { id: item.title + '_placeholder' }, // upsert by creating won't work with this; use createMany
      update: {},
      create: item,
    });
  }
  // Actually use createMany with skipDuplicates isn't possible since no unique key on title
  // Delete and recreate
  await prisma.learningCuratedItem.deleteMany();
  await prisma.learningCuratedItem.createMany({ data: curatedItems });
  console.log(`   ✓ ${curatedItems.length} curated resources created`);

  // ── Course 1: Options Foundations ───────────────────────────────────────
  console.log('\n🎓 Creating course: Options Foundations...');
  const existing1 = await prisma.learningCourse.findUnique({ where: { slug: optionsCourse.slug } });
  if (existing1) {
    await prisma.learningCourse.delete({ where: { slug: optionsCourse.slug } });
  }
  const course1 = await prisma.learningCourse.create({ data: optionsCourse });
  for (const lesson of optionsLessons) {
    await prisma.learningLesson.create({
      data: { ...lesson, courseId: course1.id },
    });
  }
  console.log(`   ✓ ${optionsLessons.length} lessons created`);

  // ── Course 2: Equity Investing Fundamentals ─────────────────────────────
  console.log('\n📈 Creating course: Equity Investing Fundamentals...');
  const existing2 = await prisma.learningCourse.findUnique({ where: { slug: equityCourse.slug } });
  if (existing2) {
    await prisma.learningCourse.delete({ where: { slug: equityCourse.slug } });
  }
  const course2 = await prisma.learningCourse.create({ data: equityCourse });
  for (const lesson of equityLessons) {
    await prisma.learningLesson.create({
      data: { ...lesson, courseId: course2.id },
    });
  }
  console.log(`   ✓ ${equityLessons.length} lessons created`);

  // ── Course 3: Fixed Income & Bonds ─────────────────────────────────────
  console.log('\n📊 Creating course: Fixed Income & Bonds...');
  const existing3 = await prisma.learningCourse.findUnique({ where: { slug: bondsCourse.slug } });
  if (existing3) await prisma.learningCourse.delete({ where: { slug: bondsCourse.slug } });
  const course3 = await prisma.learningCourse.create({ data: bondsCourse });
  for (const lesson of bondsLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course3.id } });
  }
  console.log(`   ✓ ${bondsLessons.length} lessons created`);

  // ── Course 4: Foreign Exchange ──────────────────────────────────────────
  console.log('\n💱 Creating course: Foreign Exchange (FX)...');
  const existing4 = await prisma.learningCourse.findUnique({ where: { slug: fxCourse.slug } });
  if (existing4) await prisma.learningCourse.delete({ where: { slug: fxCourse.slug } });
  const course4 = await prisma.learningCourse.create({ data: fxCourse });
  for (const lesson of fxLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course4.id } });
  }
  console.log(`   ✓ ${fxLessons.length} lessons created`);

  // ── Course 5: Trading & Market Mechanics ────────────────────────────────
  console.log('\n⚡ Creating course: Trading & Market Mechanics...');
  const existing5 = await prisma.learningCourse.findUnique({ where: { slug: tradingCourse.slug } });
  if (existing5) await prisma.learningCourse.delete({ where: { slug: tradingCourse.slug } });
  const course5 = await prisma.learningCourse.create({ data: tradingCourse });
  for (const lesson of tradingLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course5.id } });
  }
  console.log(`   ✓ ${tradingLessons.length} lessons created`);

  // ── Course 6: Macro Investing ───────────────────────────────────────────
  console.log('\n🌍 Creating course: Macro Investing...');
  const existing6 = await prisma.learningCourse.findUnique({ where: { slug: macroCourse.slug } });
  if (existing6) await prisma.learningCourse.delete({ where: { slug: macroCourse.slug } });
  const course6 = await prisma.learningCourse.create({ data: macroCourse });
  for (const lesson of macroLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course6.id } });
  }
  console.log(`   ✓ ${macroLessons.length} lessons created`);

  // ── Course 7: SGC Stock Selection Framework ────────────────────────────
  console.log('\n🎯 Creating course: The SGC Stock Selection Framework...');
  const existing7 = await prisma.learningCourse.findUnique({ where: { slug: sgcFrameworkCourse.slug } });
  if (existing7) await prisma.learningCourse.delete({ where: { slug: sgcFrameworkCourse.slug } });
  const course7 = await prisma.learningCourse.create({ data: sgcFrameworkCourse });
  for (const lesson of sgcFrameworkLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course7.id } });
  }
  console.log(`   ✓ ${sgcFrameworkLessons.length} lessons created`);

  // ── Course 8: Writing an SGC Equity Research Report ────────────────────
  console.log('\n📝 Creating course: Writing an SGC Equity Research Report...');
  const existing8 = await prisma.learningCourse.findUnique({ where: { slug: sgcReportCourse.slug } });
  if (existing8) await prisma.learningCourse.delete({ where: { slug: sgcReportCourse.slug } });
  const course8 = await prisma.learningCourse.create({ data: sgcReportCourse });
  for (const lesson of sgcReportLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course8.id } });
  }
  console.log(`   ✓ ${sgcReportLessons.length} lessons created`);

  // ── Course 9: The 5-Minute SGC Stock Pitch ─────────────────────────────
  console.log('\n🎤 Creating course: The 5-Minute SGC Stock Pitch...');
  const existing9 = await prisma.learningCourse.findUnique({ where: { slug: sgcPitchCourse.slug } });
  if (existing9) await prisma.learningCourse.delete({ where: { slug: sgcPitchCourse.slug } });
  const course9 = await prisma.learningCourse.create({ data: sgcPitchCourse });
  for (const lesson of sgcPitchLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course9.id } });
  }
  console.log(`   ✓ ${sgcPitchLessons.length} lessons created`);

  // ── Course 10: Writing an SGC "Our Take" ───────────────────────────────
  console.log('\n📰 Creating course: Writing an SGC "Our Take"...');
  const existing10 = await prisma.learningCourse.findUnique({ where: { slug: sgcOurTakeCourse.slug } });
  if (existing10) await prisma.learningCourse.delete({ where: { slug: sgcOurTakeCourse.slug } });
  const course10 = await prisma.learningCourse.create({ data: sgcOurTakeCourse });
  for (const lesson of sgcOurTakeLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course10.id } });
  }
  console.log(`   ✓ ${sgcOurTakeLessons.length} lessons created`);

  // ── Course 11: Writing an SGC Investment Strategy ──────────────────────
  console.log('\n📊 Creating course: Writing an SGC Investment Strategy...');
  const existing11 = await prisma.learningCourse.findUnique({ where: { slug: sgcStrategyCourse.slug } });
  if (existing11) await prisma.learningCourse.delete({ where: { slug: sgcStrategyCourse.slug } });
  const course11 = await prisma.learningCourse.create({ data: sgcStrategyCourse });
  for (const lesson of sgcStrategyLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course11.id } });
  }
  console.log(`   ✓ ${sgcStrategyLessons.length} lessons created`);

  // ── Course 12: Sales & Trading Primer for SGC ──────────────────────────
  console.log('\n💼 Creating course: Sales & Trading Primer (for SGC Members)...');
  const existing12 = await prisma.learningCourse.findUnique({ where: { slug: sgcSalesTradingCourse.slug } });
  if (existing12) await prisma.learningCourse.delete({ where: { slug: sgcSalesTradingCourse.slug } });
  const course12 = await prisma.learningCourse.create({ data: sgcSalesTradingCourse });
  for (const lesson of sgcSalesTradingLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course12.id } });
  }
  console.log(`   ✓ ${sgcSalesTradingLessons.length} lessons created`);

  // ── Course 13: Finance for Engineers ───────────────────────────────────
  console.log('\n🛠️  Creating course: Finance for Engineers (SGC Transition Track)...');
  const existing13 = await prisma.learningCourse.findUnique({ where: { slug: sgcEngineersCourse.slug } });
  if (existing13) await prisma.learningCourse.delete({ where: { slug: sgcEngineersCourse.slug } });
  const course13 = await prisma.learningCourse.create({ data: sgcEngineersCourse });
  for (const lesson of sgcEngineersLessons) {
    await prisma.learningLesson.create({ data: { ...lesson, courseId: course13.id } });
  }
  console.log(`   ✓ ${sgcEngineersLessons.length} lessons created`);

  const totalLessons =
    optionsLessons.length +
    equityLessons.length +
    bondsLessons.length +
    fxLessons.length +
    tradingLessons.length +
    macroLessons.length +
    sgcFrameworkLessons.length +
    sgcReportLessons.length +
    sgcPitchLessons.length +
    sgcOurTakeLessons.length +
    sgcStrategyLessons.length +
    sgcSalesTradingLessons.length +
    sgcEngineersLessons.length;

  console.log('\n✅ Seed complete!');
  console.log(`   - ${curatedItems.length} curated resources (books, newsletters, YouTube, podcasts, research, career)`);
  console.log(`   - 13 courses (6 markets fundamentals + 5 SGC house-style + S&T + Engineers track)`);
  console.log(`   - ${totalLessons} lessons`);
  console.log('\nVisit /learn to see the content (must be logged in).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
