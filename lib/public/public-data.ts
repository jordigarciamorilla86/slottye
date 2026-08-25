import { revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_DATA_REVALIDATE_SECONDS = 3600;

export const PUBLIC_BUSINESSES_CACHE_TAG = "public-businesses";
export const PUBLIC_CATEGORIES_CACHE_TAG = "public-categories";

export function invalidatePublicBusinessData() {
  revalidateTag(PUBLIC_BUSINESSES_CACHE_TAG, { expire: 0 });
}

export function invalidatePublicCategoryData() {
  revalidateTag(PUBLIC_CATEGORIES_CACHE_TAG, { expire: 0 });
}

export const getPublicCategories = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("id, name, slug, icon")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Error loading cached public categories:", error);
      throw error;
    }

    return data ?? [];
  },
  ["public-categories-v1"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATEGORIES_CACHE_TAG],
  }
);

export function getPublicBusiness(slug: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data: business, error } = await admin
        .from("businesses")
        .select(`
          id,
          name,
          slug,
          description,
          address,
          city,
          postal_code,
          phone,
          email,
          website,
          latitude,
          longitude,
          category_id,
          google_place_id,
          show_google_reviews
        `)
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        console.error("Error loading cached public business:", error);
        throw error;
      }

      if (!business) return null;

      const [categoryResult, imagesResult, servicesResult, hoursResult] =
        await Promise.all([
          business.category_id
            ? admin
                .from("categories")
                .select("name, slug")
                .eq("id", business.category_id)
                .eq("active", true)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          admin
            .from("business_images")
            .select("id, image_url, position")
            .eq("business_id", business.id)
            .order("position", { ascending: true }),
          admin
            .from("services")
            .select("id, name, description, duration_minutes")
            .eq("business_id", business.id)
            .eq("active", true)
            .order("name"),
          admin
            .from("business_hours")
            .select(`
              day_of_week,
              open_time,
              close_time,
              open_time_2,
              close_time_2,
              closed
            `)
            .eq("business_id", business.id)
            .order("day_of_week"),
        ]);

      if (categoryResult.error) {
        console.error("Error loading cached business category:", categoryResult.error);
        throw categoryResult.error;
      }
      if (imagesResult.error) {
        console.error("Error loading cached business images:", imagesResult.error);
        throw imagesResult.error;
      }
      if (servicesResult.error) {
        console.error("Error loading cached business services:", servicesResult.error);
        throw servicesResult.error;
      }
      if (hoursResult.error) {
        console.error("Error loading cached business hours:", hoursResult.error);
        throw hoursResult.error;
      }

      return {
        business,
        category: categoryResult.data ?? null,
        images: imagesResult.data ?? [],
        services: servicesResult.data ?? [],
        hours: hoursResult.data ?? [],
      };
    },
    ["public-business-v1", slug],
    {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
      tags: [PUBLIC_BUSINESSES_CACHE_TAG, `${PUBLIC_BUSINESSES_CACHE_TAG}:${slug}`],
    }
  )();
}
