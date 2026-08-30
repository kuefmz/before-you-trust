import { expect, test } from "@playwright/test";

test("completes identity confirmation and builds a Trust Brief", async ({
  page,
}) => {
  await page.goto("/");

  await page.screenshot({
    path: "homepage-desktop.png",
    fullPage: true,
  });

  await page.getByLabel("Full name *").fill("Jane Unique-Surname");
  await page.getByLabel("City or country").fill("Zurich, Switzerland");
  await page.getByLabel("Employer or organization").fill("Example AG");
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Search the public web →" }).click();

  await expect(
    page.getByRole("heading", { name: "Is this the person?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Jane Unique-Surname — context match",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "This is them" }).first().click();

  await expect(
    page.getByRole("heading", { name: "Trust Brief" }),
  ).toBeVisible();
  await expect(page.getByText("unique public sources")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Needs closer review" }),
  ).toBeVisible();
});

test("requires responsible-use confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Full name *").fill("Jane Unique-Surname");
  await page.getByRole("button", { name: "Search the public web →" }).click();

  await expect(
    page.locator(".error-banner[role='alert']"),
  ).toContainText("responsible and lawful use");
});

test("submits a story privately through the email route", async ({ page }) => {
  await page.goto("/share-your-story");

  await page
    .getByLabel("Your message")
    .fill(
      "This is a detailed story about something I wish I had been able to verify earlier.",
    );
  await page.getByLabel("I confirm that I am 18 or older.").check();
  await page
    .getByLabel(/I understand that this message is emailed/i)
    .check();
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
