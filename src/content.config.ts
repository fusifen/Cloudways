import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { CATEGORY_KEYS, CLOUDWAYS, CLOUDWAYS_ALLOWED_PATHS, PROVIDERS } from './consts';

/* =========================================================
   通用片段
   ========================================================= */

const faqItem = z.object({
  question: z.string(),
  answer: z.string(),
});

const seoBlock = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    ogImage: z.string().optional(),
    noindex: z.boolean().default(false),
  })
  .default({});

/* =========================================================
   products —— 云厂商产品线（一家厂商 = 一条记录，内含多个配置档位）
   ========================================================= */

const planSchema = z.object({
  /** 档位名，如 "2GB 标准" */
  name: z.string(),
  /** 该档位在 Cloudways 上的产品代号，便于追踪转化 */
  sku: z.string().optional(),
  vcpu: z.number(),
  /** 内存，单位 GB */
  ram: z.number(),
  /** 存储，单位 GB */
  storage: z.number(),
  /** 月流量，单位 TB */
  bandwidth: z.number(),
  /** 小时价，单位 USD */
  hourlyPrice: z.number(),
  /** 月价，单位 USD */
  monthlyPrice: z.number(),
  /** 是否为主推档位（对比表默认选中） */
  popular: z.boolean().default(false),
  /** 适用场景备注 */
  bestFor: z.string().optional(),
});

const productSchema = z.object({
  /** 厂商展示名 */
  name: z.string(),
  /** 厂商枚举键，与 consts.ts 的 PROVIDERS 对应 */
  provider: z.enum(Object.keys(PROVIDERS) as [keyof typeof PROVIDERS, ...(keyof typeof PROVIDERS)[]]),
  /** 一句话卖点 */
  tagline: z.string(),
  /** 详细介绍 */
  description: z.string(),
  /** Logo 路径（public 下） */
  logo: z.string(),
  /** 品牌色，用于标签与图表 */
  brandColor: z.string().default('#2563eb'),
  /** 数据中心 */
  datacenters: z
    .array(
      z.object({
        city: z.string(),
        country: z.string(),
        /** 机房代号，如 sfo3 */
        code: z.string().optional(),
      }),
    )
    .default([]),
  /** 配置档位（至少一档） */
  plans: z.array(planSchema).min(1),
  /** 适用场景 */
  scenarios: z.array(z.string()).default([]),
  /** Cloudways 托管特色在该厂商上的体现 */
  highlights: z.array(z.string()).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  /** 综合评分 0-5 */
  rating: z.number().min(0).max(5).default(4.5),
  /** 最适合谁 */
  recommendedFor: z.string().optional(),
  /**
   * 推广落地页路径。
   *
   * 只允许 consts.ts 里**实测可用**的 Cloudways 路径 —— 这里用 refine 硬卡住，
   * 因为路径写错（目录写法 / 已被下线的老页面）构建期不报任何错，
   * 只有真人点下去才看到 404，属于最难发现的一类线上事故。
   */
  ctaPath: z
    .string()
    .default(CLOUDWAYS.signup)
    .refine((v) => CLOUDWAYS_ALLOWED_PATHS.includes(v), {
      message:
        `ctaPath 必须是实测可用的 Cloudways 落地页路径，可选值：` +
        CLOUDWAYS_ALLOWED_PATHS.join('、') +
        `（Cloudways 是 .php 文件结构，/en/pricing/ 这类目录写法会 404）`,
    }),
  /** 首页是否推荐 */
  featured: z.boolean().default(false),
  /** 排序权重，越小越靠前 */
  order: z.number().default(99),
  /** 价格最后核对日期 */
  priceCheckedAt: z.coerce.date().optional(),
  seo: seoBlock,
});

/* =========================================================
   articles —— 文章系统
   ========================================================= */

const articleSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  author: z.string().default('Cloudways 指南编辑部'),
  category: z.enum(CATEGORY_KEYS as [string, ...string[]]),
  tags: z.array(z.string()).default([]),
  /** 头图路径（public 下，CMS 媒体库上传后写入） */
  heroImage: z.string().optional(),
  heroImageAlt: z.string().optional(),
  /** 是否展示联盟推广披露 */
  affiliateNotice: z.boolean().default(true),
  faqs: z.array(faqItem).default([]),
  /** 关联产品（填 product 的 slug / id） */
  relatedProducts: z.array(z.string()).default([]),
  /** 置顶推荐 */
  featured: z.boolean().default(false),
  /** 草稿不参与构建 */
  draft: z.boolean().default(false),
  /** 语言，为多语言预留 */
  locale: z.enum(['zh-CN', 'en']).default('zh-CN'),
  /** 预计阅读分钟数，留空则按正文自动估算 */
  readingTime: z.number().optional(),
  /** 是否显示右侧目录 */
  toc: z.boolean().default(true),
  seo: seoBlock,
});

/* =========================================================
   导出集合
   ========================================================= */

export const collections = {
  products: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
    schema: productSchema,
  }),
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
    schema: articleSchema,
  }),
};
