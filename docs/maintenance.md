# 博客维护说明

博客使用 Hexo 8.1.2 和 Redefine 2.9.0，部署在 GitHub Pages。源码和生成文件分别保存在 `redefine-pages`、`gh-pages` 分支。

## 构建与发布

建议使用 Node.js 24。

```sh
npm ci
BLOG_TARGET=github node prepare.mjs
npm run test:music
npm run build:redefine
```

生成文件位于 `dist-redefine/`。修改源码后，需要重新构建，并将生成文件更新到 `gh-pages` 分支；只推送源码分支不会更新网站。GitHub Pages 的发布来源为 `gh-pages` 分支根目录。

`deployment/github-actions-pages.yml.example` 保留了可选的自动构建配置。

## 音乐

109 首已准备的歌曲位于 `source/music/encrypted/*.enc`，歌单为 `source/music/playlist.json`。

音乐统一使用 AES-256-GCM；每首使用独立随机 96 位 IV，歌曲 ID 作为附加认证数据。网页使用 Web Crypto API 解密后生成临时音频地址。没有上传原始 MP3/M4A，原文件留在本地独立曲库。播放器每次进入随机选曲，在一轮内不重复；支持暂停、上一首、下一首、歌单选择、进度、音量、收起及站内导航连续播放。浏览器禁止自动播放时显示“开启音乐”；默认音量 10%，每次打开页面尝试播放；暂停作用于当前访问，主动调节的音量会记住。默认隐藏为左上侧小标签，悬停或点击展开，移出或点击外部收起。

加密的用途是避免直接分发可播放的音频文件。播放密钥会提供给浏览器，因此这不是 DRM，也不能防止提取音频或录音。

更新歌曲时，在本地运行（ffmpeg 路径按安装位置填写）：

```sh
node tools/prepare-music.mjs --library /path/to/blog-music-library --ffmpeg /path/to/ffmpeg
npm run test:music
```

脚本从本地两个清单读取成功下载的歌曲，去重后生成 128 kbps AAC 播放版本并加密。`.music-cache/` 只保存本地中间音频，被 Git 忽略；无需上传。

## 内容和素材

`articles.json` 是已有网络文章选读清单，保留原作者、原文日期及来源。文章入口跳转原文，不作为 MosEcho 原创发表。

Redefine 主题由 npm 安装，沿用其 GPL 许可；未修改上游 JS/CSS。主题许可见 `LICENSES/`。背景为主题自带 `wallhaven-wqery6` 日间/夜间图片；其余摄影来源见“关于”。

## 侧栏统计

个人卡片和分类链接下方显示标签文章数、原文发表月份归档、文章总数、创建时间，以及 Vercount 的访客数与访问量。内容统计由 Hexo 数据生成；博客创建时间设为 2027 年 9 月，访客统计从接入日起累计。外部计数服务不可用时显示 —。

`theme-overrides/redefine/sidebar-stats.ejs` 是自有侧栏扩展，prepare.mjs 将它插入生成的主题副本；npm 上游主题不修改。


## 私有访客分析

博客继续托管在 `mosecho.github.io`。详细分析使用 Umami 登录后台，不在博客内嵌报表，不生成 Share URL，也不邀请其他成员。现有 Vercount 卡片仍只公开汇总数字。正式站点使用 Umami Cloud 的 `cloud.umami.is/script.js` 和本网站的公开 website ID。

在自己的 Umami 账号中添加 `mosecho.github.io`，将 Tracking code 的 `src` 和 `data-website-id` 分别填入根目录 `analytics.config.json` 的 `scriptUrl`、`websiteId`。这两个值用于公开采集，不是查看报表的凭证。不要在仓库中存放密码、会话、API 密钥。两项为空时不会加载分析脚本。

运行 `BLOG_TARGET=github node prepare.mjs` 并重新构建发布。统计脚本仅在正式 GitHub 版本注入，并限制上报域名为 `mosecho.github.io`；私人预览不注入。Umami 自带 SPA 路由统计，无需额外监听导航重复上报。

接入后在 About 中补充该服务的统计说明。登录后台确认数据到达，并在退出账号后确认无法查看报表。历史 Vercount 汇总不会自动变成详细访问记录。
