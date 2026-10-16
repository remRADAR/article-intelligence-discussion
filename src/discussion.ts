import type { DiscussionPost, Survey } from "./types.js";

export type ModerationDecision = "approved" | "flagged" | "removed";

const clonePost = (post: DiscussionPost): DiscussionPost => ({ ...post });
const cloneSurvey = (survey: Survey): Survey => ({
  ...survey,
  options: [...survey.options],
  responses: { ...survey.responses },
});

/** Reader discussion with moderation. Posts are pending until moderated (safe default). */
export class DiscussionService {
  private posts = new Map<string, DiscussionPost>();

  post(input: { id: string; articleId: string; authorId: string; body: string }): DiscussionPost {
    if (!input.id?.trim() || !input.articleId?.trim() || !input.authorId?.trim()) {
      throw new Error("Post, article, and author ids are required");
    }
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
    return clonePost(post);
  }

  moderate(postId: string, decision: ModerationDecision, moderatorId: string): DiscussionPost {
    const post = this.posts.get(postId);
    if (!post) throw new Error(`Unknown post: ${postId}`);
    if (!moderatorId?.trim()) throw new Error("Moderator identity required");
    post.moderation = decision;
    post.moderatedBy = moderatorId.trim();
    return clonePost(post);
  }

  /** Public view shows only approved posts, oldest first; actor authorization is host-owned. */
  approvedFor(articleId: string): DiscussionPost[] {
    return [...this.posts.values()]
      .filter((post) => post.articleId === articleId && post.moderation === "approved")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(clonePost);
  }
}

/** Surveys aggregate responses; individual votes are never stored or exposed. */
export class SurveyService {
  private surveys = new Map<string, Survey>();

  create(input: { id: string; articleId: string; question: string; options: string[] }): Survey {
    if (!input.id?.trim() || !input.articleId?.trim()) throw new Error("Survey and article ids are required");
    if (!input.question?.trim() || input.question.length > 500) throw new Error("Survey question is invalid");
    if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 20) {
      throw new Error("Survey requires 2 to 20 options");
    }
    if (input.options.some((option) => !option?.trim() || option.length > 100)) {
      throw new Error("Survey options must be non-empty and at most 100 characters");
    }
    if (new Set(input.options).size !== input.options.length) throw new Error("Duplicate options");
    if (this.surveys.has(input.id)) throw new Error(`Duplicate survey id: ${input.id}`);
    const survey: Survey = {
      id: input.id,
      articleId: input.articleId,
      question: input.question,
      options: [...input.options],
      responses: {},
    };
    this.surveys.set(survey.id, survey);
    return cloneSurvey(survey);
  }

  respond(surveyId: string, option: string): void {
    const survey = this.surveys.get(surveyId);
    if (!survey) throw new Error(`Unknown survey: ${surveyId}`);
    if (!survey.options.includes(option)) throw new Error("Invalid option");
    survey.responses[option] = (survey.responses[option] ?? 0) + 1;
  }

  /** Aggregates only — there is deliberately no API to list individual respondents. */
  results(surveyId: string): Record<string, number> | undefined {
    const responses = this.surveys.get(surveyId)?.responses;
    return responses ? { ...responses } : undefined;
  }
}
