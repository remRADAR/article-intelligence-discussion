export type PublicationStatus =
  | "draft"
  | "under-review"
  | "approved"
  | "rejected"
  | "published";

export interface ArticleRecord {
  id: string;
  url: string;
  title: string;
  registeredAt: string;
  /** Provenance of the article itself. */
  publisher?: string;
}

export interface Claim {
  id: string;
  articleId: string;
  /** The asserted statement, quoted or paraphrased from the article. */
  text: string;
}

/** A single piece of evidence supporting or contradicting a claim. */
export interface EvidenceRecord {
  id: string;
  claimId: string;
  sourceUrl: string;
  sourcePublisher?: string;
  /** What the source actually says, briefly. */
  excerpt: string;
  /** Agreement with the claim: "supports" | "contradicts" | "context". */
  relation: "supports" | "contradicts" | "context";
  /** 0–1 confidence in the retrieval/extraction itself — NOT proof of truth. */
  retrievalConfidence: number;
  /** Independence group: sources in the same group may share an origin. */
  independenceGroup?: string;
  retrievedAt: string;
}

export interface ResearchRun {
  id: string;
  articleId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  evidence: EvidenceRecord[];
  /** Honest limitations of this run (paywalls, thin sourcing, single-language, etc.). */
  limitations: string[];
}

/**
 * Transparent evidence report. ALWAYS starts as draft.
 * Automated scores are indicators, never proof of authenticity or plagiarism.
 */
export interface EvidenceReport {
  id: string;
  articleId: string;
  runId: string;
  status: PublicationStatus;
  /** Corroboration indicator 0–1. NOT a verdict. */
  corroborationScore?: number;
  summary: string;
  limitations: string[];
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CandidateFaq {
  id: string;
  articleId: string;
  question: string;
  answer: string;
  /** Draft until editorial approval. */
  status: PublicationStatus;
  evidenceIds: string[];
}

export interface DiscussionPost {
  id: string;
  articleId: string;
  authorId: string;
  body: string;
  createdAt: string;
  moderation: "pending" | "approved" | "flagged" | "removed";
  moderatedBy?: string;
}

export interface Survey {
  id: string;
  articleId: string;
  question: string;
  options: string[];
  /** Aggregated only; individual responses are private. */
  responses: Record<string, number>;
}

export interface EditorialApproval {
  /** An explicit approval record gates publication of reports and FAQs. */
  approverId: string;
  targetId: string;
  targetType: "evidence-report" | "candidate-faq";
  /** SHA-256 of the exact typed editorial content approved by the editor. */
  revisionHash: string;
  approvedAt: string;
}
