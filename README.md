# Cloudways 中文指南

基于 **Astro 7 + Tailwind CSS 4 + Content Collections + Sveltia CMS** 的 Cloudways 推广与内容聚合站点。
静态输出、零服务器运维，可直接部署到 Cloudflare Pages / Vercel / GitHub Pages。

- **产品线**：DigitalOcean、Amazon AWS、Google Cloud、Linode (Akamai)、Vultr 五家底层云厂商，共 22 个配置档位
- **内容系统**：六大分类（教程 / 评测 / 对比 / 优惠 / 搬家 / 常见问题），支持分类筛选与分页
- **SEO**：自动 sitemap、canonical、Open Graph、Twitter Card、JSON-LD（BlogPosting / Product / FAQPage / BreadcrumbList）
- **后台**：Sveltia CMS 图形化编辑，内容提交即触发 Git 仓库更新与自动构建
- **推广链接**：全站统一管理，换联盟 ID 只改一处

---

## 快速开始

```bash
npm install                 # 安装依赖
npm run gen:assets          # 生成 SVG 品牌资源（Logo / 头图 / 分享图）
npm run dev                 # 启动开发服务器 http://localhost:4321
```

> `.env` 已配置好推广 ID `1379004`。上线前只需把 `SITE_URL` 改成你的真实域名。

生产构建与预览：

```bash
npm run build               # 输出到 dist/
npm run preview             # 本地预览构建结果
npm run check:links         # 站内链接体检（建议上线前跑）
npm run cms:check           # CMS 字段一致性校验
```

---

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `SITE_URL` | 生产必填 | 站点域名，影响 canonical、sitemap 与 OG 绝对地址。不要带结尾斜杠 |
| `PUBLIC_CLOUDWAYS_AFFILIATE_ID` | 已配置 | 当前值 `1379004`。留空时回退到 `src/consts.ts` 中的默认值 |

> `.env` 已被 `.gitignore` 忽略，不会进仓库。部署时在平台面板中配置同名环境变量即可覆盖。

---

## 推广链接统一管理

这是本项目最重要的设计决策：**Markdown 文章里永远不写完整的推广链接**。

所有链接由 `src/consts.ts` 的 `affiliateUrl()` 统一生成：

```ts
import { affiliateUrl, CLOUDWAYS } from '../consts';

affiliateUrl();                                    // 首页注册链接
affiliateUrl(CLOUDWAYS.pricing);                   // 定价页
affiliateUrl(CLOUDWAYS.signup, {
  params: { provider: 'vultr', plan: 'vultr-hf-2gb' },
});
```

输出的链接形如：

```
https://www.cloudways.com/en/?id=<你的ID>&utm_source=cloudways-guide&utm_medium=affiliate&provider=vultr
```

**换 ID 时只需改 `.env` 里的一个值**，全站所有按钮、表格、侧边栏与 CTA 卡片同步生效，
不需要逐篇修改 Markdown。

> ### ⚠️ 落地页路径只能有一处来源
>
> Cloudways 的站点是 **`.php` 文件**结构，且会不定期下线老页面。历史上踩过两次：
>
> | 写法 | 结果 |
> | :--- | :--- |
> | `/en/cloud-hosting-signup.php` | 已被 Cloudways 下线 → 落到它的 404 页 |
> | `/en/pricing/`、`/en/support/` | 目录写法 → 404 |
> | `/en/` | ✅ 首页，`?id=` 在此生效并写入联盟 cookie |
> | `/en/pricing.php`、`/en/support.php` | ✅ 真实页面 |
>
> 这类错误**构建期完全不报错**，页面照常生成、链接照常渲染，只有真人点下去才 404。
> 因此做了三道防线：
>
> 1. 路径只在 `src/consts.ts` 的 `CLOUDWAYS` 里定义（**不要在组件里硬编码**）；
> 2. `ctaPath` 的 Zod schema 用 `refine` 卡住白名单，写错直接构建失败；
> 3. `npm run check:affiliate` 静态校验 + `npm run check:affiliate -- --live` 联网实测，
>    静态层已挂到 `prebuild`。
>
> 新增落地页时：先确认页面真实存在，再写进 `CLOUDWAYS`，然后跑一次 `--live`。

组件层面统一使用 `AffiliateButton.astro`，它会自动附加
`rel="sponsored nofollow noopener"`，符合搜索引擎对商业链接的规范要求。

---

## 社交分享图必须是 PNG

