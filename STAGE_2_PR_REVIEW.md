# Stage 2 PR Review — Article Intelligence & Discussion

**Reviewed:** 2026-10-16 (UTC)  
**Code PR:** [#6](https://github.com/remRADAR/article-intelligence-discussion/pull/6)  
**Code head reviewed:** `dcc56569e7844c3ed00c7dfbbc4f1156554d6eaf` (`audit/stage-2-quality-gates`)  
**Stacked docs PR:** [#7](https://github.com/remRADAR/article-intelligence-discussion/pull/7), head `d65317297b203c7851841f704de7860f9728613a`  
**State at review:** both open; merge state `CLEAN`; latest checks pass. This is a reviewer summary, not a GitHub approval record.

## Review outcome

**Recommend PR #6 for merge as an alpha analysis/governance library only.** No source-fetching worker or production publication endpoint is included. This recommendation does not authorize enabling outbound retrieval, public discussion, or publication in a host application.

## Changes and evidence

- `requirePublicHttpUrl()` provides a syntactic first-line policy covering the tested schemes, credentials, ports, and private/special IPv4/IPv6 literals, including mapped/compatible and documentation/benchmark/multicast cases. `ResearchService` revalidates at its boundary, bounds the number of sources and excerpt length, avoids returning raw retriever errors, and reports empty runs as failed.
- The package still has **no network transport**. There is no DNS resolution, socket pinning, redirect handling, or HTTP response-size/content-type enforcement in this library.
- Editorial approvals bind to the typed target and exact content revision hash, require an injected host editor authorizer, prevent duplicate/repeated terminal transitions, and check report approval metadata. The gate is in-memory, not durable authentication, authorization, or audit history.
- Discussion and survey outputs use defensive copies and duplicate-identifier checks; host moderation, identity/anonymity, persistence, idempotency, and privacy rules remain external.
- An independent read-only review found no further package-level defect in the reviewed source/tests. Local `npm ci`, full `npm audit` (0 vulnerabilities), lint, typecheck, unit tests, build, package dry-run, and installed-tarball import smoke test passed. GitHub Actions [run 38900535502](https://github.com/remRADAR/article-intelligence-discussion/actions/runs/38900535502) passed on the reviewed code head; stacked docs Actions [run 38900593738](https://github.com/remRADAR/article-intelligence-discussion/actions/runs/38900593738) passed on the docs head.
- The full tracked-file `detect-secrets` scan produced one `Basic Auth Credentials` candidate at `tests/article.test.ts:35`; manual inspection confirmed it is a deliberately fake credential-bearing `example.com` URL used as a URL-rejection test fixture, not a real secret. No candidate value is reproduced here.

## Critical residual risk and issue links

**Keep arbitrary outbound source retrieval disabled.** The syntactic URL filter cannot prevent DNS rebinding or TOCTOU between DNS validation and the actual socket. A future transport must validate every A/AAAA answer, connect only to an approved pinned address while preserving TLS hostname validation, manually re-check each redirect hop, and enforce port, redirect-count, connection/total-time, response-byte, content-type, and concurrency limits. This must be exercised in an isolated harness and independently reviewed before enabling the capability.

- [Issue #1 — first CI and ESLint](https://github.com/remRADAR/article-intelligence-discussion/issues/1): reproducible CI/lint gates are implemented; leave open until merge and owner confirmation.
- [Issue #2 — post-DNS SSRF validation in a real worker](https://github.com/remRADAR/article-intelligence-discussion/issues/2) remains a release blocker; no worker exists.
- [Issue #3 — real retriever and claim-level analyzer](https://github.com/remRADAR/article-intelligence-discussion/issues/3), [#4 — authN/authZ and tenant isolation](https://github.com/remRADAR/article-intelligence-discussion/issues/4), and [#5 — persistence adapters](https://github.com/remRADAR/article-intelligence-discussion/issues/5) remain open.
- Do not treat the in-memory approval gate as publication authorization. The server must authenticate/authorize the editor, recheck the precise revision at publication, and persist an auditable decision.

## Review comments

- Earlier SSRF/editorial blocker details: [PR #6 comment](https://github.com/remRADAR/article-intelligence-discussion/pull/6#issuecomment-6212329445).
- Final code review follow-up: [PR #6 comment](https://github.com/remRADAR/article-intelligence-discussion/pull/6#issuecomment-6215592677).
- Docs-only integration review: [PR #7 comment](https://github.com/remRADAR/article-intelligence-discussion/pull/7#issuecomment-6215593662).
