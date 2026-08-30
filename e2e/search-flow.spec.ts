import { expect, test } from "@playwright/test";

test("runs the complete lifecycle with the founder benchmark name", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({ path: "lifecycle-01-search.png", fullPage: true });

  await page.getByLabel("Full name *").fill("Jenifer Tabita Ciuciu-Kiss");
  await page.getByLabel("City or country").fill("Zurich, Switzerland");
  await page.getByLabel("Employer or organization").fill("UBS");
  await page.getByLabel("Known username / handle").fill("kuefmz");
  await page
    .getByLabel("Known website or profile URL")
    .fill("https://jeniferciuciukiss.com/");
  await page
    .getByLabel("Social profiles or handles")
    .fill(
      "https://www.linkedin.com/in/jenifer-tabita-ciuciu-kiss/\nhttps://github.com/kuefmz",
    );
  await page.getByLabel("Photo of the person").setInputFiles({
    name: "person.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("checkbox").check();

  await page.screenshot({ path: "lifecycle-02-clues-added.png", fullPage: true });
  await page.getByRole("button", { name: "Search the public web →" }).click();

  await expect(
    page.getByRole("heading", { name: "Which person do you mean?" }),
  ).toBeVisible();
  await expect(page.getByText("Top match #1")).toBeVisible();
  await expect(page.getByText(/Photo web match:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "None of these — refine search" })).toBeVisible();
  await page.screenshot({ path: "lifecycle-03-confirm-identity.png", fullPage: true });

  await page.getByRole("button", { name: "This is them" }).first().click();
  await expect(page.getByRole("heading", { name: "Trust Brief" })).toBeVisible();
  await expect(page.getByText("unique public sources")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Social-media & photo matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Needs closer review" }),
  ).toBeVisible();
  await page.screenshot({ path: "lifecycle-04-trust-brief.png", fullPage: true });

  await page.locator("#email-report").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "lifecycle-05-email-report.png", fullPage: true });
  await page.getByLabel("Email address").fill("preview@example.test");
  await page.getByLabel(/I understand my email is used/i).check();
  await page.getByRole("button", { name: "Email me the report" }).click();
  await expect(page.getByText(/Check your inbox/i)).toBeVisible();
  await page.screenshot({ path: "lifecycle-06-email-sent.png", fullPage: true });
});

test("requires responsible-use confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Full name *").fill("Jane Unique-Surname");
  await page.getByRole("button", { name: "Search the public web →" }).click();
  await expect(page.locator(".error-banner[role='alert']")).toContainText(
    "responsible and lawful use",
  );
});

test("submits a story privately through the email route", async ({ page }) => {
  await page.goto("/share-your-story");
  await page
    .getByLabel("Your message")
    .fill(
      "This is a detailed story about something I wish I had been able to verify earlier.",
    );
  await page.getByLabel("I confirm that I am 18 or older.").check();
  await page.getByLabel(/I understand that this message is emailed/i).check();
  await page.getByRole("button", { name: "Send privately" }).click();
  await expect(page.getByText(/delivered privately/i)).toBeVisible();
});

test("does not show analytics consent when GTM is not configured", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("dialog", { name: "Analytics preferences" }),
  ).toHaveCount(0);
});
