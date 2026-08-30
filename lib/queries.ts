import type { SearchInput, SearchQuery } from "@/types/search";

function quote(value: string): string {
  return `"${value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim()}"`;
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

function buildSocialQueries(input: SearchInput, name: string): SearchQuery[] {
  const queries: SearchQuery[] = [
    {
      text: `${name} (site:instagram.com OR site:tiktok.com OR site:facebook.com OR site:x.com)`,
      kind: "social",
    },
    {
      text: `${name} (site:linkedin.com OR site:github.com OR site:youtube.com)`,
      kind: "social",
    },
  ];

  if (input.username) {
    queries.push({
      text: `${name} ${quote(input.username)} (site:instagram.com OR site:tiktok.com OR site:facebook.com OR site:x.com OR site:linkedin.com OR site:github.com)`,
      kind: "social",
    });
  }

  for (const profile of input.socialProfiles ?? []) {
    if (/^https?:\/\//i.test(profile)) {
      const host = hostname(profile);
      if (host) queries.push({ text: `${name} site:${host}`, kind: "social" });
    } else {
      queries.push({
        text: `${name} ${quote(profile)} (site:instagram.com OR site:tiktok.com OR site:facebook.com OR site:x.com OR site:youtube.com)`,
        kind: "social",
      });
    }
  }

  return queries;
}

export function buildIdentityQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const queries: SearchQuery[] = [{ text: name, kind: "identity" }];

  if (input.location) {
    queries.push({
      text: `${name} ${quote(input.location)}`,
      kind: "identity",
    });
  }

  if (input.company) {
    queries.push({
      text: `${name} ${quote(input.company)}`,
      kind: "professional",
    });
  }

  const profileHost = hostname(input.profileUrl);
  if (profileHost) {
    queries.push({
      text: `${name} site:${profileHost}`,
      kind: "identity",
    });
  }

  queries.push(
    ...buildSocialQueries(input, name),
    { text: `${name} (interview OR conference OR biography)`, kind: "general" },
    { text: `${name} filetype:pdf`, kind: "general" },
  );

  return unique(queries).slice(0, 13);
}

export function buildDeepQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
    ...buildSocialQueries(input, name),
    {
      text: `${name} (interview OR profile OR biography OR conference)`,
      kind: "general",
    },
    {
      text: `${name} (license OR registry OR registration OR credential)`,
      kind: "official",
    },
    {
      text: `${name} (court OR lawsuit OR regulator OR sanction)`,
      kind: "official",
    },
    {
      text: `${name} (news OR investigation)`,
      kind: "news",
    },
    {
      text: `${name} (complaint OR allegation OR fraud OR scam)`,
      kind: "concern",
    },
  ];

  if (input.location) {
    queries.push({
      text: `${name} ${quote(input.location)}`,
      kind: "identity",
    });
  }

  if (input.company) {
    queries.push({
      text: `${name} ${quote(input.company)}`,
      kind: "professional",
    });
  }

  if (input.claim) {
    queries.push({
      text: `${name} ${quote(input.claim)}`,
      kind: "claim",
    });
  }

  for (const url of input.confirmedIdentity?.urls ?? []) {
    const host = hostname(url);
    if (host) {
      queries.push({
        text: `${name} site:${host}`,
        kind: "identity",
      });
    }
  }

  return unique(queries).slice(0, 15);
}
