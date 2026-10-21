/**
 * Levele smoke test.
 *
 * Usage:
 *   npx playwright install chromium
 *   npm run dev
 *   BASE_URL=http://localhost:3000 npm run test:smoke
 */
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`CONSOLE: ${message.text()}`);
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await page.goto(base, { waitUntil: "networkidle" });
  assert(await page.getByText("Design like you").count(), "dashboard hero did not render");

  await page.locator(".quick-card").first().click();
  await page.waitForURL("**/editor/**", { timeout: 15000 });
  await page.waitForTimeout(2200);
  assert(await page.locator(".canvas-viewport canvas").count(), "editor canvas did not mount");

  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: /A clear heading/i }).click();
  await page.waitForTimeout(600);
  assert(await page.locator(".page-thumb canvas").count(), "page thumbnail did not render");

  await page.getByRole("button", { name: "Present", exact: true }).first().click();
  await page.waitForTimeout(700);
  assert(await page.locator(".present-overlay").count(), "present mode did not open");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: /^Download$/i }).click();
  const download = await downloadPromise;
  const target = path.join(os.tmpdir(), "levele-smoke-export.png");
  await download.saveAs(target);
  assert(fs.statSync(target).size > 10_000, "PNG export is unexpectedly small");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.getByRole("button", { name: /Share/i }).first().click();
  await page.waitForTimeout(500);
  assert(await page.locator(".share-link code").count(), "share links were not generated");

  // Live sync: a fresh browser joins through the encrypted relay, and edits flow both ways.
  await page.getByRole("button", { name: /Start live session/i }).click();
  const liveCode = page.locator(".share-link code", { hasText: "#room=" });
  await liveCode.waitFor({ timeout: 20000 });
  const liveLink = await liveCode.innerText();
  assert(!liveLink.includes("?"), "live link leaks data into the query string");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const title = page.getByLabel("Design title");
  await title.fill("Synced from A");
  await title.press("Enter");

  const peerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const peer = await peerContext.newPage();
  peer.on("pageerror", (error) => errors.push(`PEER PAGEERROR: ${error.message}`));
  await peer.goto(liveLink);
  const peerTitle = peer.getByLabel("Design title");
  await peerTitle.waitFor({ timeout: 30000 });
  await peer.waitForFunction(
    () => document.querySelector('[aria-label="Design title"]')?.value === "Synced from A",
    null,
    { timeout: 20000 },
  );
  await peerTitle.fill("Edited by B");
  await peerTitle.press("Enter");
  await page.waitForFunction(
    () => document.querySelector('[aria-label="Design title"]')?.value === "Edited by B",
    null,
    { timeout: 20000 },
  );

  // Reopening must keep the latest edit, not roll back to older relay state.
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByLabel("Design title").waitFor({ timeout: 20000 });
  await page.waitForTimeout(4000);
  assert(
    (await page.getByLabel("Design title").inputValue()) === "Edited by B",
    "design rolled back after reopening a live session",
  );
  await peerContext.close();

  // Ending the session forgets the key: after a reload the design stays offline.
  await page.getByRole("button", { name: /Share/i }).first().click();
  await page.getByRole("button", { name: /End live session/i }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByLabel("Design title").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /Share/i }).first().click();
  await page.getByRole("button", { name: /Start live session/i }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await page.locator(".editor-topbar .brand").click();
  await page.waitForTimeout(2200);
  assert(
    (await page.locator(".design-card").count()) >= 1,
    "saved design did not appear on the dashboard",
  );

  assert(errors.length === 0, `browser errors:\n${errors.join("\n")}`);
  console.log("✓ Levele smoke test passed");
  console.log(`  base: ${base}`);
  console.log(`  export: ${target} (${Math.round(fs.statSync(target).size / 1024)} KB)`);
} catch (error) {
  console.error("✗ Levele smoke test failed");
  console.error(error);
  console.error(errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
