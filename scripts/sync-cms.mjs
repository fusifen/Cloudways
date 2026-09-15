/**
 * 同步 Sveltia CMS 主程序到 public/admin/
 * ---------------------------------------------------------------
 * 为什么不直接用 CDN？
 *   unpkg / jsDelivr 等公共 CDN 在国内网络下经常超时或被拦截，
 *   会导致 /admin/ 后台白屏打不开。把主程序复制到站点自身目录后，
 *   后台从同源加载，不依赖任何外部网络，且版本随 package.json 锁定。
 *
 * 运行： node scripts/sync-cms.mjs
 * 已挂到 npm 的 predev / prebuild，正常情况下无需手动执行。
 */

import { access, copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = [
  join(root, 'node_modules/@sveltia/cms/dist/sveltia-cms.js'),
  join(root, 'node_modules/@sveltia/cms/dist/sveltia-cms.min.js'),
];

const TARGET = join(root, 'public/admin/sveltia-cms.js');

async function firstExisting(paths) {
  for (const p of paths) {
    try {
      await access(p);
      return p;
    } catch {
      /* 继续找下一个 */
    }
  }
  return null;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const source = await firstExisting(SOURCES);

if (!source) {
  // 依赖没装（例如 CI 只装了生产依赖），但产物已经在仓库里 —— 直接用现成的，不要中断构建。
  // 这一步是「后台打不开」问题的兜底：宁可保留旧版主程序，也不能让构建失败。
  if (await exists(TARGET)) {
    const { size } = await stat(TARGET);
    console.log(
      `⚠ 未找到 @sveltia/cms（node_modules 可能未安装 devDependencies）。\n` +
        `  沿用仓库中已有的 public/admin/sveltia-cms.js（${(size / 1024).toFixed(0)} KB）。\n` +
        `  如需升级主程序： npm install -D @sveltia/cms && npm run cms:sync`,
    );
    process.exit(0);
  }

  console.error(
    '✗ 找不到 @sveltia/cms 的构建产物，且 public/admin/sveltia-cms.js 不存在。\n' +
      '  请先运行： npm install -D @sveltia/cms\n' +
      '  查找路径：\n' +
      SOURCES.map((p) => `    ${p}`).join('\n'),
  );
  process.exit(1);
}

await mkdir(dirname(TARGET), { recursive: true });
await copyFile(source, TARGET);

const { size } = await stat(TARGET);
const kb = (size / 1024).toFixed(0);

console.log(`✓ Sveltia CMS 已同步到 public/admin/sveltia-cms.js（${kb} KB）`);
console.log(`  来源：${source.replace(root + '\\', '').replace(root + '/', '')}`);
