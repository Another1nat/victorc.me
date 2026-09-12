import { RESEARCH_ARTICLES, QUICK_NOTES, AUTHOR_INFO } from "@/data/blog";

export async function GET() {
  const baseUrl = "https://victorc.me";

  const researchItemsXml = RESEARCH_ARTICLES.map((post) => {
    return `
    <item>
      <title><![CDATA[[Research] ${post.title}]]></title>
      <link>${baseUrl}/research/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/research/${post.slug}</guid>
      <pubDate>${new Date(post.isoDate).toUTCString()}</pubDate>
      <description><![CDATA[${post.summary} - Takeaways: ${post.takeaways.join(" ")}]]></description>
      <category><![CDATA[${post.category}]]></category>
    </item>`;
  }).join("");

  const notesItemsXml = QUICK_NOTES.map((note) => {
    return `
    <item>
      <title><![CDATA[[Journal] ${note.title}]]></title>
      <link>${baseUrl}/notes/${note.slug}</link>
      <guid isPermaLink="true">${baseUrl}/notes/${note.slug}</guid>
      <pubDate>${new Date(note.isoDate).toUTCString()}</pubDate>
      <description><![CDATA[${note.content}]]></description>
      <category><![CDATA[${note.category}]]></category>
    </item>`;
  }).join("");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${AUTHOR_INFO.name} — Selected Works & Journal]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${AUTHOR_INFO.tagline} - Autonomous systems, machine cognition, and software engineering.]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${researchItemsXml}
    ${notesItemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
