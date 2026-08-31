function normalizeDiacritics(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");
}

function canonicalWord(value: string): string {
  return normalizeDiacritics(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

export function canonicalNameWords(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .map(canonicalWord)
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

export function urlPathContainsExactFullName(
  rawUrl: string,
  fullName: string,
): boolean {
  const target = canonicalNameWords(fullName).join("");
  if (!target) return false;

  try {
    const parsed = new URL(rawUrl);
    const segments = decodeURIComponent(parsed.pathname)
      .split("/")
      .map(canonicalWord)
      .filter(Boolean);

    for (let start = 0; start < segments.length; start += 1) {
      let combined = "";
      for (
        let end = start;
        end < Math.min(segments.length, start + 4);
        end += 1
      ) {
        combined += segments[end];
        if (combined === target) return true;
        if (combined.length > target.length) break;
      }
    }

    return false;
  } catch {
    return false;
  }
}
