import type { MetadataRoute } from "next";

export type SitemapRecord = {
  slug: string | null;
  updated_at?: string | null;
};

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export function getCanonicalBaseUrl(configuredUrl?: string) {
  try {
    const url = new URL(
      configuredUrl?.trim() || "https://slottye.com"
    );

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return url.origin;
  } catch {
    return "https://slottye.com";
  }
}

export function isPublicSlug(slug: string | null | undefined) {
  return Boolean(slug && PUBLIC_SLUG_PATTERN.test(slug));
}

function validDate(value: string | null | undefined) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildPublicSitemap({
  baseUrl,
  categories,
  businesses,
}: {
  baseUrl: string;
  categories: SitemapRecord[];
  businesses: SitemapRecord[];
}): MetadataRoute.Sitemap {
  const canonicalBaseUrl = getCanonicalBaseUrl(baseUrl);
  const entries: MetadataRoute.Sitemap = [
    {
      url: canonicalBaseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${canonicalBaseUrl}/category/todos`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...["privacy", "terms", "cookies", "legal"].map((path) => ({
      url: `${canonicalBaseUrl}/${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  for (const category of categories) {
    if (!isPublicSlug(category.slug)) continue;
    entries.push({
      url: `${canonicalBaseUrl}/category/${category.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const business of businesses) {
    if (!isPublicSlug(business.slug)) continue;
    entries.push({
      url: `${canonicalBaseUrl}/business/${business.slug}`,
      lastModified: validDate(business.updated_at),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values()
  );
}
