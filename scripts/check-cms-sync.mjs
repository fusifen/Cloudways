/**
 * CMS 配置与内容文件字段一致性检查
 * ---------------------------------------------------------------
 * 背景：本项目的字段定义分散在两处，必须保持一致 ——
 *   1. public/admin/config.yml   （后台编辑界面）
 *   2. src/content/<collection>/*.md （实际内容文件的 frontmatter）
 * 另有一处是 src/content.config.ts 的 Zod schema（构建时校验）。
 *
 * 风险：如果内容文件里出现了 config.yml 中未定义的字段，
 *       CMS 打开并保存该条目时会**静默丢弃**这个字段，
 *       表现为「后台一保存，构建就报错」或内容莫名丢失。
 *
 * 本脚本反向扫描所有内容文件，找出 config.yml 中缺失的字段并告警。
 *
 * 运行： node scripts/check-cms-sync.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------- 解析 config.yml ------------------------- */

const config = yaml.load(await readFile(join(root, 'public/admin/config.yml'), 'utf8'));

/** 递归收集一个 field 定义里出现的所有字段名 */
function collectFieldNames(fields, into = new Set()) {
  for (const f of fields ?? []) {
    if (f.name) into.add(f.name);
    if (f.fields) collectFieldNames(f.fields, into);
  }
  return into;
}

/* ------------------------- 提取 frontmatter ------------------------- */

/** 从 Markdown 文件中取出 frontmatter 的顶层键名 */
function frontmatterKeys(text) {
  if (!text.startsWith('---')) return new Set();
  const end = text.indexOf('\n---', 3);
  if (end === -1) return new Set();

  const raw = text.slice(3, end);
  let data;
  try {
    data = yaml.load(raw);
  } catch (err) {
    throw new Error(`frontmatter YAML 解析失败：${err.message}`);
  }
  return new Set(Object.keys(data ?? {}));
}

/* ------------------------- 主流程 ------------------------- */

let problems = 0;

for (const collection of config.collections ?? []) {
  const folder = collection.folder;
  if (!folder) continue;

  const dir = join(root, folder);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    console.log(`↷ 跳过 ${collection.name}（目录不存在：${folder}）`);
    continue;
  }

  const defined = collectFieldNames(collection.fields);
  // body 是正文，不是 frontmatter 字段
  defined.add('body');

  const missing = new Map(); // 字段名 -> 出现在哪些文件

  for (const file of files) {
    const keys = frontmatterKeys(await readFile(join(dir, file), 'utf8'));
    for (const key of keys) {
      if (!defined.has(key)) {
        if (!missing.has(key)) missing.set(key, []);
        missing.get(key).push(file);
      }
    }
  }

  const status = missing.size === 0 ? '✓' : '✗';
  console.log(
    `${status} ${collection.name}：${files.length} 个文件，config.yml 定义 ${defined.size - 1} 个字段`,
  );

  if (missing.size > 0) {
    problems += missing.size;
    for (const [key, where] of missing) {
      console.log(`    ⚠ 字段「${key}」未在 config.yml 中定义，出现在：${where.join('、')}`);
    }
  }
}

/* ------------------------- 输出结论 ------------------------- */

console.log('');
if (problems === 0) {
  console.log('✓ 一致性检查通过：所有内容字段都在 CMS 配置中有定义。');
} else {
  console.log(`✗ 发现 ${problems} 个未定义字段。请把上面的字段补进 public/admin/config.yml，`);
  console.log('  否则在后台打开并保存这些条目时，这些字段会被静默丢弃。');
  process.exitCode = 1;
}
