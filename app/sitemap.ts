import type { MetadataRoute } from "next";

import {
  buildPublicSitemap,
  getCanonicalBaseUrl,
  type SitemapRecord,
} from "@/lib/seo/sitemap";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 500;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL
  );
  const supabase = await createClient();
  const businesses: SitemapRecord[] = [];
  const categories: SitemapRecord[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("businesses")
      .select("slug, updated_at")
      .eq("active", true)
      .order("slug", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Error generating business sitemap:", error);
      break;
    }

    businesses.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("categories")
      .select("slug")
      .eq("active", true)
      .order("slug", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Error generating category sitemap:", error);
      break;
    }

    categories.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return buildPublicSitemap({
    baseUrl,
    categories,
    businesses,
  });
}
