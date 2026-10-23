import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { analyticsHead } from './tools/analytics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
process.chdir(here);
const originA = 'https://mosecho-private-blog.mysticreed12.chatgpt.site';
const githubPages = process.env.BLOG_TARGET === 'github';
const analyticsConfig = JSON.parse(fs.readFileSync('analytics.config.json', 'utf8'));
const privateAnalyticsHead = githubPages ? analyticsHead(analyticsConfig) : [];
const originB = githubPages ? 'https://mosecho.github.io' : 'https://mosecho-redefine-preview.mysticreed12.chatgpt.site';
const articles = JSON.parse(fs.readFileSync('articles.json', 'utf8'));
const write = (p, body) => { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, body); };
const merge = (base, value) => {
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === 'object' && !Array.isArray(item)) base[key] = merge(base[key] && typeof base[key] === 'object' ? base[key] : {}, item);
    else base[key] = item;
  }
  return base;
};

for (const name of ['anzhiyu','redefine']) {
  const dest = `themes/${name}-preview`;
  if (!fs.existsSync(dest)) fs.cpSync(`node_modules/hexo-theme-${name}`, dest, {recursive:true});
}

// Extend only the generated Redefine copy; the pinned npm theme stays intact.
const sidebarBase = fs.readFileSync('node_modules/hexo-theme-redefine/layout/pages/home/home-sidebar.ejs', 'utf8');
const sidebarEnd = sidebarBase.lastIndexOf('    </div>');
if (sidebarEnd < 0) throw new Error('Redefine sidebar insertion point not found');
write('themes/redefine-preview/layout/pages/home/home-sidebar.ejs', sidebarBase.slice(0, sidebarEnd) + `        <%- partial('components/sidebar/mosecho-site-stats') %>\n` + sidebarBase.slice(sidebarEnd));
write('themes/redefine-preview/layout/components/sidebar/mosecho-site-stats.ejs', fs.readFileSync('theme-overrides/redefine/sidebar-stats.ejs', 'utf8'));
// Umami already observes SPA navigation; reloading its script would double count.
const headBase = fs.readFileSync('node_modules/hexo-theme-redefine/layout/components/header/head.ejs', 'utf8');
write('themes/redefine-preview/layout/components/header/head.ejs', headBase.replace('theme.global.single_page == true', "theme.global.single_page == true && !theme.inject.head[i].includes('data-swup-ignore-script')"));


fs.mkdirSync('source/assets', {recursive:true});
for (const [source, destination] of [
  ['../../personal-blog/src/assets/images/mosecho/github-avatar.jpg','source/assets/avatar.jpg'],
  ['../../personal-blog/src/assets/images/mosecho/blue-mountains-amanshu-raikwar.jpg','source/assets/mountains.jpg'],
  ['../../personal-blog/public/logo/jatopos-link.svg','source/assets/jatopos.svg'],
]) if (!fs.existsSync(destination)) fs.copyFileSync(source, destination);

for (const post of articles) {
  const metadata = {
    title: post.title, date: `${post.date} 12:00:00`, updated: `${post.date} 12:00:00`,
    author: post.author, copyright_author: post.author, copyright_author_href: post.url,
    categories: [post.category], tags: post.tags,
    description: `原作者：${post.author} · ${post.site} · ${post.date}`,
    cover: `/assets/${post.image}`, thumbnail: `/assets/${post.image}`,
    link: post.url, source_url: post.url, copyright: false, comments: false,
  };
  const attribution = `原作者：**${post.author}** · ${post.site}  \n原文日期：${post.date}  \n[阅读原文 ↗](${post.url})`;
  write(`source/_posts/${post.slug}.md`, `---\n${YAML.stringify(metadata)}---\n\n${attribution}\n\n> ${post.quote}\n\n<!-- more -->\n\n[前往作者网站阅读全文](${post.url})\n`);
}

