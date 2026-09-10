const assert = require("node:assert/strict");
const puppeteer = require("puppeteer-core");
require("@next/env").loadEnvConfig(process.cwd());
require("sucrase/register/ts");
const { PrismaClient } = require("@prisma/client");
const { curriculum } = require("../../lib/learning/curriculum.ts");
const { reviewedCourse } = require("../../lib/learning/editorial.ts");
const models = require("../../lib/learning/models.ts");
(async () => {
  assert.equal(models.callProfit(103, 100, 5), -2);
  assert.ok(Math.abs(models.bondPrice(6) - 957.876) < 0.01);
  assert.ok(Math.abs(models.equityPrice(10) - 30.3142857) < 0.0001);
  assert.ok(Math.abs(models.currencyReturn(-5) + 1.2) < 0.0001);
  assert.ok(Math.abs(models.executionCost(250).vwap - 100.022) < 0.000001);
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_URL,
  });
  let courses;
  try {
    courses = (
      await prisma.learningCourse.findMany({
        include: { lessons: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      })
    ).map(reviewedCourse);
  } finally {
    await prisma.$disconnect();
  }
  assert.ok(
    courses.every((c) => curriculum[c.slug]),
    "Every existing course has a workshop",
  );
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    let role = "admin";
    let failSave = false;
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (!u.pathname.startsWith("/api/")) return req.continue();
      let data = [],
        status = 200;
      if (u.pathname === "/api/auth/session")
        data = {
          user: { id: "course-audit-user", role, name: "Course audit" },
          expires: "2099-01-01",
        };
      else if (req.method() !== "GET") {
        status = failSave ? 503 : 200;
        data = {};
      } else if (u.pathname === "/api/learning/courses") data = courses;
      else if (u.pathname.startsWith("/api/learning/courses/"))
        data = courses.find((c) => c.id === u.pathname.split("/").pop());
      req.respond({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const base = "http://localhost:3000";
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(base + "/dashboard/learning/courses", {
      waitUntil: "networkidle2",
    });
    assert.equal(
      await page.$$eval(".course-library-card", (n) => n.length),
      courses.length,
    );
    await page.screenshot({ path: "/tmp/sgc-courses-library.png" });
    await page.type('[aria-label="Search courses"]', "Options");
    assert.equal(await page.$$eval(".course-library-card", (n) => n.length), 1);
    await page.click(".course-card-link");
    await page.waitForSelector(".course-syllabus-row");
    assert.ok(
      await page.$eval(".course-hero", (n) =>
        n.textContent.includes("Options Foundations"),
      ),
    );
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: "/tmp/sgc-course-overview.png" });
    await page.click(".course-syllabus-row");
    await page.waitForSelector(".lesson-prose table");
    assert.ok(await page.$(".lesson-prose h2"));
    assert.ok(await page.$(".lesson-prose strong"));
    await page.waitForFunction(
      () =>
        document.querySelector(".course-lesson-footer button") &&
        !document.querySelector(".course-lesson-footer button").disabled,
    );
    await page.$eval(".course-lesson-footer button", (n) => n.click());
    await page.waitForFunction(() =>
      document
        .querySelector(".course-lesson-footer button")
        ?.textContent.includes("Completed"),
    );
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForFunction(() =>
      document
        .querySelector(".course-lesson-footer button")
        ?.textContent.includes("Completed"),
    );
    assert.ok(
      await page.$eval(".course-lesson-footer button", (n) =>
        n.textContent.includes("Completed"),
      ),
    );
    await page.screenshot({ path: "/tmp/sgc-course-reader.png" });
    for (const c of courses) {
      await page.goto(`${base}/dashboard/learning/courses/${c.id}?workshop=1`, {
        waitUntil: "networkidle2",
      });
      await page.waitForSelector(".course-lab");
      await page.click(".course-case summary");
      assert.ok(await page.$eval(".course-case details", (n) => n.open));
      const q = curriculum[c.slug].quiz[0];
      const labels = await page.$$(
        ".course-knowledge fieldset:first-of-type input",
      );
      await labels[q.answer].click();
      assert.ok(
        await page.$eval(".course-answer", (n) =>
          n.textContent.includes("Correct."),
        ),
      );
      if (await page.$("input[type=range]")) {
        const before = await page.$eval("output", (n) => n.textContent);
        await page.focus("input[type=range]");
        await page.keyboard.press("ArrowRight");
        assert.notEqual(
          await page.$eval("output", (n) => n.textContent),
          before,
        );
      }
      if (c.slug === "options-foundations") {
        await page.$eval(".course-lab", (n) =>
          window.scrollTo({
            top: n.getBoundingClientRect().top + scrollY - 110,
            behavior: "instant",
          }),
        );
        await page.screenshot({ path: "/tmp/sgc-course-workshop.png" });
      }
      await page.setViewport({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Mobile overflow: ${c.slug}`,
      );
      await page.setViewport({ width: 1440, height: 1000 });
      console.log(`PASS ${c.slug}: workshop, answer, mobile`);
    }
    for (const course of courses) {
      for (const lesson of course.lessons) {
        await page.goto(
          `${base}/dashboard/learning/courses/${course.id}?lesson=${lesson.slug}`,
          { waitUntil: "domcontentloaded" },
        );
        await page.waitForSelector(".lesson-prose");
        assert.ok(
          (await page.$eval(".lesson-prose", (n) => n.textContent)).length > 50,
        );
      }
      console.log(
        `PASS ${course.slug}: all ${course.lessons.length} lesson readers`,
      );
    }
    const c = courses[0];
    await page.goto(`${base}/dashboard/learning/courses/${c.id}?manage=1`, {
      waitUntil: "networkidle2",
    });
    await page.waitForSelector('a[href*="?lesson="]');
    // Open the first lesson editor, identified by its pencil icon.
    await page.evaluate(() =>
      document
        .querySelector('a[href*="?lesson="]')
        .closest(".p-4")
        .querySelector("svg.lucide-pencil")
        .closest("button")
        .click(),
    );
    await page.waitForSelector("textarea");
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Preview")
        .click(),
    );
    await page.waitForSelector(".lesson-prose table");
    assert.ok(await page.$(".lesson-prose h2"));
    await page.screenshot({ path: "/tmp/sgc-course-editor-preview.png" });
    failSave = true;
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Save")
        .click(),
    );
    await page.waitForSelector("[role=alert]");
    assert.ok(await page.$(".lesson-prose"), "Failed save keeps preview open");
    // Member view keeps reading available while withholding authoring controls.
    role = "user";
    await page.goto(`${base}/dashboard/learning/courses/${c.id}`, {
      waitUntil: "networkidle2",
    });
    assert.equal(await page.$('a[href*="manage=1"]'), null);
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(
      `${base}/dashboard/learning/courses/${c.id}?lesson=${c.lessons[0].slug}`,
      { waitUntil: "networkidle2" },
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Mobile lesson table scrolls within document",
    );
    await page.$eval(".lesson-table-scroll", (n) =>
      window.scrollTo({
        top: n.getBoundingClientRect().top + scrollY - 100,
        behavior: "instant",
      }),
    );
    await page.screenshot({ path: "/tmp/sgc-course-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS navigation, Markdown preview, progress persistence, model arithmetic and save failure",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
