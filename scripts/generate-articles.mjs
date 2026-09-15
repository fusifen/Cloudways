/**
 * Cloudways 文章骨架批量生成器
 * ---------------------------------------------------------------
 * 用途：一次性铺出大量符合 Content Collections Schema 的 Markdown 骨架，
 *       每个骨架内含标题大纲、FAQ 占位与 AI 填充提示，之后配合 AI 批量补正文。
 *
 * 用法：
 *   node scripts/generate-articles.mjs --list                  # 查看内置选题库
 *   node scripts/generate-articles.mjs --limit 5               # 生成前 5 篇
 *   node scripts/generate-articles.mjs --category tutorial     # 只生成某分类
 *   node scripts/generate-articles.mjs --slug breeze-vs-wprocket
 *   node scripts/generate-articles.mjs --dry-run               # 只预览不写文件
 *   node scripts/generate-articles.mjs --force                 # 覆盖已存在的文件
 *   node scripts/generate-articles.mjs --topics my-topics.json # 使用自定义选题库
 *
 * 自定义选题库 JSON 结构：
 *   [
 *     {
 *       "slug": "my-topic",
 *       "title": "文章标题",
 *       "description": "摘要",
 *       "category": "tutorial",          // tutorial|review|comparison|coupon|migration|faq
 *       "tags": ["标签1", "标签2"],
 *       "keywords": ["关键词"],
 *       "outline": ["二级标题1", "二级标题2"],
 *       "faqs": [{ "question": "问题", "answer": "答案占位" }]
 *     }
 *   ]
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join(root, 'src/content/articles');

/* =========================================================
   内置选题库（长尾关键词驱动）
   每个选题都对应一个真实搜索意图，避免写出无人搜索的内容
   ========================================================= */