write('source/about/index.md', `---
title: 关于我
date: 2026-10-22
comments: false
---

我是 MosEcho，AI 工程师，本科在读，也关注网络安全。我发表过 **2 篇论文**，参加过 **CTF 比赛**，有**漏洞挖掘**经验。

我在这里整理学习中读到的文章，关注 AI 工程、论文研究与安全实践。

[GitHub · MosEcho](https://github.com/MosEcho)

## 我的阅读收藏

我把读过的技术文章整理在这里，保留原作者、发表日期和原文链接。点击标题可以前往作者的网站阅读全文。

## 图片来源

博客使用的图片来自以下摄影师，感谢他们的分享。

[Amanshu Raikwar · Unsplash](https://unsplash.com/photos/landscape-photography-of-mountain-cSsgcUMUESU)

[Arwin Neil Baichoo · Unsplash](https://unsplash.com/photos/a-mountain-with-a-star-in-the-sky-yunM_ezxCY8)
`);
for (const [slug, title, type] of [['categories','分类','categories'],['tags','标签','tags'],['link','友链','link']]) write(`source/${slug}/index.md`, `---\ntitle: ${title}\ndate: 2026-10-22\ntype: ${type}\ncomments: false\n---\n` + (slug==='link' ? '\n[Jatopos的博客](https://jatopos.github.io/) · CTF、Web 安全与学习记录\n' : ''));
const friend = {name:'Jatopos的博客',link:'https://jatopos.github.io/',avatar:'/assets/jatopos.svg',descr:'CTF · Web 安全 · 学习记录',description:'CTF · Web 安全 · 学习记录'};
// The themes consume different keys from the same Hexo data file.
write('source/_data/link.yml', YAML.stringify([{class_name:'友链',class_desc:'CTF、Web 安全与学习记录',link_list:[friend],links_category:'友链',has_thumbnail:false,list:[friend]}]));

const photoCredit = '我的阅读收藏 · <a href="/about/">文章与图片来源</a>';
const base = {
  title:'MosEcho',subtitle:'AI 工程 · 网络安全 · 论文研究',description:'AI 工程师 · 本科在读，有 CTF 比赛和漏洞挖掘经验。',
  mosecho_site_start:'2027-09-01T00:00:00+08:00',
  author:'MosEcho',language:'zh-CN',timezone:'Asia/Shanghai',root:'/',permalink:'read/:title/',
  source_dir:'source',tag_dir:'tags',archive_dir:'archives',category_dir:'categories',
  date_format:'YYYY-MM-DD',time_format:'HH:mm:ss',relative_link:false,
  future:false,post_asset_folder:false,render_drafts:false,
  highlight:{enable:true,line_number:true,auto_detect:false,tab_replace:''},prismjs:{enable:false},
  index_generator:{path:'',per_page:8,order_by:'-date'},per_page:8,pagination_dir:'page',
  external_link:{enable:true,field:'site',exclude:[]},
};

const a = YAML.parse(fs.readFileSync('themes/anzhiyu-preview/_config.yml','utf8'));
merge(a, {
  menu:{'文章':{'归档':'/archives/ || anzhiyu-icon-box-archive','分类':'/categories/ || anzhiyu-icon-shapes','标签':'/tags/ || anzhiyu-icon-tags'},'友链':'/link/ || anzhiyu-icon-link','关于':'/about/ || anzhiyu-icon-paper-plane','3 · Redefine':`${originB}/ || anzhiyu-icon-arrow-right`},
  social:{Github:'https://github.com/MosEcho || anzhiyu-icon-github'},
  avatar:{img:'/assets/avatar.jpg',effect:false},favicon:'/assets/avatar.jpg',
  nav:{enable:false,travelling:false,clock:false},author_status:{enable:false},
  theme_color:{enable:true,main:'#365c86',dark_main:'#8cb9e6',paginator:'#365c86',toc_color:'#365c86'},
  aside:{position:'right',card_author:{description:'AI 工程师 · 本科在读<br>研究、CTF 与漏洞挖掘'},card_weixin:{enable:false},card_categories:{enable:true},card_announcement:{enable:true,content:'这里是我收藏的技术文章，点击标题阅读原文。'},card_webinfo:{enable:false}},
  cover:{index_enable:true,aside_enable:true,archives_enable:true,default_cover:['/assets/mountains.jpg']},
  article_double_row:true,index_img:false,default_top_img:false,
  home_top:{enable:true,title:'AI 工程',subTitle:'网络安全与研究。',siteText:'MosEcho',category:[{name:'AI 工程',path:'/categories/AI-工程/',shadow:'var(--anzhiyu-shadow-blue)',class:'blue',icon:'anzhiyu-icon-code'},{name:'研究笔记',path:'/categories/研究笔记/',shadow:'var(--anzhiyu-shadow-blue)',class:'blue',icon:'anzhiyu-icon-book'},{name:'安全实践',path:'/categories/安全实践/',shadow:'var(--anzhiyu-shadow-green)',class:'green',icon:'anzhiyu-icon-shield'}],default_descr:'原文选读',banner:{tips:'安全与 AI',title:'Why gdb-mcp?',image:'/assets/night.jpg',link:articles[0].url},swiper:{enable:false}},
  post_copyright:{enable:false},reward:{enable:false},comments:{use:[],count:false,card_post_count:false},sharejs:{enable:false},addtoany:{enable:false},
  post_head_ai_description:{enable:false},
  busuanzi:{site_uv:false,site_pv:false,page_pv:false},universe:{enable:false},diytitle:{enable:false},nav_music:{enable:false},rightClickMenu:{enable:false},
  preloader:{enable:false},pjax:{enable:false},local_search:{enable:false},
  footer:{owner:{enable:true,since:2026},custom_text:photoCredit,runtime:{enable:false}},
  CDN:{internal_provider:'local',third_party_provider:'jsdelivr'},
});
write('_config.anzhiyu.yml', YAML.stringify({...base,url:originA,theme:'anzhiyu-preview',public_dir:'dist-anzhiyu',database:'db-anzhiyu.json',theme_config:a}));

