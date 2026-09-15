import type { APIRoute } from 'astro';
import { SITE } from '../consts';

/**
 * robots.txt 动态生成
 * 用端点而不是静态文件，这样 sitemap 地址能跟随 SITE_URL 环境变量变化，
 * 不会出现「换了域名但 robots.txt 还指向旧站」的问题。
 */
export const GET: APIRoute = () => {
  const site = SITE.url.replace(/\/$/, '');

  const body = `# ${SITE.name}
# 允许所有搜索引擎抓取正文内容
User-agent: *
Allow: /

# 后台管理界面不参与索引（页面本身也带 noindex）
Disallow: /admin/

# 注意：/tags/ 与 /privacy/ 没有在这里 Disallow。
# 它们页面里带了 noindex，必须允许抓取才能让搜索引擎读到该指令；
# 如果在这里屏蔽抓取，反而可能导致 URL 被无描述地索引。

# 构建产物目录无需抓取
Disallow: /_astro/

# sitemap 位置
Sitemap: ${site}/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