const TOPIC_BANK = [
  /* ---------- 教程 tutorial ---------- */
  {
    slug: 'cloudways-wordpress-setup',
    title: 'Cloudways 部署 WordPress 完整教程：从注册到上线 30 分钟',
    description:
      '从注册账号、选择云厂商、部署应用、绑定域名到配置 SSL，手把手走完 Cloudways 上线的每一步，附常见报错排查。',
    category: 'tutorial',
    tags: ['教程', 'WordPress', '部署', 'SSL'],
    keywords: ['Cloudways 部署 WordPress', 'Cloudways 建站教程', 'Cloudways 绑定域名'],
    outline: [
      '注册与免费试用',
      '选择云厂商与机房',
      '选择应用类型与配置档位',
      '部署服务器并等待就绪',
      '绑定域名与 DNS 解析',
      '签发 SSL 证书',
      '后台登录与基础安全设置',
      '常见报错与排查',
    ],
    faqs: [
      { question: '部署一台服务器需要多久？', answer: '' },
      { question: '域名可以在 Cloudways 注册吗？', answer: '' },
    ],
  },
  {
    slug: 'cloudways-ssh-sftp-guide',
    title: 'Cloudways SSH 与 SFTP 使用指南：连接、传输与常用命令',
    description:
      '如何在 Cloudways 面板获取 SSH 凭据、用终端连接服务器、通过 SFTP 传输文件，以及 WordPress 运维必备的 WP-CLI 命令速查。',
    category: 'tutorial',
    tags: ['教程', 'SSH', 'SFTP', 'WP-CLI'],
    keywords: ['Cloudways SSH', 'Cloudways SFTP', 'Cloudways 终端连接'],
    outline: [
      '获取 SSH 凭据',
      '用终端连接服务器',
      '配置 SSH 密钥免密登录',
      '使用 SFTP 传输文件',
      'WP-CLI 常用命令速查',
      '安全注意事项',
    ],
    faqs: [{ question: '忘记 SSH 密码怎么办？', answer: '' }],
  },
  {
    slug: 'cloudways-staging-workflow',
    title: '用 Cloudways Staging 环境做安全迭代：完整工作流',
    description:
      'Staging 环境的正确用法：从创建、同步数据库、测试插件更新到一键推送到生产站，附计费注意事项与踩坑记录。',
    category: 'tutorial',
    tags: ['教程', 'Staging', '工作流', '插件更新'],
    keywords: ['Cloudways Staging', 'WordPress 测试环境', '安全更新插件'],
    outline: [
      'Staging 环境是什么',
      '创建 Staging 环境',
      '数据库同步的方向选择',
      '在生产站与 Staging 之间切换',
      '测试插件与主题更新',
      '推送到生产站',
      '计费与清理',
    ],
    faqs: [{ question: 'Staging 环境额外收费吗？', answer: '' }],
  },
  {
    slug: 'cloudways-cron-scheduled-tasks',
    title: 'Cloudways 定时任务配置：Cron Job 与 WordPress 计划任务',
    description:
      '在 Cloudways 面板配置 Cron Job 的完整方法，包括 WordPress 伪 Cron 的关闭、系统级定时备份与自定义脚本调度。',
    category: 'tutorial',
    tags: ['教程', 'Cron', '定时任务', '运维'],
    keywords: ['Cloudways Cron', 'Cloudways 定时任务', 'WordPress Cron'],
    outline: [
      'WordPress 伪 Cron 的问题',
      '在面板创建 Cron Job',
      '常用调度表达式',
      '关闭 WP-Cron 并改用系统 Cron',
      '调试定时任务是否生效',
    ],
    faqs: [{ question: 'Cron Job 不执行怎么排查？', answer: '' }],
  },

  /* ---------- 评测 review ---------- */
  {
    slug: 'cloudways-performance-benchmark',
    title: 'Cloudways 性能压测报告：五家云厂商同配置实测对比',
    description:
      '用 k6 对五家底层云厂商的同配置实例做 50 与 200 并发压测，记录 TTFB、RPS、错误率与资源占用，给出数据化的选型结论。',
    category: 'review',
    tags: ['评测', '压测', '性能', 'k6'],
    keywords: ['Cloudways 性能测试', 'Cloudways 压测', '云主机性能对比'],
    outline: [
      '测试方法与环境说明',
      '测试站点与数据准备',
      '50 并发下的表现',
      '200 并发下的表现',
      '资源占用对比',
      '结论与选型建议',
    ],
    faqs: [{ question: '压测数据适用于我的站点吗？', answer: '' }],
  },
  {
    slug: 'cloudways-support-experience',
    title: 'Cloudways 客服实测：20 次工单的响应速度与解决率',
    description:
      '记录 20 次真实客服交互：首次响应时间、问题解决率、需要升级工程师的比例，以及提高沟通效率的提问模板。',
    category: 'review',
    tags: ['评测', '客服', '支持', '工单'],
    keywords: ['Cloudways 客服', 'Cloudways 支持', 'Cloudways 工单'],
    outline: [
      '测试方法与记录维度',
      '首次响应时间分布',
      '问题解决率统计',
      '哪些问题需要升级工程师',
      '高效提问的模板',
      '结论',
    ],
    faqs: [{ question: '客服支持中文吗？', answer: '' }],
  },
  {
    slug: 'cloudways-long-term-review',
    title: '连续使用 12 个月后：Cloudways 稳定性与真实账单复盘',
    description:
      '一年的运行数据：可用性、故障次数与时长、实际账单构成、升级与降配记录，以及哪些附加项最容易被忽略。',
    category: 'review',
    tags: ['评测', '长期使用', '账单', '稳定性'],
    keywords: ['Cloudways 长期评测', 'Cloudways 账单', 'Cloudways 稳定性'],
    outline: ['可用性统计', '故障记录与处理', '账单构成拆解', '配置调整历史', '隐性成本复盘', '是否继续使用'],
    faqs: [{ question: 'Cloudways 会无故宕机吗？', answer: '' }],
  },

  /* ---------- 对比 comparison ---------- */
  {
    slug: 'cloudways-vs-vps-manual',
    title: 'Cloudways vs 自建 VPS：多花的钱值不值',
    description:
      '把 Cloudways 的管理费拆开算：自己搭 Nginx、Varnish、Redis、备份与监控需要多少时间成本，什么规模下自建更划算。',
    category: 'comparison',
    tags: ['对比', 'VPS', '自建', '成本'],
    keywords: ['Cloudways vs VPS', '托管主机值得吗', '自建服务器成本'],
    outline: ['成本对比框架', '自建需要做哪些事', '时间成本折算', '什么规模适合自建', '什么规模适合托管', '混合方案'],
    faqs: [{ question: '自建 VPS 真的更便宜吗？', answer: '' }],
  },
  {
    slug: 'cloudways-vs-siteground-bluehost',
    title: 'Cloudways vs SiteGround vs Bluehost：共享主机与托管云的边界',
    description:
      '三种主机的真实差异：资源隔离、性能上限、扩展成本与运维负担，以及站点到什么规模应该搬家。',
    category: 'comparison',
    tags: ['对比', 'SiteGround', 'Bluehost', '共享主机'],
    keywords: ['Cloudways 对比 SiteGround', '共享主机 vs 托管云', '什么时候该换主机'],
    outline: ['三类主机的资源模型', '性能对比', '成本随规模的变化', '运维负担对比', '搬家的触发信号', '结论'],
    faqs: [{ question: '小站点用 Cloudways 会浪费吗？', answer: '' }],
  },
  {
    slug: 'cloudways-nginx-apache-stack',
    title: 'Cloudways 技术栈解析：Nginx、Apache、Varnish 与 Redis 如何协作',
    description:
      '拆解 Cloudways 默认的 LEMP 架构：请求从 Nginx 到 Varnish 到 Apache 再到 PHP 的完整链路，以及每层能做什么优化。',
    category: 'comparison',
    tags: ['技术栈', 'Nginx', 'Varnish', 'Redis', '架构'],
    keywords: ['Cloudways 技术栈', 'LEMP 架构', 'Nginx Varnish Redis'],
    outline: ['整体架构概览', 'Nginx 的角色', 'Varnish 缓存层', 'Apache 与 PHP-FPM', 'Redis 对象缓存', '各层可做的优化'],
    faqs: [{ question: '可以换成纯 Nginx 吗？', answer: '' }],
  },

  /* ---------- 优惠 coupon ---------- */
  {
    slug: 'cloudways-free-trial-guide',
    title: 'Cloudways 免费试用完全指南：不绑卡也能跑通全流程',
    description:
      '免费试用的边界在哪、能做什么不能做什么、如何把试用期价值最大化，以及试用结束后的三种选择。',
    category: 'coupon',
    tags: ['优惠', '免费试用', '省钱'],
    keywords: ['Cloudways 免费试用', 'Cloudways 试用期', '不绑卡试用'],
    outline: ['试用包含什么', '不需要信用卡', '试用期必做的五件事', '试用结束后的选择', '常见限制'],
    faqs: [{ question: '试用期有多长？', answer: '' }],
  },
  {
    slug: 'cloudways-cost-optimization',
    title: 'Cloudways 省钱实战：把月账单从 96 美元压到 42 美元',
    description:
      '一个真实站点的降本过程：缓存优化替代扩容、厂商更换、闲置资源清理与备份策略调整，逐项列出节省金额。',
    category: 'coupon',
    tags: ['优惠', '省钱', '降本', '优化'],
    keywords: ['Cloudways 省钱', 'Cloudways 降低成本', '云主机降本'],
    outline: ['优化前的账单', '第一步：缓存优化', '第二步：更换厂商', '第三步：清理闲置资源', '第四步：备份策略调整', '最终账单与效果'],
    faqs: [{ question: '降配会影响性能吗？', answer: '' }],
  },

  /* ---------- 搬家 migration ---------- */
  {
    slug: 'migrate-woocommerce-to-cloudways',
    title: 'WooCommerce 迁移到 Cloudways：订单数据零丢失实操',
    description:
      '电商站点迁移的特殊处理：订单表与用户数据完整性校验、插件兼容性排查、支付网关回调地址更新与切换后验证清单。',
    category: 'migration',
    tags: ['搬家', 'WooCommerce', '电商', '数据迁移'],
    keywords: ['WooCommerce 迁移', '电商搬家', 'Cloudways WooCommerce'],
    outline: ['迁移前的准备', '数据库完整导出', '订单与用户数据校验', '插件兼容性排查', '支付网关配置更新', '切换与验证', '回滚预案'],
    faqs: [{ question: '迁移期间订单会丢失吗？', answer: '' }],
  },
  {
    slug: 'migrate-from-shared-hosting',
    title: '从共享主机搬到 Cloudways：DNS 切换与停机时间控制',
    description:
      '针对共享主机用户的迁移指南：如何在不中断访问的前提下完成切换，TTL 预调、hosts 文件预演与切换后的监控。',
    category: 'migration',
    tags: ['搬家', '共享主机', 'DNS', '零停机'],
    keywords: ['共享主机搬家', 'Cloudways 迁移', 'DNS 切换'],
    outline: ['迁移前的准备清单', 'TTL 预调低', '在新服务器搭好站点', 'hosts 文件预演', '切换 DNS', '切换后监控', '清理旧主机'],
    faqs: [{ question: '切换后旧站还能访问吗？', answer: '' }],
  },
  {
    slug: 'cloudways-domain-dns-setup',
    title: '域名与 DNS 配置指南：Cloudflare 与 Cloudways 的最佳组合',
    description:
      '把域名解析到 Cloudways 的完整步骤，以及叠加 Cloudflare 时的代理开关、缓存规则与常见冲突处理。',
    category: 'migration',
    tags: ['搬家', 'DNS', 'Cloudflare', '域名'],
    keywords: ['Cloudways DNS 配置', 'Cloudflare Cloudways', '域名解析'],
    outline: ['获取服务器 IP', 'A 记录配置', '是否开启 Cloudflare 代理', 'SSL 模式选择', '常见冲突与解决', '验证方法'],
    faqs: [{ question: 'Cloudflare 代理会影响 SSL 吗？', answer: '' }],
  },

  /* ---------- 常见问题 faq ---------- */
  {
    slug: 'cloudways-billing-explained',
    title: 'Cloudways 计费完全解析：按小时到底怎么算',
    description:
      '把账单拆到每一行：服务器小时费、存储扩容、Staging、备份加频与超流量，附真实账单样例与自查清单。',
    category: 'faq',
    tags: ['常见问题', '计费', '账单', '按小时'],
    keywords: ['Cloudways 计费', 'Cloudways 账单', 'Cloudways 按小时'],
    outline: ['计费模型概览', '服务器小时费', '附加项清单', '超流量如何处理', '真实账单样例', '账单自查清单'],
    faqs: [{ question: '删除服务器后还会扣费吗？', answer: '' }],
  },
  {
    slug: 'cloudways-security-checklist',
    title: 'Cloudways 安全加固清单：从默认配置到生产级',
    description:
      '12 项可执行的安全设置：防火墙规则、SSH 密钥、登录保护、文件权限、WAF 与备份策略，按优先级排序。',
    category: 'faq',
    tags: ['常见问题', '安全', '加固', '防火墙'],
    keywords: ['Cloudways 安全', 'Cloudways 防火墙', 'WordPress 安全加固'],
    outline: ['默认安全基线', '防火墙规则配置', 'SSH 密钥与端口', 'WordPress 登录保护', '文件权限修正', '备份与回滚策略'],
    faqs: [{ question: 'Cloudways 自带 WAF 吗？', answer: '' }],
  },
  {
    slug: 'cloudways-scaling-guide',
    title: '什么时候该升级配置：用监控数据做决策',
    description:
      '不看感觉看数据：CPU、内存、磁盘 IO 与 TTFB 四类指标的判读方法，以及每种瓶颈对应的最优解。',
    category: 'faq',
    tags: ['常见问题', '扩容', '监控', '性能'],
    keywords: ['Cloudways 升级配置', 'Cloudways 监控', '云主机扩容'],
    outline: ['四类关键指标', 'CPU 瓶颈怎么判断', '内存瓶颈怎么判断', 'IO 瓶颈怎么判断', '缓存能替代多少硬件', '升级决策树'],
    faqs: [{ question: '升级需要停机吗？', answer: '' }],
  },
  {
    slug: 'cloudways-backup-restore',
    title: 'Cloudways 备份与恢复：误删数据的三种救援路径',
    description:
      '自动备份的频率与保留策略、一键回滚的正确用法，以及服务器被删除后的补救可能性与预防措施。',
    category: 'faq',
    tags: ['常见问题', '备份', '恢复', '回滚'],
    keywords: ['Cloudways 备份', 'Cloudways 恢复', 'WordPress 数据恢复'],
    outline: ['备份策略概览', '调整备份频率', '一键回滚操作', '单文件恢复方法', '服务器被删后的补救', '异地备份方案'],
    faqs: [{ question: '备份会占用服务器空间吗？', answer: '' }],
  },
  {
    slug: 'cloudways-email-hosting',
    title: 'Cloudways 不支持邮件托管，那邮件该怎么办',
    description:
      'Cloudways 不提供邮箱服务的原因，以及三种替代方案对比：Google Workspace、Zoho Mail 与自建邮件服务的成本与难度。',
    category: 'faq',
    tags: ['常见问题', '邮件', '企业邮箱'],
    keywords: ['Cloudways 邮箱', 'Cloudways 邮件', '企业邮箱方案'],
    outline: ['为什么 Cloudways 不做邮件', '方案一：Google Workspace', '方案二：Zoho Mail', '方案三：自建邮件服务', 'DNS 记录配置', '成本对比'],
    faqs: [{ question: 'Cloudways 能发注册验证邮件吗？', answer: '' }],
  },
  {
    slug: 'cloudways-cdn-setup',
    title: 'Cloudways CDN 配置指南：Cloudflare 与 BunnyCDN 怎么选',
    description:
      '两类 CDN 的适用场景对比、在 Cloudways 上的接入步骤、缓存规则设置与命中率优化，附效果实测。',
    category: 'faq',
    tags: ['常见问题', 'CDN', 'Cloudflare', 'BunnyCDN'],
    keywords: ['Cloudways CDN', 'Cloudflare 配置', 'BunnyCDN 对比'],
    outline: ['什么时候需要 CDN', 'Cloudflare 接入步骤', 'BunnyCDN 接入步骤', '缓存规则设置', '命中率优化', '效果实测'],
    faqs: [{ question: '用了 CDN 还需要 Varnish 吗？', answer: '' }],
  },
];

