import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const paths = ["", "/pricing", "/contact", "/privacy", "/terms", "/cookies", "/login", "/signup"];
  return paths.map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
}