页面内的图片用 SVG（矢量、体积小、任意缩放不糊），但**社交分享图必须用 PNG** ——
Facebook / X / LinkedIn / 微信等平台**不渲染 SVG**，`og:image` 指向 `.svg`
会导致分享出去没有配图，这是很容易被忽略的坑。

因此 `scripts/generate-assets.mjs` 会为每张 SVG 同步导出一份同名 PNG：

| 用途 | 页面显示 | 社交分享 |
| --- | --- | --- |
| 文章头图 | `/images/articles/foo.svg` | `/images/articles/foo.png` |
| 默认分享图 | `/images/og-default.svg` | `/images/og-default.png` |
| 站点图标 | `/favicon.svg` | `/favicon.png`（同时供 iOS 主屏图标） |

转换由 `src/consts.ts` 的 `ogImagePath()` 自动完成（只换扩展名），
所以内容里写 `.svg` 路径即可，不必维护两套路径。
`apple-touch-icon` 同理 —— iOS 不支持 SVG 图标。

---

## 目录结构

```
afraid-altitude/
├── public/
│   ├── admin/                      # Sveltia CMS 后台
│   │   ├── index.html              #   CMS 入口（同源加载主程序）
│   │   ├── sveltia-cms.js          #   主程序（构建时自动同步，勿手动改）
│   │   └── config.yml              #   ★ 内容模型定义（字段与 Zod schema 一一对应）
│   ├── images/
│   │   ├── providers/              #   云厂商 Logo
│   │   ├── articles/               #   文章头图
│   │   ├── og-default.svg          #   默认社交分享图
│   │   └── uploads/                #   CMS 媒体库上传目录
│   └── favicon.svg
├── scripts/
│   ├── generate-assets.mjs         # 批量生成 SVG + PNG 品牌资源（含社交分享图）
│   ├── generate-articles.mjs       # ★ 批量生成文章骨架（内置 21 个长尾选题）
│   ├── sync-cms.mjs                # 同步 Sveltia CMS 主程序到 public/admin/（自托管）
│   ├── check-cms-sync.mjs          # ★ 校验 CMS 字段与内容文件字段是否一致
│   └── check-links.mjs             # ★ 站内链接体检，上线前跑一遍
├── src/
│   ├── consts.ts                   # ★ 站点配置 + 推广链接管理 + 分类/厂商元数据
│   ├── content.config.ts           # ★ Content Collections 的 Zod Schema
│   ├── content/
│   │   ├── products/               # 产品数据（一家厂商一个 .md，内含 plans 数组）
│   │   └── articles/               # 文章（Markdown + frontmatter）
│   ├── lib/
│   │   ├── articles.ts             # 文章查询、分页、标签聚合、阅读时长估算
│   │   └── schema.ts               # JSON-LD 结构化数据构造器
│   ├── components/                 # 19 个组件（见下方「组件清单」）
│   ├── layouts/
│   │   ├── BaseLayout.astro        # 全站外壳（Header / Footer / 移动端 CTA）
│   │   └── ArticleLayout.astro     # 文章详情布局（目录 + 侧边栏 CTA + FAQ）
│   ├── pages/                      # 路由
│   └── styles/global.css           # Tailwind 主题令牌与排版样式
└── astro.config.mjs                # site / Tailwind 插件 / sitemap / i18n
```

---

## 内容模型

### products（云厂商）

一家厂商 = 一条记录，`plans` 字段内放多个配置档位。这样设计的原因：
对比表需要「厂商 × 档位」的扁平行，把 plans 内联可以让 CMS 编辑一次搞定。

关键字段：`name`、`provider`、`tagline`、`description`、`brandColor`、
`datacenters[]`、`plans[]`、`scenarios[]`、`highlights[]`、`pros[]`、`cons[]`、
`rating`、`ctaPath`、`order`、`priceCheckedAt`、`seo{}`。

### articles（文章）

关键字段：`title`、`description`、`pubDate`、`updatedDate`、`author`、`category`、
`tags[]`、`heroImage`、`affiliateNotice`、`faqs[]`、`relatedProducts[]`、
`featured`、`draft`、`toc`、`readingTime`、`seo{}`。

`faqs[]` 会自动生成 **FAQPage 结构化数据**，有机会在搜索结果中获得富摘要展示。
`draft: true` 的文章不参与构建。

---

## 批量生成文章骨架

内置 21 个基于真实搜索意图的长尾选题，覆盖六大分类。

