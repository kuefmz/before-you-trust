import { exactNameSearchVariant } from "@/lib/exact-name";
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

  // First guarantee broad coverage across every major platform.
  for (const host of DEFAULT_SOCIAL_HOSTS) {
    queries.push({
      text: `${name} site:${host}`,
      kind: "social",
    });
  }

  return unique(queries).slice(0, 10);
}

function buildCompanyIdentityQueries(input: SearchInput): SearchQuery[] {
  const name = quote(input.name);
  const queries: SearchQuery[] = [{ text: name, kind: "identity" }];
  const siteHost = hostname(input.profileUrl);

  if (input.location) {
    queries.push({
      text: `${name} ${quote(input.location)}`,
      kind: "identity",
    });
  }

  if (siteHost) {
    queries.push(
      { text: `${name} site:${siteHost}`, kind: "identity" },
      { text: `${quote(siteHost)} reviews`, kind: "general" },
    );
  }

  queries.push(
    { text: `${name} reviews`, kind: "general" },
    { text: `${name} registry`, kind: "official" },
    { text: `${name} company register`, kind: "official" },
    { text: `${name} news`, kind: "news" },
  );

  return unique(queries).slice(0, 16);
}

function buildCompanyDeepQueries(input: SearchInput): SearchQuery[] {
  const researchName = input.confirmedIdentity?.searchName?.trim() || input.name;
  const name = quote(researchName);
  const queries: SearchQuery[] = [{ text: name, kind: "identity" }];
  const siteHost =
    hostname(input.profileUrl) ||
    input.confirmedIdentity?.urls.map((url) => hostname(url)).find(Boolean);

  if (input.location) {
    queries.push({
      text: `${name} ${quote(input.location)}`,
      kind: "identity",
    });
  }

  if (siteHost) {
    queries.push(
      { text: `${name} site:${siteHost}`, kind: "identity" },
      { text: `${quote(siteHost)} reviews`, kind: "general" },
      { text: `${quote(siteHost)} scam`, kind: "concern" },
    );
  }

  if (input.claim) {
    queries.push({
      text: `${name} ${quote(input.claim)}`,
      kind: "claim",
    });
  }

  queries.push(
    { text: `${name} reviews`, kind: "general" },
    { text: `${name} registry`, kind: "official" },
    { text: `${name} company register`, kind: "official" },
    { text: `${name} regulator`, kind: "official" },
    { text: `${name} news`, kind: "news" },
    { text: `${name} complaints`, kind: "concern" },
    { text: `${name} scam`, kind: "concern" },
    { text: `${name} fraud`, kind: "concern" },
    { text: `${name} refund`, kind: "concern" },
    { text: `${name} counterfeit`, kind: "concern" },
  );

  return unique(queries).slice(0, 20);
}

export function buildIdentityQueries(input: SearchInput): SearchQuery[] {
  if (input.subjectType === "company") {
    return buildCompanyIdentityQueries(input);
  }

  const name = quote(input.name);
  const equivalentName = quote(exactNameSearchVariant(input.name));
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
  ];

  if (equivalentName.toLowerCase() !== name.toLowerCase()) {
    queries.push({ text: equivalentName, kind: "identity" });
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
    { text: `${name} profile`, kind: "general" },
    { text: `${name} conference`, kind: "general" },
    { text: `${name} filetype:pdf`, kind: "general" },
  );

  return unique(queries).slice(0, 16);
}

export function buildDeepQueries(input: SearchInput): SearchQuery[] {
  if (input.subjectType === "company") {
    return buildCompanyDeepQueries(input);
  }

  const researchName = input.confirmedIdentity?.searchName?.trim() || input.name;
  const name = quote(researchName);
  const equivalentName = quote(exactNameSearchVariant(researchName));
  const queries: SearchQuery[] = [
    { text: name, kind: "identity" },
  ];

  if (equivalentName.toLowerCase() !== name.toLowerCase()) {
    queries.push({ text: equivalentName, kind: "identity" });
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

  return unique(queries).slice(0, 20);
}
