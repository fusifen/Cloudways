import { getCollection, type CollectionEntry } from 'astro:content';
import { ARTICLES_PER_PAGE, CATEGORY_KEYS, type CategoryKey } from '../consts';

export type Article = CollectionEntry<'articles'>;
export type Product = CollectionEntry<'products'>;

/* ------------------------- 文章查询 ------------------------- */

/** 取全部已发布文章，按发布时间倒序 */
export async function getPublishedArticles(): Promise<Article[]> {
  const all = await getCollection('articles', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 取全部产品，按 order 升序 */
export async function getSortedProducts(): Promise<Product[]> {
  const all = await getCollection('products');
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** 按分类筛选 */
export function filterByCategory(articles: Article[], category: CategoryKey): Article[] {
  return articles.filter((a) => a.data.category === category);
}

/** 按标签筛选（大小写不敏感） */
export function filterByTag(articles: Article[], tag: string): Article[] {
  const lower = tag.toLowerCase();
  return articles.filter((a) => a.data.tags.some((t) => t.toLowerCase() === lower));
}

/** 相关文章：同分类优先，其次共享标签，排除自身 */
export function getRelatedArticles(current: Article, all: Article[], limit = 3): Article[] {
  const others = all.filter((a) => a.id !== current.id);
  const scored = others.map((a) => {
    let score = 0;
    if (a.data.category === current.data.category) score += 3;
    const shared = a.data.tags.filter((t) => current.data.tags.includes(t)).length;
    score += shared * 2;
    if (a.data.featured) score += 1;
    return { article: a, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.article.data.pubDate.valueOf() - a.article.data.pubDate.valueOf())
    .slice(0, limit)
    .map((s) => s.article);
}

/* ------------------------- 分页 ------------------------- */

export type Page<T> = { items: T[]; currentPage: number; totalPages: number };

export function paginateItems<T>(items: T[], page: number, perPage = ARTICLES_PER_PAGE): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return { items: items.slice(start, start + perPage), currentPage, totalPages };
}

export function totalPagesFor(count: number, perPage = ARTICLES_PER_PAGE): number {
  return Math.max(1, Math.ceil(count / perPage));
}

/* ------------------------- 阅读时间 ------------------------- */

/**
 * 估算阅读时间（分钟）。
 * 中文按 350 字/分钟，英文按 200 词/分钟，混排取加权近似。
 */
export function estimateReadingTime(body: string | undefined): number {
  if (!body) return 1;
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-|]/g, ' ');
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9']+/g) || []).length;
  const minutes = cjk / 350 + words / 200;
  return Math.max(1, Math.round(minutes));
}

export function readingTimeOf(article: Article): number {
  return article.data.readingTime ?? estimateReadingTime(article.body);
}

/* ------------------------- 统计 ------------------------- */

export function countByCategory(articles: Article[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of CATEGORY_KEYS) result[key] = 0;
  for (const a of articles) {
    result[a.data.category] = (result[a.data.category] ?? 0) + 1;
  }
  return result;
}

export function collectTags(articles: Article[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'));
}

/* ------------------------- 格式化 ------------------------- */

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDateISO(date: Date): string {
  return date.toISOString();
}

export function formatPrice(value: number, digits = 2): string {
  return `$${value.toFixed(digits)}`;
}

/** 文章 URL */
export function articleUrl(article: Article): string {
  return `/articles/${article.id}/`;
}

/** 产品 URL */
export function productUrl(product: Product): string {
  return `/products/${product.id}/`;
}
