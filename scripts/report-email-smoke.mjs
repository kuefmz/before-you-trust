const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const email = process.argv[2] || process.env.REPORT_SMOKE_EMAIL;

if (!email) {
  console.error(
    "Usage: npm run smoke:report-email -- you@example.com\n" +
      "Or set REPORT_SMOKE_EMAIL.",
  );
  process.exit(2);
}

const payload = {
  email,
  reportLabel: "Before You Trust email smoke test",
  searchedName: "Example Person",
  consentAccepted: true,
  website: "",
  results: [
    {
      title: "Example public source",
      url: "https://example.org/",
      snippet:
        "This is a deliberate Before You Trust delivery smoke test, not a finding about a real person.",
      sourceType: "web",
    },
  ],
};

const response = await fetch(`${baseUrl}/api/report-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "before-you-trust-report-email-smoke/1",
  },
  body: JSON.stringify(payload),
});

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(`HTTP ${response.status}`);
console.log(
  typeof body === "string" ? body : JSON.stringify(body, null, 2),
);

if (!response.ok) {
  process.exit(1);
}

console.log(
  "\nDelivery endpoint accepted the report. Check the recipient inbox and the Reports Google Sheet.",
);
