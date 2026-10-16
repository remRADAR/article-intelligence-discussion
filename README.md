# article-intelligence-discussion

Article registration, claim-level evidence research, transparent evidence reports, candidate FAQs, reader discussions, surveys, and moderation — with explicit editorial approval boundaries. TypeScript, provider-independent.

## Status: ALPHA — not release-ready for public retrieval or publication

See `HANDOFF_TO_MANUS.md` and `NAIRALEAP_INTEGRATION.md`.

## Verified package boundaries

- **Drafts by default.** The in-memory `EditorialGate` binds an explicit approval to a target type and SHA-256 content revision, and fails closed unless a host-supplied editor authorizer approves the decision. Evidence report publication also requires the approved reviewer/time metadata to match the recorded approval. This is not authentication, durable audit storage, or a production publication boundary; the host must recheck the exact revision at its server-side publication endpoint.
- **No live source-fetch transport.** `requirePublicHttpUrl()` is a syntactic first-line URL filter for known literal/special ranges, credentials, and ports. It does not resolve DNS, pin a connection, control redirects, or stop DNS rebinding. No HTTP worker is shipped. Do not enable outbound retrieval or describe the package as SSRF-safe until a network adapter enforces address validation, connection pinning, redirect revalidation, and bounded time/bytes/types.
- **No verdicts from scores.** `verdictFromScore()` deliberately throws; corroboration is an indicator, never "authentic" or "fake". Similarity alone never proves plagiarism.
- **Brief stored excerpts.** At most 500 Unicode code points are retained from a retriever response. This storage cap does not limit response bytes, network time, redirects, or memory consumed by an injected transport; the host transport must enforce those limits while streaming.
- **Aggregate survey output.** The API exposes counts, not individual responses. It does not authenticate respondents, prevent repeat submissions, rate-limit abuse, or establish consent/privacy policy.
- **Moderation is an in-memory status gate.** Posts default to pending and public views must filter approved items; the host must provide authenticated moderator authorization, durable audit history, privacy controls, and abuse prevention.
- **Retrieved content is untrusted data.** Any future retrieval worker must never act on instructions inside source pages.

## Modules

| Module | Status |
| --- | --- |
| `article` (registry + syntactic URL filter) | Implemented; not a network SSRF defense |
| `research` (injected retriever, runs, indicator) | Implemented; no network fetcher or transport controls |
| `approval` (revision-bound in-memory gate) | Implemented; host auth and durable publication controls required |
| `discussion` (posts, moderation, aggregate surveys) | Implemented in memory; host auth, persistence, and abuse controls required |
| persistence adapters (Neon/Supabase) | Not implemented |

## Development

Runtime source targets Node.js 18+, but the current development/test toolchain (Vitest 4 and ESLint 10) requires Node.js 20.19+; CI uses Node 20. Use:

```bash
npm ci
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

The package metadata currently declares MIT. Confirm that license choice with the owner before any package publication. No package has been published as part of this work.
