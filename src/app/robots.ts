import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/myoriadmin/",
      },
    ],
    sitemap: "https://reviewhub.life/sitemap.xml",
  };
}
