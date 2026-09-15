/**
 * 推广落地页体检
 * ---------------------------------------------------------------
 * 为什么需要这个脚本：
 *   本站所有转化按钮最终都指向 Cloudways 的某个落地页（`CLOUDWAYS` 里的路径）。
 *   Cloudways 的站点结构是 **.php 文件**，而且会不打招呼地下线老页面：
 *
 *     ✗ /en/cloud-hosting-signup.php  → 已被下线，落到 Cloudways 自己的 404
 *     ✗ /en/pricing/                  → 目录写法，404
 *     ✗ /en/support/                  → 目录写法，404
 *     ✓ /en/                          → 首页，?id= 在此生效，联盟入口
 *     ✓ /en/pricing.php               → 真实定价页
 *     ✓ /en/digital-ocean-cloud-hosting.php → DigitalOcean 专属落地页（"部署"按钮的目标）
 *
 *   注意「部署」按钮**不要**用 pricing.php 的 #do / #vultr 锚点：
 *   那些是 Bootstrap 标签触发器，对应面板由 JS 动态加载，静态 HTML 里没有 id="do"，
 *   站点按 hash 激活标签的代码也只作用于顶层 .nav-tabs —— 外链带 #do 是个死片段。
 *   正确做法是直接用厂商专属落地页（见 consts.ts 的 CLOUDWAYS_PROVIDER_PAGES）。
 *
 *   这类错误**构建期完全不报错**：页面照常生成、链接照常渲染，
 *   只有真人点下去才会看到 404 —— 也就是「本地看着正常、上线后 404」。
 *
 * 两层检查：
 *   1. 静态层（默认）：内容里的 ctaPath 必须在 consts.ts 的白名单里，
 *      且路径形态必须合法（不允许目录式 /en/xxx/）。不联网、确定性，已挂到 prebuild。
 *   2. 联网层（--live）：真实请求每个落地页，识别 Cloudways 的软 404 页。
 *      上线前手动跑： npm run check:affiliate -- --live
 *
 * 用法：
 *   npm run check:affiliate            # 只做静态校验
 *   npm run check:affiliate -- --live  # 静态 + 联网实测
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');

/* ------------------------- 用构建同款 resolver 加载 consts.ts ------------------------- */

async function loadConsts() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: ROOT,
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    return await server.ssrLoadModule('/src/consts.ts');
  } finally {
    await server.close();
  }
}

const consts = await loadConsts();
const CLOUDWAYS = consts.CLOUDWAYS;
const PROVIDER_PAGES = consts.CLOUDWAYS_PROVIDER_PAGES;
const AFFILIATE_ID = consts.AFFILIATE_ID;
const ALLOWED = new Set(consts.CLOUDWAYS_ALLOWED_PATHS);

/** 所有对外落地页，键名用于报错定位：CLOUDWAYS.* 与 provider:<厂商> */
const LANDING_PAGES = [
  ...Object.entries(CLOUDWAYS).filter(([k]) => k !== 'origin'),
  ...Object.entries(PROVIDER_PAGES).map(([k, v]) => [`provider:${k}`, v]),
];

/* ------------------------- 收集内容里的 ctaPath ------------------------- */

