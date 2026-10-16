import type { Claim, EvidenceRecord, ResearchRun } from "./types.js";

/**
 * Source retrieval abstraction. Implementations MUST:
 *  - validate every URL with requirePublicHttpUrl before fetching (SSRF),
 *    and re-validate the DNS-resolved IP before connecting;
 *  - treat retrieved content as UNTRUSTED DATA, never as instructions
 *    (prompt-injection defense: no tool/credential use based on page content);
 *  - respect robots/ToS and copyright: store brief excerpts only, never
 *    republish full third-party articles.
 */
export interface SourceRetriever {
  id: string;
  retrieve(url: string): Promise<{ excerpt: string; publisher?: string }>;
}

export class ResearchService {
  constructor(private retriever: SourceRetriever) {}

  async run(input: { runId: string; articleId: string; claims: Claim[]; sourceUrls: string[] }): Promise<ResearchRun> {
    const run: ResearchRun = {
      id: input.runId,
      articleId: input.articleId,
      status: "running",
      startedAt: new Date().toISOString(),
      evidence: [],
      limitations: [],
    };
    // One retrieval per source; failures become limitations, not silent gaps.
    for (const url of input.sourceUrls) {
      try {
        const { excerpt, publisher } = await this.retriever.retrieve(url);
        run.evidence.push({
          id: `ev-${run.evidence.length + 1}`,
          claimId: input.claims[0]?.id ?? "article-level",
          sourceUrl: url,
          sourcePublisher: publisher,
          excerpt: excerpt.slice(0, 500), // brief excerpt only — copyright safeguard
          relation: "context",
          retrievalConfidence: 0.5, // placeholder until a real analyzer exists
          retrievedAt: new Date().toISOString(),
        });
      } catch (err) {
        run.limitations.push(`Failed to retrieve source ${url}: ${(err as Error).message}`);
      }
    }
    if (run.evidence.length === 0) run.limitations.push("No sources retrieved; report would be empty.");
    run.status = "completed";
    run.completedAt = new Date().toISOString();
    return run;
  }

  /** Indicator only. NEVER label an article authentic or fake from this score. */
  corroborationIndicator(run: ResearchRun): number {
    if (run.evidence.length === 0) return 0;
    const distinctHosts = new Set(run.evidence.map((e) => new URL(e.sourceUrl).hostname));
    const independence = distinctHosts.size / run.evidence.length;
    const supports = run.evidence.filter((e) => e.relation === "supports").length;
    return Math.min(1, (supports / run.evidence.length) * independence);
  }
}

/** Similarity alone never proves plagiarism. Keep this helper explicit and unused for verdicts. */
export function similarityIsNotPlagiarism(similarityScore: number): boolean {
  return similarityScore < Infinity; // always true — documented invariant
}
