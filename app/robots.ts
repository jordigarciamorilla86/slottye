import type { MetadataRoute } from "next";
import { getCanonicalBaseUrl } from "@/lib/seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getCanonicalBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL
  );

  return {
    rules: {
      userAgent: "*",

      allow: [
        "/",
        "/business/",
        "/category/",
      ],

      disallow: [
        "/account",
        "/admin",
        "/business-dashboard",
        "/login",
        "/auth/",
        "/api/",
        "/check-email",
        "/forgot-password",
        "/reset-password",
      ],
    },

    sitemap:
      `${baseUrl}/sitemap.xml`,
  };
}
