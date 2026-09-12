import { MetadataRoute } from "next";
import { RESEARCH_ARTICLES, QUICK_NOTES } from "@/data/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://victorc.me";

  // Core static landing hubs
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Deep research dispatches
  const researchPages: MetadataRoute.Sitemap = RESEARCH_ARTICLES.map((article) => ({
    url: `${baseUrl}/research/${article.slug}`,
    lastModified: new Date(article.isoDate),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  // Engineering logbook notes
  const notePages: MetadataRoute.Sitemap = QUICK_NOTES.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    lastModified: new Date(note.isoDate),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...researchPages, ...notePages];
}
