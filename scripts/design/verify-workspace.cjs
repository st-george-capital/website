const assert = require("node:assert/strict");
const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.BROWSER_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const base = process.env.SITE_URL || "http://localhost:3000";
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return request.continue();
      let data = [];
      if (url.pathname === "/api/portfolio/summary") data = { holdings: [{sector:"Technology",region:"North America",weight:60},{sector:"Industrials",region:"Europe",weight:40}], summary: { positionCount: 2, totalValue: 10000 } };
      if (url.pathname === "/api/auth/session")
        data = {
          user: {
            id: "visual-member",
            name: "Alex Morgan",
            email: "preview@example.com",
            role: "user",
          },
          expires: "2099-01-01T00:00:00Z",
        };
      if (url.pathname === "/api/dashboard/workspace")
        data = {
          reports: [
            {
              id: "preview-1",
              ticker: "MSFT",
              companyName: "Microsoft Corporation",
              status: "draft",
              updatedAt: "2026-09-08",
            },
            {
              id: "preview-2",
              ticker: "JPM",
              companyName: "JPMorgan Chase & Co.",
              status: "review",
              updatedAt: "2026-09-07",
            },
            {
              id: "preview-3",
              ticker: "GEV",
              companyName: "GE Vernova",
              status: "draft",
              updatedAt: "2026-09-06",
            },
          ],
        };
      if (url.pathname === "/api/calendar")
        data = [
          {
            id: "meeting",
            title: "Research committee",
            startDate: new Date(Date.now() + 86400000).toISOString(),
            location: "Bahen Centre",
          },
        ];
      if (url.pathname === "/api/dashboard/market-movers")
        data = {
          mostActivelyTraded: [
            { ticker: "MSFT", name: "Microsoft Corporation", marketCap: 3000000000000, price: 410.2, changePercentage: 1.24 },
          ],
          topGainers: [{ ticker: "TEST", name: "Test Company", marketCap: 2000000000, price: 25, changePercentage: 5 }],
          topLosers: [],
          lastUpdated: "Preview data",
        };
      if (url.pathname === "/api/dashboard/market-overview") data = { metrics: [
        { id: 'us10y', name: 'U.S. 10Y Treasury', unit: 'yield', value: 4.25, change: 3, asOf: '2026-09-08', source: 'Test data' },
        { id: 'sp500', name: 'S&P 500', unit: 'index', value: 6500, change: .5, asOf: '2026-09-08T20:00:00Z', source: 'Test data' },
        { id: 'nasdaq', name: 'Nasdaq Composite', unit: 'index', value: 21000, change: -.3, asOf: '2026-09-08T20:00:00Z', source: 'Test data' },
        { id: 'russell2000', name: 'Russell 2000', unit: 'index', value: 2300, change: 1, asOf: '2026-09-08T20:00:00Z', source: 'Test data' },
      ] };
      if (url.pathname === "/api/dashboard/quote") data = { quote: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' };
      if (url.pathname === "/api/dashboard/finance-term") data = { term: 'Key Rate Duration', definition: 'Measures sensitivity to a yield change at a specific maturity.', category: 'Fixed Income' };
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    for (const route of [
      "/dashboard",
      "/dashboard/tools",
      "/dashboard/tools/dcf",
      "/dashboard/tools/sentiment",
      "/dashboard/tools/cvar-optimizer",
    ].filter(route => !process.env.VERIFY_DASHBOARD_ONLY || route === "/dashboard")) {
      await page.setViewport({ width: 1440, height: 1000 });
      const response = await page.goto(base + route, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      assert.equal(response.status(), 200);
      await page.waitForSelector(".dashboard-shell h1");
      await page.screenshot({
        path: `/tmp/sgc-workspace-${route.split("/").pop()}.png`,
      });
      if (route === "/dashboard") {
        await page.waitForSelector('.workspace-benchmark-value');
        assert.equal(await page.$$eval('.workspace-benchmark', nodes => nodes.length), 4);
        assert.match(await page.$eval('.workspace-benchmarks', node => node.textContent), /4.25%/);
        assert.match(await page.$eval('.workspace-benchmarks', node => node.textContent), /3.0 bp/);
        assert.match(await page.$eval('.workspace-daily', node => node.textContent), /Key Rate Duration/);
        await page.$eval('.workspace-benchmarks', node => window.scrollTo({top: node.getBoundingClientRect().top + scrollY - 160, behavior: 'instant'}));
        await page.waitForFunction(() => document.querySelector('.workspace-market-table')?.textContent.includes('Microsoft Corporation (MSFT)'));
        assert.ok(await page.$eval('.workspace-market-scope', n => n.textContent.includes('$5B')));
        await page.screenshot({path: '/tmp/sgc-market-daily.png'});
        await page.evaluate(() => [...document.querySelectorAll('.workspace-tabs button')].find(n => n.textContent.trim() === 'Gainers').click());
        await page.waitForFunction(() => document.querySelector('.workspace-market-table')?.textContent.includes('Test Company (TEST)'));
        await page.evaluate(() => [...document.querySelectorAll('.workspace-tabs button')].find(n => n.textContent.trim() === 'Decliners').click());
        await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('No companies meeting the $5B minimum'));
        await page.evaluate(() => [...document.querySelectorAll('.workspace-tabs button')].find(n => n.textContent.trim() === 'Most active').click());

        assert.equal(
          await page.$eval(".workspace-report-row", (n) =>
            n.getAttribute("href"),
          ),
          "/dashboard/research/preview-1/edit",
        );
        await page.type('[aria-label="Find a research tool"]', "sentiment");
        assert.equal(
          await page.$$eval(".workspace-search-results a", (n) => n.length),
          1,
        );
      }
      if (route === "/dashboard/tools") {
        const button = '[aria-label="Pin Interview Tool"]';
        await page.click(button);
        await page.reload({ waitUntil: "networkidle2" });
        assert.ok(await page.$('[aria-label="Unpin Interview Tool"]'));
        await page.type('[aria-label="Search tools"]', "CVaR");
        assert.equal(
          await page.$$eval(".workspace-tool-card", (n) => n.length),
          1,
        );
      }
      if (route.endsWith("/dcf")) {
        assert.ok(await page.$(".tool-empty-state"), "DCF starts with company selection guidance");
        assert.equal(
          await page.$eval(".tool-saved-models", (n) => n.open),
          false,
        );
        await page.click(".tool-saved-models summary");
        assert.equal(
          await page.$eval(".tool-saved-models", (n) => n.open),
          true,
        );
      }
      if (route.endsWith('/dcf')) {
        await page.evaluate(() => [...document.querySelectorAll('.tool-action-bar button')].find(b => b.textContent.includes('Load Example')).click());
        await page.evaluate(() => [...document.querySelectorAll('.tool-tab-bar button')].find(b => b.textContent === 'Charts & Analysis').click());
        await page.waitForSelector('.recharts-bar');
        await new Promise(resolve => setTimeout(resolve, 1200));
        assert.equal(await page.$eval('.recharts-pie', () => true).catch(() => false), false, 'No terminal-value pie');
        await page.$eval('.recharts-wrapper', node => window.scrollTo({top:node.getBoundingClientRect().top+scrollY-150,behavior:'instant'}));
        await page.screenshot({path:'/tmp/sgc-dcf-chart-style.png'});
        await page.evaluate(() => [...document.querySelectorAll('.tool-tab-bar button')].find(b => b.textContent === 'Sensitivity Analysis').click());
        await page.waitForSelector('.dcf-driver-bridge');
        assert.equal(await page.$$eval('.dcf-range-row', rows => rows.length), 3);
        assert.equal(await page.$$eval('.dcf-driver-bridge .dcf-bridge-bar', bars => bars.length), 5);
        assert.equal(await page.$eval('.dcf-driver-bridge', n => /NaN|Infinity/.test(n.innerHTML)), false);
        await page.$eval('.dcf-scenario-range', node => window.scrollTo({top:node.getBoundingClientRect().top+scrollY-130,behavior:'instant'}));
        await page.mouse.move(0,0);
        await page.screenshot({path:'/tmp/sgc-dcf-scenarios.png'});
        await page.$eval('.dcf-driver-bridge', n => window.scrollTo({top:n.getBoundingClientRect().top+scrollY-150,behavior:'instant'}));
        await page.screenshot({path:'/tmp/sgc-dcf-bridge-fixed.png'});
        await page.$eval('.dcf-wacc-card', n => window.scrollTo({top:n.getBoundingClientRect().top+scrollY-90,behavior:'instant'}));
        await page.screenshot({path:'/tmp/sgc-dcf-wacc-fixed.png'});
        assert.equal(await page.$$eval('.dcf-wacc-card [class*="border-green"],.dcf-wacc-card [class*="border-red"],.dcf-wacc-card [class*="border-purple"]', nodes=>nodes.length),0);
        await page.evaluate(() => [...document.querySelectorAll('.tool-tab-bar button')].find(b => b.textContent === 'DCF Valuation').click());
        assert.ok((await page.$eval('main',n=>n.textContent)).includes('9,020M'), 'Valuation summary groups thousands');


      }
      await page.setViewport({ width: 390, height: 844 });
      await new Promise((resolve) => setTimeout(resolve, 300));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow)
        console.log(
          "Overflow nodes:",
          await page.evaluate(() =>
            [...document.querySelectorAll("main *")]
              .filter((n) => n.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 8)
              .map((n) => ({ tag: n.tagName, className: n.className })),
          ),
        );
      assert.equal(overflow, false, `Mobile overflow: ${route}`);
      console.log(`PASS ${route}`);
    }
    assert.deepEqual(errors, [], "No browser errors");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
