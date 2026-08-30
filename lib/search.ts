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

const QUERY_TIMEOUT_MS = 9_000;
const CONCURRENCY = 3;

export class SearchExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchExecutionError";
  }
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
  provider?: string;
  warnings: string[];
}> {
  const timeout = withTimeout(requestSignal);

  try {
    const response = await searchQuery(query.text, timeout.signal);
    return {
      provider: response.provider,
      warnings: response.warnings,
      contributions: response.results.map((result) => ({
        ...result,
        provider: response.provider,
        query: query.text,
        queryKind: query.kind,
      })),
    };
  } catch (error) {
    if (error instanceof SearchConfigurationError) throw error;
    return {
      contributions: [],
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

  const queryResults = await runWithConcurrency(
    queries,
    CONCURRENCY,
    (query) => executeQuery(query, requestSignal),
  );

  const contributions = queryResults.flatMap((item) => item.contributions);
  const warnings = [...new Set(queryResults.flatMap((item) => item.warnings))];
  const providers = [
    ...new Set(
      queryResults
        .map((item) => item.provider)
        .filter((provider): provider is string => Boolean(provider)),
    ),
  ];

  if (contributions.length === 0 && warnings.length > 0) {
    throw new SearchExecutionError(
      "Search providers did not return usable results. Please try again.",
    );
  }

  return {
    mode: input.mode,
    providers,
    queriesRun: queries.length,
    results: dedupeResults(contributions, input.mode === "identity" ? 45 : 60),
    warnings,
  };
}