```bash
npm run articles:list                          # 查看全部选题
npm run gen:articles                           # 生成全部骨架
npm run gen:articles -- --limit 5              # 只生成 5 篇
npm run gen:articles -- --category tutorial    # 只生成教程类
npm run gen:articles -- --slug breeze-vs-wprocket
npm run gen:articles -- --dry-run              # 预览不写文件
npm run gen:articles -- --topics my-topics.json # 使用自定义选题库
```

生成的骨架包含：

- 完整且通过 Schema 校验的 frontmatter（`draft: true`，不会误发布）
- 按选题预置的二级标题大纲
- 每个小节内的写作提示注释
- 文首的 AI 填充提示块（说明语气、数据要求、内链与转化点规则）
- FAQ 占位（填好后自动生成结构化数据）

填充完正文后，把 frontmatter 的 `draft` 改为 `false` 即可发布。

---

## Sveltia CMS 后台

### 主程序为自托管，不依赖 CDN

`public/admin/sveltia-cms.js` 由 `scripts/sync-cms.mjs` 从 `node_modules/@sveltia/cms` 复制而来，
已挂到 `predev` / `prebuild` 钩子，**`npm run dev` 和 `npm run build` 会自动同步，无需手动执行**。
需要单独更新时运行：

```bash
npm run cms:sync
```

> 之所以不用 `<script src="https://unpkg.com/@sveltia/cms/...">`：
> 公共 CDN 在国内网络下经常超时或被拦截，会导致 `/admin/` **白屏打不开**。
> 自托管后后台从同源加载，离线也能用，且版本随 `package.json` 锁定。

### 本地编辑（只需一个终端）

```bash
npm run dev          # → http://localhost:4321
```

然后打开 <http://localhost:4321/admin/>，点击 **「使用本地仓库」**，
在弹出的目录选择框中选中**项目根目录**（含 `src/content` 的那一层）。
之后就能直接编辑本地文件，保存即写入磁盘。

> Sveltia CMS **不支持** Decap 的 `local_backend` 选项（配置了会被忽略并告警），
> 它改用浏览器的 File System Access API 直接读写本地文件夹，因此不需要额外启动任何服务。
> 该能力依赖 Chromium 内核浏览器（Chrome / Edge），且仅在 `localhost` 下可用。
> 后台界面语言自动跟随浏览器，中文浏览器环境下即为中文。

### 后台打不开的排查顺序

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 一直停在「正在加载…」 | `public/admin/sveltia-cms.js` 缺失 | 运行 `npm run cms:sync` |
| 页面完全空白 | 改回了 unpkg CDN 且网络不通 | 保持自托管引用 `/admin/sveltia-cms.js` |
| 出现登录页但没有「使用本地仓库」 | 浏览器非 Chromium 内核，或未通过 `localhost` 访问 | 换 Chrome / Edge，且不要用 `127.0.0.1` 以外的地址 |
| 提示无法读取配置 | `config.yml` 字段非法 | 检查 YAML 缩进；不要给默认媒体库传 `config` 参数 |
| 控制台出现 `local_backend is not supported` | 配置里保留了 Decap 专用选项 | 删掉该行（本项目已移除） |

### 字段一致性检查

字段定义分散在 `config.yml`（后台界面）与内容文件（frontmatter）两处。
如果内容文件里出现了 CMS 未定义的字段，**后台打开并保存该条目时会静默丢弃它**，
表现为「一保存就构建失败」或内容莫名丢失。用下面的命令体检：

```bash
npm run cms:check
```

### 部署到 Vercel / Cloudflare Pages

Sveltia CMS 用 GitHub 作为内容存储，生产环境需要 OAuth 代理来完成登录：

1. 在 GitHub 创建 OAuth App
   - Homepage URL：`https://你的域名`
   - Authorization callback URL：`https://你的OAuth代理域名/callback`
2. 部署官方 OAuth Worker：<https://github.com/sveltia/sveltia-cms-auth>
   把 `GITHUB_CLIENT_ID` 与 `GITHUB_CLIENT_SECRET` 写入 Worker 环境变量
3. 修改 `public/admin/config.yml`：
   - `backend.repo` 已设为 `fusifen/Cloudways`（如需换仓库再改）
   - `backend.base_url` 改为你的 Worker 域名
4. 推送代码，Vercel / Cloudflare Pages 会自动构建并部署
5. 访问 `https://你的域名/admin/` 用 GitHub 账号登录

