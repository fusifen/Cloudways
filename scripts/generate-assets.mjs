/**
 * 静态资源生成脚本
 * ---------------------------------------------------------------
 * 生成 Cloudways 指南站点所需的 SVG 资源：
 *   - 云厂商 Logo（public/images/providers/*.svg）
 *   - 文章头图（public/images/articles/*.svg）
 *   - 默认社交分享图（public/images/og-default.svg）
 *
 * 运行： node scripts/generate-assets.mjs
 * 说明： SVG 为矢量格式，体积小、任意缩放不糊，适合作为占位与品牌资源。
 *       后续可在 CMS 媒体库中直接替换为实拍截图或设计稿。
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT =
  "-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif";

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function write(relPath, content) {
  const full = join(root, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
  console.log('✓', relPath);
}

/**
 * 由 SVG 同步导出一份同名 PNG。
 *
 * 为什么需要：Facebook / X / LinkedIn / 微信等社交平台不渲染 SVG，
 * og:image 指向 .svg 会导致分享出去没有配图。所有会用作分享图的资源
 * 都必须有 PNG 版本。
 *
 * 渲染策略：先用 2 倍密度渲染再缩回目标宽度（超采样），
 * 让渐变与文字边缘更干净。
 */
async function writePng(relSvgPath, targetWidth) {
  const svgPath = join(root, relSvgPath);
  const pngRel = relSvgPath.replace(/\.svg$/i, '.png');
  const pngPath = join(root, pngRel);

  const pipeline = sharp(svgPath, { density: 144 });
  if (targetWidth) {
    pipeline.resize({ width: targetWidth, fit: 'contain', withoutEnlargement: false });
  }
  await pipeline.png({ compressionLevel: 9, palette: false }).toFile(pngPath);

  console.log('✓', pngRel);
}

/* =========================================================
   1. 云厂商 Logo
   ========================================================= */
const providers = [
  { slug: 'digitalocean', name: 'DigitalOcean', abbr: 'DO', color: '#0080FF' },
  { slug: 'aws', name: 'Amazon AWS', abbr: 'AWS', color: '#FF9900' },
  { slug: 'gcp', name: 'Google Cloud', abbr: 'GCP', color: '#4285F4' },
  { slug: 'linode', name: 'Linode', abbr: 'LN', color: '#00A95C' },
  { slug: 'vultr', name: 'Vultr', abbr: 'VU', color: '#007BFC' },
];

function providerLogo({ name, abbr, color }) {
  const abbrSize = abbr.length > 2 ? 19 : 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="56" height="56" rx="14" fill="url(#g)"/>
  <text x="28" y="36" font-family="${FONT}" font-size="${abbrSize}" font-weight="700"
        fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${esc(abbr)}</text>
  <text x="70" y="35" font-family="${FONT}" font-size="21" font-weight="700" fill="#0b1220">${esc(name)}</text>
</svg>
`;
}

/* =========================================================
   2. 文章头图（1200×630，与 OG 图尺寸一致）
   ========================================================= */
const articleCovers = [
  {
    slug: 'placeholder',
    title: '文章头图占位',
    kicker: 'PLACEHOLDER · REPLACE ME',
    c1: '#475569',
    c2: '#94a3b8',
  },
  {
    slug: 'cloudways-review',
    title: 'Cloudways 深度评测',
    kicker: 'REVIEW · 2026',
    c1: '#1d4ed8',
    c2: '#0d9488',
  },
  {
    slug: 'pricing',
    title: '价格完全解读',
    kicker: 'PRICING · 14 – 300 USD',
    c1: '#1e40af',
    c2: '#3b82f6',
  },
  {
    slug: 'do-vs-vultr-vs-linode',
    title: '同价云厂商对比',
    kicker: 'COMPARISON · 3 PROVIDERS',
    c1: '#0f766e',
    c2: '#14b8a6',
  },
  {
    slug: 'coupon',
    title: '优惠与省钱指南',
    kicker: 'COUPON · SAVE MORE',
    c1: '#b45309',
    c2: '#f59e0b',
  },
  {
    slug: 'migration',
    title: '零停机迁移流程',
    kicker: 'MIGRATION · STEP BY STEP',
    c1: '#0e7490',
    c2: '#22d3ee',
  },
  {
    slug: 'breeze',
    title: 'Breeze 缓存实战',
    kicker: 'PERFORMANCE · TTFB -76%',
    c1: '#4338ca',
    c2: '#818cf8',
  },
  {
    slug: 'faq',
    title: '常见问题解答',
    kicker: 'FAQ · 20+ ANSWERS',
    c1: '#334155',
    c2: '#64748b',
  },
  {
    slug: 'vs-managed',
    title: '托管方案对比',
    kicker: 'COMPARISON · MANAGED WP',
    c1: '#6d28d9',
    c2: '#a78bfa',
  },
];

function articleCover({ title, kicker, c1, c2 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1010" cy="120" r="200" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="150" cy="560" r="150" fill="#ffffff" fill-opacity="0.06"/>
  <text x="96" y="250" font-family="${FONT}" font-size="26" font-weight="700"
        fill="#ffffff" fill-opacity="0.82" letter-spacing="3">${esc(kicker)}</text>
  <text x="96" y="356" font-family="${FONT}" font-size="76" font-weight="800" fill="#ffffff">${esc(title)}</text>
  <rect x="96" y="404" width="96" height="6" rx="3" fill="#ffffff" fill-opacity="0.7"/>
  <text x="96" y="500" font-family="${FONT}" font-size="30" font-weight="600"
        fill="#ffffff" fill-opacity="0.9">Cloudways 中文指南</text>
</svg>
`;
}

