const assert = require("node:assert/strict");
const puppeteer = require("puppeteer-core");

// Run against an existing dev server: node scripts/design/verify-public.cjs
// Set BROWSER_PATH and SITE_URL for other environments.
(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.BROWSER_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.SITE_URL || "http://localhost:3000";
    for (const route of [
      "/",
      "/quant-research",
      "/quant-trading",
      "/equity-macro-research",
      "/equity-research",
      "/team",
      "/contact",
    ]) {
      await page.setViewport({ width: 1440, height: 1000 });
      const response = await page.goto(base + route, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      assert.equal(response.status(), 200, route);
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector(".site-nav")).position ===
          "fixed",
      );
      assert.equal(await page.$$eval("h1", (nodes) => nodes.length), 1);
      assert.match(
        await page.$eval("h1", (node) => getComputedStyle(node).fontFamily),
        /Inter|Manrope|__Inter|__inter|__Manrope|Arial/,
      );
      const hasArtwork =
        route !== "/" && route !== "/team" && route !== "/contact";
      if (hasArtwork) {
        assert.equal(
          await page.evaluate(() =>
            document.body.innerText.includes("Illustrative"),
          ),
          false,
        );
        const moving = await page.$eval("canvas", (node) => node.toDataURL());
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.notEqual(
          await page.$eval("canvas", (node) => node.toDataURL()),
          moving,
          "Artwork should animate",
        );
        await page.click('[aria-label="Pause animation"]');
        await page.waitForSelector('[aria-label="Play animation"]');
        await new Promise((resolve) => setTimeout(resolve, 100));
        const still = await page.$eval("canvas", (node) => node.toDataURL());
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(
          await page.$eval("canvas", (node) => node.toDataURL()),
          still,
          "Paused canvas must stop",
        );
        await page.click('[aria-label="Play animation"]');
      }
      if (route === "/team") {
        assert.equal(
          await page.evaluate(() =>
            /Research Projects|80\+|2023/.test(
              document.querySelector("main").innerText,
            ),
          ),
          false,
          "No duplicate organisation stats",
        );
        assert.ok(await page.$(".portrait-grid"));
      }
      await page.screenshot({
        path: `/tmp/sgc-reviewed-${route.replaceAll("/", "") || "home"}.png`,
      });
      await page.setViewport({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Mobile overflow: ${route}`,
      );
      await page.screenshot({
        path: `/tmp/sgc-reviewed-mobile-${route.replaceAll("/", "") || "home"}.png`,
      });
      console.log(
        `PASS ${route}: rendered, responsive${hasArtwork ? ", animated, pausable" : ""}`,
      );
    }
    await page.click('[aria-label="Open menu"]');
    await page.click(".mobile-nav-group button");
    assert.equal(
      await page.$eval(".mobile-nav-group button", (node) =>
        node.getAttribute("aria-expanded"),
      ),
      "true",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.$eval("#mobile-navigation", (node) => node.hidden),
      true,
    );
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await page.goto(base, { waitUntil: "networkidle2" });
    assert.equal(await page.$eval("video", (video) => video.paused), true);
    await page.goto(base + "/quant-research", { waitUntil: "networkidle2" });
    assert.equal(await page.$('[aria-label="Pause animation"]'), null);
    assert.deepEqual(errors, [], "Browser runtime errors");
    console.log(
      "PASS mobile navigation, Escape, reduced motion, and browser runtime checks",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
