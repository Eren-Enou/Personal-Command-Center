import { expect, test } from "@playwright/test";

test("capture, convert, organize, search, and back up a local workspace", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little less to remember." }),
  ).toBeVisible();
  await page
    .getByLabel("Quick capture")
    .fill("Starlight journal: track weekend observations");
  await page.getByLabel("Quick capture").press("Enter");
  await expect(page.getByText("Saved to inbox")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByText("Inbox", { exact: true })
    .click();
  await page.getByRole("link", { name: /Starlight journal: track/ }).click();
  await page.getByRole("button", { name: "Convert to record" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Starlight journal");
  await page
    .getByRole("button", { name: "Convert entry", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Starlight journal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Starlight journal: track weekend observations", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Next step").fill("Sketch the entry screen");
  await page.getByLabel("Tags").fill("astronomy, weekend");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Sketch the entry screen")).toBeVisible();

  for (const [domain, singular, title] of [
    ["Games", "game", "Moonfall Expedition"],
    ["Media", "media item", "The Glass Orchard"],
    ["Ideas", "idea", "A map of discoveries"],
    ["Utilities", "utility", "Local preview command"],
    ["Notes", "note", "Observatory notes"],
  ] as const) {
    await page
      .getByRole("navigation")
      .getByText(domain, { exact: true })
      .click();
    await page
      .getByRole("button", { name: `+ New ${singular}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Title", { exact: true })
      .fill(title);
    await page.getByLabel("Tags").fill("weekend");
    if (domain === "Games")
      await page
        .getByLabel("Current goal")
        .fill("Explore the northern lighthouse");
    if (domain === "Media")
      await page
        .getByLabel("Progress", { exact: true })
        .fill("Chapter 8 of 24");
    if (domain === "Utilities")
      await page
        .getByLabel("Content", { exact: true })
        .fill("python -m http.server 8080");
    if (domain === "Notes") {
      await page
        .getByLabel("Body", { exact: true })
        .fill("Start with one observation.");
      await page.getByLabel("Related type").selectOption("projects");
      await page
        .getByLabel("Related record")
        .selectOption({ label: "Starlight journal" });
    }
    await page
      .getByRole("button", { name: `Create ${singular}`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await page.getByLabel("Search everything").fill("weekend");
  await page.getByLabel("Search everything").press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "7 results" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Starlight journal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Observatory notes", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByText("Inbox", { exact: true })
    .click();
  await page.getByLabel("Show archived").check();
  await expect(
    page.getByRole("link", { name: /Starlight journal: track/ }),
  ).toBeVisible();

  await page
    .getByRole("navigation")
    .getByText("Settings", { exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath("backup.json");
  await download.saveAs(backupPath);
  await page.getByLabel("JSON backup").setInputFiles(backupPath);
  await page.getByRole("button", { name: "Validate & import" }).click();
  await expect(page.getByRole("alert")).toContainText("Import conflicts");

  await page
    .getByRole("navigation")
    .getByText("Dashboard", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Current projects" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("dashboard-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
