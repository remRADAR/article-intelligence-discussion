import { BlockList, isIP } from "node:net";
import type { ArticleRecord } from "./types.js";

const BLOCKED_IP_RANGES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED_IP_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  BLOCKED_IP_RANGES.addSubnet(network, prefix, "ipv6");
}

const cloneArticle = (article: ArticleRecord): ArticleRecord => ({ ...article });

/** Article registration with strict URL syntax validation (not a transport/SSRF guarantee). */
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
    return cloneArticle(record);
  }

  get(id: string): ArticleRecord | undefined {
    const article = this.articles.get(id);
    return article ? cloneArticle(article) : undefined;
  }

  list(): ArticleRecord[] {
    return [...this.articles.values()].map(cloneArticle);
  }
}

/**
 * Syntactic URL guard only. A real transport must resolve every redirect hop,
 * reject every non-public A/AAAA answer, and pin the validated address for the
 * actual connection; this function alone does not prevent DNS rebinding.
 */
export function requirePublicHttpUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid source URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Blocked source URL: only HTTP and HTTPS are supported");
  }
  if (url.username || url.password) {
    throw new Error("Blocked source URL: credentials are not allowed");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isBlockedHost(host)) throw new Error("Blocked source URL: destination is not public");

  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) {
    throw new Error("Blocked source URL: non-standard port");
  }
  return url.toString();
}

export function isBlockedHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!normalized) return true;
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }
  if (normalized.includes("@")) return true;

  const family = isIP(normalized);
  if (family === 4) return BLOCKED_IP_RANGES.check(normalized, "ipv4");
  if (family === 6) return BLOCKED_IP_RANGES.check(normalized, "ipv6");
  return false;
}
