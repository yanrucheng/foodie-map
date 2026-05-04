/**
 * Puppeteer E2E tests for the title filter (segment pickers).
 *
 * Tests both desktop (dropdown) and mobile (bottom sheet) interactions
 * for the guide segment picker in the DynamicTitle component.
 *
 * Usage: node tests/title-filter.test.mjs
 * Requires: dev server running on http://localhost:5173
 */

import puppeteer from "puppeteer";

const BASE_URL = "http://localhost:5173";
const MOBILE_VIEWPORT = { width: 390, height: 844, isMobile: true, hasTouch: true };
const DESKTOP_VIEWPORT = { width: 1280, height: 800, isMobile: false, hasTouch: false };

/** Helper: wait a bit for animations and re-renders. */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Collects test results. */
const results = [];
function report(name, passed, detail = "") {
  results.push({ name, passed, detail });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// Desktop Tests
// ---------------------------------------------------------------------------

async function testDesktopTitleFilter(browser) {
  const page = await browser.newPage();
  await page.setViewport(DESKTOP_VIEWPORT);
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });
  await delay(500);

  // Test 1: Verify the dynamic title is rendered
  const titleEl = await page.$(".dynamic-title");
  report("Desktop: DynamicTitle element exists", !!titleEl);

  // Test 2: Verify year and city pickers are NOT interactive (single option)
  const allChips = await page.$$(".seg-chip");
  const interactiveChips = await page.$$(".seg-chip--interactive");
  report(
    "Desktop: Only guide picker is interactive (1 of 3 chips)",
    interactiveChips.length === 1,
    `Found ${interactiveChips.length} interactive out of ${allChips.length} total chips`
  );

  // Test 3: Click the interactive guide chip — dropdown should open
  if (interactiveChips.length >= 1) {
    await interactiveChips[0].click();
    await delay(300);

    const dropdown = await page.$(".seg-dropdown");
    report("Desktop: Dropdown opens on chip click", !!dropdown);

    // Test 4: Check dropdown items
    const items = await page.$$(".seg-dropdown-item");
    report(
      "Desktop: Dropdown has 2 guide options",
      items.length === 2,
      `Found ${items.length} items`
    );

    // Test 5: Get current selected item
    const selectedItem = await page.$(".seg-dropdown-item--selected");
    const selectedText = selectedItem
      ? await page.evaluate((el) => el.textContent, selectedItem)
      : null;
    report(
      "Desktop: One dropdown item is marked selected",
      !!selectedItem,
      `Selected: "${selectedText}"`
    );

    // Test 6: Verify the dropdown item is not obscured by other elements (z-index regression)
    const hitTestOk = await page.evaluate(() => {
      const item = document.querySelector(".seg-dropdown-item:not(.seg-dropdown-item--selected)");
      if (!item) return false;
      const rect = item.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === item || item.contains(hit);
    });
    report("Desktop: Dropdown item not obscured (z-index ok)", hitTestOk);

    // Test 7: Click the non-selected item to switch guide
    const nonSelectedItem = await page.$(".seg-dropdown-item:not(.seg-dropdown-item--selected)");
    const targetText = nonSelectedItem
      ? await page.evaluate((el) => el.textContent, nonSelectedItem)
      : null;

    if (nonSelectedItem) {
      await nonSelectedItem.click();
      await delay(500);

      // Test 8: Verify dropdown closes after selection
      const dropdownAfter = await page.$(".seg-dropdown");
      report("Desktop: Dropdown closes after selection", !dropdownAfter);

      // Test 9: Verify chip label updated
      const chipLabel = await page.$eval(".seg-chip--interactive .seg-chip-label", (el) => el.textContent);
      report(
        "Desktop: Chip label updates to selected guide",
        chipLabel === targetText,
        `Expected "${targetText}", got "${chipLabel}"`
      );

      // Test 10: Verify URL updated with new guide
      const url = new URL(page.url());
      const guideParam = url.searchParams.get("guide");
      report(
        "Desktop: URL guide param changed to michelin-starred",
        guideParam === "michelin-starred",
        `guide=${guideParam}`
      );

      // Test 11: Verify document title updated
      const docTitle = await page.title();
      report(
        "Desktop: document.title reflects new guide",
        docTitle.includes("米其林星级"),
        `Title: "${docTitle}"`
      );
    } else {
      report("Desktop: Could not find non-selected item to click", false);
    }
  } else {
    report("Desktop: Dropdown opens on chip click", false, "No interactive chip found");
  }

  await page.close();
}

