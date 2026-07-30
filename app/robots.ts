import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://slottye.com";

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
        "/account/",
        "/business-dashboard",
        "/business-dashboard/",
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