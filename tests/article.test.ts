import { describe, it, expect } from "vitest";
import { ArticleRegistry, requirePublicHttpUrl, isBlockedHost } from "../src/article.js";

describe("SSRF guard (requirePublicHttpUrl)", () => {
  const blocked = [
    "http://localhost/x",
    "http://127.0.0.1/x",
    "http://10.0.0.5/x",
    "http://192.168.1.1/admin",
    "http://172.16.0.1/x",
    "http://169.254.169.254/latest/meta-data", // cloud metadata
    "http://0.0.0.0/x",
    "http://[::1]/x",
    "ftp://example.com/file",
    "file:///etc/passwd",
    "http://example.com:8080/x",
    "http://user:pass@example.com/x",
    "http://metadata.google.internal/x",
    "not a url",
  ];
  for (const url of blocked) {
    it(`blocks ${url}`, () => {
      expect(() => requirePublicHttpUrl(url)).toThrow();
    });
  }

  it("allows ordinary public http(s) URLs", () => {
    expect(requirePublicHttpUrl("https://example.com/article").startsWith("https://example.com")).toBe(true);
    expect(requirePublicHttpUrl("http://example.com:80/a").startsWith("http://example.com")).toBe(true);
  });

  it("isBlockedHost sanity", () => {
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("::1")).toBe(true);
  });
});

describe("ArticleRegistry", () => {
  it("registers valid articles and rejects duplicates/empties", () => {
    const reg = new ArticleRegistry();
    const a = reg.register({ id: "a1", url: "https://news.example.com/post", title: "Test" });
    expect(a.url).toContain("news.example.com");
    expect(() => reg.register({ id: "a1", url: "https://x.example.com/", title: "Dup" })).toThrow();
    expect(() => reg.register({ id: "a2", url: "http://127.0.0.1/", title: "Bad" })).toThrow();
    expect(() => reg.register({ id: "a3", url: "https://example.com/", title: "  " })).toThrow();
  });
});