/* =========================================================
   Markdown 骨架生成
   ========================================================= */

const CATEGORY_LABEL = {
  tutorial: '教程',
  review: '评测',
  comparison: '对比',
  coupon: '优惠',
  migration: '搬家',
  faq: '常见问题',
};

/** 输出 YAML 安全的字符串 */
function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildFrontmatter(topic, index) {
  const tags = topic.tags?.length ? topic.tags : [CATEGORY_LABEL[topic.category] ?? 'Cloudways'];
  const keywords = topic.keywords?.length ? topic.keywords : tags;
  const faqs = topic.faqs?.length ? topic.faqs : [{ question: '待补充的问题', answer: '' }];

  // 让生成的骨架按顺序倒排发布日期，避免同一天堆叠
  const pub = new Date();
  pub.setDate(pub.getDate() - index * 2);
  const pubDate = pub.toISOString().slice(0, 10);

  const lines = [
    '---',
    `title: ${yamlString(topic.title)}`,
    `description: ${yamlString(topic.description)}`,
    `pubDate: ${pubDate}`,
    `author: Cloudways 指南编辑部`,
    `category: ${topic.category}`,
    'tags:',
    ...tags.map((t) => `  - ${yamlString(t)}`),
    'heroImage: /images/articles/placeholder.svg',
    `heroImageAlt: ${yamlString(topic.title)}`,
    'affiliateNotice: true',
    'featured: false',
    'draft: true',
    'toc: true',
    'relatedProducts: [digitalocean, vultr]',
    'faqs:',
  ];

  for (const faq of faqs) {
    lines.push(`  - question: ${yamlString(faq.question)}`);
    lines.push(`    answer: ${yamlString(faq.answer || '【待填写：控制在 80–150 字，直接回答问题，不要铺垫】')}`);
  }

  lines.push('seo:');
  lines.push(`  title: ${yamlString(topic.title.slice(0, 60))}`);
  lines.push(`  description: ${yamlString(topic.description.slice(0, 158))}`);
  lines.push('  keywords:');
  lines.push(...keywords.map((k) => `    - ${yamlString(k)}`));
  lines.push('---');

  return lines.join('\n');
}