async function frontmatterCtaPaths(relDir) {
  const dir = join(ROOT, relDir);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.md')) continue;
    const text = await readFile(join(dir, name), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const m = fm[1].match(/^ctaPath:\s*(.+?)\s*$/m);
    if (m) {
      const pm = fm[1].match(/^provider:\s*(.+?)\s*$/m);
      out.push({
        file: `${relDir}/${name}`,
        value: m[1].replace(/^["']|["']$/g, ''),
        provider: pm ? pm[1].replace(/^["']|["']$/g, '') : undefined,
      });
    }
  }
  return out;
}

const entries = [
  ...(await frontmatterCtaPaths('src/content/products')),
  ...(await frontmatterCtaPaths('src/content/articles')),
];

/* ------------------------- 静态检查 ------------------------- */

const errors = [];
const warnings = [];

for (const [key, value] of LANDING_PAGES) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    errors.push(`${key} 必须是站内相对路径（以 / 开头），实际是 ${JSON.stringify(value)}`);
    continue;
  }
  // Cloudways 用 .php 文件结构，目录写法（/en/xxx/）一律 404
  if (value !== '/en/' && value.endsWith('/')) {
    errors.push(
      `${key} = "${value}" 是目录写法。Cloudways 是 .php 文件结构，` +
        `请改成 "${value.replace(/\/$/, '.php')}" 或回落 "/en/"`,
    );
  }
  if (value.includes('cloud-hosting-signup')) {
    errors.push(`${key} = "${value}"：该路径已被 Cloudways 下线，会落到 Cloudways 的 404 页`);
  }
}

for (const { file, value, provider } of entries) {
  if (!ALLOWED.has(value)) {
    errors.push(
      `${file} 的 ctaPath="${value}" 不在 consts.ts 白名单里。\n` +
        `      可选值：${[...ALLOWED].join('、')}`,
    );
  }
  // 厂商专属页不能配错厂商（schema 里也拦了一道，这里让 prebuild 更早暴露问题）
  const owner = Object.entries(PROVIDER_PAGES).find(([, p]) => p === value)?.[0];
  if (owner && provider && owner !== provider) {
    errors.push(
      `${file} 的 ctaPath="${value}" 是 ${owner} 的专属落地页，但 provider="${provider}" —— 会跳到别家厂商`,
    );
  }
}

/* ------------------------- 联网检查 ------------------------- */

/** Cloudways 的软 404：HTTP 可能是 200/301，但页面是它自己的 404 模板 */
const SOFT_404_MARKERS = ['slipped through a time portal', 'Cloudways | 404'];

async function probe(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(25000),
  });
  const body = await res.text();
  const soft = SOFT_404_MARKERS.some((m) => body.includes(m));
  return { status: res.status, soft, finalUrl: res.url };
}

if (LIVE) {
  const paths = [...new Set(LANDING_PAGES.map(([, v]) => v))];
  console.log(`\n联网实测 ${paths.length} 个落地页（联盟 ID ${AFFILIATE_ID}）…`);
  console.log('注意：Cloudways 前置了机器人防护，非浏览器请求常被拦成 403，\n      这属于「无法判定」而不是「链接失效」，不会算作失败。\n');

  let blocked = 0;

  for (const p of paths) {
    const url = new URL(p, CLOUDWAYS.origin);
    url.searchParams.set('id', AFFILIATE_ID);
    const target = url.toString();
    try {
      const { status, soft, finalUrl } = await probe(target);
      if (soft) {
        // 最危险的情况：HTTP 200 但其实是 Cloudways 自己的 404 页
        errors.push(`${p} → 命中 Cloudways 的 404 页面（HTTP ${status}）\n      ${finalUrl}`);
        console.log(`  ✗ ${p}  →  Cloudways 404 页面`);
      } else if (status === 404) {
        errors.push(`${p} → HTTP 404\n      ${finalUrl}`);
        console.log(`  ✗ ${p}  →  HTTP 404`);
      } else if (status === 403 || status === 429) {
        blocked++;
        warnings.push(`${p} 被 Cloudways 的机器人防护拦截（HTTP ${status}），无法自动判定 —— 请用浏览器人工确认一次`);
        console.log(`  ? ${p}  →  HTTP ${status}（被 WAF 拦截，无法判定）`);
      } else if (status >= 500) {
        warnings.push(`${p} → HTTP ${status}（服务端临时错误，稍后重试）`);
        console.log(`  ~ ${p}  →  HTTP ${status}（服务端临时错误）`);
      } else {
        console.log(`  ✓ ${p}  →  HTTP ${status}`);
      }
    } catch (e) {
      warnings.push(`${p} 无法联网验证：${e.message}（本地网络/代理问题，不代表链接失效）`);
      console.log(`  ? ${p}  →  网络不可达，跳过`);
    }
  }

  if (blocked === paths.length) {
    console.log('\n全部落地页都被 WAF 拦成 403 —— 本次联网检查没有结论，请人工确认。');
  }
}

/* ------------------------- 输出 ------------------------- */

console.log(`\n检查 ${LANDING_PAGES.length} 个落地页配置、${entries.length} 处内容 ctaPath。`);

for (const w of warnings) console.log(`⚠ ${w}`);

if (errors.length === 0) {
  console.log('✓ 推广落地页全部合法。');
} else {
  console.error(`\n✗ 发现 ${errors.length} 个问题：\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exitCode = 1;
}
