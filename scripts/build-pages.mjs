import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, readFileSync, writeFileSync, rmSync } from "node:fs";
const api = "app/api";
const backup = ".api-disabled-for-pages";
const config = "next.config.ts";
const original = readFileSync(config, "utf8");
if (existsSync(backup)) throw new Error("Stale API backup exists; restore it before continuing.");
try {
  renameSync(api, backup);
  // Keep server API routes in source, but exclude them from the static export build.
  writeFileSync(config, original);
  execFileSync("npm", ["run", "build"], { stdio: "inherit", env: { ...process.env, PAGES_EXPORT: "true" } });
  mkdirSync("out", { recursive: true });
  writeFileSync("out/CNAME", "beforeyoutrust.org\n");
  writeFileSync("out/.nojekyll", "");
} finally {
  writeFileSync(config, original);
  if (existsSync(backup)) renameSync(backup, api);
}
