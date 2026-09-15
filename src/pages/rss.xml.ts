import type { APIRoute } from 'astro';
import { SITE } from '../consts';
import { getPublishedArticles } from '../lib/articles';

/** XML 转义，防止正文里的特殊字符破坏 feed 结构 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const articles = await getPublishedArticles();
  const site = SITE.url.replace(/\/$/, '');

  const items = articles
    .map((article) => {
      const url = `${site}/articles/${article.id}/`;
      const d = article.data;
      return `    <item>
      <title>${esc(d.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(d.description)}</description>
      <pubDate>${d.pubDate.toUTCString()}</pubDate>
      <category>${esc(d.category)}</category>
${d.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${site}/</link>
    <description>${esc(SITE.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
