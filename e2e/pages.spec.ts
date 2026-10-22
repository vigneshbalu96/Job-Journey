import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

const PAGES: [string, string][] = [
  ["/today", "Good"],
  ["/pipeline", "Pipeline"],
  ["/companies", "Companies"],
  ["/contacts", "Contacts"],
  ["/questions", "Question bank"],
  ["/documents", "Documents"],
  ["/offers", "Offers"],
  ["/journey", "Journey"],
  ["/clip", "Clip a job"],
  ["/settings", "Settings"],
];

test("every page renders without server or client errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));
  await signIn(page, uniqueEmail());

  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(heading) })).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);
  }
  expect(errors.filter((e) => !e.includes("favicon")), errors.join("\n")).toEqual([]);
});

test("contacts, notes and questions round-trip", async ({ page }) => {
  await signIn(page, uniqueEmail());

  await page.goto("/contacts");
  await page.getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Riya Menon");
  await dialog.getByLabel("Email").fill("riya@example.com");
  await dialog.getByLabel("Phone").fill("+91 98765 43210");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByText("Contact added")).toBeVisible();
  await page.getByRole("link", { name: "Riya Menon" }).click();
  await page.waitForURL(/\/contacts\//);
  await page.getByRole("button", { name: "Log interaction" }).click();
  await page.getByRole("dialog").getByLabel("What happened").fill("Intro call about the platform team");
  await page.getByRole("dialog").getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.getByText("Intro call about the platform team")).toBeVisible();

  await page.goto("/questions");
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByRole("dialog").getByLabel("Question").fill("Tell me about a time you disagreed with a PM");
  await page.getByRole("dialog").getByLabel("Tags").fill("behavioural, conflict");
  await page.getByRole("dialog").getByRole("button", { name: "Add question" }).click();
  await expect(page.getByText("Tell me about a time you disagreed with a PM")).toBeVisible();
  await page.getByRole("button", { name: "Asked again" }).click();
  await expect(page.getByText(/asked 1×/)).toBeVisible();
});
