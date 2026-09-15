/**
 * 全站常量与「推广链接统一管理中心」
 * ------------------------------------------------------------------
 * 所有 Cloudways 返佣链接都在这里生成，Markdown 文章里只需写相对路径，
 * 后期更换推广 ID 时只改环境变量 PUBLIC_CLOUDWAYS_AFFILIATE_ID，全站生效。
 */

/* ------------------------- 站点基础信息 ------------------------- */

export const SITE = {
  name: 'Cloudways 中文指南',
  shortName: 'Cloudways 指南',
  /** 用于 <title> 后缀 */
  titleSuffix: 'Cloudways 中文指南',
  description:
    'Cloudways 托管云主机中文评测与实战教程：覆盖 DigitalOcean、AWS、Google Cloud、Linode、Vultr 五大云厂商的配置与价格对比，含 Breeze 缓存、免费迁移与最新优惠。',
  /** astro.config.mjs 里的 site，构建时由 Astro 注入 */
  url: (import.meta.env.SITE as string) || 'https://cloudways-guide.com',
  locale: 'zh-CN',
  author: 'Cloudways 指南编辑部',
  email: 'hello@cloudways-guide.com',
  /** 默认分享图 */
  defaultOgImage: '/images/og-default.svg',
  twitter: '@cloudwaysguide',
} as const;

/* ------------------------- 推广链接管理 ------------------------- */

/** 你的 Cloudways 联盟 ID（可在 .env 中用 PUBLIC_CLOUDWAYS_AFFILIATE_ID 覆盖） */
export const AFFILIATE_ID =
  (import.meta.env.PUBLIC_CLOUDWAYS_AFFILIATE_ID as string) || '1379004';

/** 额外透传的 UTM / 追踪参数 */
const EXTRA_PARAMS: Record<string, string> = {
  utm_source: 'cloudways-guide',
  utm_medium: 'affiliate',
};

/**
 * Cloudways 官方落地页路径（**唯一可信来源**）
 *
 * ⚠️ 这里每一个值都是**实测可用**的，改动前请先跑 `npm run check:affiliate -- --live`。
 *
 * 两个反复踩过的坑：
 *  1. Cloudways 是 **.php 文件**结构，不是目录结构。
 *     `/en/pricing/`、`/en/support/` 这类「目录写法」全部 404，
 *     正确写法是 `/en/pricing.php`、`/en/support.php`。
 *  2. `/en/cloud-hosting-signup.php` 这条老注册路径**已被 Cloudways 下线**，
 *     访问会落到 Cloudways 自己的 404 页（"slipped through a time portal"）。
 *     现在注册/试用统一落地首页 `/en/`：`?id=` 参数在该页生效并写入联盟 cookie，
 *     用户再点页面里的 "Start Free" 完成注册，归因不丢。
 *
 * 因此：**`/en/` 是唯一保证可用的联盟入口**，其它深链只在确认存在时才使用。
 */
export const CLOUDWAYS = {
  origin: 'https://www.cloudways.com',
  /** 首页 —— 联盟追踪入口，`?id=` 在此页生效 */
  home: '/en/',
  /** 注册 / 免费试用入口（落地首页，见上方说明） */
  signup: '/en/',
  /** 定价页 */
  pricing: '/en/pricing.php',
  /** 免费试用（与注册同页） */
  freeTrial: '/en/',
  /** 免费网站迁移服务 */
  migration: '/en/free-website-migration-service.php',
  /** Breeze WordPress 缓存插件 */
  breeze: '/en/free-wordpress-cache-plugin-breeze.php',
  /** Cloudways 已无独立优惠页，回落首页 */
  coupon: '/en/',
  /** 支持中心 */
  support: '/en/support.php',
} as const;

/**
 * 各云厂商在 Cloudways 上的**专属落地页** —— 也就是「部署 / 部署此方案」按钮的目标。
 *
 * 这些路径取自 Cloudways 官网页脚 "Cloud Infrastructure" 分组，均**实测**：
 *   HTTP 200 · 不是它自己的 404 模板 · 页面内加载了 affiliateCookieHandler.js
 *   （所以 `?id=1379004` 会在该页写入联盟 cookie，归因不丢）
 *
 * ⚠️ 为什么**不用** pricing.php 的 `#do` / `#vultr` 这类锚点：
 *   那些 `#do` 是 Bootstrap **标签页触发器**（位于 `ul.server_pricing_tabs`），
 *   对应的面板由 JS 动态加载，静态 HTML 里根本没有 `id="do"` 的元素；
 *   而站点里那段「按 hash 激活标签」的代码只作用于顶层 `.nav-tabs`
 *   （Flexible / Autonomous 那一组），管不到厂商标签。
 *   结论：外链带 `#do` 既不会切标签、也不会滚动（无对应 id，浏览器无处可跳），
 *   是个**死片段**。厂商专属页才是真正「一跳直达目标方案」的地址。
 */
