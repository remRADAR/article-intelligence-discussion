import { describe, it, expect } from "vitest";
import {
  EditorialGate,
  faqIsPublishable,
  reportIsPublishable,
  verdictFromScore,
} from "../src/approval.js";
import type { CandidateFaq, EditorialAuthorizationRequest, EvidenceReport } from "../src/types.js";

const report = (id: string, status: EvidenceReport["status"]): EvidenceReport => ({
  id,
  articleId: "a1",
  runId: "r1",
  status,
  summary: "reviewed summary",
  limitations: ["one limitation"],
  createdAt: "2026-10-16T00:00:00.000Z",
});
const faq = (id: string, status: CandidateFaq["status"]): CandidateFaq => ({
  id,
  articleId: "a1",
  question: "reviewed question",
  answer: "reviewed answer",
  status,
  evidenceIds: ["ev-1"],
});
const authorizedEditors = (allowedIds = ["editor-1"]) => ({
  isAuthorizedEditor(input: EditorialAuthorizationRequest) {
    return allowedIds.includes(input.approverId);
  },
});

describe("EditorialGate", () => {
  it("blocks drafts and records an explicit approval for the exact report revision", () => {
    const gate = new EditorialGate(authorizedEditors());
    const draft = report("rep1", "draft");
    gate.registerDraft(draft);
    expect(gate.isPublishable(draft)).toBe(false);
    expect(reportIsPublishable(report("rep1", "draft"), gate)).toBe(false);

    const approval = gate.approve(draft, "editor-1");
    const approved = {
      ...draft,
      status: "approved" as const,
      approvedBy: approval.approverId,
      approvedAt: approval.approvedAt,
    };
    expect(reportIsPublishable(approved, gate)).toBe(true);
    expect(gate.statusOf("rep1")).toBe("approved");
    expect(gate.approvalOf("rep1")).toMatchObject({
      approverId: "editor-1",
      targetId: "rep1",
      targetType: "evidence-report",
    });
    expect(reportIsPublishable({ ...approved, approvedBy: "forged-editor" }, gate)).toBe(false);
    expect(reportIsPublishable({ ...approved, approvedAt: "1999-01-01T00:00:00.000Z" }, gate)).toBe(false);
  });

  it("fails closed without a trusted host authorizer or when the editor is unauthorized", () => {
    const draft = report("rep2", "draft");
    const noAuthorizer = new EditorialGate();
    noAuthorizer.registerDraft(draft);
    expect(() => noAuthorizer.approve(draft, "editor-1")).toThrow(/no trusted authorizer/);
    expect(noAuthorizer.statusOf("rep2")).toBe("draft");

    const denying = new EditorialGate(authorizedEditors([]));
    denying.registerDraft(draft);
    expect(() => denying.approve(draft, "editor-1")).toThrow(/not authorized/);
    expect(denying.statusOf("rep2")).toBe("draft");
  });

  it("requires a non-empty approver and records a reviewed FAQ through the same gate", () => {
    const gate = new EditorialGate(authorizedEditors());
    const candidate = faq("faq1", "draft");
    gate.registerDraft(candidate);
    expect(() => gate.approve(candidate, "  ")).toThrow(/identity required/);
    gate.approve(candidate, "editor-1");
    expect(faqIsPublishable(faq("faq1", "approved"), gate)).toBe(true);
  });

  it("does not publish changed content or a different target type under an approved id", () => {
    const gate = new EditorialGate(authorizedEditors());
    const draft = report("shared-id", "draft");
    gate.registerDraft(draft);
    const approval = gate.approve(draft, "editor-1");

    const changedReport = {
      ...draft,
      status: "approved" as const,
      approvedBy: approval.approverId,
      approvedAt: approval.approvedAt,
    };
    changedReport.summary = "unreviewed changed summary";
    changedReport.articleId = "different-article";
    expect(reportIsPublishable(changedReport, gate)).toBe(false);

    const faqWithSameId = faq("shared-id", "approved");
    expect(faqIsPublishable(faqWithSameId, gate)).toBe(false);
  });

  it("rejects changed drafts, duplicate registrations, and repeated terminal decisions", () => {
    const gate = new EditorialGate(authorizedEditors());
    const draft = report("rep3", "draft");
    gate.registerDraft(draft);
    expect(() => gate.registerDraft(draft)).toThrow(/already registered/);

    const changed = report("rep3", "draft");
    changed.summary = "changed before review";
    expect(() => gate.approve(changed, "editor-1")).toThrow(/content changed/);

    gate.approve(draft, "editor-1");
    expect(() => gate.approve(draft, "editor-1")).toThrow(/already approved/);
    expect(() => gate.reject(draft, "editor-1")).toThrow(/already approved/);
  });

  it("records authorized rejection and prevents later approval", () => {
    const gate = new EditorialGate(authorizedEditors());
    const draft = faq("faq2", "draft");
    gate.registerDraft(draft);
    gate.reject(draft, "editor-1");
    expect(gate.statusOf("faq2")).toBe("rejected");
    expect(() => gate.approve(draft, "editor-1")).toThrow(/already rejected/);
  });

  it("does not allow a caller-controlled approved status without a matching gate record", () => {
    const gate = new EditorialGate(authorizedEditors());
    expect(reportIsPublishable(report("ghost", "approved"), gate)).toBe(false);
  });

  it("refuses to convert scores into verdicts", () => {
    expect(() => verdictFromScore(0.97)).toThrow(/not verdicts/i);
  });
});
