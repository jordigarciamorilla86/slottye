import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const supabase =
    await createClient();

  /*
   * ============================================================
   * NEGOCIOS PÚBLICOS
   * ============================================================
   */

  const {
    data: businesses,
    error: businessesError,
  } = await supabase
    .from("businesses")
    .select(`
      slug,
      updated_at
    `)
    .eq("active", true);

  if (businessesError) {
    console.error(
      "Error generando sitemap de negocios:",
      businessesError
    );
  }

  /*
   * ============================================================
   * CATEGORÍAS
   * ============================================================
   */

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("categories")
    .select(`
      slug
    `)
    .eq("active", true);

  if (categoriesError) {
    console.error(
      "Error generando sitemap de categorías:",
      categoriesError
    );
  }

  /*
   * ============================================================
   * PÁGINAS PRINCIPALES
   * ============================================================
   */

  const staticPages: MetadataRoute.Sitemap =
    [
      {
        url: baseUrl,
        lastModified:
          new Date(),
        changeFrequency:
          "daily",
        priority: 1,
      },

      {
        url:
          `${baseUrl}/category/todos`,
        lastModified:
          new Date(),
        changeFrequency:
          "daily",
        priority: 0.9,
      },
    ];

  /*
   * ============================================================
   * CATEGORÍAS
   * ============================================================
   */

  const categoryPages: MetadataRoute.Sitemap =
    (categories ?? []).map(
      (category) => ({
        url:
          `${baseUrl}/category/${category.slug}`,

        changeFrequency:
          "daily",

        priority:
          0.8,
      })
    );

  /*
   * ============================================================
   * NEGOCIOS
   * ============================================================
   */

  const businessPages: MetadataRoute.Sitemap =
    (businesses ?? []).map(
      (business) => ({
        url:
          `${baseUrl}/business/${business.slug}`,

        lastModified:
          business.updated_at
            ? new Date(
                business.updated_at
              )
            : new Date(),

        changeFrequency:
          "daily",

        priority:
          0.8,
      })
    );

  return [
    ...staticPages,
    ...categoryPages,
    ...businessPages,
  ];
}