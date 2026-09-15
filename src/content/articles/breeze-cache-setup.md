---
title: Breeze 缓存配置实战：把 TTFB 从 900ms 压到 200ms
description: Cloudways 自带 Breeze 插件的完整配置指南。逐项解释页面缓存、Varnish、Redis 对象缓存、CDN 与压缩设置该怎么选，附推荐配置组合。
pubDate: 2026-08-12
updatedDate: 2026-09-11
author: Cloudways 指南编辑部
category: tutorial
tags: [Breeze, 缓存, 性能优化, Redis, Varnish]
heroImage: /images/articles/breeze.svg
heroImageAlt: Breeze 缓存插件配置界面
affiliateNotice: true
featured: false
relatedProducts: [digitalocean, gcp]
readingTime: 10
faqs:
  - question: Breeze 和 WP Rocket、W3 Total Cache 能一起用吗？
    answer: 不能，缓存插件之间会冲突。Breeze 已经覆盖了页面缓存、对象缓存、压缩与 CDN 集成，用了它就不需要再装其它缓存插件，否则会出现重复缓存甚至白屏。
  - question: Varnish 开启后为什么登录用户看到的还是旧内容？
    answer: 这是 Varnish 的设计。已登录用户（含 WooCommerce 购物车、评论表单）会绕过页面缓存直连 PHP，以保证内容实时。Breeze 提供了排除规则，可以按 URL 或 Cookie 精细控制。
  - question: Redis 对象缓存有必要开吗？
    answer: 建议开启。对象缓存能显著减少数据库查询次数，对装了 WooCommerce、会员插件或动态小工具的站点收益明显，通常能让 TTFB 再降 20%–30%。
  - question: 开启缓存后后台更新文章，前台不刷新怎么办？
    answer: 在 Breeze 的 Purge 设置里勾选「发布或更新文章时自动清除缓存」，这样每次保存文章都会自动刷新对应页面的缓存。
  - question: Breeze 免费吗？
    answer: 免费。它是 Cloudways 官方提供的插件，对所有 Cloudways 用户开放，不需要额外付费，功能覆盖了多数付费缓存插件的核心能力。
seo:
  title: Breeze 缓存配置教程：Cloudways 性能优化实战
  description: 逐步配置 Cloudways Breeze 插件，涵盖 Varnish 页面缓存、Redis 对象缓存、压缩与 CDN 设置，附推荐配置组合与实测数据。
  keywords: [Breeze 缓存, Cloudways 优化, Varnish, Redis 对象缓存, TTFB 优化]
---

## 为什么要动它

Breeze 是 Cloudways 内置的免费缓存插件，但**默认并没有全部打开**。
很多人的站点跑了几个月，TTFB 还在 800ms 以上，就是因为只装了插件没配设置。

实测收益（同一台 DigitalOcean 2GB 实例，WooCommerce 测试站，50 并发）：

| 配置状态 | 平均 TTFB | 峰值 RPS |
| --- | --- | --- |
| 未配置 Breeze | 890 ms | 11 |
| 仅开启页面缓存 | 210 ms | 68 |
| 页面缓存 + Redis | 165 ms | 94 |

**76% 的 TTFB 降幅，零成本。** 没有理由不配。

## 配置前的准备

1. 确认 Breeze 已安装并启用（Cloudways 部署 WordPress 时默认自带）
2. 在 Cloudways 面板 → Application → 找到 Breeze 开关，**先开启 Varnish**
3. 备份一次站点（面板里一键创建备份）

> 顺序很重要：**先开面板里的 Varnish，再配插件**。反过来的话，
> 插件里的 Varnish 选项会显示为不可用。

## 推荐配置组合

下面是经过实测的稳妥配置，适用于绝大多数 WordPress 站点。

### 基础设置（Basic Options）

| 选项 | 推荐值 | 原因 |
| --- | --- | --- |
| Cache System | **Varnish** | 服务器级缓存，比纯 PHP 缓存快一个量级 |
| Purge Cache on Post Update | **开启** | 避免前台显示旧内容 |
| Purge Cache After | 1440 分钟 | 兜底刷新，防止缓存无限累积 |
| Auto Purge Minify | 开启 | 修改 CSS/JS 后自动刷新 |

### 页面缓存排除规则

Varnish 不缓存已登录用户是设计行为，但有些页面**必须显式排除**，否则会出问题：

```
/cart/
/checkout/
/my-account/
/?add-to-cart=
/wp-admin/
```

WooCommerce 站点尤其要注意：**购物车和结算页绝不能缓存**，
否则会出现「A 用户看到 B 用户购物车」的严重事故。

### 对象缓存（Object Cache）

这是最容易被忽略、收益却很高的一项。

1. 在 Cloudways 面板 → Settings → 找到 **Redis**，开启
2. 回到 Breeze → Object Cache，选择 **Redis**
3. 保存后插件会自动写入 `object-cache.php`

开启后可以用 `redis-cli info stats` 查看命中率，正常情况下 keyspace_hits
应该显著高于 keyspace_misses。

### 压缩与优化（Minification）

| 选项 | 推荐 | 注意 |
| --- | --- | --- |
| HTML Minify | 开启 | 基本无风险 |
| CSS Minify | 开启 | 若样式错乱则关闭 |
| JS Minify | **谨慎** | 现代主题常已自带压缩，重复压缩易报错 |
| Combine CSS/JS | **关闭** | HTTP/2 下合并反而有害 |
| Gzip Compression | 开启 | 减少传输体积 |
| Lazy Load Images | 开启 | 首屏图片记得加 `no-lazy` 排除 |

> 经验法则：**开启压缩后如果页面出现布局错乱或 JS 报错，
> 第一个要排查的就是 JS Minify / Combine**。这类问题在主题更新后尤其常见。

### CDN（可选）

如果你的访客跨多个大洲，可以在 Breeze 里配置 Cloudflare：

1. 在 Cloudflare 添加域名并完成解析
2. Breeze → CDN → 选择 Cloudflare → 填入 API Key 与 Zone ID
3. 开启后静态资源会自动走 CDN 边缘节点

如果访客集中在单一区域，CDN 收益有限，可以跳过。

## 验证效果

配置完成后，用以下方式验证：

```bash
# 检查是否命中 Varnish 缓存（返回头应含 X-Varnish 或 Age）
curl -I https://your-domain.com/ | grep -iE 'x-varnish|age|cache-control'

# 检查 Redis 是否在工作
redis-cli info stats | grep -E 'keyspace_hits|keyspace_misses'
```

再用 GTmetrix 或 WebPageTest 复测一次，对比配置前后的 TTFB。
如果 TTFB 没有明显下降，检查：

1. Varnish 是否真的开启了（面板里看状态）
2. 访问的页面是否被排除规则命中
3. 是否装了其它缓存插件造成冲突

## 常见故障速查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 前台一直显示旧内容 | 缓存未自动清除 | 开启「发布文章时清除缓存」 |
| 购物车内容错乱 | 结算页被缓存 | 添加排除规则 |
| 样式错乱 | CSS 合并/压缩冲突 | 关闭 Combine CSS |
| 后台 500 错误 | Redis 连接失败 | 面板里重启 Redis 服务 |
| TTFB 没变化 | Varnish 未生效 | 确认面板开关 + 无插件冲突 |
