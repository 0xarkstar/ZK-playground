import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /understand zk technology/i })
    ).toBeVisible();
  });

  test("should display the hero badge", async ({ page }) => {
    await expect(page.getByText("Learn Zero-Knowledge Proofs")).toBeVisible();
  });

  test("should have Start Learning button that navigates to education", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /start learning/i }).click();
    await expect(page).toHaveURL("/education/snark");
  });

  test("should have Try Demo button that navigates to voting demo", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /try demo/i }).click();
    await expect(page).toHaveURL("/demo/voting");
  });

  test("should display core concept section", async ({ page }) => {
    await expect(page.getByText("Prove knowledge without revealing")).toBeVisible();
    await expect(page.getByText("Tiny proofs, fast verification")).toBeVisible();
    await expect(page.getByText("Keep sensitive data hidden")).toBeVisible();
  });

  test("should display feature cards section", async ({ page }) => {
    await expect(page.getByText("What You Will Learn")).toBeVisible();
    await expect(page.getByText("Education Modules").first()).toBeVisible();
    await expect(page.getByText("Circuit Visualization").first()).toBeVisible();
    await expect(page.getByText("Proof Animation").first()).toBeVisible();
    await expect(page.getByText("Secret Voting Demo").first()).toBeVisible();
  });

  test("should display tech stack section", async ({ page }) => {
    await expect(page.getByText("Built With Modern Stack")).toBeVisible();
    await expect(page.getByText("Circom").first()).toBeVisible();
    await expect(page.getByText("snarkjs").first()).toBeVisible();
  });

  test("should have navigation header", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Playground")).toBeVisible();
  });

  test("should have theme toggle button", async ({ page }) => {
    const themeButton = page.locator('button').filter({ has: page.locator('svg.lucide-moon, svg.lucide-sun') });
    await expect(themeButton).toBeVisible();
  });
});
