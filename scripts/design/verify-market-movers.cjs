const assert = require("node:assert/strict");
const Module = require("node:module");
require("sucrase/register/ts");
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === "next/cache") return { unstable_cache: (fn) => fn };
  if (name === "@/lib/alpha-vantage") return {};
  if (name === "@/lib/market-data/fmp-quotes") return {};
  return original.call(this, name, ...args);
};
const {
  parseMoverCompany,
  filterMarketMovers,
  fillMoverList,
  shouldCacheFilteredMovers,
} = require("../../lib/market-data/movers.ts");
Module._load = original;
(async () => {
  const profile = {
    Symbol: "BIG",
    Currency: "USD",
    Name: "Big Company",
    MarketCapitalization: "1000000000",
  };
  assert.equal(parseMoverCompany(profile, "BIG").marketCap, 1e9);
  assert.equal(parseMoverCompany({ ...profile, Currency: "" }, "big").name, "Big Company");
  for (const change of [
    { Currency: "CAD" },
    { Symbol: "OTHER" },
    { Name: "" },
    { MarketCapitalization: "None" },
    { MarketCapitalization: "Infinity" },
    { MarketCapitalization: "0" },
  ])
    assert.equal(parseMoverCompany({ ...profile, ...change }, "BIG"), null);
  const row = (ticker) => ({
    ticker,
    price: 10,
    volume: 100,
    changeAmount: 1,
    changePercentage: 10,
  });
  const movers = {
    metadata: null,
    lastUpdated: "test",
    topGainers: ["SMALL", "BIG", "UNKNOWN"].map(row),
    topLosers: ["BIG", "FAIL"].map(row),
    mostActivelyTraded: ["BIGGER", "BIG", "SMALL"].map(row),
  };
  const calls = [];
  const result = await filterMarketMovers(movers, async (ticker) => {
    calls.push(ticker);
    if (ticker === "FAIL") throw Error("unavailable");
    if (ticker === "UNKNOWN") return null;
    return {
      name: ticker + " Company",
      marketCap:
        ticker === "SMALL" ? 4.9e9 : ticker === "BIGGER" ? 8e9 : 5e9,
    };
  });
  assert.deepEqual(
    result.topGainers.map((r) => r.ticker),
    ["BIG"],
  );
  assert.deepEqual(
    result.topLosers.map((r) => r.ticker),
    ["BIG"],
  );
  assert.deepEqual(
    result.mostActivelyTraded.map((r) => r.ticker),
    ["BIGGER", "BIG"],
  );
  assert.equal(result.topGainers[0].name, "BIG Company");
  assert.equal(calls.length, 5, "Fetch each company once across tabs");
  assert.equal(result.coverageIncomplete, true);
  assert.equal(shouldCacheFilteredMovers(result), true);
  const expired = await filterMarketMovers(
    movers,
    async () => {
      throw Error("must not run");
    },
    0,
  );
  assert.equal(expired.topGainers.length, 0);
  assert.equal(expired.coverageIncomplete, true);
  assert.equal(shouldCacheFilteredMovers(expired), false);
  const filled = fillMoverList(
    result.topGainers,
    [
      {
        ticker: "NVDA",
        name: "NVIDIA",
        marketCap: 3e12,
        price: 120,
        volume: 50,
        changeAmount: 4,
        changePercentage: 3,
      },
      {
        ticker: "BIG",
        name: "Duplicate",
        marketCap: 3e12,
        price: 10,
        volume: 90,
        changeAmount: 1,
        changePercentage: 2,
      },
    ],
    (a, b) => (b.changePercentage || 0) - (a.changePercentage || 0),
  );
  assert.deepEqual(
    filled.map((r) => r.ticker),
    ["BIG", "NVDA"],
  );
  const ten = fillMoverList(
    [],
    Array.from({ length: 12 }, (_, i) => ({
      ticker: "T" + i,
      name: "Company " + i,
      marketCap: 5e9 + i,
      price: 10,
      volume: 100 - i,
      changeAmount: 1,
      changePercentage: 5 - i,
    })),
    (a, b) => (b.volume || 0) - (a.volume || 0),
  );
  assert.equal(ten.length, 10);
  assert.equal(ten[0].ticker, "T0");
  const {
    quoteToMover,
    yahooChartToMover,
    FMP_STAGGER_MS,
    YAHOO_STAGGER_MS,
  } = require("../../lib/market-data/fmp-quotes.ts");
  assert.ok(FMP_STAGGER_MS >= 1000, "FMP quotes must be spaced to stay under rate limits");
  assert.ok(YAHOO_STAGGER_MS >= 200, "Yahoo quotes must be spaced to stay under rate limits");
  assert.equal(
    quoteToMover({
      symbol: "MSFT",
      name: "Microsoft",
      marketCap: 3e12,
      changePercentage: 1.5,
      volume: 20,
    }).changePercentage,
    1.5,
  );
  const yahoo = yahooChartToMover({
    symbol: "aapl",
    shortName: "Apple Inc.",
    regularMarketPrice: 324.29,
    chartPreviousClose: 324.96,
    regularMarketChangePercent: 2.838,
    regularMarketVolume: 47162200,
  });
  assert.equal(yahoo.ticker, "AAPL");
  assert.equal(yahoo.name, "Apple Inc.");
  assert.equal(yahoo.marketCap, 5e9);
  assert.equal(yahoo.changePercentage, 2.838);
  assert.equal(yahoo.volume, 47162200);
  assert.equal(yahooChartToMover({ symbol: "AAPL" }), null);
  console.log(
    "PASS $5B market-cap boundary, top 10 fill, company names, missing data, currencies, rank preservation, deduplication and request budget",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
