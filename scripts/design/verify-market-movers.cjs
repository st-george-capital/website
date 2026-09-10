const assert = require("node:assert/strict");
const Module = require("node:module");
require("sucrase/register/ts");
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === "next/cache") return { unstable_cache: (fn) => fn };
  if (name === "@/lib/alpha-vantage") return {};
  return original.call(this, name, ...args);
};
const {
  parseMoverCompany,
  filterMarketMovers,
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
        ticker === "SMALL" ? 999999999 : ticker === "BIGGER" ? 2e9 : 1e9,
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
  const expired = await filterMarketMovers(
    movers,
    async () => {
      throw Error("must not run");
    },
    0,
  );
  assert.equal(expired.topGainers.length, 0);
  assert.equal(expired.coverageIncomplete, true);
  console.log(
    "PASS market-cap boundary, all three lists, company names, missing data, currencies, rank preservation, deduplication and request budget",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
