import { expect, test } from "@playwright/test";

test("completes identity confirmation and builds a Trust Brief", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Full name *").fill("Jane Unique-Surname");
  await page.getByLabel("City or country").fill("Zurich, Switzerland");
  await page.getByLabel("Employer or organization").fill("Example AG");
  await page
    .getByRole("checkbox")
    .check();

  await page.getByRole("button", { name: "Search the public web →" }).click();

  await expect(
    page.getByRole("heading", { name: "Is this the person?" }),
  ).toBeVisible();
  await expect(page.getByText(/context match/i)).toBeVisible();

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
    page.getByRole("alert"),
  ).toContainText("responsible and lawful use");
});
