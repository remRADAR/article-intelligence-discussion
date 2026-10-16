import { describe, it, expect } from "vitest";
import { ArticleRegistry, requirePublicHttpUrl, isBlockedHost } from "../src/article.js";

describe("SSRF URL syntax guard (not a DNS-pinned transport guarantee)", () => {
  const blocked = [
    "http://localhost/x",
    "http://localhost./x",
    "http://127.0.0.1/x",
    "http://2130706433/x",
    "http://10.0.0.5/x",
    "http://192.168.1.1/admin",
    "http://172.16.0.1/x",
    "http://100.64.0.1/x",
    "http://169.254.169.254/latest/meta-data",
    "http://0.0.0.0/x",
    "http://192.0.2.10/x",
    "http://198.18.0.1/x",
    "http://[::]/x",
    "http://[::1]/x",
    "http://[::2]/x",
    "http://[::127.0.0.1]/x",
    "http://[::10.0.0.1]/x",
    "http://[::192.0.2.1]/x",
    "http://[::ffff:127.0.0.1]/x",
    "http://[::ffff:7f00:1]/x",
    "http://[fe80::1]/x",
    "http://[fc00::1]/x",
    "http://[ff02::1]/x",
    "http://[2001:db8::1]/x",
    "ftp://example.com/file",
    "file:///etc/passwd",
    "http://example.com:8080/x",
    "http://example.com:443/x",
    "https://example.com:80/x",
    "http://user:pass@example.com/x",
    "http://metadata.google.internal/x",
    "not a url",
  ];
  for (const url of blocked) {
    it(`blocks ${url}`, () => {
      expect(() => requirePublicHttpUrl(url)).toThrow();
    });
  }

  it("allows ordinary public HTTP(S) URLs on their scheme's standard port", () => {
    expect(requirePublicHttpUrl("https://example.com/article").startsWith("https://example.com")).toBe(true);
    expect(requirePublicHttpUrl("http://example.com:80/a").startsWith("http://example.com")).toBe(true);
  });

  it("does not include a blocked destination in policy errors", () => {
    expect(() => requirePublicHttpUrl("http://169.254.169.254/latest/meta-data")).toThrow(
      "Blocked source URL: destination is not public",
    );
  });

  it("classifies known special IPv4 and IPv6 literals", () => {
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("::1")).toBe(true);
    expect(isBlockedHost("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedHost("ff02::1")).toBe(true);
  });
});

describe("ArticleRegistry", () => {
  it("registers valid articles and rejects duplicates/empties", () => {
    const registry = new ArticleRegistry();
    const article = registry.register({ id: "a1", url: "https://news.example.com/post", title: "Test" });
    expect(article.url).toContain("news.example.com");
    expect(() => registry.register({ id: "a1", url: "https://x.example.com/", title: "Dup" })).toThrow();
    expect(() => registry.register({ id: "a2", url: "http://127.0.0.1/", title: "Bad" })).toThrow();
    expect(() => registry.register({ id: "a3", url: "https://example.com/", title: "  " })).toThrow();
  });

  it("returns defensive copies", () => {
    const registry = new ArticleRegistry();
    const article = registry.register({ id: "a2", url: "https://news.example.com/", title: "Test" });
    article.url = "http://127.0.0.1/";
    expect(registry.get("a2")?.url).toContain("https://news.example.com");
  });
});
