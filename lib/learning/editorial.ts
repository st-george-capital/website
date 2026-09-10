/** Exact-match corrections to legacy seed copy. Author-edited wording is preserved.
 * Applied to API responses and server readers so the editor previews the same text.
 * Database records are only changed by the existing explicit save action.
 */
const corrections: [string, string][] = [
  [
    "A **call** gives the buyer the right to **buy** 100 shares of the underlying stock at the **strike price** before expiration.",
    "A **call** gives its buyer the right to buy the underlying asset at the strike price. In the standard US equity-option examples here, one contract represents 100 shares. American-style options can be exercised before expiry; European-style options can be exercised only at expiry. Adjusted contracts and other products can have different deliverables.",
  ],
  [
    "A **put** gives the buyer the right to **sell** 100 shares at the strike price before expiration.",
    "A **put** gives its buyer the right to sell the underlying asset at the strike price, subject to the contract’s exercise and settlement terms. These examples use standard 100-share US equity contracts.",
  ],
  [
    "- Options are contracts on 100 shares (in US markets)",
    "- Standard US equity options usually cover 100 shares; check the multiplier, deliverable and settlement terms for the specific contract.",
  ],
  [
    "- Options expire — time works *against* buyers and *for* sellers",
    "- Time decay typically reduces an option’s time value, all else equal. It does not guarantee a seller’s profit: price moves, volatility and assignment can dominate.",
  ],
  [
    "The **premium** is the price you pay (or receive) for an option contract. It's quoted per share, and since each contract covers 100 shares, multiply by 100 for the total cost.",
    "For the standard equity contracts in this course, premium is quoted per share. Multiply the quote by the 100-share contract multiplier and the number of contracts, then include fees. Check the actual multiplier for adjusted or other option contracts.",
  ],
  [
    "These two strategies are the starting point for most options income approaches. They're defined-risk, conservative, and used by professional and retail traders alike.",
    "Covered calls and cash-secured puts exchange some potential upside for premium while retaining substantial downside exposure. A covered call can lose most of the stock investment; a cash-secured put can lose nearly the strike price less premium per share if the stock falls to zero. Cash collateral does not make a put economically low-risk. See the [Options Industry Council’s covered-call explanation](https://www.optionseducation.org/strategies/all-strategies/covered-call-buy-write).",
  ],
  [
    "When you sell an option, you're collecting that extrinsic value. Time works in your favor — every day that passes, the option you sold loses value (all else equal), and you profit.",
    "An option seller may benefit from time decay, all else equal. That sensitivity is not the same as realized profit: changes in the underlying, implied volatility, rates and assignment can overwhelm the decay.",
  ],
  [
    "The **foreign exchange market (FX or Forex)** is the global marketplace for buying and selling currencies. With approximately **$7.5 trillion in daily volume**, it dwarfs all stock exchanges combined (NYSE + NASDAQ: ~$25 billion/day).",
    "The **foreign exchange market (FX or Forex)** is the global marketplace for exchanging currencies. The [BIS April 2025 survey](https://www.bis.org/publications/202509-commentary-otc-derivatives) measured average daily OTC FX turnover of approximately **$9.6 trillion**. This is a dated survey measure, not a live daily figure; comparisons with other markets require consistent definitions.",
  ],
];
export function reviewedContent(content: string) {
  return corrections.reduce(
    (text, [before, after]) => text.split(before).join(after),
    content,
  );
}
export function reviewedCourse<
  T extends { slug: string; summary: string; lessons?: { content?: string }[] },
>(course: T): T {
  return {
    ...course,
    summary:
      course.slug === "foreign-exchange-fx"
        ? course.summary.replace(
            "The world's largest financial market — $7.5 trillion traded daily.",
            "Understand global currency markets from the quote to the portfolio.",
          )
        : course.summary,
    ...(course.lessons
      ? {
          lessons: course.lessons.map((l) => ({
            ...l,
            ...(typeof l.content === "string"
              ? { content: reviewedContent(l.content) }
              : {}),
          })),
        }
      : {}),
  };
}
