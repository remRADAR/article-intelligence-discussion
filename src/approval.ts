import { createHash } from "node:crypto";
import type { CandidateFaq, EditorialApproval, EvidenceReport, PublicationStatus } from "./types.js";

export type EditorialTarget = EvidenceReport | CandidateFaq;
export type EditorialTargetType = EditorialApproval["targetType"];
export type EditorialDecision = "approve" | "reject";

export interface EditorialAuthorizationRequest {
  approverId: string;
  targetId: string;
  targetType: EditorialTargetType;
  decision: EditorialDecision;
}

/** The host must implement this against its authenticated editor/role system. */
export interface EditorialAuthorizationValidator {
  isAuthorizedEditor(input: EditorialAuthorizationRequest): boolean;
}

type GateItem = {
  targetType: EditorialTargetType;
  revisionHash: string;
  status: PublicationStatus;
  decisionBy?: string;
  decisionAt?: string;
  approval?: EditorialApproval;
};

const getTargetType = (target: EditorialTarget): EditorialTargetType =>
  "question" in target ? "candidate-faq" : "evidence-report";

/** Hash only editorial content/identity; status and approval metadata are not content. */
const revisionHash = (target: EditorialTarget): string => {
  const content =
    "question" in target
      ? {
          targetType: "candidate-faq",
          id: target.id,
          articleId: target.articleId,
          question: target.question,
          answer: target.answer,
          evidenceIds: [...target.evidenceIds],
        }
      : {
          targetType: "evidence-report",
          id: target.id,
          articleId: target.articleId,
          runId: target.runId,
          corroborationScore: target.corroborationScore ?? null,
          summary: target.summary,
          limitations: [...target.limitations],
        };
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
};

const isDraftStatus = (status: PublicationStatus): boolean =>
  status === "draft" || status === "under-review";

/**
 * In-memory editorial gate. It binds approvals to a content hash and target
 * type, and can consult a host-provided authorizer. It is not persistent and
 * cannot authenticate users itself; production publication must use a durable
 * server-side audit boundary and supply a trusted validator.
 */
export class EditorialGate {
  private items = new Map<string, GateItem>();

  constructor(private readonly authorizationValidator?: EditorialAuthorizationValidator) {}

  registerDraft(target: EditorialTarget): void {
    if (!target || typeof target !== "object" || !target.id?.trim()) {
      throw new Error("Editorial item id required");
    }
    if (target.status !== "draft") throw new Error("New editorial items must be drafts");
    if (this.items.has(target.id)) throw new Error(`Editorial item already registered: ${target.id}`);
    const targetType = getTargetType(target);
    this.items.set(target.id, {
      targetType,
      revisionHash: revisionHash(target),
      status: "draft",
    });
  }

  approve(target: EditorialTarget, approverId: string): EditorialApproval {
    const item = this.requireCurrentDraft(target);
    const approver = this.requireAuthorizedApprover(target, approverId, "approve");
    const approval: EditorialApproval = {
      approverId: approver,
      targetId: target.id,
      targetType: item.targetType,
      revisionHash: item.revisionHash,
      approvedAt: new Date().toISOString(),
    };
    item.status = "approved";
    item.decisionBy = approver;
    item.decisionAt = approval.approvedAt;
    item.approval = approval;
    return { ...approval };
  }

  reject(target: EditorialTarget, reviewerId: string): void {
    const item = this.requireCurrentDraft(target);
    const reviewer = this.requireAuthorizedApprover(target, reviewerId, "reject");
    item.status = "rejected";
    item.decisionBy = reviewer;
    item.decisionAt = new Date().toISOString();
  }

  isPublishable(target: EditorialTarget): boolean {
    if (!target || typeof target !== "object") return false;
    const item = this.items.get(target.id);
    const approvalMetadataMatches =
      "runId" in target
        ? target.approvedBy === item?.approval?.approverId && target.approvedAt === item?.approval?.approvedAt
        : true;
    return (
      target.status === "approved" &&
      item?.status === "approved" &&
      item.targetType === getTargetType(target) &&
      item.revisionHash === revisionHash(target) &&
      item.approval?.targetType === item.targetType &&
      item.approval.revisionHash === item.revisionHash &&
      approvalMetadataMatches
    );
  }

  statusOf(id: string): PublicationStatus | undefined {
    return this.items.get(id)?.status;
  }

  approvalOf(id: string): EditorialApproval | undefined {
    const approval = this.items.get(id)?.approval;
    return approval ? { ...approval } : undefined;
  }

  private requireCurrentDraft(target: EditorialTarget): GateItem {
    if (!target || typeof target !== "object" || !target.id?.trim()) {
      throw new Error("Editorial item id required");
    }
    const item = this.items.get(target.id);
    if (!item) throw new Error(`Unknown item: ${target.id}`);
    if (item.status !== "draft" && item.status !== "under-review") {
      throw new Error(`Editorial item is already ${item.status}`);
    }
    if (!isDraftStatus(target.status)) throw new Error("Only a draft or under-review revision can be decided");
    if (item.targetType !== getTargetType(target) || item.revisionHash !== revisionHash(target)) {
      throw new Error("Editorial content changed after draft registration; register the new revision for review");
    }
    return item;
  }

  private requireAuthorizedApprover(
    target: EditorialTarget,
    approverId: string,
    decision: EditorialDecision,
  ): string {
    const approver = approverId?.trim();
    if (!approver) throw new Error("Approver identity required");
    if (!this.authorizationValidator) {
      throw new Error("Editorial decision is disabled because no trusted authorizer is configured");
    }
    const authorized = this.authorizationValidator.isAuthorizedEditor({
      approverId: approver,
      targetId: target.id,
      targetType: getTargetType(target),
      decision,
    });
    if (authorized !== true) throw new Error("Approver is not authorized for this editorial decision");
    return approver;
  }
}

export function reportIsPublishable(report: EvidenceReport, gate: EditorialGate): boolean {
  return gate.isPublishable(report);
}

export function faqIsPublishable(faq: CandidateFaq, gate: EditorialGate): boolean {
  return gate.isPublishable(faq);
}

/** Ensure no automated score is ever rendered as a verdict. */
export function verdictFromScore(score: number): never {
  throw new Error(`Scores are indicators, not verdicts (score: ${score}). Editorial review required.`);
}
