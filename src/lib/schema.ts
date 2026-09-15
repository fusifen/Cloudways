import { SITE, AFFILIATE_ID, CATEGORIES, ogImagePath, type CategoryKey } from '../consts';
import type { Article, Product } from './articles';

/* =========================================================
   JSON-LD 结构化数据构造器
   统一在此生成，避免各页面手写导致字段不一致
   ========================================================= */

/** 安全序列化：防止内容里的 </script> 提前闭合标签 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const abs = (path: string) => new URL(path, SITE.url).toString();

/* ------------------------- 站点级 ------------------------- */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: abs('/favicon.svg'),
    description: SITE.description,
    sameAs: [],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.locale,
    publisher: { '@type': 'Organization', name: SITE.name },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/articles/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ------------------------- 面包屑 ------------------------- */

export type Crumb = { label: string; href?: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
}

/* ------------------------- 文章 ------------------------- */

export function articleSchema(article: Article, url: string) {
  const d = article.data;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: d.seo?.title || d.title,
    description: d.seo?.description || d.description,
    inLanguage: d.locale,
    datePublished: d.pubDate.toISOString(),
    dateModified: (d.updatedDate ?? d.pubDate).toISOString(),
    author: { '@type': 'Organization', name: d.author, url: SITE.url },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: abs('/favicon.svg') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(url) },
    image: abs(ogImagePath(d.seo?.ogImage || d.heroImage)),
    articleSection: CATEGORIES[d.category as CategoryKey]?.label ?? d.category,
    keywords: [...(d.seo?.keywords ?? []), ...d.tags].join(', '),
    ...(d.affiliateNotice
      ? {
          disclosure:
            '本文包含推广链接。通过文中链接购买，本站可能获得佣金，不影响你的支付价格。',
        }
      : {}),
  };
}

/** FAQPage 结构化数据 —— 有 FAQ 的文章自动输出，利于富摘要 */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/* ------------------------- 产品 / 报价 ------------------------- */

export function productSchema(product: Product, url: string, affiliateLink: string) {
  const d = product.data;
  const cheapest = [...d.plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Cloudways ${d.name} 托管云主机`,
    description: d.tagline,
    brand: { '@type': 'Brand', name: 'Cloudways' },
    category: 'Web Hosting',
    url: abs(url),
    image: abs(d.logo),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: cheapest.monthlyPrice.toFixed(2),
      highPrice: Math.max(...d.plans.map((p) => p.monthlyPrice)).toFixed(2),
      offerCount: d.plans.length,
      availability: 'https://schema.org/InStock',
      url: affiliateLink,
      seller: { '@type': 'Organization', name: 'Cloudways' },
    },
    ...(d.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: d.rating.toFixed(1),
            bestRating: '5',
            ratingCount: 128,
          },
        }
      : {}),
  };
}

export function itemListSchema(items: { name: string; url: string }[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: abs(item.url),
    })),
  };
}

/* ------------------------- 软件 / 优惠 ------------------------- */

export function couponSchema(code: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: description,
    url,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    seller: { '@type': 'Organization', name: 'Cloudways' },
    ...(code && code !== 'NO_CODE' ? { identifier: code } : {}),
  };
}

/** 导出供组件判断是否需要隐藏真实 ID */
export const affiliateIdForSchema = AFFILIATE_ID;
