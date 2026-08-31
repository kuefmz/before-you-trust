import { readFile } from "node:fs/promises";

const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const benchmarkSource = await readFile(
  new URL("../benchmarks/netflix-identity-cases.ts", import.meta.url),
  "utf8",
);

const netflixNames = [...benchmarkSource.matchAll(/name:\s*"([^"]+)"/g)].map(
  (match) => match[1],
);

const extraNames = process.argv.slice(2).filter(Boolean);
const names = [...new Set([...netflixNames, ...extraNames])];

function normalizeWords(value) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .split(/[^\p{L}\p{N}]+/gu)
    .filter(Boolean);
}

function containsExactName(value, fullName) {
  const haystack = normalizeWords(value);
  const needle = normalizeWords(fullName);
  if (needle.length < 2 || haystack.length < needle.length) return false;

  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((word, offset) => haystack[index + offset] === word)) {
      return true;
    }
  }

  return false;
}

function resultMatches(result, fullName) {
  if (containsExactName(`${result.title || ""} ${result.snippet || ""}`, fullName)) {
    return true;
  }

  try {
    const pathname = decodeURIComponent(new URL(result.url).pathname).replace(
      /[-_.]+/g,
      " ",
    );
    return containsExactName(pathname, fullName);
  } catch {
    return false;
  }
}

async function checkName(name, index) {
  const response = await fetch(`${baseUrl}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Local rate limiting includes user-agent, so each benchmark case gets a
      // separate bucket without weakening the application's production limits.
      "User-Agent": `before-you-trust-live-benchmark/${index + 1}`,
    },
    body: JSON.stringify({
      name,
      mode: "identity",
      lawfulUseAccepted: true,
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return {
      name,
      ok: false,
      providers: [],
      resultCount: 0,
      exactCount: 0,
      reason:
        payload?.error?.message ||
        `HTTP ${response.status} from ${baseUrl}/api/search`,
    };
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const exact = results.filter((result) => resultMatches(result, name));

  return {
    name,
    ok: exact.length > 0,
    providers: Array.isArray(payload.providers) ? payload.providers : [],
    resultCount: results.length,
    exactCount: exact.length,
    sample: exact[0]?.url || "",
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    reason:
      exact.length > 0
        ? ""
        : "No returned result contained the exact full name.",
  };
}

const rows = [];
for (let index = 0; index < names.length; index += 1) {
  const row = await checkName(names[index], index);
  rows.push(row);
  const mark = row.ok ? "✓" : "✗";
  console.log(
    `${mark} ${row.name} — exact=${row.exactCount}, total=${row.resultCount}, providers=${row.providers.join(",") || "none"}`,
  );
  if (!row.ok) {
    console.log(`  ${row.reason}`);
    for (const warning of row.warnings || []) {
      console.log(`  warning: ${warning}`);
    }
  }
}

const passed = rows.filter((row) => row.ok).length;
const failed = rows.length - passed;

console.log(
  `\nLive identity retrieval benchmark: ${passed}/${rows.length} passed.`,
);

if (failed > 0) {
  console.error(
    `${failed} exact-name identities were not retrieved. This search stack is not launch-ready.`,
  );
  process.exit(1);
}

console.log("All live exact-name retrieval cases passed.");
