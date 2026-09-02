import { expect, test } from "@playwright/test";

test("robots, sitemap and llms discovery files are populated", async ({
  request,
}) => {
  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain("User-Agent:");
  expect(robots).toContain("https://beforeyoutrust.org/sitemap.xml");

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("<urlset");
  expect(sitemap).toContain("https://beforeyoutrust.org/");
  expect(sitemap).toContain("https://beforeyoutrust.org/how-it-works");

  const llmsResponse = await request.get("/llms.txt");
  expect(llmsResponse.ok()).toBe(true);
  const llms = await llmsResponse.text();
  expect(llms).toContain("# Before You Trust");
  expect(llms).toContain("https://beforeyoutrust.org/sitemap.xml");
  expect(llms.length).toBeGreaterThan(500);
});
