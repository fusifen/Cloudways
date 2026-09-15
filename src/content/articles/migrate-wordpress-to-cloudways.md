---
title: 把 WordPress 搬到 Cloudways：零停机迁移完整流程
description: 从共享主机或其它 VPS 迁移到 Cloudways 的完整实操。含免费迁移申请、手动迁移步骤、DNS 切换时机与迁移后必做的 7 项检查。
pubDate: 2026-07-15
updatedDate: 2026-09-03
author: Cloudways 指南编辑部
category: migration
tags: [搬家, 迁移, WordPress, DNS, 零停机]
heroImage: /images/articles/migration.svg
heroImageAlt: 网站迁移流程示意图
affiliateNotice: true
featured: false
relatedProducts: [digitalocean, vultr]
readingTime: 11
faqs:
  - question: Cloudways 的免费迁移服务覆盖哪些内容？
    answer: 官方团队会帮你迁移网站文件、数据库、邮件账户（部分场景）与 DNS 配置，并验证站点在目标服务器上正常运行。每台服务器通常提供一次免费迁移。
  - question: 迁移过程中网站会下线吗？
    answer: 不会。正确流程是先在新服务器上完整搭好并验证，再切换 DNS 解析。原站全程保持在线，切换后旧服务器再保留几天作为回滚保险。
  - question: 迁移大概需要多久？
    answer: 提交免费迁移申请后，官方通常在一个工作日内完成；站点体积越大耗时越长。手动迁移一个中型 WordPress 站（约 2GB）大约需要 1–2 小时。
  - question: DNS 切换后要等多久生效？
    answer: 取决于原 DNS 的 TTL 设置。建议迁移前把 TTL 调到 300 秒（5 分钟），这样切换后通常几分钟到半小时内全球生效，最长不超过 TTL 设定值。
  - question: 迁移后如果发现问题能回滚吗？
    answer: 可以。只要不删除旧服务器，把 DNS 改回去即可立即恢复。建议切换后至少保留旧服务器 7 天。
seo:
  title: WordPress 迁移到 Cloudways 完整教程：零停机搬家流程
  description: 从共享主机或 VPS 迁移到 Cloudways 的完整流程，含免费迁移申请、手动迁移步骤、DNS 切换时机与迁移后检查清单。
  keywords: [WordPress 迁移, Cloudways 搬家, 网站迁移教程, DNS 切换]
---

## 迁移的核心原则：先建好，再切换

90% 的迁移事故都源于同一个错误：**先改 DNS，再在新服务器上折腾**。
正确顺序永远是：

```
新服务器部署 → 迁移数据 → 本地验证 → 预演切换 → 改 DNS → 观察 → 清理旧服务器
```

只要旧服务器还在、数据还在，任何环节出问题都可以秒级回滚。

## 方案选择：免费迁移 vs 手动迁移

Cloudways 提供两条路径：

| 方案 | 适合谁 | 耗时 | 风险 |
| --- | --- | --- | --- |
| **免费迁移服务** | 不想折腾、站点较大、含电商 | 官方 1 个工作日内 | 低 |
| **手动迁移** | 想完全掌控、站点较小 | 1–3 小时 | 中 |

**建议**：站点超过 2GB、含 WooCommerce 订单数据、或用了复杂插件组合的，
直接用免费迁移服务。省下的时间远超那点掌控感的价值。

## 路径 A：使用免费迁移服务

1. **部署目标服务器**。在 Cloudways 面板新建服务器，选好厂商与机房。
   > 建议：目标机房尽量靠近你的主要用户群，或与原机房同区域，减少迁移后的性能落差。
2. **提交迁移申请**。在服务器详情页找到「Migration」入口，填写原服务器的
   SSH / SFTP 信息、站点 URL 与管理员账号。
3. **等待官方处理**。团队会完成文件与数据库搬运，并在迁移完成后通知你。
4. **验证**。用 Cloudways 提供的临时 URL（或 hosts 文件绑定）访问新站，逐项检查。
5. **切换 DNS**。验证通过后修改域名解析指向新服务器 IP。

## 路径 B：手动迁移（4 步）

### 第 1 步：备份原站

用插件（如 UpdraftPlus、All-in-One WP Migration）导出**完整备份**：
数据库 + wp-content 目录。同时记录当前的插件列表与 PHP 版本。

### 第 2 步：在新服务器部署 WordPress

在 Cloudways 面板选应用类型为 WordPress，填写站点名称与管理员信息。
部署完成后你会拿到：

- 公网 IP
- 临时访问地址（如 `http://203.0.113.10`）
- SSH 凭据
- MySQL 数据库名与密码（在 Application 详情页）

### 第 3 步：上传文件与导入数据库

```bash
# 上传 wp-content（在原服务器上执行）
rsync -avz --progress /var/www/html/wp-content/ \
  master_user@NEW_SERVER_IP:/home/master/applications/APP_NAME/public_html/wp-content/

# 导出原站数据库
wp db export backup.sql --add-drop-table

# 上传后在新服务器导入
wp db import backup.sql
```

### 第 4 步：替换域名并修正 URL

如果域名不变，只需处理硬编码的旧 IP 或临时域名。用 WP-CLI 批量替换：

```bash
wp search-replace 'https://old-domain.com' 'https://new-domain.com' \
  --all-tables --precise --report-changed-only
```

> 注意：`--precise` 会走 PHP 反序列化，比纯 SQL 替换更安全，
> 但执行较慢。数据量大时建议先备份。

## DNS 切换：时机的选择

**最佳切换时间：你的流量低谷期**（通常是目标时区的凌晨）。

切换前必做：

1. 把原 DNS 的 TTL 提前 24 小时调低到 300 秒
2. 确认新服务器上的 SSL 证书已签发（Cloudways 自动处理 Let's Encrypt）
3. 用 hosts 文件在本机绑定域名到新 IP，完整走一遍下单 / 登录 / 表单提交

切换动作：把域名的 A 记录从旧 IP 改成新服务器 IP。

## 迁移后必做的 7 项检查

| # | 检查项 | 怎么验 |
| --- | --- | --- |
| 1 | 首页与内页可访问 | 手动点 5 个不同层级页面 |
| 2 | SSL 正常 | 浏览器无警告，`https://` 锁标正常 |
| 3 | 固定链接正确 | 打开设置→固定链接，保存一次刷新规则 |
| 4 | 表单可提交 | 实际提交一次联系表单并确认收到邮件 |
| 5 | 邮件能发出 | 测试找回密码邮件是否送达 |
| 6 | 图片全部显示 | 检查媒体库，确认没有 404 |
| 7 | Breeze 缓存已开启 | 面板 → Application → Breeze，开启 Varnish |

## 清理阶段

切换后**至少保留旧服务器 7 天**。确认一切正常后：

1. 在原主机商处取消订阅（不是仅停服，要取消计费）
2. 删除 Cloudways 上临时创建的测试服务器
3. 检查是否有残留的 Staging 环境在计费

> 最后提醒：迁移完成后，记得在 Google Search Console 里提交新的 sitemap，
> 并检查是否有大量 404 报错——这通常是固定链接规则没刷新的信号。
