import type { DiscussionPost, Survey } from "./types.js";

export type ModerationDecision = "approved" | "flagged" | "removed";

/** Reader discussion with moderation. Posts are pending until moderated (safe default). */
export class DiscussionService {
  private posts = new Map<string, DiscussionPost>();

  post(input: { id: string; articleId: string; authorId: string; body: string }): DiscussionPost {
    if (!input.body?.trim()) throw new Error("Empty post body");
    if (input.body.length > 5000) throw new Error("Post too long (max 5000 chars)");
    const post: DiscussionPost = {
      id: input.id,
      articleId: input.articleId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
      moderation: "pending",
    };
    if (this.posts.has(post.id)) throw new Error(`Duplicate post id: ${post.id}`);
    this.posts.set(post.id, post);
    return post;
  }

  moderate(postId: string, decision: ModerationDecision, moderatorId: string): DiscussionPost {
    const post = this.posts.get(postId);
    if (!post) throw new Error(`Unknown post: ${postId}`);
    if (!moderatorId?.trim()) throw new Error("Moderator identity required");
    post.moderation = decision;
    post.moderatedBy = moderatorId;
    return post;
  }

  /** Public view shows only approved posts, oldest first. */
  approvedFor(articleId: string): DiscussionPost[] {
    return [...this.posts.values()]
      .filter((p) => p.articleId === articleId && p.moderation === "approved")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

/** Surveys aggregate responses; individual votes are never exposed. */
export class SurveyService {
  private surveys = new Map<string, Survey>();

  create(input: { id: string; articleId: string; question: string; options: string[] }): Survey {
    if (input.options.length < 2) throw new Error("At least two options required");
    if (new Set(input.options).size !== input.options.length) throw new Error("Duplicate options");
    const survey: Survey = { id: input.id, articleId: input.articleId, question: input.question, options: input.options, responses: {} };
    this.surveys.set(survey.id, survey);
    return survey;
  }

  respond(surveyId: string, option: string): void {
    const s = this.surveys.get(surveyId);
    if (!s) throw new Error(`Unknown survey: ${surveyId}`);
    if (!s.options.includes(option)) throw new Error("Invalid option");
    s.responses[option] = (s.responses[option] ?? 0) + 1;
  }

  /** Aggregates only — there is deliberately no API to list individual respondents. */
  results(surveyId: string): Record<string, number> | undefined {
    return this.surveys.get(surveyId)?.responses;
  }
}
