import type { ArticleRecord } from "./types.js";

/** Article registration with strict URL validation (SSRF first line of defense). */
export class ArticleRegistry {
  private articles = new Map<string, ArticleRecord>();

  register(input: { id: string; url: string; title: string; publisher?: string }): ArticleRecord {
    if (!input.id?.trim()) throw new Error("Article id required");
    if (!input.title?.trim()) throw new Error("Title required");
    const record: ArticleRecord = {
      id: input.id,
      url: requirePublicHttpUrl(input.url),
      title: input.title.trim(),
      publisher: input.publisher,
      registeredAt: new Date().toISOString(),
    };
    if (this.articles.has(record.id)) throw new Error(`Duplicate article id: ${record.id}`);
    this.articles.set(record.id, record);
    return record;
  }

  get(id: string): ArticleRecord | undefined {
    return this.articles.get(id);
  }

  list(): ArticleRecord[] {
    return [...this.articles.values()];
  }
}

/**
 * SSRF guard for retrieval workers. Enforces http(s), bans private/loopback/
 * link-local/reserved ranges and non-standard ports. Default-deny.
 * KNOWN GAP: hostname-based URLs must be resolved via DNS and the resulting
 * IP re-checked before connecting; see HANDOFF_TO_MANUS.md.
 */
export function requirePublicHttpUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Blocked: only http(s) URLs are allowed (got ${url.protocol})`);
  }
  if (url.username || url.password) {
    throw new Error("Blocked: credentials in URL are not allowed");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isBlockedHost(host)) {
    throw new Error(`Blocked: host resolves to a private or reserved address range (${host})`);
  }
  if (url.port && !["", "80", "443"].includes(url.port)) {
    throw new Error(`Blocked: non-standard port ${url.port}`);
  }
  return url.toString();
}

export function isBlockedHost(host: string): boolean {
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.includes("@")) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const o = ipv4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return true;
    const [a, b] = [o[0]!, o[1]!];
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  // IPv6: block ::, ::1, link-local, unique-local. A robust implementation must
  // resolve and re-check post-DNS; noted as limitation in HANDOFF_TO_MANUS.md.
  if (host.includes(":")) {
    const h = host.toLowerCase();
    if (h === "::" || h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  }
  return false;
}
