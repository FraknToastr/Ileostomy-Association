const { test, expect } = require("playwright/test");

test.describe("stocktake SPA", () => {
  test("desktop dashboard renders without console errors", async ({ page }) => {
    const consoleMessages = [];
    page.on("console", message => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });

    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto("http://127.0.0.1:8026/index.html");

    await expect(page.locator(".topbar .brand-logo.light-logo")).toBeVisible();
    await expect(page.locator("#themeToggle svg")).toBeVisible();
    await expect(page.locator("#mobilePreview")).toHaveCount(0);
    await expect(page.locator("#headlineValue")).toHaveText("+$662.50");
    await expect(page.locator(".variance-track")).toHaveCount(0);
    await expect(page.locator("#underLabel")).toHaveCount(0);
    await expect(page.locator("#overLabel")).toHaveCount(0);
    await expect(page.locator("#stockRows tr")).toHaveCount(445);
    await expect(page.locator("#stockRows .status-chip").filter({ hasText: "Formula" })).toHaveCount(0);
    await expect(page.locator("#stockRows tr", { hasText: "12080" })).toContainText("50");
    await expect(page.locator("#stockRows tr", { hasText: "12080" })).toContainText("Pharma block 2");
    await expect(page.locator("#sectionChart")).not.toContainText("Pharma block");
    await expect(page.locator("#sectionChart")).toContainText("Coloplast");
    await expect(page.locator("#sectionChart")).toContainText("Omnigon");
    await expect(page.locator("#filterStatusPill")).toBeHidden();

    const auditRow = page.locator("#stockRows tr", { hasText: "7906" });
    await expect(auditRow).toContainText("+$17.40");
    await expect(auditRow.locator(".audit-chip")).toHaveCount(0);

    await expect(page.locator("#companyFilter")).toContainText("Dansac (DA/DAN)");
    await expect(page.locator("#companyFilter")).toContainText("Hollister (HO/HOL)");
    await page.locator("#companyFilter").selectOption("DA|DAN");
    await expect(page.locator("#filterStatusPill")).toBeVisible();
    await expect(page.locator("#filterStatusPill")).toHaveCSS("animation-name", "filterPulse");
    await expect(page.locator("#filterStatusText")).toHaveText("Dansac (DA/DAN)");
    await expect(page.locator("#stockRows tr")).toHaveCount(36);
    await expect(page.locator("#stockRows tr").first()).toContainText(/DA|DAN/);
    await page.locator("#clearFilterPill").click();
    await expect(page.locator("#filterStatusPill")).toBeHidden();
    await expect(page.locator("#companyFilter")).toHaveValue("all");
    await expect(page.locator("#stockRows tr")).toHaveCount(445);
    await page.locator("#companyFilter").selectOption("HO|HOL");
    await expect(page.locator("#stockRows tr")).toHaveCount(55);
    await expect(page.locator("#stockRows tr").first()).toContainText(/HO|HOL/);
    await page.locator("#companyFilter").selectOption("all");

    const selectedRow = page.locator("#stockRows tr", { hasText: "12080" });
    await selectedRow.click();
    await expect(selectedRow).toHaveClass(/is-selected/);
    await expect(selectedRow).toHaveAttribute("aria-selected", "true");
    await page.locator("#stockRows tr", { hasText: "7906" }).hover();
    await expect(selectedRow).toHaveClass(/is-selected/);
    await selectedRow.click();
    await expect(selectedRow).not.toHaveClass(/is-selected/);

    await expect(page.locator("th[data-sort-key]")).toHaveCount(14);
    for (const key of [
      "row",
      "code",
      "description",
      "company",
      "segment",
      "subsection",
      "price",
      "sams",
      "actual",
      "quantityDiff",
      "valueDiff",
      "workbookValueDiff",
      "status",
      "audit"
    ]) {
      const header = page.locator(`th[data-sort-key="${key}"]`);
      await header.locator(".sort-button").click();
      await expect(header).toHaveAttribute("aria-sort", "ascending");
    }

    await page.locator('th[data-sort-key="row"] .sort-button').click();
    await expect(page.locator("#stockRows tr").first().locator("td").first()).toHaveText("3");
    await page.locator('th[data-sort-key="row"] .sort-button').click();
    await expect(page.locator("#stockRows tr").first().locator("td").first()).toHaveText("527");
    expect(consoleMessages).toEqual([]);
  });

  test("mobile stocktake mode renders and updates counts", async ({ page }) => {
    const consoleMessages = [];
    page.on("console", message => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:8026/index.html");

    await expect(page.locator(".mobile-title .brand-logo.light-logo")).toBeVisible();
    await expect(page.locator("#mobileTheme svg")).toBeVisible();
    await expect(page.locator("#desktopPreview")).toHaveCount(0);
    await expect(page.locator(".mobile-title h2")).toHaveText("Stocktake");
    await expect(page.locator(".stock-card")).toHaveCount(120);

    const firstCount = page.locator(".stock-card input[data-action='input']").first();
    const before = Number(await firstCount.inputValue());
    await page.locator(".stock-card button[data-action='inc']").first().click();
    await expect(firstCount).toHaveValue(String(before + 1));
    expect(consoleMessages).toEqual([]);
  });
});