export const CLOUDWAYS_PROVIDER_PAGES: Record<ProviderKey, string> = {
  digitalocean: '/en/digital-ocean-cloud-hosting.php',
  vultr: '/en/vultr-hosting.php',
  linode: '/en/linode-hosting.php',
  aws: '/en/amazon-cloud-hosting.php',
  gcp: '/en/managed-google-compute-engine.php',
};

/** 允许出现在内容里的落地页路径白名单，供 content schema 与 check-affiliate-links.mjs 校验 */
export const CLOUDWAYS_ALLOWED_PATHS: readonly string[] = [
  ...new Set([
    ...Object.values(CLOUDWAYS).filter((v) => typeof v === 'string' && v.startsWith('/')),
    ...Object.values(CLOUDWAYS_PROVIDER_PAGES),
  ]),
];

/**
 * 取某云厂商的专属落地页路径；传入未知厂商时回落定价页。
 *
 * @example
 * providerCtaPath('digitalocean') // '/en/digital-ocean-cloud-hosting.php'
 * providerCtaPath()               // '/en/pricing.php'
 */
export function providerCtaPath(provider?: string): string {
  return (provider && CLOUDWAYS_PROVIDER_PAGES[provider as ProviderKey]) || CLOUDWAYS.pricing;
}

type AffiliateOptions = {
  /** 覆盖默认的推广 ID */
  id?: string;
  /** 附加自定义参数，如 { plan: 'do-2gb' } */
  params?: Record<string, string>;
  /** 关闭 UTM 透传（用于对比测试） */
  noUtm?: boolean;
};

/**
 * 生成带推广 ID 的 Cloudways 链接。
 *
 * @example
 * affiliateUrl()                          // 首页注册链接
 * affiliateUrl(CLOUDWAYS.pricing)         // 定价页
 * affiliateUrl(CLOUDWAYS.signup, { params: { plan: 'vultr-high-frequency' } })
 */
