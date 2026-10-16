import { requirePublicHttpUrl } from "./article.js";
import type { Claim, ResearchRun } from "./types.js";

const MAX_SOURCE_URLS = 20;
const MAX_EXCERPT_CHARACTERS = 500;

const truncateCodePoints = (value: string, limit: number): string => {
  const result: string[] = [];
  for (const character of value) {
    if (result.length >= limit) break;
    result.push(character);
  }
  return result.join("");
};

/**
 * Source retrieval abstraction. No network transport is shipped in this package.
 * Any host implementation must validate each URL and redirect, resolve and
 * reject non-public IPv4/IPv6 answers, pin the validated address for connection,
 * enforce time/byte/type/redirect bounds, and treat content as untrusted data.
 */
export interface SourceRetriever {
  id: string;
  retrieve(url: string): Promise<{ excerpt: string; publisher?: string }>;
}

export class ResearchService {
  constructor(private retriever: SourceRetriever) {}

  async run(input: {
    runId: string;
    articleId: string;
    claims: Claim[];
    sourceUrls: string[];
  }): Promise<ResearchRun> {
    const run: ResearchRun = {
      id: input.runId,
      articleId: input.articleId,
      status: "running",
      startedAt: new Date().toISOString(),
      evidence: [],
      limitations: [],
    };
    const urls = Array.isArray(input.sourceUrls) ? input.sourceUrls : [];
    if (!Array.isArray(input.sourceUrls)) run.limitations.push("Source URL input was invalid.");
    if (urls.length > MAX_SOURCE_URLS) {
      run.limitations.push(`Only the first ${MAX_SOURCE_URLS} sources were considered.`);
    }

    // One bounded retrieval per source; errors do not reveal URLs or provider details.
    for (const rawUrl of urls.slice(0, MAX_SOURCE_URLS)) {
      try {
        const url = requirePublicHttpUrl(rawUrl);
        const result = await this.retriever.retrieve(url);
        if (!result || typeof result.excerpt !== "string") {
          throw new Error("Invalid retrieval response");
        }
        const excerpt = truncateCodePoints(result.excerpt, MAX_EXCERPT_CHARACTERS);
        run.evidence.push({
          id: `ev-${run.evidence.length + 1}`,
          claimId: input.claims[0]?.id ?? "article-level",
          sourceUrl: url,
          sourcePublisher: typeof result.publisher === "string" ? result.publisher : undefined,
          excerpt,
          relation: "context",
          retrievalConfidence: 0.5, // placeholder until a real analyzer exists
          retrievedAt: new Date().toISOString(),
        });
      } catch {
        run.limitations.push("A source could not be retrieved; source and provider details are withheld.");
      }
    }

    if (run.evidence.length === 0) {
      run.limitations.push("No sources were retrieved; this report must not be treated as complete.");
      run.status = "failed";
    } else {
      run.status = "completed";
    }
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

/** Similarity alone never proves plagiarism. */
export function similarityIsNotPlagiarism(similarityScore: number): boolean {
  void similarityScore;
  return true;
}
