import type { CandidateFaq, EvidenceReport, PublicationStatus } from "./types.js";

/**
 * Editorial approval gate. Evidence reports and generated FAQs are drafts
 * and CANNOT be published without an explicit, recorded approval by an
 * authorized editor.
 */
export class EditorialGate {
  private items = new Map<string, { status: PublicationStatus; approvedBy?: string; approvedAt?: string }>();

  registerDraft(id: string): void {
    this.items.set(id, { status: "draft" });
  }

  approve(id: string, approverId: string): void {
    const item = this.items.get(id);
    if (!item) throw new Error(`Unknown item: ${id}`);
    if (!approverId?.trim()) throw new Error("Approver identity required");
    item.status = "approved";
    item.approvedBy = approverId;
    item.approvedAt = new Date().toISOString();
  }

  reject(id: string): void {
    const item = this.items.get(id);
    if (!item) throw new Error(`Unknown item: ${id}`);
    item.status = "rejected";
  }

  isPublishable(id: string): boolean {
    return this.items.get(id)?.status === "approved";
  }

  statusOf(id: string): PublicationStatus | undefined {
    return this.items.get(id)?.status;
  }
}

export function reportIsPublishable(report: EvidenceReport, gate: EditorialGate): boolean {
  if (report.status !== "approved") return false;
  return gate.isPublishable(report.id);
}

export function faqIsPublishable(faq: CandidateFaq, gate: EditorialGate): boolean {
  if (faq.status !== "approved") return false;
  return gate.isPublishable(faq.id);
}

/** Ensure no automated score is ever rendered as a verdict. */
export function verdictFromScore(score: number): never {
  throw new Error(`Scores are indicators, not verdicts (score: ${score}). Editorial review required.`);
}
