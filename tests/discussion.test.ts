import { describe, it, expect } from "vitest";
import { DiscussionService, SurveyService } from "../src/discussion.js";

describe("DiscussionService", () => {
  it("holds posts pending until moderated", () => {
    const d = new DiscussionService();
    d.post({ id: "p1", articleId: "a1", authorId: "u1", body: "Great article" });
    expect(d.approvedFor("a1")).toHaveLength(0);
    d.moderate("p1", "approved", "mod-1");
    expect(d.approvedFor("a1")).toHaveLength(1);
  });

  it("removes flagged/removed posts from public view and requires moderator identity", () => {
    const d = new DiscussionService();
    d.post({ id: "p2", articleId: "a1", authorId: "u1", body: "spam" });
    d.moderate("p2", "removed", "mod-1");
    expect(d.approvedFor("a1")).toHaveLength(0);
    d.post({ id: "p3", articleId: "a1", authorId: "u2", body: "hi" });
    expect(() => d.moderate("p3", "approved", "")).toThrow();
  });

  it("validates posts", () => {
    const d = new DiscussionService();
    expect(() => d.post({ id: "p4", articleId: "a1", authorId: "u1", body: "" })).toThrow();
    expect(() => d.post({ id: "p5", articleId: "a1", authorId: "u1", body: "x".repeat(5001) })).toThrow();
  });
});

describe("SurveyService (privacy: aggregates only)", () => {
  it("aggregates responses and rejects invalid options", () => {
    const s = new SurveyService();
    s.create({ id: "sv1", articleId: "a1", question: "Helpful?", options: ["yes", "no"] });
    s.respond("sv1", "yes");
    s.respond("sv1", "yes");
    s.respond("sv1", "no");
    expect(s.results("sv1")).toEqual({ yes: 2, no: 1 });
    expect(() => s.respond("sv1", "maybe")).toThrow();
    expect(() => s.create({ id: "sv2", articleId: "a1", question: "q", options: ["only"] })).toThrow();
  });
});
