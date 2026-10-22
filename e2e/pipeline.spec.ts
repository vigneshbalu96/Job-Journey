import { expect, test } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

test.describe("pipeline smoke", () => {
  test("sign in → add application → move stage → history → remove", async ({ page }) => {
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text().slice(0, 300)));
    await signIn(page, uniqueEmail());

    await page.goto("/pipeline");
    await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();

    // Add an application with an inline new company.
    await page.getByRole("button", { name: "Add application" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("New company name").fill("Playwright Labs");
    await dialog.getByLabel("Role title").fill("Senior Frontend Engineer");
    await dialog.getByLabel("Location").fill("Bengaluru");
    await dialog.getByRole("button", { name: "Add application" }).click();

    // Lands on the detail page.
    await page.waitForURL(/\/applications\//);
    await expect(page.getByRole("heading", { name: "Senior Frontend Engineer" })).toBeVisible();
    await expect(page.getByText("Playwright Labs")).toBeVisible();

    // Move to Applied via the Move menu.
    await page.getByRole("button", { name: /Move/ }).click();
    await page.getByRole("menuitem", { name: "Applied" }).click();
    await page.getByRole("dialog").getByLabel("Note").fill("Applied through referral portal");
    await page.getByRole("dialog").getByRole("button", { name: "Move", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // History has two entries (saved → applied) once the page revalidates.
    await expect(page.getByRole("tab", { name: /History \(2\)/ })).toBeVisible();
    await page.getByRole("tab", { name: /History \(2\)/ }).click();
    await expect(page.getByText("Applied through referral portal")).toBeVisible();

    // Applied created the apply-day checklist (3) plus one follow-up.
    await page.getByRole("tab", { name: /Tasks \(4\)/ }).click();
    await expect(page.getByText("Attach the resume version you sent", { exact: false })).toBeVisible();
    await expect(page.getByText("Follow up on Senior Frontend Engineer", { exact: false })).toBeVisible();

    // Move to Interview with a date → a dated interview task appears.
    await page.getByRole("button", { name: /Move/ }).click();
    await page.getByRole("menuitem", { name: "Interview" }).click();
    const moveDialog = page.getByRole("dialog");
    await moveDialog.getByLabel("Round").fill("Round 1 – technical");
    await moveDialog.getByLabel("Interview at").fill("2026-10-09T11:00");
    await moveDialog.getByRole("button", { name: "Move", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // follow-up for Applied was retired; new follow-up + interview + 3 apply steps = 5 open
    await expect(page.getByRole("tab", { name: /Tasks \(5\)/ })).toBeVisible();
    await page.getByRole("tab", { name: /Tasks \(5\)/ }).click();
    await expect(page.getByText("Round 1 – technical · Senior Frontend Engineer", { exact: false })).toBeVisible();
    await expect(page.getByText("9 Oct 2026, 11:00")).toBeVisible();

    // Kanban shows the card in the Interview column.
    await page.goto("/pipeline");
    const appliedColumn = page.locator("section", { has: page.getByText("Interview", { exact: true }) }).first();
    await expect(appliedColumn.getByText("Senior Frontend Engineer")).toBeVisible();

    // Soft delete from the detail page.
    await appliedColumn.getByText("Senior Frontend Engineer").click();
    await page.waitForURL(/\/applications\//);
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
    await page.waitForURL(/\/pipeline$/);
    await expect(page.getByText("Nothing in the pipeline yet")).toBeVisible();
  });

  test("anonymous visitor is redirected to login", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForURL(/\/login\?next=%2Fpipeline/);
    await expect(page.getByRole("heading", { name: "Job Journey" })).toBeVisible();
  });
});
