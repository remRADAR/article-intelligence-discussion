# NairaLeap Integration — Article Intelligence & Discussion

## Status and scope

This branch documents a safe UI boundary; it does not add or change plugin runtime code. NairaLeap's article detail page shows a read-only “Evidence & discussion — Not enabled” notice. Existing migrated article content and original-source links remain unchanged; the frontend does not load this package as a dependency.

No arbitrary URL fetching, evidence submission, comments, community surveys, automated verdicts, or publication controls are enabled.

## SSRF and source retrieval blocker

The package exports a `SourceRetriever` interface and a syntactic first-line URL filter; it does not ship an HTTP worker. The filter can reject known literal/special IPs, credentials, schemes, and ports, but does not resolve DNS, pin the vetted address to the socket, revalidate redirects, or prevent DNS rebinding/TOCTOU. Tests use stub retrievers. Do not enable arbitrary URL fetching based on this check.

A future worker must validate every A/AAAA answer, deny private/link-local/loopback/metadata/multicast/unspecified/reserved addresses, connect only to a vetted address while preserving TLS hostname verification, disable automatic redirects and revalidate each hop, and impose strict time, byte, redirect, content-type, port, and concurrency limits. Add isolated tests for rebinding/address changes, IPv4/IPv6 special ranges, blocked redirect targets, and bounded failures, then obtain independent security review.

## Editorial governance boundary

`EditorialGate` binds each in-memory approval to an exact typed content SHA-256 revision and target type, rejects stale/duplicate/terminal decisions, and requires an injected `EditorialAuthorizationValidator` for approve/reject. Evidence report `approvedBy`/`approvedAt` must match the recorded approval. Without a trusted validator, decisions fail closed. This mitigates the earlier stale-content/string-identity finding in the library boundary but is not host authentication or durable audit storage.

This remains an in-memory library gate, not host authentication, role/tenant authorization, durable audit history, or a production publication boundary. The host must revalidate the exact revision at its authenticated server-side publish endpoint. Public evidence/discussion also requires host-defined identity/anonymity, moderation, abuse/idempotency, persistence, and privacy controls.

## Configuration and fallback

No new environment variables, permissions, credentials, or external requests are introduced. NairaLeap's existing source link remains the only article source affordance. The status notice is the fallback; no discussion or evidence is stored.

## Verification

The NairaLeap Cypress spec verifies the notice appears and exposes no submission controls. Package tests verify the syntactic URL filter, non-leaking bounded research failures, revision-bound approvals, and no score-based verdicts; these do **not** demonstrate safe network transport. Retrieval, DNS/redirect safety, host authorization, durable persistence, moderation, and public discussion remain unimplemented.

This stacked documentation PR targets `audit/stage-2-quality-gates`, which carries `package-lock.json`; CI includes that base as a pull-request target so `npm ci` can run. The quality-gate PR remains a prerequisite before this documentation PR can be retargeted to `main`.