// ---------------------------------------------------------------------------
// Mobile Tests
// ---------------------------------------------------------------------------

async function testMobileTitleFilter(browser) {
  const page = await browser.newPage();
  await page.setViewport(MOBILE_VIEWPORT);
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });
  await delay(1000); // extra wait for lazy-loaded MobileShell

  // Test 1: Verify mobile title rendered (compact mode)
  const titleEl = await page.$(".dynamic-title--compact");
  report("Mobile: DynamicTitle compact element exists", !!titleEl);

  // Test 2: Check for mobile interactive chips
  const mobileInteractiveChips = await page.$$(".seg-chip--mobile.seg-chip--interactive");
  report(
    "Mobile: Only guide picker is interactive (1 mobile chip)",
    mobileInteractiveChips.length === 1,
    `Found ${mobileInteractiveChips.length} interactive mobile chips`
  );

  // Test 3: Tap the interactive mobile chip — bottom sheet should open
  if (mobileInteractiveChips.length >= 1) {
    await mobileInteractiveChips[0].click();
    await delay(500);

    const sheet = await page.$(".bottom-sheet-container");
    report("Mobile: Bottom sheet opens on chip tap", !!sheet);

    // Test 4: Check sheet items
    const sheetItems = await page.$$(".seg-sheet-item");
    report(
      "Mobile: Bottom sheet has 2 guide options",
      sheetItems.length === 2,
      `Found ${sheetItems.length} items`
    );

    // Test 5: Get current selected item
    const selectedSheetItem = await page.$(".seg-sheet-item--selected");
    const selectedSheetText = selectedSheetItem
      ? await page.evaluate((el) => el.querySelector(".seg-sheet-item-label")?.textContent || el.textContent, selectedSheetItem)
      : null;
    report(
      "Mobile: One sheet item is marked selected",
      !!selectedSheetItem,
      `Selected: "${selectedSheetText}"`
    );

    // Test 6: Tap the non-selected item to switch guide
    const nonSelectedSheetItem = await page.$(".seg-sheet-item:not(.seg-sheet-item--selected)");
    const targetSheetText = nonSelectedSheetItem
      ? await page.evaluate((el) => el.querySelector(".seg-sheet-item-label")?.textContent || el.textContent, nonSelectedSheetItem)
      : null;

    if (nonSelectedSheetItem) {
      // Use page.evaluate for click — avoids hit-test issues with bottom sheet layers
      await page.evaluate(() => {
        const item = document.querySelector(".seg-sheet-item:not(.seg-sheet-item--selected)");
        if (item) item.click();
      });
      await delay(500);

      // Test 7: Verify bottom sheet closes after selection
      const sheetAfter = await page.$(".bottom-sheet-container");
      report("Mobile: Bottom sheet closes after selection", !sheetAfter);

      // Test 8: Verify chip label updated
      const chipLabel = await page.$eval(
        ".seg-chip--mobile.seg-chip--interactive .seg-chip-label",
        (el) => el.textContent
      );
      report(
        "Mobile: Chip label updates to selected guide",
        chipLabel === targetSheetText,
        `Expected "${targetSheetText}", got "${chipLabel}"`
      );

      // Test 9: Verify URL updated
      const url = new URL(page.url());
      const guideParam = url.searchParams.get("guide");
      report(
        "Mobile: URL guide param changed to michelin-starred",
        guideParam === "michelin-starred",
        `guide=${guideParam}`
      );

      // Test 10: Verify document title updated
      const docTitle = await page.title();
      report(
        "Mobile: document.title reflects new guide",
        docTitle.includes("米其林星级"),
        `Title: "${docTitle}"`
      );
    } else {
      report("Mobile: Could not find non-selected sheet item to tap", false);
    }
  } else {
    report("Mobile: Bottom sheet opens on chip tap", false, "No interactive mobile chip found");
  }

  await page.close();
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔍 Title Filter E2E Tests");
  console.log("=".repeat(60));

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log("\n📺 Desktop Tests:");
    console.log("-".repeat(40));
    await testDesktopTitleFilter(browser);

    console.log("\n📱 Mobile Tests:");
    console.log("-".repeat(40));
    await testMobileTitleFilter(browser);
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Summary: ${passed}/${total} tests passed`);

  if (passed < total) {
    console.log("\n❌ FAILED TESTS:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}${r.detail ? `: ${r.detail}` : ""}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