export function affiliateUrl(path: string = CLOUDWAYS.home, options: AffiliateOptions = {}): string {
  const url = new URL(path, CLOUDWAYS.origin);
  url.searchParams.set('id', options.id ?? AFFILIATE_ID);
  if (!options.noUtm) {
    for (const [key, value] of Object.entries(EXTRA_PARAMS)) {
      url.searchParams.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(options.params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** 是否已配置真实推广 ID（用于页面上给出友好提醒） */
export const HAS_AFFILIATE_ID = AFFILIATE_ID !== 'YOUR_AFFILIATE_ID';

/**
 * 把站内图片路径转换为社交分享用的 PNG 路径。
 *
 * 为什么需要这个：Facebook / X / LinkedIn / 微信等平台**不渲染 SVG**，
 * 直接给 .svg 会导致分享出去没有配图。资源生成脚本会为每张 SVG
 * 同步输出一份同名 PNG，这里只负责换扩展名。
 */
export function ogImagePath(imagePath?: string): string {
  const path = imagePath || SITE.defaultOgImage;
  return path.replace(/\.svg$/i, '.png');
}

/* ------------------------- 云厂商元数据 ------------------------- */

export type ProviderKey = 'digitalocean' | 'aws' | 'gcp' | 'linode' | 'vultr';

export const PROVIDERS: Record<
  ProviderKey,
  { label: string; labelEn: string; color: string; logo: string; blurb: string }
> = {
  digitalocean: {
    label: 'DigitalOcean',
    labelEn: 'DigitalOcean',
    color: '#0080FF',
    logo: '/images/providers/digitalocean.svg',
    blurb: '性价比标杆，入门首选，机房覆盖广、开通最快。',
  },
  aws: {
    label: 'Amazon AWS',
    labelEn: 'AWS',
    color: '#FF9900',
    logo: '/images/providers/aws.svg',
    blurb: '企业级基础设施，全球区域最多，适合合规与高可用场景。',
  },
  gcp: {
    label: 'Google Cloud',
    labelEn: 'GCP',
    color: '#4285F4',
    logo: '/images/providers/gcp.svg',
    blurb: '网络质量优秀，Premium Tier 骨干网，适合亚太与欧美双向业务。',
  },
  linode: {
    label: 'Linode (Akamai)',
    labelEn: 'Linode',
    color: '#00A95C',
    logo: '/images/providers/linode.svg',
    blurb: 'Akamai 边缘网络加持，稳定耐用，开发者口碑好。',
  },
  vultr: {
    label: 'Vultr',
    labelEn: 'Vultr',
    color: '#007BFC',
    logo: '/images/providers/vultr.svg',
    blurb: '高频计算与裸金属见长，全球机房数量多，延迟低。',
  },
};

/* ------------------------- 文章分类 ------------------------- */

export const CATEGORIES = {
  tutorial: { label: '教程', description: '从零开始的建站、部署与运维实操教程', color: '#2563eb' },
  review: { label: '评测', description: '真实测速、压测与长期使用体验报告', color: '#7c3aed' },
  comparison: { label: '对比', description: '云厂商、配置档位与竞品的横向对比', color: '#0d9488' },
  coupon: { label: '优惠', description: '最新优惠码、折扣活动与省钱方案', color: '#ea580c' },
  migration: { label: '搬家', description: '网站迁移、数据搬迁与零停机切换', color: '#0891b2' },
  faq: { label: '常见问题', description: '计费、退款、性能与支持的答疑', color: '#64748b' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function isCategoryKey(value: string): value is CategoryKey {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, value);
}

/* ------------------------- 导航 ------------------------- */

export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/products/', label: '产品与价格' },
  { href: '/compare/', label: '厂商对比' },
  { href: '/articles/', label: '文章教程' },
  { href: '/coupons/', label: '最新优惠' },
  { href: '/faq/', label: '常见问题' },
] as const;

export const FOOTER_LINKS = [
  {
    title: '产品',
    links: [
      { href: '/products/', label: '全部云厂商' },
      { href: '/compare/', label: '配置对比表' },
      { href: '/pricing/', label: '价格一览' },
    ],
  },
  {
    title: '内容',
    links: [
      { href: '/articles/', label: '全部文章' },
      { href: '/categories/tutorial/', label: '新手教程' },
      { href: '/categories/review/', label: '深度评测' },
      { href: '/categories/migration/', label: '网站搬家' },
    ],
  },
  {
    title: '关于',
    links: [
      { href: '/about/', label: '关于本站' },
      { href: '/affiliate-disclosure/', label: '推广声明' },
      { href: '/privacy/', label: '隐私政策' },
      { href: '/rss.xml', label: 'RSS 订阅' },
    ],
  },
] as const;

/* ------------------------- 分页 ------------------------- */

export const ARTICLES_PER_PAGE = 9;

/* ------------------------- 托管特色（Cloudways 独家能力） ------------------------- */

export const HOSTING_FEATURES = [
  {
    icon: 'bolt',
    title: 'Breeze 缓存',
    desc: '官方 WordPress 缓存插件，Varnish + Redis 一键开启，TTFB 可降 60% 以上。',
  },
  {
    icon: 'server',
    title: '多云任选',
    desc: '同一个控制面板里自由切换 5 家 IaaS 底层，随时按地域与预算调整。',
  },
  {
    icon: 'shield',
    title: '免费迁移',
    desc: '专业团队免费搬站，WordPress / WooCommerce / PHP 站点零停机切换。',
  },
  {
    icon: 'globe',
    title: '全球机房',
    desc: '覆盖 5 大洲 20+ 数据中心，支持按访问来源就近部署。',
  },
  {
    icon: 'chart',
    title: '弹性扩容',
    desc: 'CPU、内存、存储可在控制台在线升降配，按小时计费不浪费。',
  },
  {
    icon: 'lock',
    title: '安全与备份',
    desc: '免费 SSL、专用防火墙、自动备份与 1 键回滚，默认即安全。',
  },
] as const;

export const TRUST_POINTS = [
  '无需信用卡即可试用',
  '按小时计费 · 随时删除不欠费',
  '免费 SSL + 免费迁移',
  '24/7 人工在线客服',
] as const;
