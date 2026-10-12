import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
const api = "app/api";
const backup = ".api-disabled-for-pages";
if (existsSync(backup)) throw new Error("Stale API backup exists; restore it before continuing.");
try {
  renameSync(api, backup);
  // Keep server API routes in source, but exclude them from the static export build.
  execFileSync("npm", ["run", "build"], { stdio: "inherit", env: { ...process.env, PAGES_EXPORT: "true" } });
  mkdirSync("out", { recursive: true });
  writeFileSync("out/CNAME", "beforeyoutrust.org\n");
  writeFileSync("out/.nojekyll", "");
} finally {
  if (existsSync(backup)) renameSync(backup, api);
}