const b=YAML.parse(fs.readFileSync('themes/redefine-preview/_config.yml','utf8'));
merge(b, {
  info:{title:'MosEcho',subtitle:'AI 工程 · 网络安全 · 论文研究',author:'MosEcho',url:originB},
  defaults:{avatar:'/assets/avatar.jpg',favicon:'/assets/avatar.jpg'},colors:{primary:'#365c86',default_mode:'light'},
  home_banner:{enable:true,style:'fixed',image:{light:'/images/wallhaven-wqery6-light.webp',dark:'/images/wallhaven-wqery6-dark.webp'},title:'MosEcho',subtitle:{text:['AI 工程 · 网络安全','本科在读 · 论文研究'],hitokoto:{enable:false}},text_color:{light:'#ffffff',dark:'#ffffff'},social_links:{enable:true,links:[{icon:'github',url:'https://github.com/MosEcho'}],qrs:[]}},
  navbar:{color:{left:'#243c57',right:'#365c86',transparency:70},links:{'Home':{path:'/',icon:'fa-regular fa-house'},'归档':{path:'/archives/',icon:'fa-regular fa-archive'},'友链':{path:'/link/',icon:'fa-regular fa-link'},'关于':{path:'/about/',icon:'fa-regular fa-user'},'1 · 安知鱼':{path:originA,icon:'fa-regular fa-arrow-up-right'}},search:{enable:false}},
  home:{sidebar:{enable:true,position:'left',first_item:'info',announcement:'我收藏的技术文章',links:{'AI 工程':{path:'/categories/AI-工程/',icon:'fa-regular fa-code'},'研究笔记':{path:'/categories/研究笔记/',icon:'fa-regular fa-book'},'安全实践':{path:'/categories/安全实践/',icon:'fa-regular fa-shield'}}},article_date_format:'YYYY-MM-DD',excerpt_length:240},
  global:{website_counter:{enable:false},single_page:true,open_graph:{image:'/images/wallhaven-wqery6-light.webp',description:base.description}},
  articles:{word_count:{enable:false},copyright:{enable:false},author_label:{enable:false},recommendation:{enable:false}},comment:{enable:false},
  footer:{runtime:false,statistics:false,icon:'',start:'2026/10/23 00:00:00',customize:photoCredit},
  inject:{enable:true,head:[...privateAnalyticsHead,'<link rel="stylesheet" href="/assets/music-player.css?v=20261023-dock">','<script type="module" src="/assets/music-player.mjs?v=20261023-dock"></script>','<link rel="stylesheet" href="/assets/site-stats.css?v=20261023">','<script type="module" src="/assets/site-stats.mjs?v=20261023"></script>',...(githubPages ? ['<script defer src="https://events.vercount.one/js"></script>'] : [])],footer:[]},
});
if (githubPages) delete b.navbar.links['1 · 安知鱼'];
write('_config.redefine.yml', YAML.stringify({...base,url:originB,theme:'redefine-preview',public_dir:'dist-redefine',database:'db-redefine.json',theme_config:b}));

// Outbound reading collection: every title/card/read-more goes to its real author.
write('scripts/source-links.js', `const catalog = require('../articles.json');\nhexo.extend.filter.register('after_render:html', function(html) {\n  for (const article of catalog) {\n    const local = '/read/' + article.slug + '/';\n    html = html.split('href="' + local + '"').join('href="' + article.url + '"');\n  }\n  return html;\n});\n`);
console.log('Prepared two authentic themes with the same six attributed source articles.');
