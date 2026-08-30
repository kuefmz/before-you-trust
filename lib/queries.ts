import type { SearchInput, SearchQuery } from "@/types/search";

function quote(value: string): string {
  return \`"\${value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim()}"\`;
}

function unique(queries: SearchQuery[]): SearchQuery[] {
  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = query.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hostname(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function buildIdentityQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const queries: SearchQuery[] = [{ text: name, kind: "identity" }];

  if (input.location) {
    queries.push({
      text: \`\${name} \${quote(input.location)}\`,
      kind: "identity",
    });
  }

  if (input.company) {
    queries.push({
      text: \`\${name} \${quote(input.company)}\`,
      kind: "professional",
    });
  }

  if (input.username) {
    queries.push({
      text: \`\${name} \${quote(input.username)}\`,
      kind: "identity",
    });
  }

  const profileHost = hostname(input.profileUrl);
  if (profileHost) {
    queries.push({
      text: \`\${name} site:\${profileHost}\`,
      kind: "identity",
    });
  }

  queries.push(
    { text: \`\${name} LinkedIn\`, kind: "professional" },
    { text: \`\${name} GitHub\`, kind: "professional" },
    { text: \`\${name} (interview OR conference OR biography)\`, kind: "general" },
    { text: \`\${name} filetype:pdf\`, kind: "general" },
  );

  return unique(queries).slice(0, 9);
}

export function buildDeepQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
    {
      text: \`\${name} (interview OR profile OR biography OR conference)\`,
      kind: "general",
    },
    {
      text: \`\${name} (license OR registry OR registration OR credential)\`,
      kind: "official",
    },
    {
      text: \`\${name} (court OR lawsuit OR regulator OR sanction)\`,
      kind: "official",
    },
    {
      text: \`\${name} (news OR investigation)\`,
      kind: "news",
    },
    {
      text: \`\${name} (complaint OR allegation OR fraud OR scam)\`,
      kind: "concern",
    },
  ];

  if (input.location) {
    queries.push({
      text: \`\${name} \${quote(input.location)}\`,
      kind: "identity",
    });
  }

  if (input.company) {
    queries.push({
      text: \`\${name} \${quote(input.company)}\`,
      kind: "professional",
    });
  }

  if (input.claim) {
    queries.push({
      text: \`\${name} \${quote(input.claim)}\`,
      kind: "claim",
    });
  }

  for (const url of input.confirmedIdentity?.urls ?? []) {
    const host = hostname(url);
    if (host) {
      queries.push({
        text: \`\${name} site:\${host}\`,
        kind: "identity",
      });
    }
  }

  return unique(queries).slice(0, 11);
}
