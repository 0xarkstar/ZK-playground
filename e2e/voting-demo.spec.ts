import { test, expect } from "@playwright/test";

test.describe("Voting Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/voting");
  });

  test("should display page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Secret Voting Demo" })
    ).toBeVisible();
  });

  test("should display demo context", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Secret Voting Demo" })).toBeVisible();
    await expect(page.getByText("Contract Deployment")).toBeVisible();
  });

  test("should show real blockchain alert", async ({ page }) => {
    await expect(page.getByText("Real Blockchain Demo")).toBeVisible();
    await expect(page.getByText(/Base Sepolia/i).first()).toBeVisible();
  });

  test("should display wallet connection section", async ({ page }) => {
    await expect(page.getByText("Wallet Connection")).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
  });

  test("should have Vote and How tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Vote" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "How" })).toBeVisible();
  });

  test("should display contract deployment section", async ({ page }) => {
    await expect(page.getByText("Contract Deployment")).toBeVisible();
    await expect(page.getByRole("button", { name: /deploy contracts/i })).toBeVisible();
  });

  test("should display voter registration section", async ({ page }) => {
    await expect(page.getByText("Voter Registration", { exact: true })).toBeVisible();
  });

  test("should display ZK proof generation section", async ({ page }) => {
    await expect(page.getByText("ZK Proof Generation")).toBeVisible();
    await expect(page.getByText("Register as a voter first")).toBeVisible();
  });

  test("should display voting panel with yes/no options", async ({ page }) => {
    await expect(page.getByText("Cast Your Vote")).toBeVisible();
    await expect(page.getByRole("button", { name: /- Yes$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /- No$/i })).toBeVisible();
  });

  test("should display progress section", async ({ page }) => {
    // Progress is in the sidebar
    const progress = page.locator("text=Progress").first();
    await expect(progress).toBeVisible();
    await expect(page.getByText("Deploy Contracts").first()).toBeVisible();
  });

  test("should display live results", async ({ page }) => {
    await expect(page.getByText("Live Results")).toBeVisible();
    await expect(page.getByText(/votes/i).first()).toBeVisible();
  });

  test("should display contract info", async ({ page }) => {
    await expect(page.getByText("Contract Info")).toBeVisible();
    await expect(page.getByText("Base Sepolia").first()).toBeVisible();
    await expect(page.getByText("Not deployed").first()).toBeVisible();
  });

  test("should switch to How It Works tab", async ({ page }) => {
    await page.getByRole("tab", { name: "How" }).click();
    await expect(page.getByText("How Anonymous Voting Works")).toBeVisible();
    await expect(page.getByText("The Privacy Problem")).toBeVisible();
    await expect(page.getByText("The ZK Solution")).toBeVisible();
  });
});

test.describe("Voting Demo - Vote Selection (without wallet)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/voting");
  });

  test("should select yes vote", async ({ page }) => {
    await page.getByRole("button", { name: /- Yes$/i }).click();
    await expect(page.getByText("Your selection")).toBeVisible();
  });

  test("should select no vote", async ({ page }) => {
    await page.getByRole("button", { name: /- No$/i }).click();
    await expect(page.getByText("Your selection")).toBeVisible();
  });
});

test.describe("Voting Demo - Step-by-Step Process", () => {
  test("should display all steps in How It Works", async ({ page }) => {
    await page.goto("/demo/voting");
    await page.getByRole("tab", { name: "How" }).click();

    await expect(page.getByText("Step-by-Step Process")).toBeVisible();
    // Check for step titles in How It Works tab
    await expect(page.getByRole("heading", { name: "Deploy Contracts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Register Voters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start Voting" })).toBeVisible();
  });

  test("should display progress steps on sidebar", async ({ page }) => {
    await page.goto("/demo/voting");

    // Progress sidebar shows step names
    await expect(page.getByText("Progress").first()).toBeVisible();
    await expect(page.getByText("Deploy Contracts").first()).toBeVisible();
    await expect(page.getByText("Register Identity")).toBeVisible();
    await expect(page.getByText("Start Voting")).toBeVisible();
    await expect(page.getByText("Generate Proof").first()).toBeVisible();
    await expect(page.getByText("Submit Vote")).toBeVisible();
    await expect(page.getByText("Complete")).toBeVisible();
  });
});

test.describe("Voting Demo - Contract Deployment UI", () => {
  test("should show deployment requirements", async ({ page }) => {
    await page.goto("/demo/voting");

    await expect(page.getByText("Groth16Verifier")).toBeVisible();
    await expect(page.getByText("SecretVoting")).toBeVisible();
    await expect(page.getByText(/Requires Base Sepolia ETH/i)).toBeVisible();
  });

  test("should have faucet link", async ({ page }) => {
    await page.goto("/demo/voting");

    const faucetLink = page.getByRole("link", { name: /base faucet/i }).first();
    await expect(faucetLink).toBeVisible();
    await expect(faucetLink).toHaveAttribute("href", /docs\.base\.org.*faucets/);
  });
});
