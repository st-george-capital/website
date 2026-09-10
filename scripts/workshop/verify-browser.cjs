const assert = require("node:assert/strict"),
  puppeteer = require("puppeteer-core");
require("@next/env").loadEnvConfig(process.cwd());
require("sucrase/register/ts");
const { projectTemplates } = require("../../lib/workshop/templates.ts");
const { encode } = require("next-auth/jwt");
(async () => {
  // Verify the real authenticated by-slug redirect for every starter course link.
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    token: { id: "workshop-link-audit", role: "user", name: "Audit" },
    maxAge: 120,
  });
  for (const slug of new Set(projectTemplates.map((t) => t.course))) {
    const r = await fetch(
      `http://localhost:3000/dashboard/learning/courses/by-slug/${slug}`,
      {
        redirect: "manual",
        headers: { Cookie: `next-auth.session-token=${token}` },
      },
    );
    const html = await r.text();
    const target =
      r.headers.get("location") ||
      html.match(
        /NEXT_REDIRECT;replace;(\/dashboard\/learning\/courses\/[a-z0-9]+);/,
      )?.[1] ||
      html.match(/url=(\/dashboard\/learning\/courses\/[a-z0-9]+)/)?.[1];
    assert.ok(target, `${slug} should redirect to its course`);
    assert.match(
      target,
      /^\/dashboard\/learning\/courses\/(?!by-slug|undefined)[a-z0-9]+$/,
    );
  }
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  let page;
  try {
    page = await browser.newPage();
    let projects = [],
      fail = false;
    const errors = [];
    const owner = { id: "owner", name: "Alex Morgan" },
      member = { id: "member", name: "Jamie Lee" };
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("BROWSER", e.stack);
    });
    page.on("dialog", (d) => d.accept());
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (!u.pathname.startsWith("/api/")) return req.continue();
      let data = [],
        status = 200;
      if (u.pathname === "/api/auth/session")
        data = { user: { ...owner, role: "admin" }, expires: "2099-01-01" };
      else if (fail) {
        status = 503;
        data = { error: "Test save failure; changes have not been saved." };
      } else if (u.pathname === "/api/workshop/members") data = [owner, member];
      else if (
        u.pathname === "/api/workshop/projects" &&
        req.method() === "GET"
      )
        data = projects;
      else if (
        u.pathname === "/api/workshop/projects" &&
        req.method() === "POST"
      ) {
        const body = JSON.parse(req.postData());
        const now = new Date().toISOString();
        const p = {
          ...body,
          id: "project-audit",
          ownerId: owner.id,
          owner,
          members: body.memberIds.map((id) => ({
            userId: id,
            user: id === "member" ? member : owner,
          })),
          milestones: body.milestones.map((title, i) => ({
            id: `task-${i}`,
            title,
            completed: false,
            assigneeId: null,
            assignee: null,
            dueAt: null,
          })),
          updates: [],
          version: 1,
          canEdit: true,
          canManage: true,
          createdAt: now,
          updatedAt: now,
          _count: { updates: 0 },
        };
        projects.push(p);
        data = { id: p.id };
        status = 201;
      } else if (u.pathname.startsWith("/api/workshop/projects/")) {
        const p = projects[0];
        const body = req.postData() ? JSON.parse(req.postData()) : {};
        if (u.pathname.endsWith("/updates")) {
          p.updates.unshift({
            id: "update-1",
            ...body,
            createdAt: new Date().toISOString(),
            author: owner,
          });
          data = { id: "update-1" };
          status = 201;
        } else if (u.pathname.endsWith("/milestones")) {
          if (req.method() === "POST") {
            p.milestones.push({
              ...body,
              id: "new-task",
              completed: false,
              assignee: body.assigneeId === "member" ? member : null,
            });
            status = 201;
          }
          if (req.method() === "PATCH")
            p.milestones.find((m) => m.id === body.id).completed =
              body.completed;
          if (req.method() === "DELETE")
            p.milestones = p.milestones.filter((m) => m.id !== body.id);
          data = { success: true };
        } else if (req.method() === "PATCH") {
          Object.assign(p, body, { version: p.version + 1 });
          data = { success: true };
        } else data = p;
      }
      req.respond({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto("http://localhost:3000/dashboard/workshop", {
      waitUntil: "networkidle2",
    });
    assert.equal(
      await page.$$eval(".workspace-nav-group h2", (ns) => ns.length),
      5,
    );
    assert.ok(
      await page.$('a[href="/dashboard/workshop"][aria-current="page"]'),
    );
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.includes("Explore project starters"))
        .click(),
    );
    assert.equal(
      await page.$$eval(".workshop-project-card", (ns) => ns.length),
      6,
    );
    await page.screenshot({ path: "/tmp/sgc-workshop-starters.png" });
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.includes("Use starter"))
        .click(),
    );
    await page.waitForSelector("dialog[open]");
    await page.$eval(".workshop-member-picker", (n) =>
      [...n.querySelectorAll("label")]
        .find((l) => l.textContent.includes("Jamie"))
        .querySelector("input")
        .click(),
    );
    await page.type(
      'input[placeholder="https://github.com/organisation/project"]',
      "https://github.com/st-george-capital/website",
    );
    fail = true;
    await page.click("dialog footer .course-primary");
    await page.waitForSelector("dialog [role=alert]");
    assert.ok(await page.$("dialog[open]"));
    fail = false;
    await page.click("dialog footer .course-primary");
    await page.waitForSelector(".workshop-project-header");
    assert.ok(
      await page.$eval(".workshop-collaborators", (n) =>
        n.textContent.includes("Jamie"),
      ),
    );
    assert.equal(
      await page.$eval(".workshop-resource-link", (n) =>
        n.getAttribute("href"),
      ),
      "https://github.com/st-george-capital/website",
    );
    await page.click(".workshop-milestones input");
    await page.waitForFunction(
      () =>
        document.querySelector(".workshop-milestones input")?.checked &&
        !document.querySelector(".workshop-milestones input")?.disabled,
    );
    await page.click(".workshop-add-task summary");
    await page.waitForSelector(".workshop-add-task form");
    await page.type(
      ".workshop-add-task input:not([type=date])",
      "Independent validation",
    );
    await page.select(".workshop-add-task select", "member");
    await page.click(".workshop-add-task button");
    await page.waitForFunction(() =>
      document
        .querySelector(".workshop-milestones")
        ?.textContent.includes("Independent validation"),
    );
    await page.evaluate(() =>
      [...document.querySelectorAll(".workshop-tabs button")]
        .find((b) => b.textContent.includes("Updates"))
        .click(),
    );
    await page.type(
      ".workshop-update-form textarea",
      "## Data audit complete\n\n**Three instruments** validated. Next: test duplicate dates.",
    );
    await page.click(".workshop-update-form .course-primary");
    await page.waitForSelector(".workshop-timeline strong");
    await page.reload({ waitUntil: "networkidle2" });
    await page.evaluate(() =>
      [...document.querySelectorAll(".workshop-tabs button")]
        .find((b) => b.textContent.includes("Updates"))
        .click(),
    );
    assert.ok(await page.$(".workshop-timeline .lesson-prose h2"));
    await page.screenshot({ path: "/tmp/sgc-workshop-project.png" });
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector("#dashboard-sidebar").getBoundingClientRect()
          .right <= 0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Project mobile overflow",
    );
    await page.click('button[aria-label="Open navigation"]');
    await page.waitForFunction(() => Math.abs(document.querySelector("#dashboard-sidebar").getBoundingClientRect().left) < 1);
    assert.ok(await page.$('section[aria-label="Learning & projects"]'));
    await page.click('button[aria-label="Close navigation"]');
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent === "Edit project")
        .click(),
    );
    await page.waitForSelector("dialog[open]");
    assert.equal(
      await page.$eval("dialog", (n) => n.scrollWidth > n.clientWidth),
      false,
      "Editor mobile overflow",
    );
    await page.screenshot({ path: "/tmp/sgc-workshop-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS starter/course links, sidebar groups, create, collaborators, milestones, updates, reload, failed save and mobile",
    );
  } catch (error) {
    await page.screenshot({ path: "/tmp/sgc-workshop-failure.png" });
    console.log(
      await page
        .$eval("main", (n) => n.innerText.slice(-1500))
        .catch(() => "No main element"),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
