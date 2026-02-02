import { test, expect } from "@playwright/test";

test.describe("Visualization - Circuit Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visualization/circuit");
  });

  test("should display page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Circuit Visualization" })
    ).toBeVisible();
  });

  test("should display visualization module badge", async ({ page }) => {
    await expect(page.getByText("Visualization Module")).toBeVisible();
  });

  test("should have circuit selector dropdown", async ({ page }) => {
    // There are two comboboxes - language switcher and circuit selector
    // The circuit selector contains "Multiplier" as its default value
    await expect(page.getByRole("combobox").filter({ hasText: "Multiplier" })).toBeVisible();
  });

  test("should display circuit graph container", async ({ page }) => {
    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("should have legend section", async ({ page }) => {
    await expect(page.getByText("Legend").first()).toBeVisible();
    await expect(page.getByText("Input Signal").first()).toBeVisible();
    await expect(page.getByText("Output Signal").first()).toBeVisible();
  });

  test("should switch circuits when selecting from dropdown", async ({
    page,
  }) => {
    // Click the circuit selector combobox (not the language switcher)
    await page.getByRole("combobox").filter({ hasText: "Multiplier" }).click();
    await page.getByRole("option", { name: "Range Check" }).click();
    await expect(page.getByText("Verify value is between")).toBeVisible();
  });

  test("should display understanding signals section", async ({ page }) => {
    await expect(page.getByText("Understanding Signals")).toBeVisible();
  });

  test("should display code examples section", async ({ page }) => {
    await expect(page.getByText("Circom Code Examples")).toBeVisible();
  });
});

test.describe("Visualization - Proof Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visualization/proof");
  });

  test("should display page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Proof Process Visualization" })
    ).toBeVisible();
  });

  test("should display proof stats section", async ({ page }) => {
    await expect(page.getByText("Proof Size")).toBeVisible();
    await expect(page.getByText("Verification Time")).toBeVisible();
  });

  test("should have proof generation pipeline section", async ({ page }) => {
    await expect(page.getByText("Proof Generation Pipeline")).toBeVisible();
  });

  test("should display proof steps", async ({ page }) => {
    await expect(page.getByText("Load Inputs").first()).toBeVisible();
    await expect(page.getByText("Compute Witness").first()).toBeVisible();
    await expect(page.getByText("Generate Proof").first()).toBeVisible();
    await expect(page.getByText("Verify Proof").first()).toBeVisible();
  });

  test("should have start button for animation", async ({ page }) => {
    await expect(page.getByRole("button", { name: /start/i })).toBeVisible();
  });

  test("should start animation when clicking start", async ({ page }) => {
    await page.getByRole("button", { name: /start/i }).click();
    await expect(page.getByText("In Progress")).toBeVisible({ timeout: 2000 });
  });

  test("should display the proof flow section", async ({ page }) => {
    await expect(page.getByText("The Proof Flow")).toBeVisible();
  });

  test("should show what gets revealed section", async ({ page }) => {
    await expect(page.getByText("What Gets Revealed?")).toBeVisible();
    await expect(page.getByText("Visible to Verifier")).toBeVisible();
    await expect(page.getByText("Hidden from Verifier")).toBeVisible();
  });

  test("should have interactive demo section", async ({ page }) => {
    await expect(page.getByText("Try It Yourself")).toBeVisible();
  });
});
