import type { SearchInput, SearchQuery } from "@/types/search";

function clean(value: string): string {
  return value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

function quote(value: string): string {
  return `"${clean(value)}"`;
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

const DEFAULT_SOCIAL_HOSTS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "x.com",
  "github.com",
  "youtube.com",
  "reddit.com",
] as const;

function buildSocialQueries(input: SearchInput, name: string): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const contextTerms = [input.location, input.company]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(quote);

  // User-supplied clues are the strongest social/profile hints, so search them
  // before generic platform queries.
  for (const profile of input.socialProfiles ?? []) {
    if (/^https?:\/\//i.test(profile)) {
      const host = hostname(profile);
      if (host) {
        queries.push({
          text: `${name} site:${host}`,
          kind: "social",
        });
      }
    } else {
      queries.push({
        text: `${name} ${quote(profile)}`,
        kind: "social",
      });
    }
  }

  for (const host of DEFAULT_SOCIAL_HOSTS) {
    queries.push({
      text: `${name} site:${host}`,
      kind: "social",
    });

    if (contextTerms.length > 0) {
      queries.push({
        text: `${name} ${contextTerms.join(" ")} site:${host}`,
        kind: "social",
      });
    }
  }

  return unique(queries).slice(0, 14);
}

export function buildIdentityQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const plainName = clean(input.name);
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
    { text: plainName, kind: "identity" },
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

  if (input.location && input.company) {
    queries.push({
      text: `${name} ${quote(input.location)} ${quote(input.company)}`,
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
    { text: `${name} interview`, kind: "general" },
    { text: `${name} conference`, kind: "general" },
    { text: `${name} biography`, kind: "general" },
    { text: `${name} filetype:pdf`, kind: "general" },
  );

  return unique(queries).slice(0, 22);
}

export function buildDeepQueries(input: SearchInput): SearchQuery[] {
  const researchName = input.confirmedIdentity?.searchName?.trim() || input.name;
  const name = quote(researchName);
  const plainName = clean(researchName);
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
    { text: plainName, kind: "identity" },
  ];

  if (clean(input.name).toLowerCase() !== plainName.toLowerCase()) {
    queries.push({
      text: quote(input.name),
      kind: "identity",
    });
  }

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

  queries.push(
    ...buildSocialQueries(input, name).slice(0, 5),
    { text: `${name} profile`, kind: "general" },
    { text: `${name} registry`, kind: "official" },
    { text: `${name} court`, kind: "official" },
    { text: `${name} regulator`, kind: "official" },
    { text: `${name} news`, kind: "news" },
    { text: `${name} complaint`, kind: "concern" },
    { text: `${name} fraud`, kind: "concern" },
  );

  for (const url of input.confirmedIdentity?.urls ?? []) {
    const host = hostname(url);
    if (host) {
      queries.push({
        text: `${name} site:${host}`,
        kind: "identity",
      });
    }
  }

  return unique(queries).slice(0, 24);
}
