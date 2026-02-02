import { test, expect } from "@playwright/test";

test.describe("Education - SNARK Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/education/snark");
  });

  test("should display page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "zk-SNARK" })).toBeVisible();
  });

  test("should display education module badge", async ({ page }) => {
    await expect(page.getByText("Education Module")).toBeVisible();
  });

  test("should have tabs for different sections", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "How It Works" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Trusted Setup" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Try It" })).toBeVisible();
  });

  test("should switch tabs when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: "How It Works" }).click();
    await expect(page.getByText("From Program to Proof")).toBeVisible();

    await page.getByRole("tab", { name: "Trusted Setup" }).click();
    await expect(page.getByText("The Trusted Setup Ceremony")).toBeVisible();

    await page.getByRole("tab", { name: "Try It" }).click();
    await expect(page.getByText("Interactive zk-SNARK Demo")).toBeVisible();
  });

  test("should have interactive demo on Try It tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Try It" }).click();
    await expect(page.getByRole("button", { name: /generate.*verify/i })).toBeVisible();
  });
});

test.describe("Education - STARK Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/education/stark");
  });

  test("should display page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "zk-STARK" })).toBeVisible();
  });

  test("should have tabs for different sections", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "How It Works" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Transparency" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Applications" })).toBeVisible();
  });

  test("should show real-world applications", async ({ page }) => {
    await page.getByRole("tab", { name: "Applications" }).click();
    await expect(page.getByText("StarkNet")).toBeVisible();
    await expect(page.getByText("StarkEx")).toBeVisible();
  });
});

test.describe("Education - Comparison Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/education/comparison");
  });

  test("should display page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "SNARK vs STARK" })
    ).toBeVisible();
  });

  test("should show quick overview section", async ({ page }) => {
    await expect(page.getByText("Quick Overview")).toBeVisible();
  });

  test("should display comparison chart", async ({ page }) => {
    await expect(page.getByText("SNARK vs STARK Comparison")).toBeVisible();
  });

  test("should display detailed feature comparison", async ({ page }) => {
    await expect(page.getByText("Detailed Feature Comparison")).toBeVisible();
  });

  test("should display use case recommendations", async ({ page }) => {
    await expect(page.getByText("Use Case Recommendations")).toBeVisible();
  });
});
