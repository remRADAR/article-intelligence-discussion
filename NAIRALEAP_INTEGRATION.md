# NairaLeap Integration — Article Intelligence & Discussion

## Status and scope

This branch documents a safe UI boundary; it does not add or change plugin runtime code. NairaLeap's current integration branch is `remRADAR/NairaLeap:integration/nairaleap-plugin-vibe`. On article detail pages it shows a read-only “Evidence & discussion — Not enabled” notice. Existing migrated article content and original-source links remain as they are. The frontend does not load this package as a dependency.

No article URL fetching, evidence submission, comments, community surveys, automated verdicts, or publication controls are enabled.

## SSRF and source retrieval blocker

The package exports a `SourceRetriever` interface and a syntactic URL guard; it does not ship a network fetch worker. DNS resolution is not checked and bound to the eventual socket, redirects are not safely revalidated, and tests currently use stub retrievers. Do not enable arbitrary URL fetches from NairaLeap using the URL guard alone.

A future worker must validate every DNS A/AAAA answer, deny private/link-local/loopback/metadata/multicast/unspecified/reserved addresses, connect only to a vetted address while preserving TLS hostname validation, manually revalidate every redirect, and bound ports, time, redirects, response bytes, content types, and concurrency. Add isolated regressions for DNS rebinding/answer changes, IPv4/IPv6 special ranges, blocked redirect targets, and limits; require independent security review.

## Editorial governance blocker

`EditorialGate` is an in-memory item-ID map. It accepts a non-empty caller-supplied approver string and does not bind approval to immutable content. The package does not provide host authentication, role/tenant authorization, durable persistence, or an audit trail. Do not use it as a publication trust boundary.

Before publishing integrations, bind approvals to canonical immutable revision hashes, invalidate on edits, and verify authenticated authorized editors and the exact approved revision server-side. Public evidence/discussion also requires host-defined anonymity, moderation, abuse, idempotency/duplicate, persistence, and privacy controls.

## Configuration and fallback

No new environment variables, permissions, or credentials are introduced. NairaLeap's existing original-source link remains the only article source affordance in this phase. The status notice is the fallback; no comments/evidence are stored.

## Verification

NairaLeap's focused Cypress spec verifies the status notice appears and exposes no submission controls. Network retrieval, DNS/redirect safety, authorization, approval freshness, persistence, moderation, and public discussion are not implemented or tested here.
