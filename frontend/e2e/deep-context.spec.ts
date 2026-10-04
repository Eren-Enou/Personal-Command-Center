import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("accumulate, retrieve and back up shared context across Media and Projects", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/media");
  await page.getByRole("button", { name: "+ New media item" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Deep Context manga");
  await page
    .getByRole("button", { name: "Create media item", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Deep Context manga", exact: true }),
  ).toBeVisible();
  const parentUrl = page.url();
  for (const name of ["Reiner", "Chapter 42"]) {
    await page.getByRole("button", { name: "+ Topic" }).click();
    await page.getByLabel("Topic name").fill(name);
    await page.getByRole("button", { name: "Create Topic" }).click();
    await expect(
      page.getByRole("button", { name: `${name} (0)` }),
    ).toBeVisible();
  }
  for (const [body, topics] of [
    [
      "Quicksilver suspicion\nThe reaction connects character and chapter.",
      ["Reiner", "Chapter 42"],
    ],
    ["Character-only observation", ["Reiner"]],
    ["A thought without a Topic", []],
  ] as const) {
    await page.getByRole("button", { name: "Add note…" }).click();
    await page
      .getByRole("textbox", { name: "Observation", exact: true })
      .fill(body);
    for (const name of topics)
      await page.getByRole("checkbox", { name, exact: true }).check();
    await page
      .getByRole("textbox", { name: "Observation", exact: true })
      .press("Control+Enter");
    await expect(
      page.locator(".context-body").filter({ hasText: body }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Reiner (2)" }).click();
  await expect(page.getByRole("article", { name: "Context Note" })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Chapter 42 (1)" }).click();
  await expect(page.getByRole("article", { name: "Context Note" })).toHaveCount(
    1,
  );
  await expect(page.locator(".context-body")).toContainText(
    "Quicksilver suspicion",
  );
  await page.getByRole("button", { name: "All (3)" }).click();
  await expect(page.getByRole("article", { name: "Context Note" })).toHaveCount(
    3,
  );
  await page.getByLabel("Search everything").fill("Quicksilver suspicion");
  await page.getByLabel("Search everything").press("Enter");
  await expect(page.locator(".search-results")).toContainText("Context Note");
  await page.locator(".search-results").getByRole("link").click();
  await expect(page.locator(".focused-context")).toContainText(
    "Quicksilver suspicion",
  );
  await page
    .locator(".focused-context")
    .getByRole("button", { name: /Edit observation/ })
    .click();
  await page
    .getByRole("textbox", { name: "Observation", exact: true })
    .fill("Quicksilver suspicion confirmed\nKeep both Topic associations.");
  await expect(
    page.getByRole("checkbox", { name: "Reiner", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Chapter 42", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.locator(".context-body").filter({ hasText: "confirmed" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".focused-context")).toContainText("confirmed");
  await page.getByRole("button", { name: "Manage topic Reiner" }).click();
  await page.getByLabel("Topic name").fill("Reiner evidence");
  await page.getByLabel("Description (optional)").fill("Character clues");
  await page.getByRole("button", { name: "Save Topic" }).click();
  await expect(
    page.getByRole("button", { name: "Reiner evidence (2)" }),
  ).toBeVisible();
  await page.getByLabel("Search everything").fill("Reiner evidence");
  await page.getByLabel("Search everything").press("Enter");
  await expect(page.locator(".search-results")).toContainText("Topic");
  await page.locator(".search-results").getByRole("link").click();
  await expect(
    page.getByRole("button", { name: "Reiner evidence (2)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article", { name: "Context Note" })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "All (3)" }).click();
  // The Topic selector stays bounded even with dozens of local Topics.
  for (let i = 0; i < 24; i++) {
    await page.getByRole("button", { name: "+ Topic" }).click();
    await page.getByLabel("Topic name").fill(`Worldbuilding detail ${i + 1}`);
    await page.getByRole("button", { name: "Create Topic" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  for (const width of [390, 952, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".topic-bar")
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(182);
    await expect(page.getByRole("button", { name: "Add note…" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Related Notes" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`deep-context-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/projects");
  await page.getByRole("button", { name: "+ New project" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Context architecture project");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Topic" }).click();
  await page.getByLabel("Topic name").fill("Architecture");
  await page.getByRole("button", { name: "Create Topic" }).click();
  await page.getByRole("button", { name: "Add note…" }).click();
  await page
    .getByRole("textbox", { name: "Observation", exact: true })
    .fill(
      "Keep migrations explicit rather than inventing domain-specific models.",
    );
  await page
    .getByRole("checkbox", { name: "Architecture", exact: true })
    .check();
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(
    page.getByRole("button", { name: "Architecture (1)" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".context-body")).toContainText(
    "Keep migrations explicit",
  );
  await page.goto("/settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  const download = await pending;
  const path = testInfo.outputPath("deep-context-backup.json");
  await download.saveAs(path);
  const backup = JSON.parse(await readFile(path, "utf8"));
  expect(backup.schema_version).toBe(3);
  expect(backup.topics).toHaveLength(27);
  expect(backup.context_notes).toHaveLength(4);
  expect(
    backup.context_notes.find((n: { body: string }) =>
      n.body.includes("confirmed"),
    ).topic_ids,
  ).toHaveLength(2);
  await page.goto(parentUrl);
  await page.getByRole("button", { name: "Manage topic Chapter 42" }).click();
  await page.getByRole("button", { name: "Delete Topic" }).click();
  await page.getByRole("button", { name: "Remove Topic" }).click();
  await expect(page.getByRole("button", { name: "All (3)" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reiner evidence (2)" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Delete observation A thought without a Topic",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete observation", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "All (2)" })).toBeVisible();
  expect(errors).toEqual([]);
});
