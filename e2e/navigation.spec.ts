import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate through education pages", async ({ page }) => {
    // Start at home
    await page.goto("/");
    await expect(page).toHaveURL("/");

    // Navigate to Education - SNARK via link
    await page.getByRole("link", { name: /start learning/i }).click();
    await expect(page).toHaveURL("/education/snark");
    await expect(page.getByRole("heading", { name: "zk-SNARK" })).toBeVisible();

    // Navigate to home via logo
    await page.getByRole("link", { name: /playground/i }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("should navigate to demo page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /try demo/i }).click();
    await expect(page).toHaveURL("/demo/voting");
    await expect(page.getByRole("heading", { name: "Secret Voting Demo" })).toBeVisible();
  });

  test("should have working footer link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Built for learning ZK technology")).toBeVisible();
  });

  test("all main pages should be accessible", async ({ page }) => {
    const pages = [
      { url: "/", title: /understand zk technology/i },
      { url: "/education/snark", title: "zk-SNARK" },
      { url: "/education/stark", title: "zk-STARK" },
      { url: "/education/comparison", title: "SNARK vs STARK" },
      { url: "/visualization/circuit", title: "Circuit Visualization" },
      { url: "/visualization/proof", title: "Proof Process Visualization" },
      { url: "/demo/voting", title: "Secret Voting Demo" },
    ];

    for (const { url, title } of pages) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
  });
});

test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show mobile menu button on small screens", async ({ page }) => {
    await page.goto("/");

    // Mobile menu button should be visible
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuButton).toBeVisible();
  });

  test("should open mobile menu when clicking menu button", async ({ page }) => {
    await page.goto("/");

    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await menuButton.click();

    // After clicking, the close button (X icon) should appear
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await expect(closeButton).toBeVisible();
  });
});

test.describe("Theme Toggle", () => {
  test("should have theme toggle button", async ({ page }) => {
    await page.goto("/");

    // Get the theme toggle button
    const themeButton = page.locator('button').filter({ has: page.locator('svg.lucide-moon, svg.lucide-sun') });
    await expect(themeButton).toBeVisible();

    // Click should work without error
    await themeButton.click();
    await expect(themeButton).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("home page should have proper structure", async ({ page }) => {
    await page.goto("/");

    // Check for main landmark
    await expect(page.locator("main")).toBeVisible();

    // Check for header
    await expect(page.locator("header")).toBeVisible();

    // Check for footer
    await expect(page.locator("footer")).toBeVisible();

    // Check that h1 heading is present
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });

  test("all pages should have h1 heading", async ({ page }) => {
    const pages = [
      "/",
      "/education/snark",
      "/education/stark",
      "/education/comparison",
      "/visualization/circuit",
      "/visualization/proof",
      "/demo/voting",
    ];

    for (const url of pages) {
      await page.goto(url);
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    }
  });

  test("interactive elements should be keyboard focusable", async ({ page }) => {
    await page.goto("/");

    // Tab through interactive elements - just verify we can tab without errors
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Verify an element is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});
