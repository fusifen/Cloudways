/**
 * 站内链接体检
 * ---------------------------------------------------------------
 * 扫描 dist/ 下的全部 HTML，提取所有站内链接与资源引用，
 * 逐一核对目标文件是否存在，报告死链。
 *
 * 为什么需要：内容站的内部链接会随文章增删、slug 调整而失效，
 * 而死链既影响用户体验也浪费爬虫预算。上线前跑一遍很值。
 *
 * 用法：
 *   npm run check:links              # 检查 dist/
 *   npm run check:links -- --dir dist
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------- 参数 ------------------------- */
const argv = process.argv.slice(2);
const dirIdx = argv.indexOf('--dir');
const distDir = join(root, dirIdx !== -1 ? argv[dirIdx + 1] : 'dist');

if (!existsSync(distDir)) {
  console.error(`✗ 找不到构建目录：${distDir}\n  请先运行 npm run build。`);
  process.exit(1);
}

/* ------------------------- 收集 HTML ------------------------- */

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = await walk(distDir);

/* ------------------------- 提取链接 ------------------------- */

/** 只关心站内链接：以 / 开头，或相对路径；忽略 http(s)、mailto、tel、#、data: */
function extractRefs(html) {
  const refs = new Set();
  const attrRe = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(html))) {
    const raw = m[1];
    if (!raw) continue;
    if (/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(raw)) continue;
    refs.add(raw);
  }
  return refs;
}

/** 把 URL 引用解析为 dist 下的实际文件路径 */
function resolveTarget(ref, fromFile) {
  // 去掉查询串与锚点
  let path = ref.split('#')[0].split('?')[0];
  if (!path) return null;

  // 关键：按 HTTP 语义解码百分号编码。
  // 例如 /tags/%E7%BC%93%E5%AD%98/ 对应磁盘上的 dist/tags/缓存/index.html。
  // 静态托管平台（Cloudflare Pages / Vercel / Netlify / GitHub Pages）
  // 都会先解码路径再查文件，所以这里也必须解码，否则会误报死链。
  try {
    path = decodeURIComponent(path);
  } catch {
    // 非法编码序列，保留原样继续检查
  }

  if (path.startsWith('/')) {
    path = path.slice(1);
  } else {
    // 相对路径：相对于当前页面所在目录
    const rel = fromFile.slice(distDir.length).replace(/^[\\/]/, '');
    path = normalize(join(dirname(rel), path));
  }

  const abs = join(distDir, path);

  // 依次尝试：原样 → 补 index.html → 补 .html
  const candidates = [abs, join(abs, 'index.html'), `${abs}.html`];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/* ------------------------- 执行检查 ------------------------- */

const broken = new Map(); // 目标 -> 来源页面集合
let totalRefs = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const rel = file.slice(distDir.length).replace(/\\/g, '/').replace(/^\/?/, '/');
  const pagePath = rel.replace(/index\.html$/, '');

  for (const ref of extractRefs(html)) {
    totalRefs++;
    if (!resolveTarget(ref, file)) {
      if (!broken.has(ref)) broken.set(ref, new Set());
      broken.get(ref).add(pagePath);
    }
  }
}

/* ------------------------- 输出 ------------------------- */

console.log(`扫描 ${htmlFiles.length} 个页面，检查 ${totalRefs} 处站内引用。\n`);

if (broken.size === 0) {
  console.log('✓ 未发现死链。');
} else {
  console.log(`✗ 发现 ${broken.size} 个失效目标：\n`);
  for (const [ref, pages] of broken) {
    console.log(`  ${ref}`);
    console.log(`    出现在：${[...pages].slice(0, 4).join('、')}${pages.size > 4 ? ` 等 ${pages.size} 个页面` : ''}`);
  }
  process.exitCode = 1;
}

/* ------------------------- 附：页面清单概览 ------------------------- */
const stats = await stat(distDir);
console.log(`\n构建目录：${distDir}`);
console.log(`HTML 页面数：${htmlFiles.length}`);
