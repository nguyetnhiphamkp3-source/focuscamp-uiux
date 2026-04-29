import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://focus.camp";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/inbox", "/c/*/settings", "/u/*/following", "/u/*/followers"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
