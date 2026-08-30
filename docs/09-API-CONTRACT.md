# API Contract — MVP

## POST `/api/search`

### Request
```json
{
  "name": "Jane Unique-Surname",
  "location": "Zurich, Switzerland",
  "company": "Example AG",
  "username": "janesmith",
  "profileUrl": "https://example.com/jane",
  "mode": "identity"
}
```

Only `name` is required.

### Response
```json
{
  "queryId": "ephemeral-id",
  "results": [
    {
      "title": "...",
      "url": "https://...",
      "snippet": "...",
      "sourceType": "professional_profile",
      "publishedAt": null,
      "query": "..."
    }
  ]
}
```

## POST `/api/search` — deep mode
```json
{
  "name": "Jane Unique-Surname",
  "confirmedIdentity": {
    "location": "Zurich, Switzerland",
    "employer": "Example AG",
    "urls": ["https://..."]
  },
  "mode": "deep"
}
```

## API rules
- Validate input length.
- Rate-limit abusive traffic.
- Never return provider API keys.
- Keep raw provider-specific data server-side; normalize fields.
- Do not log searched names in production analytics.
- Return source URLs with every result object.
- Fail explicitly when a provider is unavailable; do not fabricate substitute results.

## Suggested result type
```ts
type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  publishedAt: string | null;
  query: string;
};
```
