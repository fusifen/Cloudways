// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 站点域名：部署前请改成你的真实域名（影响 canonical / sitemap / OG 绝对地址）
const SITE = process.env.SITE_URL || 'https://cloudways-guide.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',

  // 静态输出（默认），可零成本部署到 Cloudflare Pages / Vercel / GitHub Pages
  output: 'static',

  integrations: [
    sitemap({
      // 后台管理页不进 sitemap
      filter: (page) => !page.includes('/admin'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  // 多语言结构预留：默认中文在根路径，英文走 /en/ 前缀
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