function buildBody(topic) {
  const outline = topic.outline?.length ? topic.outline : ['小节一', '小节二', '小节三'];

  const sections = outline
    .map(
      (heading, i) => `## ${heading}

<!--
【写作要求】${heading}
- 这一段要回答的具体问题：
- 需要的数据 / 表格 / 命令：
- 与本节的关联内链：
-->

【待填写：${i === 0 ? '开篇直接给结论或关键数据，不要铺垫背景。' : '用 2–4 段说明，优先给出可执行步骤或数据。'}】

`,
    )
    .join('\n');

  return `
<!--
============================================================
AI 填充提示（发布前请删除本注释块）
============================================================
这是一篇「${CATEGORY_LABEL[topic.category] ?? topic.category}」类文章。填充正文时请遵守：

1. 语气：直接、具体、有判断。不要写「随着互联网的发展」这类空话。
2. 数据：所有价格、性能数字必须标注来源或测试条件；没有数据的结论要说明是经验值。
3. 结构：每个二级标题下优先给结论，再给理由，最后给操作步骤。
4. 表格：凡是「对比」性质的内容，优先用 Markdown 表格呈现。
5. 内链：自然地在正文中链接到站内相关页面（如 /products/digitalocean/、/compare/）。
6. 转化点：文中至少出现一次 Cloudways 的推荐语境，但不要生硬，说明「为什么现在值得试」。
7. FAQ：文末的 faqs 字段要填成完整回答，会生成 FAQPage 结构化数据。
8. 删除本注释块，并把 draft 改为 false 后发布。
============================================================
-->

## 结论先行

【待填写：用 2–3 句话给出核心结论，让读者不必读完就能拿走答案。】

${sections}
## 常见问题

<!-- 本节内容由 frontmatter 的 faqs 字段自动渲染，正文中无需重复。 -->
`;
}

