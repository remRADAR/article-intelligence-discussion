import { describe, it, expect } from "vitest";
import { DiscussionService, SurveyService } from "../src/discussion.js";

describe("DiscussionService", () => {
  it("holds posts pending until moderated and returns copied records", () => {
    const service = new DiscussionService();
    const returned = service.post({ id: "p1", articleId: "a1", authorId: "u1", body: "Great article" });
    returned.moderation = "approved";
    expect(service.approvedFor("a1")).toHaveLength(0);
    const approved = service.moderate("p1", "approved", "mod-1");
    approved.body = "mutated return";
    expect(service.approvedFor("a1")).toHaveLength(1);
    expect(service.approvedFor("a1")[0]?.body).toBe("Great article");
  });

  it("removes flagged/removed posts from public view and requires moderator identity", () => {
    const service = new DiscussionService();
    service.post({ id: "p2", articleId: "a1", authorId: "u1", body: "spam" });
    service.moderate("p2", "removed", "mod-1");
    expect(service.approvedFor("a1")).toHaveLength(0);
    service.post({ id: "p3", articleId: "a1", authorId: "u2", body: "hi" });
    expect(() => service.moderate("p3", "approved", "")).toThrow();
    expect(() => service.post({ id: "p3", articleId: "a1", authorId: "u2", body: "duplicate" })).toThrow();
  });

  it("validates posts", () => {
    const service = new DiscussionService();
    expect(() => service.post({ id: "p4", articleId: "a1", authorId: "u1", body: "" })).toThrow();
    expect(() => service.post({ id: "p5", articleId: "a1", authorId: "u1", body: "x".repeat(5001) })).toThrow();
  });
});

describe("SurveyService (aggregate-only outputs)", () => {
  it("aggregates responses, rejects invalid options, and returns copies", () => {
    const service = new SurveyService();
    const options = ["yes", "no"];
    const returned = service.create({ id: "sv1", articleId: "a1", question: "Helpful?", options });
    options[0] = "forged";
    returned.options[0] = "also forged";
    service.respond("sv1", "yes");
    service.respond("sv1", "yes");
    service.respond("sv1", "no");
    const results = service.results("sv1");
    expect(results).toEqual({ yes: 2, no: 1 });
    if (results) results.yes = 999;
    expect(service.results("sv1")).toEqual({ yes: 2, no: 1 });
    expect(() => service.respond("sv1", "maybe")).toThrow();
    expect(() => service.create({ id: "sv2", articleId: "a1", question: "q", options: ["only"] })).toThrow();
    expect(() => service.create({ id: "sv1", articleId: "a1", question: "duplicate", options: ["x", "y"] })).toThrow(/Duplicate survey id/);
  });
});
