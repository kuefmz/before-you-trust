function normalizeDiacritics(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");
}

/**
 * Exact-name matching is token-exact, not punctuation-exact.
 *
 * Examples that are intentionally equivalent:
 *   Ciuciu-Kiss === Ciuciu Kiss
 *   Te'o === Te o
 *   Jean–Luc === Jean Luc
 *
 * Spelling must still match token-for-token:
 *   Swiatek !== Swiatecki
 *   Te'o !== Te'ox
 */
export function canonicalNameWords(value: string): string[] {
  return normalizeDiacritics(value)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((word) => word.length > 0);
}

export function containsExactFullName(
  value: string,
  fullName: string,
): boolean {
  const haystack = canonicalNameWords(value);
  const needle = canonicalNameWords(fullName);

  if (needle.length < 2 || haystack.length < needle.length) return false;

  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (
      needle.every((word, offset) => haystack[index + offset] === word)
    ) {
      return true;
    }
  }

  return false;
}

export function exactNameSearchVariant(fullName: string): string {
  return canonicalNameWords(fullName).join(" ");
}

export function urlPathContainsExactFullName(
  rawUrl: string,
  fullName: string,
): boolean {
  const needle = canonicalNameWords(fullName);
  if (needle.length < 2) return false;

  try {
    const parsed = new URL(rawUrl);
    const pathWords = canonicalNameWords(decodeURIComponent(parsed.pathname));

    for (
      let index = 0;
      index <= pathWords.length - needle.length;
      index += 1
    ) {
      if (
        needle.every((word, offset) => pathWords[index + offset] === word)
      ) {
        return true;
      }
    }

    // Some profile systems collapse punctuation and spaces into one slug
    // segment. Compare the exact token sequence only after concatenation.
    const target = needle.join("");
    const segments = decodeURIComponent(parsed.pathname)
      .split("/")
      .map((segment) => canonicalNameWords(segment).join(""))
      .filter(Boolean);

    return segments.some((segment) => segment === target);
  } catch {
    return false;
  }
}
