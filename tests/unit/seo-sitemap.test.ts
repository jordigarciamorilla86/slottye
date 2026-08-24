import { describe, expect, it } from "vitest";

import {
  buildPublicSitemap,
  getCanonicalBaseUrl,
  isPublicSlug,
} from "@/lib/seo/sitemap";

describe("public sitemap", () => {
  it("normalizes the configured canonical origin", () => {
    expect(getCanonicalBaseUrl("https://slottye.com/path/"))
      .toBe("https://slottye.com");
    expect(getCanonicalBaseUrl("javascript:bad"))
      .toBe("https://slottye.com");
  });

  it("accepts only canonical URL-safe slugs", () => {
    expect(isPublicSlug("salon-belleza-2")).toBe(true);
    expect(isPublicSlug("../admin")).toBe(false);
    expect(isPublicSlug("slug/con-ruta")).toBe(false);
    expect(isPublicSlug("")).toBe(false);
  });

  it("includes public pages only and removes duplicates", () => {
    const entries = buildPublicSitemap({
      baseUrl: "https://slottye.com/ignored",
      categories: [
        { slug: "salud" },
        { slug: "todos" },
        { slug: "bad/slug" },
      ],
      businesses: [
        { slug: "clinica-demo", updated_at: "2026-08-24T10:00:00Z" },
        { slug: "clinica-demo" },
        { slug: null },
      ],
    });

    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://slottye.com");
    expect(urls).toContain("https://slottye.com/category/todos");
    expect(urls).toContain("https://slottye.com/category/salud");
    expect(urls).toContain("https://slottye.com/business/clinica-demo");
    expect(urls).not.toContain("https://slottye.com/category/bad/slug");
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      urls.some((url) => /\/(login|account|admin|api)(\/|$)/.test(url))
    ).toBe(false);
  });
});