> 部署平台需要把构建命令设为 `npm run build`，输出目录设为 `dist`。
> 环境变量 `SITE_URL` 与 `PUBLIC_CLOUDWAYS_AFFILIATE_ID` 在平台面板中配置。

---

## 路由一览

| 路由 | 说明 |
| --- | --- |
| `/` | 首页：Hero、厂商卡片、托管特色、对比表、推荐方案、最新文章 |
| `/products/` | 全部云厂商产品线 |
| `/products/[id]/` | 厂商详情：档位价格表、适用场景、优缺点、机房列表 |
| `/compare/` | 厂商维度对比矩阵 + 按需求选择建议 |
| `/pricing/` | 价格一览：同内存档位最便宜/最贵分析 + 隐性成本清单 |
| `/coupons/` | 优惠指南（说明为什么没有优惠码） |
| `/faq/` | 常见问题聚合（含 FAQPage 结构化数据） |
| `/articles/` | 文章列表（分类筛选 + 标签云） |
| `/articles/page/[page]/` | 文章分页 |
| `/articles/[id]/` | 文章详情（目录、内嵌 CTA、FAQ、相关阅读） |
| `/categories/` | 分类总览 |
| `/categories/[category]/` | 分类文章列表 |
| `/categories/[category]/page/[page]/` | 分类分页 |
| `/tags/`、`/tags/[tag]/` | 标签索引与标签页 |
| `/about/`、`/affiliate-disclosure/`、`/privacy/` | 关于、推广声明、隐私政策 |
| `/rss.xml` | RSS 订阅 |
| `/sitemap-index.xml` | sitemap（由 `@astrojs/sitemap` 生成） |
| `/admin/` | Sveltia CMS 后台 |

---

## 组件清单

**布局与外壳**：`BaseLayout`、`ArticleLayout`、`Header`、`Footer`、`BaseHead`（SEO）

**业务组件**：`ProductCard`、`ProductComparisonTable`（可筛选排序）、`PlanTable`、
`ArticleCard`、`ArticleIndex`（列表页模板）、`Pagination`、`TableOfContents`、`FaqSection`、
`RelatedArticles`、`Rating`

**转化组件**：`AffiliateButton`、`SidebarCTA`、`InlineCTA`、`MobileCTABar`、
`AffiliateDisclosure`

**基础组件**：`Icon`（内联 SVG 图标集）、`Breadcrumbs`

---

## 设计令牌

主题在 `src/styles/global.css` 中用 Tailwind v4 的 `@theme` 定义，改色只需改一处：

```css
@theme {
  --color-brand-600: #2563eb;   /* 品牌蓝，主按钮与链接 */
  --color-accent-500: #14b8a6;  /* 强调青绿，转化按钮 */
  --color-ink-900: #0b1220;     /* 标题墨色 */
  --color-surface: #f6f8fc;     /* 页面底色 */
  --color-line: #e3e8f1;        /* 分隔线 */
}
```

Tailwind v4 会自动把 `--color-brand-600` 映射为 `bg-brand-600`、`text-brand-600` 等工具类。

---

## 多语言预留

`astro.config.mjs` 中已配置 i18n（默认 `zh-CN` 在根路径，`en` 走 `/en/` 前缀），
`articles` 集合也有 `locale` 字段。目前只构建中文站，
后续要做英文站时，新建 `src/pages/en/` 下的对应路由并复用同一批组件即可。

---

## 部署前检查清单

- [x] 代码仓库已绑定 `https://github.com/fusifen/Cloudways`（分支 `main`）
- [ ] `.env` 中填写真实的 `SITE_URL`（推广 ID `1379004` 已配置）
- [ ] 部署 OAuth Worker 并更新 `backend.base_url`（当前占位 `https://sveltia-cms-auth.fusifen.workers.dev`）
- [ ] 替换占位 SVG（`public/images/`）为真实截图或设计稿
- [ ] 核对产品价格，更新 `priceCheckedAt` 字段
- [ ] 运行 `npm run cms:check` 确认字段一致性
- [ ] 在 Google Search Console 提交 `sitemap-index.xml`

---

## 免责声明

本站为独立运营的第三方站点，与 Cloudways 官方无从属关系。
站内包含联盟推广链接，通过链接注册可能为本站带来佣金，**不影响你的支付价格**。
所有价格与性能数据仅供参考，请以官网实时信息为准。
Cloudways 为 Cloudways Ltd. 的注册商标。
