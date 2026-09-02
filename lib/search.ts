import { rankCompanyResults } from "@/lib/company-relevance";
import {
  containsExactFullName,
  urlPathContainsExactFullName,
} from "@/lib/exact-name";
import { buildDeepQueries, buildIdentityQueries } from "@/lib/queries";
import { dedupeResults, type ResultContribution } from "@/lib/normalize";
import {
  SearchConfigurationError,
  searchQuery,
} from "@/lib/providers";
import type {
  SearchInput,
  SearchQuery,
  SearchResponse,
} from "@/types/search";

export { SearchConfigurationError };

const QUERY_TIMEOUT_MS = 7_500;
const SEARCH_BUDGET_MS = 18_000;
const CONCURRENCY = 4;

export class SearchExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchExecutionError";
  }
}

function identityResultScore(
  result: ReturnType<typeof dedupeResults>[number],
  fullName: string,
): number {
  let score = 0;

  if (containsExactFullName(result.title, fullName)) {
    score += 100;
  } else if (
    containsExactFullName(`${result.title} ${result.snippet}`, fullName)
  ) {
    score += 90;
  }

  if (urlPathContainsExactFullName(result.url, fullName)) {
    score += 80;
  }

  if (result.sourceType === "professional") score += 25;
  if (result.sourceType === "social") score += 20;
  if (result.queryKinds.includes("social")) score += 12;
  if (result.queryKinds.includes("professional")) score += 12;
  if (result.queryKinds.includes("identity")) score += 6;

  return score;
}

function rankIdentityResults(
  results: ReturnType<typeof dedupeResults>,
  fullName: string,
) {
  return [...results].sort(
    (a, b) =>
      identityResultScore(b, fullName) - identityResultScore(a, fullName),
  );
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index]!);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runner(),
    ),
  );

  return output;
}

function withTimeout(parentSignal: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error("Search query timed out."));
  }, QUERY_TIMEOUT_MS);

  const abortFromParent = () => controller.abort(parentSignal.reason);
  parentSignal.addEventListener("abort", abortFromParent, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", abortFromParent);
    },
  };
}

async function executeQuery(
  query: SearchQuery,
  requestSignal: AbortSignal,
): Promise<{
  contributions: ResultContribution[];
  providers: string[];
  warnings: string[];
}> {
  const timeout = withTimeout(requestSignal);

  try {
    const response = await searchQuery(query.text, timeout.signal);
    return {
      providers: response.providers,
      warnings: response.warnings,
      contributions: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        publishedAt: result.publishedAt,
        provider: result.provider,
        query: query.text,
        queryKind: query.kind,
      })),
    };
  } catch (error) {
    if (error instanceof SearchConfigurationError) throw error;
    return {
      contributions: [],
      providers: [],
      warnings: [
        error instanceof Error ? error.message : "A search query failed.",
      ],
    };
  } finally {
    timeout.cleanup();
  }
}

export async function executeSearch(
  input: SearchInput,
  requestSignal: AbortSignal,
): Promise<Omit<SearchResponse, "requestId">> {
  const queries =
    input.mode === "identity"
      ? buildIdentityQueries(input)
      : buildDeepQueries(input);

  const budgetController = new AbortController();
  const budgetTimer = setTimeout(() => {
    budgetController.abort(new Error("Search request time budget reached."));
  }, SEARCH_BUDGET_MS);
  const combinedSignal = AbortSignal.any([
    requestSignal,
    budgetController.signal,
  ]);

  let queryResults: Awaited<ReturnType<typeof executeQuery>>[];
  try {
    queryResults = await runWithConcurrency(
      queries,
      CONCURRENCY,
      (query) => executeQuery(query, combinedSignal),
    );
  } finally {
    clearTimeout(budgetTimer);
  }

  const contributions = queryResults.flatMap((item) => item.contributions);
  const warnings = [...new Set(queryResults.flatMap((item) => item.warnings))];
  const providers = [
    ...new Set(
      queryResults.flatMap((item) => item.providers),
    ),
  ];

  if (contributions.length === 0 && warnings.length > 0) {
    throw new SearchExecutionError(
      "Search providers did not return usable results. Please try again.",
    );
  }

  const deduped = dedupeResults(
    contributions,
    input.mode === "identity" ? 160 : 90,
  );
  const results =
    input.subjectType === "company"
      ? rankCompanyResults(deduped, input).slice(0, 40)
      : input.mode === "identity"
        ? rankIdentityResults(deduped, input.name).slice(0, 70)
        : deduped.slice(0, 60);

  return {
    mode: input.mode,
    providers,
    queriesRun: queries.length,
    results,
    warnings,
  };
}
