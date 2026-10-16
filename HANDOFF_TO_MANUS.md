# HANDOFF TO MANUS — article-intelligence-discussion

## Repository URL and branch/commit

- Repository: https://github.com/remRADAR/article-intelligence-discussion
- Branch: `main`. Initial implementation pushed as the first code commit on top of the README-only init commit. Record the exact commit SHA here after auditing.
- Note: repository was created manually by the owner (the build integration could not create repositories; `403 Resource not accessible by integration`).

## Implemented modules

- `src/article.ts` — `ArticleRegistry`; `requirePublicHttpUrl`/`isBlockedHost` SSRF guard (http(s) only; loopback/private/link-local/metadata/multicast blocked; standard ports only; no embedded credentials; default-deny).
- `src/research.ts` — `SourceRetriever` interface (implementations must validate URLs, treat content as untrusted data — prompt injection — and store only brief excerpts for copyright), `ResearchService` runs with limitations tracking, `corroborationIndicator` (indicator only), explicit `similarityIsNotPlagiarism` invariant.
- `src/approval.ts` — `EditorialGate`: drafts by default; publication of evidence reports and candidate FAQs requires a recorded approval with approver identity; `verdictFromScore` always throws (scores are not verdicts).
- `src/discussion.ts` — `DiscussionService` (pending-until-moderated, approved-only public view) and `SurveyService` (aggregate-only results).
- Persistence adapters: NOT IMPLEMENTED (planned; optional Neon/Supabase).

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Actual test results

- Tests authored (vitest: SSRF guard incl. cloud-metadata IP, editorial gating, research limitations, moderation, survey privacy) but **not executed in the authoring environment — no Node runtime was available**. First authoritative results come from CI on first push. Treat a red first CI run as expected risk; fix defects rather than deleting assertions.
- `npm run lint` requires ESLint config which is NOT yet present (outstanding work); the lint step may fail in CI until a config is added.

## Environment variables / provider prerequisites

- None required for core. A future real retriever needs egress config; keep SSRF validation independent of provider config.

## Database schemas and migrations

- None. Persistence adapters must derive schema from actual host inspection (RADARSite = Neon; NairaLeap = Supabase) and never touch host production schemas without separate authorization.

## Security assumptions and known risks

- SSRF guard is syntactic + IP-literal aware; **DNS resolution + post-resolution IP re-check is a known gap** — the retriever implementation must re-validate after DNS. Flagged in code docs and tests.
- Prompt-injection defense is a contract on `SourceRetriever` implementations, not yet mechanically enforced.
- Editorial gate is in-memory and has no authN/authZ of its own — host provides identity; adapter phase must define roles (editor vs reader).
- Tenant isolation is not implemented (single-tenant in-memory stores).

## Mocked or incomplete features

- No real fetch/retrieval worker (interface + fake test retriever only).
- Claim extraction/entailment analysis is not implemented (`relation` defaults to "context", `retrievalConfidence` placeholder 0.5).
- No persistence, no API layer, no UI, no ESLint config.

## Known bugs / prioritized outstanding work

1. Run CI for authoritative test results (first reviewer action); add ESLint config.
2. DNS-resolution SSRF re-check in the real retriever (security priority).
3. AuthN/authZ + tenant isolation model before any multi-tenant deployment.
4. Claim-level analyzer (entailment, relation classification) — needs a vetted NLP provider, treat outputs as drafts.
5. Persistence adapters (Neon for RADARSite integration planning; Supabase for NairaLeap).
6. Shared GitHub Project board (blocked: no Projects capability in current integration).

## Reproduction for the independent reviewer

```bash
git clone https://github.com/remRADAR/article-intelligence-discussion.git
cd article-intelligence-discussion
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

Cross-repository dependencies: nigerian-language-engine (localized UI strings), voice-speech-engine (read-aloud of approved reports — must respect the same approval gates).
