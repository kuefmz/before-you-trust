import { readFile } from "node:fs/promises";

function fail(message) {
  console.error(`DEPLOYMENT PREFLIGHT FAILED: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

const [pkgRaw, amplify, envExample, gitignore, environmentDoc] = await Promise.all([
  readFile("package.json", "utf8"),
  readFile("amplify.yml", "utf8"),
  readFile(".env.example", "utf8"),
  readFile(".gitignore", "utf8"),
  readFile("docs/13-ENVIRONMENT.md", "utf8"),
]);

const pkg = JSON.parse(pkgRaw);

if (typeof pkg.engines?.node === "string" && pkg.engines.node.includes("22")) {
  pass("package.json pins Node.js 22+");
} else {
  fail("package.json must require Node.js 22+");
}

for (const required of ["nvm install 22", "npm ci", "npm run build", "baseDirectory: .next"]) {
  if (amplify.includes(required)) pass(`amplify.yml contains: ${required}`);
  else fail(`amplify.yml is missing: ${required}`);
}

if (
  amplify.includes("^NEXT_PUBLIC_") &&
  amplify.includes("SEARXNG_BASE_URL") &&
  amplify.includes("YACY_BASE_URL") &&
  amplify.includes("YACY_RESOURCE") &&
  amplify.includes("REPORT_APPS_SCRIPT_URL") &&
  amplify.includes("^RUNTIME_SECRETS_PARAMETER=")
) {
  pass("Amplify exports only public/non-secret endpoint config plus the SSM parameter name");
} else {
  fail("Amplify environment export rules are not in the expected safe form");
}

const forbiddenAmplifySecrets = [
  "YACY_PASSWORD",
  "GOOGLE_VISION_API_KEY",
];

for (const key of forbiddenAmplifySecrets) {
  if (amplify.includes(key)) fail(`${key} must not be written into amplify.yml`);
}
if (!forbiddenAmplifySecrets.some((key) => amplify.includes(key))) {
  pass("No server-side secret names are hard-coded into amplify.yml");
}

const requiredEnvKeys = [
  "RUNTIME_SECRETS_PARAMETER",
  "NEXT_PUBLIC_ALLOW_INDEXING=false",
  "SEARCH_PROVIDER=auto",
  "SEARXNG_BASE_URL",
  "SEARXNG_USERNAME",
  "SEARXNG_PASSWORD",
  "YACY_BASE_URL",
  "YACY_RESOURCE",
  "YACY_USERNAME",
  "YACY_PASSWORD",
  "GOOGLE_VISION_API_KEY",
  "REPORT_APPS_SCRIPT_URL",
];

for (const key of requiredEnvKeys) {
  if (!envExample.includes(key)) fail(`.env.example is missing ${key}`);
}
if (requiredEnvKeys.every((key) => envExample.includes(key))) {
  pass(".env.example documents the required and optional runtime configuration");
}

if (
  gitignore.includes(".env.local") &&
  gitignore.includes(".env.*.local") &&
  gitignore.includes("*.pem")
) {
  pass("Local secrets and PEM files are ignored");
} else {
  fail(".gitignore does not cover expected local secret files");
}

if (environmentDoc.includes("Add the selected search API key as an Amplify environment variable")) {
  fail("docs/13-ENVIRONMENT.md still contains the obsolete direct-secret Amplify instruction");
} else {
  pass("Deployment documentation avoids obsolete direct-secret search instructions");
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nDeployment preflight passed.");