/* =========================================================
   3. 默认社交分享图
   ========================================================= */
const ogDefault = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Cloudways 中文指南">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1040" cy="110" r="220" fill="#ffffff" fill-opacity="0.07"/>
  <circle cx="120" cy="580" r="170" fill="#ffffff" fill-opacity="0.06"/>

  <rect x="96" y="112" width="76" height="76" rx="20" fill="#ffffff" fill-opacity="0.16"/>
  <path d="M150 130 L118 168 H140 L136 194 L168 154 H146 Z" fill="#ffffff"/>

  <text x="96" y="272" font-family="${FONT}" font-size="72" font-weight="800" fill="#ffffff">Cloudways 中文指南</text>
  <text x="96" y="342" font-family="${FONT}" font-size="30" font-weight="500"
        fill="#ffffff" fill-opacity="0.88">托管云主机评测 · 价格对比 · 实战教程</text>

  <g font-family="${FONT}" font-size="24" font-weight="600" fill="#ffffff" fill-opacity="0.92">
    <rect x="96" y="410" width="200" height="52" rx="26" fill="#ffffff" fill-opacity="0.14"/>
    <text x="126" y="444">5 家云厂商</text>
    <rect x="316" y="410" width="212" height="52" rx="26" fill="#ffffff" fill-opacity="0.14"/>
    <text x="346" y="444">20+ 全球机房</text>
    <rect x="548" y="410" width="228" height="52" rx="26" fill="#ffffff" fill-opacity="0.14"/>
    <text x="578" y="444">实测性能数据</text>
  </g>

  <text x="96" y="546" font-family="${FONT}" font-size="24" font-weight="500"
        fill="#ffffff" fill-opacity="0.7">cloudways-guide.com</text>
</svg>
`;

/* =========================================================
   4. favicon（品牌闪电标）
   ========================================================= */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Cloudways 中文指南">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <path d="M36 10 L19 36 H30 L26 54 L45 26 H33 Z" fill="#ffffff"/>
</svg>
`;

/* =========================================================
   执行
   ========================================================= */
console.log('— 云厂商 Logo —');
for (const p of providers) {
  const rel = `public/images/providers/${p.slug}.svg`;
  await write(rel, providerLogo(p));
  await writePng(rel, 480);
}

console.log('\n— 文章头图 —');
for (const c of articleCovers) {
  const rel = `public/images/articles/${c.slug}.svg`;
  await write(rel, articleCover(c));
  await writePng(rel, 1200);
}

console.log('\n— 分享图与图标 —');
await write('public/images/og-default.svg', ogDefault);
await writePng('public/images/og-default.svg', 1200);

await write('public/favicon.svg', favicon);
await writePng('public/favicon.svg', 180);

console.log('\n全部静态资源生成完成（SVG 用于页面显示，PNG 用于社交分享）。');
