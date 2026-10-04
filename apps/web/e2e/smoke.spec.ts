import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke test: landing -> offline demo repo -> analysis -> dashboard.
 * Requires the dev servers (npm run dev); Playwright reuses them if already up.
 */
test("landing loads and the demo repo reaches the dashboard", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");

  // Hero
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand any codebase");
  await expect(page.getByRole("button", { name: /Analyze repo/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Four steps from URL to pull request/i }),
  ).toBeVisible();

  // Start analysis with the bundled offline demo repo.
  await page.getByRole("button", { name: /Load demo repo/i }).click();
  await expect(page).toHaveURL(/\/repo\/[^/]+\/loading/, { timeout: 30_000 });

  // Should auto-advance to the dashboard once analysis completes.
  await expect(page).toHaveURL(/\/repo\/[^/]+$/, { timeout: 90_000 });

  // Dashboard tabs + overview content
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Map" })).toBeVisible();
  await expect(page.getByText(/What this project does/i)).toBeVisible({ timeout: 20_000 });

  // Map tab renders the React Flow canvas with a laid-out, clickable module
  await page.getByRole("tab", { name: "Map" }).click();
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(page.getByRole("button", { name: "Everything" })).toBeVisible();

  const firstNode = page.locator(".react-flow__node").first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();

  // Node drawer opens with dependency + file detail
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Files inside")).toBeVisible();

  await page.getByLabel("Close panel").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // No uncaught page errors
  const unexpected = consoleErrors.filter((entry) => entry.includes("Uncaught"));
  expect(unexpected).toEqual([]);
});
