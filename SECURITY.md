# Security policy

- Report vulnerabilities via GitHub Security Advisories — not issues.
- All outbound retrieval MUST validate URLs with `requirePublicHttpUrl` (SSRF) and re-validate the resolved IP post-DNS before connecting (documented limitation of the current guard).
- Retrieved content is untrusted input: never execute, follow instructions from, or pass credentials based on it (prompt injection).
- Store only brief excerpts; respect robots.txt, terms of service, and copyright.
- Evidence scores are indicators. Never present them as proof of authenticity or plagiarism.
- Publication of reports/FAQs requires an explicit recorded editorial approval; do not add bypass paths.
- Survey responses are aggregate-only by design; do not add individual-level read APIs.
- Never commit credentials or production data.
