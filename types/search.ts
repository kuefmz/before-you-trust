export type SearchMode = "identity" | "deep";

export type SearchContext =
  | "dating"
  | "business"
  | "professional"
  | "community"
  | "online"
  | "other";

export type QueryKind =
  | "identity"
  | "professional"
  | "official"
  | "news"
  | "concern"
  | "claim"
  | "general";

export type SourceType =
  | "official"
  | "professional"
  | "social"
  | "news"
  | "personal"
  | "web";

export interface ConfirmedIdentity {
  label: string;
  confidence: "high" | "medium" | "low";
  supportingSignals: string[];
  urls: string[];
}

export interface SearchInput {
  name: string;
  location?: string;
  company?: string;
  username?: string;
  profileUrl?: string;
  claim?: string;
  context?: SearchContext;
  mode: SearchMode;
  lawfulUseAccepted: boolean;
  confirmedIdentity?: ConfirmedIdentity;
}

export interface SearchQuery {
  text: string;
  kind: QueryKind;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceType: SourceType;
  publishedAt: string | null;
  providers: string[];
  queries: string[];
  queryKinds: QueryKind[];
}

export interface SearchResponse {
  requestId: string;
  mode: SearchMode;
  providers: string[];
  queriesRun: number;
  results: SearchResult[];
  warnings: string[];
}

export interface IdentityCandidate {
  id: string;
  label: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  supportingSignals: string[];
  conflictingSignals: string[];
  sources: SearchResult[];
}
