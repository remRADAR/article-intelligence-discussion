# article-intelligence-discussion

Article registration, claim-level evidence research, transparent evidence reports, candidate FAQs, reader discussions, surveys, and moderation — with hard editorial approval gates. TypeScript, provider-independent.

## Status: ALPHA — first implementation pass (awaiting independent audit)

See `HANDOFF_TO_MANUS.md`.

## Core guarantees (enforced in code and tests)

- **Drafts by default.** Evidence reports and generated FAQs cannot be published without an explicit recorded editorial approval (`EditorialGate`).
- **No verdicts from scores.** `verdictFromScore()` deliberately throws; corroboration is an indicator, never "authentic" or "fake".
- **Similarity is not plagiarism.** No code path labels plagiarism from similarity alone.
- **SSRF defense.** Every source URL passes `requirePublicHttpUrl`: http(s) only, loopback/private/link-local/metadata IPs blocked, non-standard ports and embedded credentials blocked, default-deny.
- **Prompt-injection defense.** Retrieved page content is untrusted data; retrieval workers must never act on instructions inside it.
- **Copyright safeguard.** Only brief excerpts (≤500 chars) are stored; sources are tracked; never republish third-party articles.
- **Survey privacy.** Only aggregates are exposed; there is no API to read individual respondents.
- **Moderation.** Discussion posts are pending until moderated; public views show approved posts only.

## Modules

| Module | Status |
| --- | --- |
| `article` (registry + SSRF guard) | Implemented, tested |
| `research` (retriever abstraction, runs, corroboration indicator) | Implemented, tested (retriever is an interface; no real fetcher yet) |
| `approval` (editorial gate) | Implemented, tested |
| `discussion` (posts, moderation, surveys) | Implemented, tested |
| persistence adapters (Neon/Supabase) | NOT IMPLEMENTED (planned) |

## Development

```bash
npm ci && npm test && npm run typecheck && npm run build
```

## License

MIT.
