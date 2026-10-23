# MosEcho 的个人博客

[访问博客](https://mosecho.github.io/) · [关于我](https://mosecho.github.io/about/) · [文章归档](https://mosecho.github.io/archives/)

我是 MosEcho，本科在读，主要做 AI 工程，也涉及网络安全，有过 CTF 比赛和漏洞挖掘的经历。

我用这个博客整理学习资料和技术实践，关注的方向包括：

- **AI 工程**：LLM、Agent 和模型训练。
- **研究笔记**：论文阅读、反编译等研究话题。
- **安全实践**：CTF、Web 安全与漏洞研究。

目前站内以我整理的技术文章选读为主，保留原作者、发表日期和原文链接。点击文章会前往原作者的网站，这些文章不属于我的原创。

## 关于这个仓库

我把博客源码放在这个仓库里。网站使用 [Hexo](https://hexo.io/) 和 [Redefine](https://github.com/EvanNotFound/hexo-theme-redefine)，托管在 GitHub Pages。

我在左上角放了一个默认收起的音乐播放器，可以随机播放、切歌和调节音量。默认音量为 10%；如果浏览器没有自动播放，点一下音乐图标就能开启。

- `redefine-pages`：日常维护的源码，也是仓库默认分支。
- `gh-pages`：构建后的网页文件，由 GitHub Pages 发布。

## 本地构建

使用 Node.js 24，在源码分支运行：

```sh
npm ci
BLOG_TARGET=github node prepare.mjs
npm run build:redefine
```

构建结果位于 `dist-redefine/`。内容、音乐和统计卡的维护方式见 [维护说明](docs/maintenance.md)。

## 致谢

感谢 [Hexo](https://hexo.io/)、[Redefine](https://github.com/EvanNotFound/hexo-theme-redefine) 和 [Vercount](https://github.com/EvanNotFound/vercount) 的维护者，也感谢选读文章的作者。

主题许可保存在 [LICENSES](LICENSES/) 中；文章与图片的来源说明可以在博客的[关于页面](https://mosecho.github.io/about/)找到。
