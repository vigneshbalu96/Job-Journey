import { test } from "@playwright/test";
import { signIn } from "./helpers";

// Visual sweep for review, not a pass/fail test. Run with:
//   SHOTS_DIR=/path SHOTS_EMAIL=user@example.com pnpm exec playwright test screenshots
const dir = process.env.SHOTS_DIR;
const email = process.env.SHOTS_EMAIL;

test.skip(!dir || !email, "set SHOTS_DIR and SHOTS_EMAIL");

test("screenshot every page", async ({ page }) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, email!);
  const pages = ["/today", "/pipeline", "/pipeline?view=table", "/companies", "/contacts", "/questions", "/documents", "/offers", "/journey", "/clip", "/settings"];
  const go = async (url: string) => {
    // Dev-server HMR can abort the first navigation after a compile; retry once.
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
    await page.waitForLoadState("networkidle").catch(() => {});
  };
  for (const p of pages) {
    await go(p);
    await page.screenshot({ path: `${dir}/${p.replace(/[\/?=]/g, "_").replace(/^_/, "")}.png`, fullPage: true });
  }
  // One application detail + its tabs, one company, one contact.
  await go("/pipeline?view=table");
  const first = page.locator("table tbody tr a").first();
  await first.click();
  await page.waitForURL(/\/applications\//);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/application_overview.png`, fullPage: true });
  for (const tab of ["History", "Notes", "Contacts", "Files", "AI"]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/application_${tab.toLowerCase()}.png`, fullPage: true });
  }
  await go("/companies");
  await page.locator("main a[href^='/companies/']").first().click();
  await page.waitForURL(/\/companies\/[0-9a-f-]+/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${dir}/company.png`, fullPage: true });
  await go("/contacts");
  await page.locator("main a[href^='/contacts/']").first().click();
  await page.waitForURL(/\/contacts\/[0-9a-f-]+/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${dir}/contact.png`, fullPage: true });
  // Mobile pass on the two busiest pages.
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/pipeline");
  await page.screenshot({ path: `${dir}/mobile_pipeline.png`, fullPage: true });
  await go("/today");
  await page.screenshot({ path: `${dir}/mobile_today.png`, fullPage: true });
});