/* =========================================================
   CLI
   ========================================================= */

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, limit: Infinity, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') args.list = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--category') args.category = argv[++i];
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--out') args.out = resolve(argv[++i]);
    else if (a === '--topics') args.topics = resolve(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Cloudways 文章骨架批量生成器

  --list                     列出内置选题库
  --limit <n>                限制生成数量
  --category <key>           只生成指定分类（tutorial|review|comparison|coupon|migration|faq）
  --slug <slug>              只生成指定选题
  --out <dir>                输出目录（默认 src/content/articles）
  --topics <file.json>       使用自定义选题库
  --dry-run                  只预览，不写文件
  --force                    覆盖已存在的文件
  --help                     显示帮助
`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) return printHelp();

  let bank = TOPIC_BANK;
  if (args.topics) {
    bank = JSON.parse(await readFile(args.topics, 'utf8'));
    console.log(`已加载自定义选题库：${args.topics}（${bank.length} 个选题）`);
  }

  if (args.list) {
    console.log(`\n内置选题库共 ${bank.length} 个选题：\n`);
    for (const key of Object.keys(CATEGORY_LABEL)) {
      const group = bank.filter((t) => t.category === key);
      if (!group.length) continue;
      console.log(`【${CATEGORY_LABEL[key]}】`);
      for (const t of group) console.log(`  ${t.slug.padEnd(38)} ${t.title}`);
      console.log('');
    }
    return;
  }

  let selected = bank;
  if (args.category) selected = selected.filter((t) => t.category === args.category);
  if (args.slug) selected = selected.filter((t) => t.slug === args.slug);
  selected = selected.slice(0, args.limit);

  if (!selected.length) {
    console.error('没有匹配的选题。用 --list 查看可用选题。');
    process.exitCode = 1;
    return;
  }

  if (!args.dryRun) await mkdir(args.out, { recursive: true });

  let written = 0;
  let skipped = 0;

  for (const [i, topic] of selected.entries()) {
    const target = join(args.out, `${topic.slug}.md`);
    const content = `${buildFrontmatter(topic, i)}\n${buildBody(topic)}`;

    if (!args.force && (await exists(target))) {
      console.log(`↷ 跳过（已存在） ${topic.slug}.md`);
      skipped++;
      continue;
    }

    if (args.dryRun) {
      console.log(`\n──────── ${topic.slug}.md ────────\n${content.slice(0, 900)}\n...`);
    } else {
      await writeFile(target, content, 'utf8');
      console.log(`✓ ${topic.slug}.md`);
    }
    written++;
  }

  console.log(
    `\n完成：生成 ${written} 篇${skipped ? `，跳过 ${skipped} 篇` : ''}。` +
      (args.dryRun ? '（dry-run，未写入文件）' : `\n输出目录：${args.out}`) +
      '\n下一步：用 AI 逐篇填充正文，填完把 frontmatter 的 draft 改为 false。',
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
