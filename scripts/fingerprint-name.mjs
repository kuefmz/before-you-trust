import { createHmac } from "node:crypto";

const name = process.argv.slice(2).join(" ").trim();
const secret = process.env.SEARCH_FINGERPRINT_SECRET?.trim();

if (!name || !secret) {
  console.error(
    "Usage: SEARCH_FINGERPRINT_SECRET=... npm run fingerprint:name -- \"Exact Name\"",
  );
  process.exit(1);
}

const normalized = name
  .normalize("NFKC")
  .toLocaleLowerCase("en")
  .replace(/\s+/g, " ")
  .trim();

process.stdout.write(
  createHmac("sha256", secret).update(normalized, "utf8").digest("hex"),
);
