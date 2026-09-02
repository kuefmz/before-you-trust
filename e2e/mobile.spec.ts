import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("homepage is usable on a phone-sized viewport", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Verify someone online before trust gets expensive.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /coffee/i })).toBeVisible();

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  await expect(
    page.getByRole("navigation", { name: "Mobile primary navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "How it works" }).last()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation menu" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Start a free search →" }).click();
  await expect(page.getByLabel("Full name *")).toBeVisible();
  await expect(
    page.getByText("Add more information to improve the match", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Known website or profile URL")).not.toBeVisible();

  await page
    .locator("summary")
    .filter({ hasText: "Add more information to improve the match" })
    .click();

  await expect(page.getByLabel("Known website or profile URL")).toBeVisible();
  await expect(page.getByLabel("Photo of the person")).toBeVisible();

  await page.screenshot({ path: "homepage-mobile.png", fullPage: true });
});
