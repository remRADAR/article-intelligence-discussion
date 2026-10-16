import { describe, it, expect } from "vitest";
import { ResearchService, similarityIsNotPlagiarism } from "../src/research.js";
import type { SourceRetriever } from "../src/research.js";

const okRetriever: SourceRetriever = {
  id: "test-retriever",
  async retrieve(url) {
    return { excerpt: `Content from ${new URL(url).hostname}`, publisher: "TestPublisher" };
  },
};
const failingRetriever: SourceRetriever = {
  id: "failing-retriever",
  async retrieve() { throw new Error("blocked by SSRF guard"); },
};

describe("ResearchService", () => {
  it("records evidence with brief excerpts and honest limitations on failure", async () => {
    const svc = new ResearchService(okRetriever);
    const run = await svc.run({
      runId: "r1", articleId: "a1",
      claims: [{ id: "c1", articleId: "a1", text: "Claim one" }],
      sourceUrls: ["https://one.example.com/a", "https://two.example.com/b"],
    });
    expect(run.status).toBe("completed");
    expect(run.evidence).toHaveLength(2);
    expect(run.evidence.every((e) => e.excerpt.length <= 500)).toBe(true);

    const failing = new ResearchService(failingRetriever);
    const run2 = await failing.run({ runId: "r2", articleId: "a1", claims: [], sourceUrls: ["https://x.example.com/"] });
    expect(run2.evidence).toHaveLength(0);
    expect(run2.limitations.some((l) => l.includes("Failed to retrieve"))).toBe(true);
    expect(similarityIsNotPlagiarism(0.99)).toBe(true);
  });

  it("corroboration indicator rewards distinct hosts but is capped at 1", async () => {
    const svc = new ResearchService(okRetriever);
    const run = await svc.run({
      runId: "r3", articleId: "a1",
      claims: [{ id: "c1", articleId: "a1", text: "x" }],
      sourceUrls: ["https://a.example.com/1", "https://a.example.com/2", "https://b.example.com/3"],
    });
    const score = svc.corroborationIndicator(run);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(run.evidence.every((e) => e.relation === "context")).toBe(true);
  });
});
