import { describe, it, expect } from "vitest";
import { EditorialGate, reportIsPublishable, faqIsPublishable, verdictFromScore } from "../src/approval.js";
import type { CandidateFaq, EvidenceReport } from "../src/types.js";

const report = (id: string, status: EvidenceReport["status"]): EvidenceReport => ({
  id, articleId: "a1", runId: "r1", status, summary: "s", limitations: [], createdAt: new Date().toISOString(),
});
const faq = (id: string, status: CandidateFaq["status"]): CandidateFaq => ({
  id, articleId: "a1", question: "q", answer: "a", status, evidenceIds: [],
});

describe("EditorialGate", () => {
  it("blocks publication of drafts", () => {
    const gate = new EditorialGate();
    gate.registerDraft("rep1");
    expect(gate.isPublishable("rep1")).toBe(false);
    expect(reportIsPublishable(report("rep1", "draft"), gate)).toBe(false);
  });

  it("publishes only after explicit recorded approval", () => {
    const gate = new EditorialGate();
    gate.registerDraft("rep2");
    gate.approve("rep2", "editor-1");
    const approved = report("rep2", "approved");
    expect(reportIsPublishable(approved, gate)).toBe(true);
    expect(gate.statusOf("rep2")).toBe("approved");
  });

  it("requires approver identity", () => {
    const gate = new EditorialGate();
    gate.registerDraft("rep3");
    expect(() => gate.approve("rep3", "")).toThrow();
    expect(() => gate.approve("rep3", "  ")).toThrow();
  });

  it("gates FAQs the same way as reports", () => {
    const gate = new EditorialGate();
    gate.registerDraft("faq1");
    expect(faqIsPublishable(faq("faq1", "draft"), gate)).toBe(false);
    gate.approve("faq1", "editor-2");
    expect(faqIsPublishable(faq("faq1", "approved"), gate)).toBe(true);
  });

  it("status alone without gate approval is not publishable", () => {
    const gate = new EditorialGate();
    // An attacker flipping status to 'approved' on the object is not enough:
    expect(reportIsPublishable(report("ghost", "approved"), gate)).toBe(false);
  });

  it("refuses to convert scores into verdicts", () => {
    expect(() => verdictFromScore(0.97)).toThrow(/not verdicts/i);
  });
});
