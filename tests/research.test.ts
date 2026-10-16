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
  async retrieve() {
    throw new Error("internal provider detail: 169.254.169.254/token");
  },
};

describe("ResearchService", () => {
  it("records evidence with brief excerpts and honest limitations on failure", async () => {
    const service = new ResearchService(okRetriever);
    const run = await service.run({
      runId: "r1",
      articleId: "a1",
      claims: [{ id: "c1", articleId: "a1", text: "Claim one" }],
      sourceUrls: ["https://one.example.com/a", "https://two.example.com/b"],
    });
    expect(run.status).toBe("completed");
    expect(run.evidence).toHaveLength(2);
    expect(run.evidence.every((evidence) => evidence.excerpt.length <= 500)).toBe(true);

    const failing = new ResearchService(failingRetriever);
    const failedRun = await failing.run({
      runId: "r2",
      articleId: "a1",
      claims: [],
      sourceUrls: ["https://x.example.com/"],
    });
    expect(failedRun.status).toBe("failed");
    expect(failedRun.evidence).toHaveLength(0);
    expect(failedRun.limitations.some((limitation) => limitation.includes("could not be retrieved"))).toBe(true);
    expect(JSON.stringify(failedRun)).not.toContain("169.254.169.254");
    expect(JSON.stringify(failedRun)).not.toContain("internal provider detail");
  });

  it("validates URLs before calling an injected retriever", async () => {
    let calls = 0;
    const retriever: SourceRetriever = {
      id: "counting-retriever",
      async retrieve(url) {
        calls += 1;
        return { excerpt: url };
      },
    };
    const run = await new ResearchService(retriever).run({
      runId: "r3",
      articleId: "a1",
      claims: [],
      sourceUrls: ["file:///etc/passwd", "http://127.0.0.1/", "https://safe.example/article"],
    });
    expect(calls).toBe(1);
    expect(run.evidence).toHaveLength(1);
    expect(run.status).toBe("completed");
    expect(run.limitations).toHaveLength(2);
  });

  it("caps source count and 500 Unicode code points per excerpt", async () => {
    const longRetriever: SourceRetriever = {
      id: "long-retriever",
      async retrieve() {
        return { excerpt: "😀".repeat(501) };
      },
    };
    const run = await new ResearchService(longRetriever).run({
      runId: "r4",
      articleId: "a1",
      claims: [],
      sourceUrls: Array.from({ length: 21 }, (_, index) => `https://source-${index}.example/article`),
    });
    expect(run.evidence).toHaveLength(20);
    expect(Array.from(run.evidence[0]!.excerpt)).toHaveLength(500);
    expect(run.limitations).toContain("Only the first 20 sources were considered.");
  });

  it("corroboration indicator remains an indicator, not a verdict", async () => {
    const service = new ResearchService(okRetriever);
    const run = await service.run({
      runId: "r5",
      articleId: "a1",
      claims: [{ id: "c1", articleId: "a1", text: "x" }],
      sourceUrls: ["https://a.example.com/1", "https://a.example.com/2", "https://b.example.com/3"],
    });
    const score = service.corroborationIndicator(run);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(run.evidence.every((evidence) => evidence.relation === "context")).toBe(true);
    expect(similarityIsNotPlagiarism(0.99)).toBe(true);
    expect(similarityIsNotPlagiarism(Number.NaN)).toBe(true);
    expect(similarityIsNotPlagiarism(Number.POSITIVE_INFINITY)).toBe(true);
  });
});
